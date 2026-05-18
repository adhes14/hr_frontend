<script lang="ts">
	import { onMount } from 'svelte';
	import { listUsers, createUser, changePassword, setUserActive, type Staff } from '$lib/api/client';
	import { isAdmin } from '$lib/auth';
	import { goto } from '$app/navigation';

	let users = $state<Staff[]>([]);
	let loading = $state(true);
	let error = $state('');

	// Create User Modal
	let showCreateModal = $state(false);
	let newFullName = $state('');
	let newUsername = $state('');
	let newPassword = $state('');
	let newRole = $state<'health_staff' | 'admin'>('health_staff');

	// Change Password Modal
	let showPasswordModal = $state(false);
	let selectedUserId = $state('');
	let selectedUserPassword = $state('');

	onMount(async () => {
		if (!isAdmin()) {
			goto('/');
			return;
		}
		await loadUsers();
	});

	async function loadUsers() {
		try {
			loading = true;
			users = await listUsers();
		} catch (e: any) {
			error = e.message;
		} finally {
			loading = false;
		}
	}

	async function handleCreateUser(e: Event) {
		e.preventDefault();
		try {
			await createUser({
				full_name: newFullName,
				username: newUsername,
				password: newPassword,
				role: newRole
			});
			showCreateModal = false;
			newFullName = '';
			newUsername = '';
			newPassword = '';
			newRole = 'health_staff';
			await loadUsers();
		} catch (e: any) {
			alert('Error: ' + e.message);
		}
	}

	async function handleToggleActive(user: Staff) {
		if (confirm(`¿Estás seguro de ${user.is_active ? 'desactivar' : 'activar'} al usuario ${user.username}?`)) {
			try {
				await setUserActive(user.id, !user.is_active);
				await loadUsers();
			} catch (e: any) {
				alert('Error: ' + e.message);
			}
		}
	}

	function openPasswordModal(id: string) {
		selectedUserId = id;
		selectedUserPassword = '';
		showPasswordModal = true;
	}

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		try {
			await changePassword(selectedUserId, selectedUserPassword);
			showPasswordModal = false;
			alert('Contraseña actualizada correctamente');
		} catch (e: any) {
			alert('Error: ' + e.message);
		}
	}
</script>

<div class="header">
	<h1>👤 Gestión de Usuarios</h1>
	<button class="primary" onclick={() => (showCreateModal = true)}>+ Nuevo Usuario</button>
</div>

{#if error}
	<div class="error">{error}</div>
{/if}

{#if loading}
	<div class="loading">Cargando...</div>
{:else}
	<div class="table-container">
		<table>
			<thead>
				<tr>
					<th>Nombre</th>
					<th>Usuario</th>
					<th>Rol</th>
					<th>Estado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each users as user}
					<tr class:inactive={!user.is_active}>
						<td>{user.full_name}</td>
						<td><strong>{user.username}</strong></td>
						<td>
							<span class="badge {user.role}">
								{user.role === 'admin' ? 'Administrador' : 'Personal Médico'}
							</span>
						</td>
						<td>
							<span class="badge {user.is_active ? 'active' : 'inactive'}">
								{user.is_active ? 'Activo' : 'Inactivo'}
							</span>
						</td>
						<td class="actions">
							<button class="secondary" onclick={() => openPasswordModal(user.id)}>
								🔑 Cambiar Clave
							</button>
							<button class={user.is_active ? 'danger' : 'success'} onclick={() => handleToggleActive(user)}>
								{user.is_active ? 'Desactivar' : 'Activar'}
							</button>
						</td>
					</tr>
				{/each}
				{#if users.length === 0}
					<tr>
						<td colspan="5" class="empty">No hay usuarios registrados</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
{/if}

<!-- Create User Modal -->
{#if showCreateModal}
	<div class="modal-backdrop" onclick={() => (showCreateModal = false)}></div>
	<dialog open class="modal">
		<h3>Crear Nuevo Usuario</h3>
		<form onsubmit={handleCreateUser}>
			<label>
				Nombre Completo:
				<input type="text" bind:value={newFullName} required placeholder="Ej: Dr. Juan Pérez" />
			</label>
			<label>
				Nombre de Usuario:
				<input type="text" bind:value={newUsername} required placeholder="Ej: jperez" />
			</label>
			<label>
				Contraseña Inicial:
				<input type="password" bind:value={newPassword} required />
			</label>
			<label>
				Rol:
				<select bind:value={newRole}>
					<option value="health_staff">Personal Médico (Enfermera, Médico, etc)</option>
					<option value="admin">Administrador del Sistema</option>
				</select>
			</label>
			<div class="modal-actions">
				<button type="button" class="text" onclick={() => (showCreateModal = false)}>Cancelar</button>
				<button type="submit" class="primary">Crear Usuario</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Change Password Modal -->
{#if showPasswordModal}
	<div class="modal-backdrop" onclick={() => (showPasswordModal = false)}></div>
	<dialog open class="modal">
		<h3>Cambiar Contraseña</h3>
		<form onsubmit={handleChangePassword}>
			<label>
				Nueva Contraseña:
				<input type="password" bind:value={selectedUserPassword} required minlength="6" />
			</label>
			<div class="modal-actions">
				<button type="button" class="text" onclick={() => (showPasswordModal = false)}>Cancelar</button>
				<button type="submit" class="primary">Guardar</button>
			</div>
		</form>
	</dialog>
{/if}

<style>
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.table-container {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		overflow: hidden;
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: 1rem;
		text-align: left;
		border-bottom: 1px solid #f0f0f0;
	}

	th {
		background: #f8f9fa;
		font-weight: 600;
		color: #444;
	}

	tr:hover {
		background: #fdfdfd;
	}

	tr.inactive {
		background: #fafafa;
		opacity: 0.7;
	}

	.badge {
		padding: 0.3rem 0.6rem;
		border-radius: 20px;
		font-size: 0.85rem;
		font-weight: 500;
	}

	.badge.admin { background: #e3f2fd; color: #1565c0; }
	.badge.health_staff { background: #f3e5f5; color: #7b1fa2; }
	.badge.active { background: #e8f5e9; color: #2e7d32; }
	.badge.inactive { background: #ffebee; color: #c62828; }

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	button {
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	button.primary { background: #3f51b5; color: white; }
	button.primary:hover { background: #303f9f; }
	
	button.secondary { background: #e0e0e0; color: #333; }
	button.secondary:hover { background: #d0d0d0; }
	
	button.danger { background: #ffebee; color: #c62828; }
	button.danger:hover { background: #ffcdd2; }
	
	button.success { background: #e8f5e9; color: #2e7d32; }
	button.success:hover { background: #c8e6c9; }

	button.text { background: transparent; color: #666; }
	button.text:hover { background: #f0f0f0; }

	.empty {
		text-align: center;
		color: #888;
		padding: 3rem;
	}

	/* Modals */
	.modal-backdrop {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(0,0,0,0.5);
		z-index: 100;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 2rem;
		border-radius: 12px;
		border: none;
		box-shadow: 0 20px 40px rgba(0,0,0,0.2);
		z-index: 101;
		width: 100%;
		max-width: 400px;
	}

	.modal h3 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: #1a1a2e;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		font-size: 0.9rem;
		color: #444;
	}

	input, select {
		padding: 0.6rem;
		border: 1px solid #ddd;
		border-radius: 6px;
		font-size: 1rem;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1rem;
	}
</style>

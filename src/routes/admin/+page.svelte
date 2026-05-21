<script lang="ts">
	import { onMount } from 'svelte';
	import {
		listUsers, createUser, changePassword, setUserActive, type Staff,
		getBeds, getBedTypes, createBed, updateBed, deleteBed, type Bed,
		createBedType, updateBedType, deleteBedType, type BedType,
		getSettings, updateSettings
	} from '$lib/api/client';
	import { isAdmin } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { playNotificationSound } from '$lib/sse';

	// General page state
	let activeTab = $state<'users' | 'beds' | 'types' | 'settings'>('users');
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Data stores
	let users = $state<Staff[]>([]);
	let beds = $state<Bed[]>([]);
	let bedTypes = $state<BedType[]>([]);
	let systemSettings = $state<Record<string, string>>({
		sound_alert_control_overdue: 'true',
		sound_alert_discharge_ready: 'false',
		sound_alert_patient_admitted: 'false',
		sound_alert_patient_discharged: 'false'
	});

	// Users State
	let showUserModal = $state(false);
	let selectedUser = $state<Staff | null>(null);
	let userFullName = $state('');
	let userUsername = $state('');
	let userPassword = $state('');
	let userRole = $state<'health_staff' | 'admin'>('health_staff');
	let showPasswordModal = $state(false);
	let selectedUserId = $state('');
	let selectedUserPassword = $state('');

	// Beds State
	let showBedModal = $state(false);
	let selectedBed = $state<Bed | null>(null);
	let bedNumber = $state<number>(0);
	let bedTypeId = $state<number>(0);
	let bedIsActive = $state(true);
	let deleteBedConfirm = $state<Bed | null>(null);

	// Bed Types State
	let showTypeModal = $state(false);
	let selectedType = $state<BedType | null>(null);
	let typeName = $state('');
	let typePrefix = $state('');
	let typeRequiresFollowup = $state(false);
	let deleteTypeConfirm = $state<BedType | null>(null);

	// Form actions loading
	let formLoading = $state(false);
	let formError = $state<string | null>(null);

	onMount(async () => {
		if (!isAdmin()) {
			goto('/');
			return;
		}
		await loadAllData();
	});

	async function loadAllData() {
		loading = true;
		error = null;
		try {
			const [u, b, bt, s] = await Promise.all([
				listUsers(),
				getBeds(),
				getBedTypes(),
				getSettings()
			]);
			users = u;
			beds = b;
			bedTypes = bt;
			systemSettings = { ...systemSettings, ...s };
		} catch (err: any) {
			error = err.message || 'Error al cargar datos del panel';
		} finally {
			loading = false;
		}
	}

	// Tab switcher
	async function switchTab(tab: typeof activeTab) {
		activeTab = tab;
		formError = null;
		// Refresh selected data
		try {
			if (tab === 'users') users = await listUsers();
			if (tab === 'beds') {
				beds = await getBeds();
				bedTypes = await getBedTypes();
			}
			if (tab === 'types') bedTypes = await getBedTypes();
			if (tab === 'settings') systemSettings = await getSettings();
		} catch (err: any) {
			formError = err.message || 'Error al refrescar datos';
		}
	}

	// --- USER CRUD ACTIONS ---
	function openCreateUserModal() {
		selectedUser = null;
		userFullName = '';
		userUsername = '';
		userPassword = '';
		userRole = 'health_staff';
		formError = null;
		showUserModal = true;
	}

	async function handleUserSubmit(e: Event) {
		e.preventDefault();
		formLoading = true;
		formError = null;
		try {
			await createUser({
				full_name: userFullName,
				username: userUsername,
				password: userPassword,
				role: userRole
			});
			showUserModal = false;
			users = await listUsers();
		} catch (err: any) {
			formError = err.message || 'Error al crear usuario';
		} finally {
			formLoading = false;
		}
	}

	async function handleToggleUserActive(user: Staff) {
		const action = user.is_active ? 'desactivar' : 'activar';
		if (confirm(`¿Estás seguro de ${action} al usuario ${user.username}?`)) {
			try {
				await setUserActive(user.id, !user.is_active);
				users = await listUsers();
			} catch (err: any) {
				alert('Error: ' + err.message);
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
		formLoading = true;
		try {
			await changePassword(selectedUserId, selectedUserPassword);
			showPasswordModal = false;
			alert('Contraseña actualizada correctamente');
		} catch (err: any) {
			alert('Error: ' + err.message);
		} finally {
			formLoading = false;
		}
	}

	// --- BED CRUD ACTIONS ---
	function openCreateBedModal() {
		selectedBed = null;
		bedNumber = 0;
		bedTypeId = bedTypes.length > 0 ? bedTypes[0].id : 0;
		bedIsActive = true;
		formError = null;
		showBedModal = true;
	}

	function openEditBedModal(bed: Bed) {
		selectedBed = bed;
		bedNumber = bed.number;
		bedTypeId = bed.bed_type?.id || 0;
		bedIsActive = bed.is_active;
		formError = null;
		showBedModal = true;
	}

	async function handleBedSubmit(e: Event) {
		e.preventDefault();
		if (!bedNumber || !bedTypeId) {
			formError = 'Número y tipo de cama son obligatorios';
			return;
		}
		formLoading = true;
		formError = null;
		try {
			if (selectedBed) {
				await updateBed(selectedBed.id, {
					number: bedNumber,
					bed_type_id: bedTypeId
				});
			} else {
				await createBed({
					number: bedNumber,
					bed_type_id: bedTypeId,
					is_active: bedIsActive
				});
			}
			showBedModal = false;
			beds = await getBeds();
		} catch (err: any) {
			formError = err.message || 'Error al guardar cama';
		} finally {
			formLoading = false;
		}
	}

	function confirmDeleteBed(bed: Bed) {
		deleteBedConfirm = bed;
		formError = null;
	}

	async function handleDeleteBed() {
		if (!deleteBedConfirm) return;
		formLoading = true;
		try {
			await deleteBed(deleteBedConfirm.id);
			deleteBedConfirm = null;
			beds = await getBeds();
		} catch (err: any) {
			formError = err.message || 'No se puede eliminar: la cama está ocupada';
		} finally {
			formLoading = false;
		}
	}

	// --- BED TYPE CRUD ACTIONS ---
	function openCreateTypeModal() {
		selectedType = null;
		typeName = '';
		typePrefix = '';
		typeRequiresFollowup = false;
		formError = null;
		showTypeModal = true;
	}

	function openEditTypeModal(bt: BedType) {
		selectedType = bt;
		typeName = bt.name;
		typePrefix = bt.prefix;
		typeRequiresFollowup = bt.requires_postpartum_followup;
		formError = null;
		showTypeModal = true;
	}

	async function handleTypeSubmit(e: Event) {
		e.preventDefault();
		if (!typeName || !typePrefix) {
			formError = 'Nombre y prefijo son obligatorios';
			return;
		}
		formLoading = true;
		formError = null;
		try {
			if (selectedType) {
				await updateBedType(selectedType.id, {
					name: typeName,
					prefix: typePrefix,
					requires_postpartum_followup: typeRequiresFollowup
				});
			} else {
				await createBedType({
					name: typeName,
					prefix: typePrefix,
					requires_postpartum_followup: typeRequiresFollowup
				});
			}
			showTypeModal = false;
			bedTypes = await getBedTypes();
		} catch (err: any) {
			formError = err.message || 'Error al guardar tipo de cama';
		} finally {
			formLoading = false;
		}
	}

	function confirmDeleteType(bt: BedType) {
		deleteTypeConfirm = bt;
		formError = null;
	}

	async function handleDeleteType() {
		if (!deleteTypeConfirm) return;
		formLoading = true;
		try {
			await deleteBedType(deleteTypeConfirm.id);
			deleteTypeConfirm = null;
			bedTypes = await getBedTypes();
		} catch (err: any) {
			formError = err.message || 'No se puede eliminar: hay camas asignadas a este tipo';
		} finally {
			formLoading = false;
		}
	}

	// --- SYSTEM SETTINGS ACTIONS ---
	async function handleSaveSettings() {
		formLoading = true;
		formError = null;
		try {
			await updateSettings(systemSettings);
			alert('Configuración guardada correctamente');
		} catch (err: any) {
			formError = err.message || 'Error al guardar configuración';
		} finally {
			formLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Panel de Administración - Hospital Manager</title>
</svelte:head>

<div class="admin-panel">
	<header class="panel-header">
		<h1>⚙️ Panel de Administración</h1>
		<p class="panel-subtitle">Gestiona usuarios, infraestructura de camas, alertas y sonidos del sistema.</p>
	</header>

	{#if error}
		<div class="error-alert">{error}</div>
	{/if}

	{#if loading}
		<div class="loading-state">
			<span class="spinner"></span>
			Cargando panel de administración...
		</div>
	{:else}
		<!-- Tab Controls -->
		<div class="tabs-nav">
			<button class:active={activeTab === 'users'} onclick={() => switchTab('users')}>
				👤 Usuarios
			</button>
			<button class:active={activeTab === 'beds'} onclick={() => switchTab('beds')}>
				🛏️ Camas
			</button>
			<button class:active={activeTab === 'types'} onclick={() => switchTab('types')}>
				🏷️ Tipos de Cama
			</button>
			<button class:active={activeTab === 'settings'} onclick={() => switchTab('settings')}>
				🔊 Alertas y Configuración
			</button>
		</div>

		<!-- Tab Content Area -->
		<div class="tab-content card">
			<!-- USERS TAB -->
			{#if activeTab === 'users'}
				<div class="tab-header">
					<h2>👤 Gestión de Usuarios</h2>
					<button class="btn btn-primary" onclick={openCreateUserModal}>+ Nuevo Usuario</button>
				</div>

				<div class="table-responsive-wrapper">
					<table class="modern-table">
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
									<td class="font-medium text-main">{user.full_name}</td>
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
										<button class="btn btn-sm btn-secondary" onclick={() => openPasswordModal(user.id)}>
											🔑 Clave
										</button>
										<button class="btn btn-sm {user.is_active ? 'btn-danger' : 'btn-success'}" onclick={() => handleToggleUserActive(user)}>
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

			<!-- BEDS TAB -->
			{#if activeTab === 'beds'}
				<div class="tab-header">
					<h2>🛏️ Gestión de Camas</h2>
					<button class="btn btn-primary" onclick={openCreateBedModal}>+ Nueva Cama</button>
				</div>

				<div class="table-responsive-wrapper">
					<table class="modern-table">
						<thead>
							<tr>
								<th>Número</th>
								<th>Tipo</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each beds as bed (bed.id)}
								<tr>
									<td class="font-medium text-main"><strong>{bed.bed_type?.prefix}{bed.number}</strong></td>
									<td>{bed.bed_type?.name ?? 'N/A'}</td>
									<td>
										{#if bed.is_active}
											<span class="badge badge-active">Activa</span>
										{:else}
											<span class="badge badge-inactive">Inactiva</span>
										{/if}
									</td>
									<td class="col-actions">
										<button class="btn btn-sm btn-info" onclick={() => openEditBedModal(bed)}>Editar</button>
										<button class="btn btn-sm btn-danger" onclick={() => confirmDeleteBed(bed)}>Eliminar</button>
									</td>
								</tr>
							{/each}
							{#if beds.length === 0}
								<tr>
									<td colspan="4" class="empty">No hay camas registradas</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- BED TYPES TAB -->
			{#if activeTab === 'types'}
				<div class="tab-header">
					<h2>🏷️ Tipos de Cama</h2>
					<button class="btn btn-primary" onclick={openCreateTypeModal}>+ Nuevo Tipo</button>
				</div>

				<div class="table-responsive-wrapper">
					<table class="modern-table">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Prefijo</th>
								<th>Seguimiento Post-parto</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each bedTypes as bt (bt.id)}
								<tr>
									<td class="font-medium text-main">{bt.name}</td>
									<td><strong>{bt.prefix}</strong></td>
									<td>
										{#if bt.requires_postpartum_followup}
											<span class="badge badge-active">Requiere</span>
										{:else}
											<span class="badge badge-inactive">No requiere</span>
										{/if}
									</td>
									<td class="col-actions">
										<button class="btn btn-sm btn-info" onclick={() => openEditTypeModal(bt)}>Editar</button>
										<button class="btn btn-sm btn-danger" onclick={() => confirmDeleteType(bt)}>Eliminar</button>
									</td>
								</tr>
							{/each}
							{#if bedTypes.length === 0}
								<tr>
									<td colspan="4" class="empty">No hay tipos de cama registrados</td>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- SYSTEM SETTINGS TAB -->
			{#if activeTab === 'settings'}
				<div class="tab-header">
					<h2>🔊 Configuración de Notificaciones Sonoras</h2>
				</div>

				<div class="settings-form">
					<p class="settings-description">
						Elige qué eventos generan una alerta sonora (beep triple sintetizado) en los clientes de escritorio y móviles conectados. Los eventos desactivados se reflejarán visualmente de forma silenciosa.
					</p>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title">🚨 Control Postparto Vencido (Monitoreo)</span>
							<span class="setting-help">Se reproduce cuando vence alguna ventana de control entre la 1era y 8va hora del paciente post-parto.</span>
						</div>
						<div class="setting-input">
							<select bind:value={systemSettings.sound_alert_control_overdue}>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title">✅ Paciente Alta Lista</span>
							<span class="setting-help">Se reproduce cuando se cumplen las 24 horas (parto) o 48 horas (cesárea) de hospitalización.</span>
						</div>
						<div class="setting-input">
							<select bind:value={systemSettings.sound_alert_discharge_ready}>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title">📥 Nueva Admisión (Ingreso)</span>
							<span class="setting-help">Se reproduce al ingresar un paciente a una cama.</span>
						</div>
						<div class="setting-input">
							<select bind:value={systemSettings.sound_alert_patient_admitted}>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title">📤 Alta de Paciente (Egreso)</span>
							<span class="setting-help">Se reproduce cuando se egresa al paciente y se libera la cama.</span>
						</div>
						<div class="setting-input">
							<select bind:value={systemSettings.sound_alert_patient_discharged}>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title">📥 Nueva Admisión (Ingreso)</span>
							<span class="setting-help">Se reproduce al ingresar un paciente a una cama.</span>
						</div>
						<div class="setting-input">
							<select bind:value={systemSettings.sound_alert_patient_admitted}>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title">📤 Alta de Paciente (Egreso)</span>
							<span class="setting-help">Se reproduce cuando se egresa al paciente y se libera la cama.</span>
						</div>
						<div class="setting-input">
							<select bind:value={systemSettings.sound_alert_patient_discharged}>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					{#if formError}
						<div class="error-alert">{formError}</div>
					{/if}

					<div class="settings-actions">
						<button type="button" class="btn btn-secondary" onclick={playNotificationSound}>
							🔊 Probar Parlantes / Sonido
						</button>
						<button type="button" class="btn btn-primary" onclick={handleSaveSettings} disabled={formLoading}>
							{formLoading ? 'Guardando...' : '💾 Guardar Configuración'}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- --- MODALS --- -->

<!-- Create User Modal -->
{#if showUserModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showUserModal = false)}></div>
	<dialog open class="modal">
		<h3>Crear Nuevo Usuario</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleUserSubmit}>
			<label>
				Nombre Completo:
				<input type="text" bind:value={userFullName} required placeholder="Ej: Dr. Juan Pérez" />
			</label>
			<label>
				Nombre de Usuario:
				<input type="text" bind:value={userUsername} required placeholder="Ej: jperez" />
			</label>
			<label>
				Contraseña Inicial:
				<input type="password" bind:value={userPassword} required />
			</label>
			<label>
				Rol:
				<select bind:value={userRole}>
					<option value="health_staff">Personal Médico (Enfermera, Médico, etc)</option>
					<option value="admin">Administrador del Sistema</option>
				</select>
			</label>
			<div class="modal-actions">
				<button type="button" class="btn btn-text" onclick={() => (showUserModal = false)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={formLoading}>
					{formLoading ? 'Creando...' : 'Crear Usuario'}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Change Password Modal -->
{#if showPasswordModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showPasswordModal = false)}></div>
	<dialog open class="modal">
		<h3>Cambiar Contraseña</h3>
		<form onsubmit={handleChangePassword}>
			<label>
				Nueva Contraseña:
				<input type="password" bind:value={selectedUserPassword} required minlength="6" />
			</label>
			<div class="modal-actions">
				<button type="button" class="btn btn-text" onclick={() => (showPasswordModal = false)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={formLoading}>
					{formLoading ? 'Guardando...' : 'Guardar'}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Create/Edit Bed Modal -->
{#if showBedModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showBedModal = false)}></div>
	<dialog open class="modal">
		<h3>{selectedBed ? 'Editar Cama' : 'Nueva Cama'}</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleBedSubmit}>
			<label>
				Número de Cama:
				<input type="number" min="1" bind:value={bedNumber} required />
			</label>
			<label>
				Tipo de Cama:
				<select bind:value={bedTypeId} required>
					<option value={0} disabled>Seleccionar tipo...</option>
					{#each bedTypes as bt}
						<option value={bt.id}>{bt.name} ({bt.prefix})</option>
					{/each}
				</select>
			</label>
			{#if !selectedBed}
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={bedIsActive} />
					Cama Activa
				</label>
			{/if}
			<div class="modal-actions">
				<button type="button" class="btn btn-text" onclick={() => (showBedModal = false)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={formLoading}>
					{formLoading ? 'Guardando...' : selectedBed ? 'Guardar Cambios' : 'Crear'}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Delete Bed Confirmation Modal -->
{#if deleteBedConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (deleteBedConfirm = null)}></div>
	<dialog open class="modal modal-confirm">
		<h3>Eliminar Cama</h3>
		<p>¿Está seguro que desea eliminar la cama <strong>{deleteBedConfirm.bed_type?.prefix}{deleteBedConfirm.number}</strong>?</p>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<div class="modal-actions">
			<button type="button" class="btn btn-text" onclick={() => (deleteBedConfirm = null)}>Cancelar</button>
			<button type="button" class="btn btn-danger" onclick={handleDeleteBed} disabled={formLoading}>
				{formLoading ? 'Eliminando...' : 'Eliminar'}
			</button>
		</div>
	</dialog>
{/if}

<!-- Create/Edit Bed Type Modal -->
{#if showTypeModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showTypeModal = false)}></div>
	<dialog open class="modal">
		<h3>{selectedType ? 'Editar Tipo de Cama' : 'Nuevo Tipo de Cama'}</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleTypeSubmit}>
			<label>
				Nombre:
				<input type="text" placeholder="Maternidad" bind:value={typeName} required />
			</label>
			<label>
				Prefijo:
				<input type="text" placeholder="M" maxlength="5" bind:value={typePrefix} required />
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={typeRequiresFollowup} />
				Requiere seguimiento post-parto
			</label>
			<div class="modal-actions">
				<button type="button" class="btn btn-text" onclick={() => (showTypeModal = false)}>Cancelar</button>
				<button type="submit" class="btn btn-primary" disabled={formLoading}>
					{formLoading ? 'Guardando...' : selectedType ? 'Guardar Cambios' : 'Crear'}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Delete Type Confirmation Modal -->
{#if deleteTypeConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (deleteTypeConfirm = null)}></div>
	<dialog open class="modal modal-confirm">
		<h3>Eliminar Tipo de Cama</h3>
		<p>¿Está seguro que desea eliminar el tipo de cama <strong>{deleteTypeConfirm.name}</strong>?</p>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<div class="modal-actions">
			<button type="button" class="btn btn-text" onclick={() => (deleteTypeConfirm = null)}>Cancelar</button>
			<button type="button" class="btn btn-danger" onclick={handleDeleteType} disabled={formLoading}>
				{formLoading ? 'Eliminando...' : 'Eliminar'}
			</button>
		</div>
	</dialog>
{/if}

<style>
	.admin-panel {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.panel-header {
		margin-bottom: 0.5rem;
	}

	.panel-subtitle {
		color: var(--text-muted);
		font-size: 1rem;
		margin-top: 0.25rem;
	}

	/* Tabs Styling */
	.tabs-nav {
		display: flex;
		gap: 0.5rem;
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 2px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tabs-nav::-webkit-scrollbar {
		display: none;
	}

	.tabs-nav button {
		background: transparent;
		border: none;
		padding: 0.75rem 1.25rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-muted);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
		border-bottom: 3px solid transparent;
		margin-bottom: -2px;
	}

	.tabs-nav button:hover {
		color: var(--text-main);
	}

	.tabs-nav button.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
		font-weight: 600;
	}

	/* Card and Containers */
	.card {
		background: var(--surface);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-md);
		border: 1px solid var(--border-color);
		padding: 1.5rem;
	}

	.tab-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.tab-header h2 {
		margin: 0;
		font-size: 1.35rem;
	}

	/* Table Badges and Classes */
	tr.inactive {
		background: var(--background);
		opacity: 0.7;
	}

	.badge {
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 500;
		display: inline-block;
	}

	.badge.admin { background: var(--info-bg); color: var(--info); }
	.badge.health_staff { background: #f3e5f5; color: #7b1fa2; }
	.badge.active, .badge.badge-active { background: var(--success-bg); color: var(--success); }
	.badge.inactive, .badge.badge-inactive { background: var(--danger-bg); color: var(--danger); }

	.actions, .col-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Buttons styling */
	.btn {
		border: 1px solid transparent;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-md);
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		font-size: 0.9rem;
	}

	.btn-primary { background: var(--primary); color: white; }
	.btn-primary:hover { background: var(--primary-hover); transform: translateY(-1px); }

	.btn-secondary { background: var(--background); color: var(--text-main); border-color: var(--border-color); }
	.btn-secondary:hover { background: var(--border-color); }

	.btn-danger { background: var(--danger-bg); color: var(--danger); }
	.btn-danger:hover { background: #fee2e2; border-color: rgba(239, 68, 68, 0.2); }

	.btn-success { background: var(--success-bg); color: var(--success); }
	.btn-success:hover { background: #d1fae5; }

	.btn-info { background: var(--info-bg); color: var(--info); }
	.btn-info:hover { background: #dbeafe; }

	.btn-text { background: transparent; color: var(--text-muted); }
	.btn-text:hover { background: var(--background); }

	.btn-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		border-radius: var(--border-radius-sm);
	}

	.empty {
		text-align: center;
		color: var(--text-muted);
		padding: 3rem;
	}

	/* Settings specific styling */
	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 800px;
	}

	.settings-description {
		color: var(--text-muted);
		font-size: 0.95rem;
		line-height: 1.6;
		margin-bottom: 0.5rem;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: var(--background);
		border-radius: var(--border-radius-md);
		border: 1px solid var(--border-color);
		gap: 2rem;
		flex-wrap: wrap;
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 250px;
	}

	.setting-title {
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-main);
	}

	.setting-help {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.setting-input select {
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-sm);
		border: 1px solid var(--border-color);
		font-size: 0.95rem;
		background: white;
		cursor: pointer;
		min-width: 150px;
	}

	.settings-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	/* Modals styling */
	.modal-backdrop {
		position: fixed;
		top: 0; left: 0; right: 0; bottom: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 2rem;
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-lg);
		z-index: 1001;
		width: 90%;
		max-width: 480px;
	}

	.modal-confirm {
		max-width: 400px;
	}

	.modal h3 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: var(--secondary);
		font-size: 1.25rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-main);
	}

	.checkbox-label {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	input[type="text"],
	input[type="password"],
	input[type="number"],
	select {
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-size: 0.95rem;
		width: 100%;
		background: white;
	}

	input:focus, select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px var(--info-bg);
	}

	input[type="checkbox"] {
		width: auto;
		cursor: pointer;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.error-alert {
		background: var(--danger-bg);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--border-radius-md);
		padding: 0.75rem 1rem;
		color: var(--danger);
		font-size: 0.9rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 5rem 0;
		gap: 1rem;
		color: var(--text-muted);
	}

	.spinner {
		border: 3px solid var(--border-color);
		border-top: 3px solid var(--primary);
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>

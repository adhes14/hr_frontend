<script lang="ts">
	import type { BedType } from '$lib/api/client';
	import { getBedTypes, createBedType, updateBedType, deleteBedType } from '$lib/api/client';

	let bedTypes = $state<BedType[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Modal state
	let showModal = $state(false);
	let editingBedType = $state<BedType | null>(null);
	let formName = $state('');
	let formPrefix = $state('');
	let formRequiresFollowup = $state(false);
	let formLoading = $state(false);
	let formError = $state<string | null>(null);
	let deleteConfirm = $state<BedType | null>(null);

	async function loadBedTypes() {
		loading = true;
		error = null;
		try {
			bedTypes = await getBedTypes();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar tipos de cama';
		} finally {
			loading = false;
		}
	}

	function openCreateModal() {
		editingBedType = null;
		formName = '';
		formPrefix = '';
		formRequiresFollowup = false;
		formError = null;
		showModal = true;
	}

	function openEditModal(bt: BedType) {
		editingBedType = bt;
		formName = bt.name;
		formPrefix = bt.prefix;
		formRequiresFollowup = bt.requires_postpartum_followup;
		formError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingBedType = null;
		formError = null;
	}

	async function handleFormSubmit() {
		if (!formName || !formPrefix) {
			formError = 'Nombre y prefijo son obligatorios';
			return;
		}

		formLoading = true;
		formError = null;

		try {
			if (editingBedType) {
				await updateBedType(editingBedType.id, {
					name: formName,
					prefix: formPrefix,
					requires_postpartum_followup: formRequiresFollowup
				});
			} else {
				await createBedType({
					name: formName,
					prefix: formPrefix,
					requires_postpartum_followup: formRequiresFollowup
				});
			}
			closeModal();
			await loadBedTypes();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al guardar tipo de cama';
		} finally {
			formLoading = false;
		}
	}

	function confirmDelete(bt: BedType) {
		deleteConfirm = bt;
	}

	async function handleDelete() {
		if (!deleteConfirm) return;

		formLoading = true;
		formError = null;

		try {
			await deleteBedType(deleteConfirm.id);
			deleteConfirm = null;
			await loadBedTypes();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'No se puede eliminar: hay camas asignadas';
		} finally {
			formLoading = false;
		}
	}

	function cancelDelete() {
		deleteConfirm = null;
	}

	$effect(() => {
		loadBedTypes();
	});
</script>

<svelte:head>
	<title>Tipos de Cama - Hospital</title>
</svelte:head>

<div class="bed-types-page">
	<div class="header">
		<h1>Tipos de Cama</h1>
		<button class="btn-new" onclick={openCreateModal}>+ Nuevo Tipo de Cama</button>
	</div>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if loading}
		<p class="message">Cargando...</p>
	{:else if bedTypes.length === 0}
		<p class="message">No hay tipos de cama registrados</p>
	{:else}
		<div class="bed-type-list">
			<div class="list-header">
				<span class="col-name">Nombre</span>
				<span class="col-prefix">Prefijo</span>
				<span class="col-followup">Seguimiento</span>
				<span class="col-actions">Acciones</span>
			</div>
			{#each bedTypes as bt (bt.id)}
				<div class="bed-type-row">
					<span class="col-name">{bt.name}</span>
					<span class="col-prefix"><strong>{bt.prefix}</strong></span>
					<span class="col-followup">
						{#if bt.requires_postpartum_followup}
							<span class="badge badge-active">Requiere</span>
						{:else}
							<span class="badge badge-inactive">No requiere</span>
						{/if}
					</span>
					<span class="col-actions">
						<button class="btn-edit" onclick={() => openEditModal(bt)}>Editar</button>
						<button class="btn-delete" onclick={() => confirmDelete(bt)}>Eliminar</button>
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={closeModal} tabindex="-1">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="modal" role="document" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingBedType ? 'Editar Tipo de Cama' : 'Nuevo Tipo de Cama'}</h2>
				<button class="modal-close" onclick={closeModal}>&times;</button>
			</div>

			{#if formError}
				<div class="error">{formError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
				<div class="field">
					<label for="name">Nombre</label>
					<input id="name" type="text" placeholder="Maternidad" bind:value={formName} required />
				</div>

				<div class="field">
					<label for="prefix">Prefijo</label>
					<input id="prefix" type="text" placeholder="M" maxlength="5" bind:value={formPrefix} required />
				</div>

				<div class="field checkbox-field">
					<label>
						<input type="checkbox" bind:checked={formRequiresFollowup} />
						Requiere seguimiento post-parto
					</label>
					<p class="field-hint">Los tipos con seguimiento mostrarán controles cada 15-30 minutos</p>
				</div>

				<div class="modal-actions">
					<button type="button" class="btn-cancel" onclick={closeModal}>Cancelar</button>
					<button type="submit" class="btn-submit" disabled={formLoading}>
						{formLoading ? 'Guardando...' : editingBedType ? 'Guardar Cambios' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y_interactive_supports_focus -->
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={cancelDelete} tabindex="-1">
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div class="modal modal-confirm" role="document" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Eliminar Tipo de Cama</h2>
				<button class="modal-close" onclick={cancelDelete}>&times;</button>
			</div>
			<p>¿Está seguro que desea eliminar el tipo de cama <strong>{deleteConfirm.name}</strong>?</p>
			{#if formError}
				<div class="error">{formError}</div>
			{/if}
			<div class="modal-actions">
				<button type="button" class="btn-cancel" onclick={cancelDelete}>Cancelar</button>
				<button type="button" class="btn-delete-confirm" onclick={handleDelete} disabled={formLoading}>
					{formLoading ? 'Eliminando...' : 'Eliminar'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.bed-types-page {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	h1 {
		margin: 0;
		color: #1a1a2e;
	}

	.btn-new {
		background: #2ecc71;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
	}

	.btn-new:hover {
		background: #27ae60;
	}

	.error {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 0.75rem;
		color: #c00;
		margin-bottom: 1rem;
	}

	.message {
		text-align: center;
		color: #666;
		padding: 2rem;
	}

	.bed-type-list {
		border: 1px solid #eee;
		border-radius: 8px;
		overflow: hidden;
	}

	.list-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1.5fr 1.5fr;
		padding: 0.75rem 1rem;
		background: #1a1a2e;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.bed-type-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1.5fr 1.5fr;
		padding: 0.75rem 1rem;
		border-top: 1px solid #eee;
		align-items: center;
	}

	.bed-type-row:hover {
		background: #f8f9fa;
	}

	.badge {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.badge-active {
		background: #2ecc71;
		color: white;
	}

	.badge-inactive {
		background: #95a5a6;
		color: white;
	}

	.col-actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-edit {
		background: #3498db;
		color: white;
		border: none;
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.btn-edit:hover {
		background: #2980b9;
	}

	.btn-delete {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.8rem;
	}

	.btn-delete:hover {
		background: #c0392b;
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		width: 90%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
	}

	.modal-confirm {
		max-width: 400px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.modal-header h2 {
		margin: 0;
		color: #1a1a2e;
	}

	.modal-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #666;
		padding: 0;
		line-height: 1;
	}

	.field {
		margin-bottom: 1rem;
	}

	.checkbox-field label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.field-hint {
		color: #666;
		font-size: 0.875rem;
		margin: 0.25rem 0 0 1.5rem;
	}

	input[type="text"] {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.modal-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
		margin-top: 1rem;
	}

	.btn-cancel {
		background: #eee;
		color: #333;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
	}

	.btn-cancel:hover {
		background: #ddd;
	}

	.btn-submit {
		background: #2ecc71;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
	}

	.btn-submit:hover:not(:disabled) {
		background: #27ae60;
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-delete-confirm {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		font-weight: 500;
	}

	.btn-delete-confirm:hover:not(:disabled) {
		background: #c0392b;
	}

	.btn-delete-confirm:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
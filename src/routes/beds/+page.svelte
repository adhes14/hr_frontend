<script lang="ts">
	import type { Bed, BedType } from '$lib/api/client';
	import { getBeds, getBedTypes, createBed, updateBed, deleteBed } from '$lib/api/client';

	let beds = $state<Bed[]>([]);
	let bedTypes = $state<BedType[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Modal state
	let showModal = $state(false);
	let editingBed = $state<Bed | null>(null);
	let formNumber = $state(0);
	let formBedTypeId = $state(0);
	let formIsActive = $state(true);
	let formLoading = $state(false);
	let formError = $state<string | null>(null);
	let deleteConfirm = $state<Bed | null>(null);

	async function loadBeds() {
		loading = true;
		error = null;
		try {
			beds = await getBeds();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar camas';
		} finally {
			loading = false;
		}
	}

	async function loadBedTypes() {
		try {
			bedTypes = await getBedTypes();
		} catch (e) {
			console.error('Error loading bed types:', e);
		}
	}

	function openCreateModal() {
		editingBed = null;
		formNumber = 0;
		formBedTypeId = bedTypes.length > 0 ? bedTypes[0].id : 0;
		formIsActive = true;
		formError = null;
		showModal = true;
	}

	function openEditModal(bed: Bed) {
		editingBed = bed;
		formNumber = bed.number;
		formBedTypeId = bed.bed_type?.id ?? 0;
		formIsActive = bed.is_active;
		formError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingBed = null;
		formError = null;
	}

	async function handleFormSubmit() {
		if (!formNumber || !formBedTypeId) {
			formError = 'Número y tipo de cama son obligatorios';
			return;
		}

		formLoading = true;
		formError = null;

		try {
			if (editingBed) {
				await updateBed(editingBed.id, {
					number: formNumber,
					bed_type_id: formBedTypeId
				});
			} else {
				await createBed({
					number: formNumber,
					bed_type_id: formBedTypeId,
					is_active: formIsActive
				});
			}
			closeModal();
			await loadBeds();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al guardar cama';
		} finally {
			formLoading = false;
		}
	}

	function confirmDelete(bed: Bed) {
		deleteConfirm = bed;
	}

	async function handleDelete() {
		if (!deleteConfirm) return;

		formLoading = true;
		formError = null;

		try {
			await deleteBed(deleteConfirm.id);
			deleteConfirm = null;
			await loadBeds();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'No se puede eliminar: la cama está ocupada';
		} finally {
			formLoading = false;
		}
	}

	function cancelDelete() {
		deleteConfirm = null;
	}

	$effect(() => {
		loadBeds();
		loadBedTypes();
	});
</script>

<svelte:head>
	<title>Camas - Hospital</title>
</svelte:head>

<div class="beds-page">
	<div class="header">
		<h1>Camas</h1>
		<button class="btn-new" onclick={openCreateModal}>+ Nueva Cama</button>
	</div>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	{#if loading}
		<p class="message">Cargando...</p>
	{:else if beds.length === 0}
		<p class="message">No hay camas registradas</p>
	{:else}
		<div class="beds-list">
			<div class="list-header">
				<span class="col-number">Número</span>
				<span class="col-type">Tipo</span>
				<span class="col-status">Estado</span>
				<span class="col-actions">Acciones</span>
			</div>
			{#each beds as bed (bed.id)}
				<div class="bed-row">
					<span class="col-number"><strong>{bed.bed_type?.prefix}{bed.number}</strong></span>
					<span class="col-type">{bed.bed_type?.name ?? 'N/A'}</span>
					<span class="col-status">
						{#if bed.is_active}
							<span class="badge badge-active">Activa</span>
						{:else}
							<span class="badge badge-inactive">Inactiva</span>
						{/if}
					</span>
					<span class="col-actions">
						<button class="btn-edit" onclick={() => openEditModal(bed)}>Editar</button>
						<button class="btn-delete" onclick={() => confirmDelete(bed)}>Eliminar</button>
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showModal}
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={closeModal} tabindex="-1">
		<div class="modal" role="document" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingBed ? 'Editar Cama' : 'Nueva Cama'}</h2>
				<button class="modal-close" onclick={closeModal}>&times;</button>
			</div>

			{#if formError}
				<div class="error">{formError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
				<div class="field">
					<label for="number">Número de Cama</label>
					<input id="number" type="number" min="1" bind:value={formNumber} required />
				</div>

				<div class="field">
					<label for="bedType">Tipo de Cama</label>
					<select id="bedType" bind:value={formBedTypeId} required>
						<option value={0} disabled>Seleccionar tipo...</option>
						{#each bedTypes as bt}
							<option value={bt.id}>{bt.name} ({bt.prefix})</option>
						{/each}
					</select>
				</div>

				{#if !editingBed}
					<div class="field checkbox-field">
						<label>
							<input type="checkbox" bind:checked={formIsActive} />
							Cama activa
						</label>
					</div>
				{/if}

				<div class="modal-actions">
					<button type="button" class="btn-cancel" onclick={closeModal}>Cancelar</button>
					<button type="submit" class="btn-submit" disabled={formLoading}>
						{formLoading ? 'Guardando...' : editingBed ? 'Guardar Cambios' : 'Crear'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteConfirm}
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={cancelDelete} tabindex="-1">
		<div class="modal modal-confirm" role="document" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Eliminar Cama</h2>
				<button class="modal-close" onclick={cancelDelete}>&times;</button>
			</div>
			<p>¿Está seguro que desea eliminar la cama <strong>{deleteConfirm.bed_type?.prefix}{deleteConfirm.number}</strong>?</p>
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
	.beds-page {
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

	.beds-list {
		border: 1px solid #eee;
		border-radius: 8px;
		overflow: hidden;
	}

	.list-header {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1.5fr;
		padding: 0.75rem 1rem;
		background: #1a1a2e;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.bed-row {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr 1.5fr;
		padding: 0.75rem 1rem;
		border-top: 1px solid #eee;
		align-items: center;
	}

	.bed-row:hover {
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

	input[type="number"],
	select {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		box-sizing: border-box;
	}

	input:focus,
	select:focus {
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
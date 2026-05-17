<script lang="ts">
	import type { Patient, PaginatedResponse } from '$lib/api/client';
	import { listPatients, searchPatients, createPatient, updatePatient } from '$lib/api/client';

	// List state
	let patients = $state<Patient[]>([]);
	let total = $state(0);
	let totalPages = $state(0);
	let currentPage = $state(1);
	let limit = 10;
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Search state
	let searchQuery = $state('');
	let isSearching = $state(false);

	// Create/Edit modal state
	let showModal = $state(false);
	let editingPatient = $state<Patient | null>(null);
	let formIdentityNumber = $state('');
	let formFullName = $state('');
	let formBirthDate = $state('');
	let formGestas = $state(0);
	let formPartos = $state(0);
	let formCesareas = $state(0);
	let formAbortos = $state(0);
	let formLoading = $state(false);
	let formError = $state<string | null>(null);

	// Load patients list
	async function loadPatients() {
		loading = true;
		error = null;
		try {
			const response: PaginatedResponse<Patient> = await listPatients(currentPage, limit);
			patients = response.data;
			total = response.total;
			totalPages = response.total_pages;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar pacientes';
		} finally {
			loading = false;
		}
	}

	// Search patients
	async function handleSearch() {
		if (!searchQuery.trim()) {
			isSearching = false;
			await loadPatients();
			return;
		}
		loading = true;
		error = null;
		isSearching = true;
		try {
			patients = await searchPatients(searchQuery.trim());
			total = patients.length;
			totalPages = 1;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al buscar';
		} finally {
			loading = false;
		}
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSearch();
		}
	}

	function clearSearch() {
		searchQuery = '';
		isSearching = false;
		currentPage = 1;
		loadPatients();
	}

	// Pagination
	function goToPage(page: number) {
		if (page < 1 || page > totalPages) return;
		currentPage = page;
		loadPatients();
	}

	// Modal management
	function openCreateModal() {
		editingPatient = null;
		formIdentityNumber = '';
		formFullName = '';
		formBirthDate = '';
		formGestas = 0;
		formPartos = 0;
		formCesareas = 0;
		formAbortos = 0;
		formError = null;
		showModal = true;
	}

	function openEditModal(patient: Patient) {
		editingPatient = patient;
		formIdentityNumber = patient.identity_number;
		formFullName = patient.full_name;
		formBirthDate = patient.birth_date.split('T')[0];
		const oh = patient.obstetric_history as Record<string, unknown>;
		formGestas = typeof oh.gestas === 'number' ? oh.gestas as number : 0;
		formPartos = typeof oh.partos === 'number' ? oh.partos as number : 0;
		formCesareas = typeof oh.cesareas === 'number' ? oh.cesareas as number : 0;
		formAbortos = typeof oh.abortos === 'number' ? oh.abortos as number : 0;
		formError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingPatient = null;
		formError = null;
	}

	async function handleFormSubmit() {
		if (!formIdentityNumber || !formFullName || !formBirthDate) {
			formError = 'DNI, nombre y fecha de nacimiento son obligatorios';
			return;
		}

		formLoading = true;
		formError = null;

		const obstetric_history = {
			gestas: formGestas,
			partos: formPartos,
			cesareas: formCesareas,
			abortos: formAbortos
		};

		try {
			if (editingPatient) {
				await updatePatient(editingPatient.id, {
					identity_number: formIdentityNumber,
					full_name: formFullName,
					birth_date: formBirthDate,
					obstetric_history
				});
			} else {
				await createPatient({
					identity_number: formIdentityNumber,
					full_name: formFullName,
					birth_date: formBirthDate,
					obstetric_history
				});
			}
			closeModal();
			await loadPatients();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al guardar paciente';
		} finally {
			formLoading = false;
		}
	}

	// Load on mount
	$effect(() => {
		loadPatients();
	});
</script>

<svelte:head>
	<title>Pacientes - Hospital</title>
</svelte:head>

<div class="patients-page">
	<div class="header">
		<h1>Pacientes</h1>
		<button class="btn-new" onclick={openCreateModal}>+ Nuevo Paciente</button>
	</div>

	<!-- Search bar -->
	<div class="search-bar">
		<input
			type="text"
			placeholder="Buscar por DNI o nombre..."
			bind:value={searchQuery}
			onkeydown={handleSearchKeydown}
		/>
		<button onclick={handleSearch} disabled={loading || !searchQuery.trim()}>
			Buscar
		</button>
		{#if isSearching}
			<button class="btn-clear" onclick={clearSearch}>Limpiar</button>
		{/if}
	</div>

	<!-- Error message -->
	{#if error}
		<div class="error">{error}</div>
	{/if}

	<!-- Loading -->
	{#if loading}
		<p class="message">Cargando...</p>
	{:else if patients.length === 0}
		<p class="message">No se encontraron pacientes</p>
	{:else}
		<!-- Patient list -->
		<div class="patient-list">
			<div class="list-header">
				<span class="col-name">Nombre</span>
				<span class="col-dni">DNI</span>
				<span class="col-birth">Fecha Nac.</span>
				<span class="col-actions">Acciones</span>
			</div>
			{#each patients as patient (patient.id)}
				<div class="patient-row">
					<span class="col-name">{patient.full_name}</span>
					<span class="col-dni">{patient.identity_number}</span>
					<span class="col-birth">{patient.birth_date.split('T')[0]}</span>
					<span class="col-actions">
						<button class="btn-edit" onclick={() => openEditModal(patient)}>Editar</button>
						<a href="/admissions/new?patient_id={patient.id}" class="btn-internar">Internar</a>
					</span>
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if totalPages > 1}
			<div class="pagination">
				<button
					class="page-btn"
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					&laquo; Anterior
				</button>
				<span class="page-info">
					Página {currentPage} de {totalPages} ({total} pacientes)
				</span>
				<button
					class="page-btn"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					Siguiente &raquo;
				</button>
			</div>
		{/if}
	{/if}
</div>

<!-- Create/Edit Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="modal-overlay" role="dialog" aria-modal="true" onclick={closeModal}>
		<div class="modal" role="document" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{editingPatient ? 'Editar Paciente' : 'Nuevo Paciente'}</h2>
				<button class="modal-close" onclick={closeModal}>&times;</button>
			</div>

			{#if formError}
				<div class="error">{formError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
				<div class="field">
					<label for="identity">DNI / Documento</label>
					<input id="identity" type="text" placeholder="12345678" bind:value={formIdentityNumber} required />
				</div>

				<div class="field">
					<label for="name">Nombre Completo</label>
					<input id="name" type="text" placeholder="María García" bind:value={formFullName} required />
				</div>

				<div class="field">
					<label for="birth">Fecha de Nacimiento</label>
					<input id="birth" type="date" bind:value={formBirthDate} required />
				</div>

				<fieldset class="obstetric-fieldset">
					<legend>Antecedentes Obstétricos</legend>
					<p class="fieldset-hint">Gestas, Partos, Cesáreas, Abortos</p>
					<div class="obstetric-grid">
						<div class="obstetric-field">
							<label for="gestas">Gestas (G)</label>
							<input id="gestas" type="number" min="0" bind:value={formGestas} />
						</div>
						<div class="obstetric-field">
							<label for="partos">Partos (P)</label>
							<input id="partos" type="number" min="0" bind:value={formPartos} />
						</div>
						<div class="obstetric-field">
							<label for="cesareas">Cesáreas (C)</label>
							<input id="cesareas" type="number" min="0" bind:value={formCesareas} />
						</div>
						<div class="obstetric-field">
							<label for="abortos">Abortos (A)</label>
							<input id="abortos" type="number" min="0" bind:value={formAbortos} />
						</div>
					</div>
				</fieldset>

				<div class="modal-actions">
					<button type="button" class="btn-cancel" onclick={closeModal}>Cancelar</button>
					<button type="submit" class="btn-submit" disabled={formLoading}>
						{formLoading ? 'Guardando...' : editingPatient ? 'Guardar Cambios' : 'Crear Paciente'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.patients-page {
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
		white-space: nowrap;
	}

	.btn-new:hover {
		background: #27ae60;
	}

	.search-bar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.search-bar input {
		flex: 1;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
	}

	.search-bar input:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.search-bar button {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		white-space: nowrap;
	}

	.search-bar button:hover:not(:disabled) {
		background: #16213e;
	}

	.search-bar button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-clear {
		background: #e74c3c !important;
	}

	.btn-clear:hover {
		background: #c0392b !important;
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

	/* Patient list table */
	.patient-list {
		border: 1px solid #eee;
		border-radius: 8px;
		overflow: hidden;
	}

	.list-header {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1.5fr;
		padding: 0.75rem 1rem;
		background: #1a1a2e;
		color: white;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.patient-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1.5fr;
		padding: 0.75rem 1rem;
		border-top: 1px solid #eee;
		align-items: center;
	}

	.patient-row:hover {
		background: #f8f9fa;
	}

	.col-name {
		font-weight: 500;
	}

	.col-dni {
		color: #555;
	}

	.col-birth {
		color: #555;
		font-size: 0.875rem;
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

	.btn-internar {
		background: #2ecc71;
		color: white;
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.8rem;
		display: inline-block;
	}

	.btn-internar:hover {
		background: #27ae60;
	}

	/* Pagination */
	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.page-btn {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.page-btn:hover:not(:disabled) {
		background: #16213e;
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		color: #666;
		font-size: 0.875rem;
	}

	/* Modal */
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

	.modal-close:hover {
		color: #333;
	}

	.field {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	input[type="text"],
	input[type="date"],
	input[type="number"] {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
		box-sizing: border-box;
	}

	input:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.obstetric-fieldset {
		border: 2px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.obstetric-fieldset legend {
		font-weight: 600;
		color: #1a1a2e;
		padding: 0 0.5rem;
	}

	.fieldset-hint {
		color: #666;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.obstetric-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.obstetric-field label {
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.obstetric-field input {
		text-align: center;
		font-weight: 600;
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
</style>
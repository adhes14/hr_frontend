<script lang="ts">
	import type { Patient, Bed } from "$lib/api/client";
	import {
		getBeds,
		searchPatients,
		createAdmission,
		getPatient,
	} from "$lib/api/client";
	import { goto } from "$app/navigation";
	import { page } from "$app/stores";

	let beds = $state<Bed[]>([]);
	let patients = $state<Patient[]>([]);
	let selectedBedId = $state<number | null>(null);
	let selectedPatientId = $state<string | null>(null);
	let selectedPatient = $state<Patient | null>(null);
	let searchQuery = $state("");
	let loading = $state(false);
	let loadingBeds = $state(true);
	let error = $state<string | null>(null);
	let admissionDiagnosis = $state("");
	let treatment = $state("");

	// Get pre-selected values from URL params
	$effect(() => {
		const bedParam = $page.url.searchParams.get("bed_id");
		const patientParam = $page.url.searchParams.get("patient_id");
		if (bedParam) selectedBedId = parseInt(bedParam);
		if (patientParam) selectedPatientId = patientParam;
	});

	// Load patient details when selectedPatientId changes
	$effect(() => {
		if (selectedPatientId) {
			if (selectedPatient?.id === selectedPatientId) return;

			const found = patients.find((p) => p.id === selectedPatientId);
			if (found) {
				selectedPatient = found;
			} else {
				getPatient(selectedPatientId)
					.then((p) => {
						selectedPatient = p;
					})
					.catch((e) => {
						console.error("Error fetching patient:", e);
						selectedPatient = null;
					});
			}
		} else {
			selectedPatient = null;
		}
	});

	// Load available beds
	$effect(() => {
		loadBeds();
	});

	async function loadBeds() {
		try {
			const allBeds = await getBeds();
			beds = allBeds.filter(
				(b) => b.current_admission_id === null && b.is_active,
			);
		} catch (e) {
			console.error("Error loading beds:", e);
		} finally {
			loadingBeds = false;
		}
	}

	async function handleSearch() {
		if (!searchQuery.trim()) return;
		try {
			patients = await searchPatients(searchQuery.trim());
		} catch (e) {
			console.error("Search error:", e);
			patients = [];
		}
	}

	async function handleSubmit() {
		if (!selectedBedId || !selectedPatientId) {
			error = "Selecciona una cama y un paciente";
			return;
		}
		if (!admissionDiagnosis.trim()) {
			error = "El diagnóstico de ingreso es obligatorio";
			return;
		}

		loading = true;
		error = null;

		try {
			await createAdmission({
				patient_id: selectedPatientId,
				bed_id: selectedBedId,
				admission_diagnosis: admissionDiagnosis.trim(),
				treatment: treatment.trim(),
			});

			goto("/");
		} catch (e) {
			error =
				e instanceof Error ? e.message : "Error al crear internación";
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Nueva Internación - Hospital</title>
</svelte:head>

<div class="form-page">
	<h1>Nueva Internación</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<!-- Bed Selection -->
		<div class="field">
			<label for="bed-select">Cama</label>
			{#if loadingBeds}
				<p>Cargando camas disponibles...</p>
			{:else if beds.length === 0}
				<p class="warning">No hay camas disponibles</p>
			{:else}
				<select id="bed-select" bind:value={selectedBedId}>
					<option value={null}>Seleccionar cama...</option>
					{#each beds as bed (bed.id)}
						<option value={bed.id}>
							{bed.bed_type?.prefix}{bed.number} - {bed.bed_type
								?.name}
						</option>
					{/each}
				</select>
			{/if}
		</div>

		<!-- Patient Selection -->
		<div class="field">
			<label for="patient-search">Paciente</label>
			{#if selectedPatientId}
				<div
					class="selected-patient"
					class:warning-bg={selectedPatient?.is_admitted}
				>
					{#if selectedPatient}
						{#if selectedPatient.is_admitted}
							<span class="warning-text"
								>El paciente {selectedPatient.full_name} ya está
								internado.</span
							>
						{:else}
							<span
								>Paciente seleccionado: {selectedPatient.full_name}</span
							>
						{/if}
					{:else}
						<span>Cargando datos del paciente...</span>
					{/if}
					<button
						type="button"
						class="btn-clear"
						onclick={() => {
							selectedPatientId = null;
						}}
					>
						Cambiar
					</button>
				</div>
			{:else}
				<div class="patient-search">
					<input
						id="patient-search"
						type="text"
						placeholder="Buscar por DNI o nombre..."
						bind:value={searchQuery}
						onkeydown={(e) =>
							e.key === "Enter" &&
							(e.preventDefault(), handleSearch())}
					/>
					<button type="button" onclick={handleSearch}>🔍</button>
				</div>

				{#if patients.length > 0}
					<div class="patient-list">
						{#each patients as patient (patient.id)}
							<button
								type="button"
								class="patient-option"
								class:selected={selectedPatientId ===
									patient.id}
								class:disabled={patient.is_admitted}
								disabled={patient.is_admitted}
								onclick={() => {
									if (!patient.is_admitted)
										selectedPatientId = patient.id;
								}}
							>
								<strong>
									{patient.full_name}
									{#if patient.is_admitted}
										<span class="badge-internado"
											>(Ya internado/a)</span
										>
									{/if}
								</strong>
								<span>DNI: {patient.identity_number}</span>
							</button>
						{/each}
					</div>
				{/if}
			{/if}
		</div>

		<!-- Admission Diagnosis -->
		<div class="field">
			<label for="admission-diagnosis">Diagnóstico de Ingreso</label>
			<textarea
				id="admission-diagnosis"
				placeholder="Ingrese el diagnóstico de ingreso..."
				bind:value={admissionDiagnosis}
				rows="3"
				required
			></textarea>
		</div>

		<!-- Treatment -->
		<div class="field">
			<label for="treatment">Tratamiento</label>
			<textarea
				id="treatment"
				placeholder="Ingrese el tratamiento inicial (opcional)..."
				bind:value={treatment}
				rows="3"
			></textarea>
		</div>

		<button
			type="submit"
			class="btn-submit"
			disabled={loading ||
				!selectedBedId ||
				!selectedPatientId ||
				selectedPatient?.is_admitted ||
				!admissionDiagnosis.trim()}
		>
			{loading ? "Internando..." : "Internar Paciente"}
		</button>
	</form>
</div>

<style>
	.form-page {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		max-width: 600px;
		margin: 0 auto;
	}

	h1 {
		margin: 0 0 1.5rem 0;
		color: #1a1a2e;
	}

	.error {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 0.75rem;
		color: #c00;
		margin-bottom: 1rem;
	}

	.warning {
		color: #e67e22;
		font-style: italic;
	}

	.field {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	select,
	input,
	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		background: white;
		font-family: inherit;
		resize: vertical;
	}

	select:focus,
	input:focus,
	textarea:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.patient-search {
		display: flex;
		gap: 0.5rem;
	}

	.patient-search input {
		flex: 1;
	}

	.patient-search button {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0 1rem;
		border-radius: 8px;
		cursor: pointer;
	}

	.patient-list {
		margin-top: 0.5rem;
		max-height: 200px;
		overflow-y: auto;
		border: 1px solid #eee;
		border-radius: 8px;
	}

	.patient-option {
		display: block;
		width: 100%;
		text-align: left;
		padding: 0.75rem;
		border: none;
		background: white;
		cursor: pointer;
		border-bottom: 1px solid #eee;
	}

	.patient-option:last-child {
		border-bottom: none;
	}

	.patient-option:hover {
		background: #f5f5f5;
	}

	.patient-option.selected {
		background: #e8f5e9;
		border-left: 3px solid #2ecc71;
	}

	.selected-patient {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: #e8f5e9;
		border-radius: 8px;
	}

	.selected-patient.warning-bg {
		background: #feeecd;
		border: 1px solid #f5c2c2;
	}

	.warning-text {
		color: #b58105;
		font-weight: 500;
	}

	.patient-option.disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: #f9f9f9;
	}

	.patient-option.disabled:hover {
		background: #f9f9f9;
	}

	.badge-internado {
		color: #3b82f6;
		font-size: 0.8rem;
		font-weight: normal;
		margin-left: 0.5rem;
	}

	.btn-clear {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.btn-submit {
		width: 100%;
		background: #2ecc71;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-submit:hover:not(:disabled) {
		background: #27ae60;
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getAdmission, getBedPatient } from '$lib/api/client';
	import type { Admission, Patient } from '$lib/api/client';
	import ClinicalLogForm from '$lib/components/ClinicalLogForm.svelte';

	const admissionId = $derived($page.params.admissionId);

	let admission = $state<Admission | null>(null);
	let patient = $state<Patient | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);
	let successMessage = $state<string | null>(null);

	$effect(() => {
		loadAdmission();
	});

	async function loadAdmission() {
		if (!admissionId) return;

		loading = true;
		error = null;

		try {
			admission = await getAdmission(admissionId);

			if (admission?.bed_id) {
				try {
					patient = await getBedPatient(admission.bed_id);
				} catch (e) {
					console.error('Error loading patient:', e);
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	function handleSuccess(nextControlAt: string | null) {
		const formattedTime = nextControlAt
			? new Date(nextControlAt).toLocaleString('es-AR', {
					hour: '2-digit',
					minute: '2-digit'
				})
			: 'Vigilancia completa';

		successMessage = `Control registrado. Próximo control: ${formattedTime}`;

		setTimeout(() => {
			goto(`/admissions/${admissionId}`);
		}, 2000);
	}
</script>

<svelte:head>
	<title>Nuevo Control - Hospital</title>
</svelte:head>

<div class="clinical-log-page">
	<div class="header">
		<button type="button" class="back-btn" onclick={() => goto(`/admissions/${admissionId}`)}>
			← Admisión
		</button>
		<h1>Nuevo Control</h1>
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
			<button onclick={loadAdmission}>Reintentar</button>
		</div>
	{:else if loading}
		<div class="loading">Cargando...</div>
	{:else}
		<div class="patient-context">
			{#if patient}
				<p><strong>Paciente:</strong> {patient.full_name}</p>
				<p><strong>Cama:</strong> {admission ? `Cama ${admission.bed_id}` : ''}</p>
			{/if}
		</div>

		{#if successMessage}
			<div class="success-banner">
				<p>{successMessage}</p>
			</div>
		{:else if admissionId}
			<ClinicalLogForm {admissionId} onsuccess={handleSuccess} />
		{/if}
	{/if}
</div>

<style>
	.clinical-log-page {
		max-width: 600px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.back-btn {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.back-btn:hover {
		background: #16213e;
	}

	h1 {
		margin: 0;
		color: #1a1a2e;
		font-size: 1.5rem;
	}

	.error-banner {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
	}

	.error-banner p {
		margin: 0 0 0.75rem 0;
		color: #c00;
	}

	.error-banner button {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		color: #666;
	}

	.success-banner {
		background: #d4edda;
		border: 1px solid #c3e6cb;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
	}

	.success-banner p {
		margin: 0;
		color: #155724;
		font-weight: 500;
	}

	.patient-context {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.patient-context p {
		margin: 0.25rem 0;
		color: #555;
	}

	.patient-context strong {
		color: #333;
	}
</style>
<script lang="ts">
	import type { Bed, Patient } from '$lib/api/client';
	import { getBedPatient } from '$lib/api/client';
	import DischargeButton from './DischargeButton.svelte';

	let { bed, onclick, onDischarged }: { bed: Bed; onclick?: () => void; onDischarged?: () => void } = $props();

	let patient = $state<Patient | null>(null);
	let loading = $state(false);
	let showPatient = $state(false);

	const isOccupied = $derived(bed.current_admission_id !== null);
	const statusColor = $derived(isOccupied ? '#e74c3c' : '#2ecc71');
	const statusText = $derived(isOccupied ? 'Ocupada' : 'Disponible');

	async function loadPatient() {
		if (!isOccupied || patient) return;
		loading = true;
		try {
			patient = await getBedPatient(bed.id);
		} catch (e) {
			console.error('Error loading patient:', e);
		} finally {
			loading = false;
		}
	}

	function handleClick() {
		if (isOccupied) {
			showPatient = !showPatient;
			if (showPatient && !patient) {
				loadPatient();
			}
		} else {
			onclick?.();
		}
	}

	function handleDischarged() {
		onDischarged?.();
	}
</script>

<button
	class="bed-card"
	style="border-color: {statusColor}"
	onclick={handleClick}
>
	<div class="bed-header">
		<span class="bed-number">{bed.bed_type?.prefix}{bed.number}</span>
		<span class="bed-status" style="background: {statusColor}">
			{statusText}
		</span>
	</div>

	{#if showPatient && isOccupied}
		<div class="patient-info">
			{#if loading}
				<p>Cargando paciente...</p>
			{:else if patient}
				<p><strong>Paciente:</strong> {patient.full_name}</p>
				<p><strong>DNI:</strong> {patient.identity_number}</p>
				{#if bed.current_admission_id}
					<DischargeButton admissionId={bed.current_admission_id} onDischarged={handleDischarged} />
				{/if}
			{:else}
				<p>Error al cargar paciente</p>
			{/if}
		</div>
	{/if}
</button>

<style>
	.bed-card {
		background: white;
		border: 3px solid;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
		text-align: left;
		width: 100%;
		font-size: 1rem;
	}

	.bed-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.bed-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.bed-number {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.bed-status {
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.patient-info {
		margin-top: 0.75rem;
		padding-top: 0.75rem;
		border-top: 1px solid #eee;
	}

	.patient-info p {
		margin: 0.25rem 0;
	}
</style>
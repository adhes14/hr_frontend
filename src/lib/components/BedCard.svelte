<script lang="ts">
	import type { Bed, Patient, Admission, ClinicalLog } from '$lib/api/client';
	import { getBedPatient, getAdmission, listClinicalLogs } from '$lib/api/client';
	import DischargeButton from './DischargeButton.svelte';
	import ControlStatusBadge from './ControlStatusBadge.svelte';
	import { goto } from '$app/navigation';

	let { bed, onclick, onDischarged }: { bed: Bed; onclick?: () => void; onDischarged?: () => void } = $props();

	let patient = $state<Patient | null>(null);
	let admission = $state<Admission | null>(null);
	let clinicalLogs = $state<ClinicalLog[]>([]);
	let loading = $state(false);
	let showPatient = $state(false);

	const isOccupied = $derived(bed.current_admission_id !== null);
	const statusColor = $derived(isOccupied ? '#e74c3c' : '#2ecc71');
	const statusText = $derived(isOccupied ? 'Ocupada' : 'Disponible');
	const hasActiveMonitoring = $derived(admission !== null && (admission.next_control_at !== null || clinicalLogs.length > 0));

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

	async function loadAdmissionData() {
		if (!bed.current_admission_id || admission) return;
		try {
			const [admissionData, logsData] = await Promise.all([
				getAdmission(bed.current_admission_id),
				listClinicalLogs(bed.current_admission_id)
			]);
			admission = admissionData;
			clinicalLogs = logsData;
		} catch (e) {
			console.error('Error loading admission data:', e);
		}
	}

	function handleClick() {
		if (isOccupied) {
			showPatient = !showPatient;
			if (showPatient && !patient) {
				loadPatient();
				loadAdmissionData();
			}
		} else {
			onclick?.();
		}
	}

	function handleDischarged() {
		onDischarged?.();
	}

	function navigateToAdmission() {
		if (bed.current_admission_id) {
			goto(`/admissions/${bed.current_admission_id}`);
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="bed-card"
	style="border-color: {statusColor}"
	onclick={handleClick}
	role="button"
	tabindex="0"
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
<div class="actions-section">
				<button type="button" class="btn-details" onclick={navigateToAdmission}>
					Ver Detalles
				</button>
			</div>
			{#if hasActiveMonitoring && admission}
				<div class="monitoring-section">
					<ControlStatusBadge
						nextControlAt={admission.next_control_at}
						controlCount={clinicalLogs.length}
					/>
				</div>
			{/if}
			{#if bed.current_admission_id}
				<DischargeButton admissionId={bed.current_admission_id} onDischarged={handleDischarged} />
			{/if}
			{:else}
				<p>Error al cargar paciente</p>
			{/if}
		</div>
	{/if}
</div>

<style>
	.bed-card {
		background: white;
		border: 3px solid;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
		text-align: left;
		box-sizing: border-box;
		max-width: 100%;
		overflow: hidden;
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

	.monitoring-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0.75rem 0;
		padding: 0.75rem 0;
		border-top: 1px solid #eee;
		border-bottom: 1px solid #eee;
	}

	.btn-details {
		background: #3498db;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-details:hover {
		background: #2980b9;
	}
</style>
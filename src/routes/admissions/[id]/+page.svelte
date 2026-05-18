<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getAdmission, getBedPatient, getBed, listClinicalLogs } from '$lib/api/client';
	import type { Admission, Patient, Bed, ClinicalLog } from '$lib/api/client';
	import EventTypeSelector from '$lib/components/EventTypeSelector.svelte';
	import ControlStatusBadge from '$lib/components/ControlStatusBadge.svelte';
	import DischargeButton from '$lib/components/DischargeButton.svelte';

	const admissionId = $derived($page.params.id);

	let admission = $state<Admission | null>(null);
	let patient = $state<Patient | null>(null);
	let bed = $state<Bed | null>(null);
	let clinicalLogs = $state<ClinicalLog[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		loadData();
	});

	async function loadData() {
		if (!admissionId) return;

		loading = true;
		error = null;

		try {
			const [admissionData, logsData] = await Promise.all([
				getAdmission(admissionId),
				listClinicalLogs(admissionId)
			]);

			admission = admissionData;
			clinicalLogs = logsData;

			if (admission?.bed_id) {
				try {
					const [patientData, bedData] = await Promise.all([
						getBedPatient(admission.bed_id),
						getBed(admission.bed_id)
					]);
					patient = patientData;
					bed = bedData;
				} catch (e) {
					console.error('Error loading patient/bed:', e);
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	function handleEventRegistered(updatedAdmission: Admission) {
		admission = updatedAdmission;
	}

	function handleDischarged() {
		goto('/');
	}

	function navigateToClinicalLog() {
		goto(`/clinical-log/${admissionId}`);
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		return date.toLocaleString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatVital(vital: number, unit: string): string {
		return `${vital} ${unit}`;
	}
</script>

<svelte:head>
	<title>Admisión - Hospital</title>
</svelte:head>

<div class="admission-detail">
	<div class="header">
		<button type="button" class="back-btn" onclick={() => goto('/')}>
			← Dashboard
		</button>
		{#if patient}
			<h1>Cama {patient ? ` - ${patient.full_name}` : ''}</h1>
		{:else}
			<h1>Admisión</h1>
		{/if}
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
			<button onclick={loadData}>Reintentar</button>
		</div>
	{:else if loading}
		<div class="loading">Cargando datos...</div>
	{:else if admission}
		<div class="content">
			<!-- Patient Info -->
			{#if patient}
				<section class="section patient-section">
					<h2>Datos del Paciente</h2>
					<div class="patient-details">
						<p><strong>Nombre:</strong> {patient.full_name}</p>
						<p><strong>DNI:</strong> {patient.identity_number}</p>
						<p><strong>Fecha de Nac.:</strong> {patient.birth_date}</p>
					</div>
				</section>
			{/if}

		<!-- Event Section - only for beds that require postpartum follow-up -->
		{#if bed?.bed_type?.requires_postpartum_followup}
			<section class="section">
				<EventTypeSelector
					admissionId={admission!.id}
					eventType={admission!.event_type}
					eventAt={admission!.event_at}
					estimatedDischargeAt={admission!.estimated_discharge_at}
					onregistered={handleEventRegistered}
				/>
			</section>
		{/if}

		<!-- Control Status -->
		{#if admission.status === 'active' && bed?.bed_type?.requires_postpartum_followup}
			<section class="section control-section">
				<h2>Estado de Vigilancia</h2>
				<div class="control-info">
					{#if admission.next_control_at || clinicalLogs.length > 0}
						<ControlStatusBadge
							nextControlAt={admission.next_control_at}
							controlCount={clinicalLogs.length}
							requiresPostpartumFollowup={bed?.bed_type?.requires_postpartum_followup ?? false}
						/>
					{/if}
					<button type="button" class="btn-control" onclick={navigateToClinicalLog}>
						Registrar Control
					</button>
				</div>
			</section>
		{/if}

			<!-- Clinical Logs History -->
			<section class="section">
				<h2>Historial de Controles</h2>
				{#if clinicalLogs.length === 0}
					<p class="no-logs">No hay controles registrados</p>
				{:else}
					<div class="logs-list">
						{#each clinicalLogs as log (log.id)}
							<div class="log-entry">
								<div class="log-header">
									<span class="log-time">{formatDateTime(log.created_at)}</span>
								</div>
								<div class="log-vitals">
									<span title="PA Sistólica">{formatVital(log.pa_systolic, 'mmHg')}</span>
									<span title="PA Diastólica">{formatVital(log.pa_diastolic, 'mmHg')}</span>
									<span title="Frecuencia Cardíaca">FC: {formatVital(log.heart_rate, 'bpm')}</span>
									<span title="Frecuencia Respiratoria">FR: {formatVital(log.resp_rate, 'rpm')}</span>
									<span title="Temperatura">Temp: {log.temperature}°C</span>
									<span title="SpO2">SpO2: {formatVital(log.spo2, '%')}</span>
								</div>
								<div class="log-obstetric">
									{#if log.pinard_status}
										<span class="badge ok">Pinard OK</span>
									{:else}
										<span class="badge warning">Pinard No Satisfactorio</span>
									{/if}
									<span>Loquios: {['-', 'Hemático', 'Serosa', 'Alba'][log.lochia_type]}</span>
									<span>Cantidad: {['-', 'Escaso', 'Moderado', 'Abundante'][log.lochia_amount]}</span>
									{#if !log.lochia_odor}
										<span class="badge warning">Loquios Fétidos</span>
									{/if}
									{#if log.has_clots}
										<span class="badge warning">Coágulos</span>
									{/if}
								</div>
								{#if log.notes}
									<p class="log-notes">{log.notes}</p>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</section>

			<!-- Discharge Section -->
			{#if admission.status === 'active'}
				<section class="section discharge-section">
					<DischargeButton admissionId={admission!.id} onDischarged={handleDischarged} />
				</section>
			{/if}
		</div>
	{/if}
</div>

<style>
	.admission-detail {
		max-width: 800px;
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

	.content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.section h2 {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.patient-section .patient-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.patient-details p {
		margin: 0;
		color: #555;
	}

	.patient-details strong {
		color: #333;
	}

	.control-section .control-info {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		align-items: flex-start;
	}

	.btn-control {
		width: 100%;
		min-height: 48px;
		background: #3498db;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-control:hover {
		background: #2980b9;
	}

	.no-logs {
		color: #888;
		font-style: italic;
		text-align: center;
		padding: 1rem;
	}

	.logs-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.log-entry {
		border: 1px solid #eee;
		border-radius: 8px;
		padding: 0.75rem;
		background: #fafafa;
	}

	.log-header {
		margin-bottom: 0.5rem;
	}

	.log-time {
		font-size: 0.75rem;
		color: #666;
	}

	.log-vitals {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}

	.log-vitals span {
		background: #e8f4f8;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		color: #2980b9;
	}

	.log-obstetric {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.log-obstetric span {
		font-size: 0.75rem;
		color: #555;
	}

	.badge {
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-weight: 500;
	}

	.badge.ok {
		background: #d4edda;
		color: #155724;
	}

	.badge.warning {
		background: #fff3cd;
		color: #856404;
	}

	.log-notes {
		margin: 0.5rem 0 0 0;
		font-size: 0.875rem;
		color: #555;
		font-style: italic;
	}

	.discharge-section {
		background: #fafafa;
	}
</style>
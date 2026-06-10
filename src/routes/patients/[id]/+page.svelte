<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getPatient, getPatientAdmissions, listClinicalLogs, getBeds, listOrdersByAdmission } from '$lib/api/client';
	import type { Patient, Admission, ClinicalLog, Bed, AuxiliaryOrder } from '$lib/api/client';

	const patientId = $derived($page.params.id);

	let patient = $state<Patient | null>(null);
	let admissions = $state<Admission[]>([]);
	let bedsMap = $state<Record<number, string>>({});
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Expandable logs state
	// Keys are admission IDs. Values are the logs details.
	let expandedLogs = $state<Record<string, {
		logs: ClinicalLog[];
		loading: boolean;
		loaded: boolean;
		error: string | null;
		expanded: boolean;
	}>>({});

	let expandedOrders = $state<Record<string, {
		orders: AuxiliaryOrder[];
		loading: boolean;
		loaded: boolean;
		error: string | null;
		expanded: boolean;
	}>>({});

	// Load patient, admissions, and beds mapping
	async function loadData() {
		if (!patientId) return;
		loading = true;
		error = null;

		try {
			const [patientData, admissionsData, bedsData] = await Promise.all([
				getPatient(patientId),
				getPatientAdmissions(patientId),
				getBeds().catch(() => [] as Bed[]) // gracefully handle beds loading error
			]);

			patient = patientData;
			admissions = admissionsData;

			// Build bed mapping
			const mapping: Record<number, string> = {};
			for (const b of bedsData) {
				const prefix = b.bed_type?.prefix || '';
				mapping[b.id] = `${prefix}${b.number}`;
			}
			bedsMap = mapping;

			// Initialize expandedLogs and expandedOrders state for each admission
			const logsState: typeof expandedLogs = {};
			const ordersState: typeof expandedOrders = {};
			for (const adm of admissionsData) {
				logsState[adm.id] = {
					logs: [],
					loading: false,
					loaded: false,
					error: null,
					expanded: false
				};
				ordersState[adm.id] = {
					orders: [],
					loading: false,
					loaded: false,
					error: null,
					expanded: false
				};
			}
			expandedLogs = logsState;
			expandedOrders = ordersState;

		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos del paciente';
		} finally {
			loading = false;
		}
	}

	async function toggleLogs(admissionId: string) {
		const state = expandedLogs[admissionId];
		if (!state) return;

		// Toggle expanded status
		state.expanded = !state.expanded;

		// Load logs if expanding and not loaded yet
		if (state.expanded && !state.loaded && !state.loading) {
			state.loading = true;
			state.error = null;
			try {
				const logs = await listClinicalLogs(admissionId);
				state.logs = logs;
				state.loaded = true;
			} catch (e) {
				state.error = e instanceof Error ? e.message : 'Error al cargar observaciones';
			} finally {
				state.loading = false;
			}
		}
	}

	async function toggleOrders(admissionId: string) {
		const state = expandedOrders[admissionId];
		if (!state) return;

		// Toggle expanded status
		state.expanded = !state.expanded;

		// Load orders if expanding and not loaded yet
		if (state.expanded && !state.loaded && !state.loading) {
			state.loading = true;
			state.error = null;
			try {
				const orders = await listOrdersByAdmission(admissionId);
				state.orders = orders;
				state.loaded = true;
			} catch (e) {
				state.error = e instanceof Error ? e.message : 'Error al cargar órdenes';
			} finally {
				state.loading = false;
			}
		}
	}

	function calculateAge(birthDateStr?: string): number {
		if (!birthDateStr) return 0;
		const birth = new Date(birthDateStr);
		const today = new Date();
		let age = today.getFullYear() - birth.getFullYear();
		const m = today.getMonth() - birth.getMonth();
		if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
			age--;
		}
		return age;
	}

	function calculateDuration(admission: Admission): string {
		const start = new Date(admission.created_at);
		const end = admission.discharged_at ? new Date(admission.discharged_at) : new Date();
		const diffMs = end.getTime() - start.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

		if (diffDays === 0) {
			if (diffHours === 0) return 'Menos de una hora';
			return `${diffHours} hs`;
		}
		return `${diffDays} día${diffDays > 1 ? 's' : ''} y ${diffHours} hs`;
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

	$effect(() => {
		loadData();
	});
</script>

<svelte:head>
	<title>{patient ? `${patient.full_name} - Historial` : 'Cargando Historial...'}</title>
</svelte:head>

<div class="patient-history-page">
	<!-- Top Bar -->
	<div class="top-navigation">
		<button type="button" class="back-btn" onclick={() => goto('/patients')}>
			← Volver a Pacientes
		</button>
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
			<button class="retry-btn" onclick={loadData}>Reintentar</button>
		</div>
	{:else if loading}
		<div class="loading-spinner">
			<div class="spinner"></div>
			<p>Cargando perfil e historial del paciente...</p>
		</div>
	{:else if patient}
		<div class="grid-container">
			<!-- Left side: Patient Profile Card -->
			<aside class="profile-card">
				<div class="profile-header">
					<div class="avatar-placeholder">
						{patient.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
					</div>
					<h2>{patient.full_name}</h2>
					{#if patient.is_admitted}
						<span class="status-badge active-admitted">🔴 Internada actualmente</span>
					{:else}
						<span class="status-badge inactive-admitted">⚪ Sin internación activa</span>
					{/if}
				</div>

				<div class="profile-info-section">
					<h3>Datos Personales</h3>
					<div class="info-group">
						<span class="info-label">DNI / Documento:</span>
						<span class="info-value">{patient.identity_number}</span>
					</div>
					<div class="info-group">
						<span class="info-label">Fecha Nacimiento:</span>
						<span class="info-value">{patient.birth_date.split('T')[0]}</span>
					</div>
					<div class="info-group">
						<span class="info-label">Edad:</span>
						<span class="info-value">{calculateAge(patient.birth_date)} años</span>
					</div>
				</div>

				<div class="profile-info-section">
					<h3>Antecedentes Obstétricos</h3>
					<div class="obstetric-summary-grid">
						<div class="obstetric-item">
							<span class="obs-count">{patient.obstetric_history?.gestas ?? 0}</span>
							<span class="obs-label">Gestas</span>
						</div>
						<div class="obstetric-item">
							<span class="obs-count">{patient.obstetric_history?.partos ?? 0}</span>
							<span class="obs-label">Partos</span>
						</div>
						<div class="obstetric-item">
							<span class="obs-count">{patient.obstetric_history?.cesareas ?? 0}</span>
							<span class="obs-label">Cesáreas</span>
						</div>
						<div class="obstetric-item">
							<span class="obs-count">{patient.obstetric_history?.abortos ?? 0}</span>
							<span class="obs-label">Abortos</span>
						</div>
					</div>
				</div>
				
				{#if !patient.is_admitted}
					<a href="/admissions/new?patient_id={patient.id}" class="action-btn-primary">
						Registrar Internación
					</a>
				{/if}
			</aside>

			<!-- Right side: Hospitalization History -->
			<main class="history-content">
				<div class="section-title-wrapper">
					<h2>Historial Clínico de Internaciones</h2>
					<span class="count-badge">{admissions.length} internación{admissions.length !== 1 ? 'es' : ''}</span>
				</div>

				{#if admissions.length === 0}
					<div class="empty-state">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
							<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
							<polyline points="14 2 14 8 20 8"/>
							<line x1="16" y1="13" x2="8" y2="13"/>
							<line x1="16" y1="17" x2="8" y2="17"/>
							<line x1="10" y1="9" x2="8" y2="9"/>
						</svg>
						<p>No se encontraron registros de internaciones previas para esta paciente.</p>
					</div>
				{:else}
					<div class="admissions-timeline">
						{#each admissions as adm (adm.id)}
							{@const state = expandedLogs[adm.id]}
							<article class="admission-card {adm.status === 'active' ? 'active-card' : ''}">
								<div class="card-header">
									<div class="card-header-main">
										{#if adm.status === 'active'}
											<span class="badge active-badge">🟢 Activa</span>
										{:else}
											<span class="badge discharged-badge">⚪ Alta Médica</span>
										{/if}
										<h3>
											Cama: {bedsMap[adm.bed_id] || `ID ${adm.bed_id}`}
										</h3>
									</div>
									<div class="duration-tag">
										⏱️ {calculateDuration(adm)}
									</div>
								</div>

								<div class="card-body">
									<div class="info-grid">
										<div class="info-field">
											<span class="field-label">Fecha de Ingreso</span>
											<span class="field-value">{formatDateTime(adm.created_at)}</span>
										</div>
										<div class="info-field">
											<span class="field-label">Fecha de Alta</span>
											<span class="field-value">
												{#if adm.status === 'active'}
													<span class="text-blue">En curso</span>
												{:else}
													{formatDateTime(adm.discharged_at)}
												{/if}
											</span>
										</div>
										<div class="info-field">
											<span class="field-label">Evento Obstétrico</span>
											<span class="field-value capitalize">{adm.event_type || 'Ninguno'}</span>
										</div>
										<div class="info-field">
											<span class="field-label">Fecha de Evento</span>
											<span class="field-value">{adm.event_at ? formatDateTime(adm.event_at) : '-'}</span>
										</div>
									</div>

									<div class="diagnosis-block">
										<div class="diag-group">
											<span class="field-label">Diagnóstico de Ingreso</span>
											<p class="diag-text">{adm.admission_diagnosis || 'Sin especificar'}</p>
										</div>
										<div class="diag-group">
											<span class="field-label">Diagnóstico Actual / Final</span>
											<p class="diag-text font-semibold">{adm.current_diagnosis || 'Sin especificar'}</p>
											{#if adm.current_diagnosis_updated_by_name}
												<span class="modifier-text">Actualizado por: {adm.current_diagnosis_updated_by_name}</span>
											{/if}
										</div>
									</div>

									<!-- Action row inside card -->
									<div class="card-actions-row">
										{#if adm.status === 'active'}
											<a href="/admissions/{adm.id}" class="navigate-link">
												Ir a la Internación Activa →
											</a>
										{/if}
										
										<div class="action-buttons-group">
											<button 
												type="button" 
												class="expand-logs-btn {state?.expanded ? 'active-expanded' : ''}" 
												onclick={() => toggleLogs(adm.id)}
											>
												{state?.expanded ? '📖 Ocultar controles clínicos' : '📘 Ver controles clínicos'}
											</button>

											<button 
												type="button" 
												class="expand-logs-btn {expandedOrders[adm.id]?.expanded ? 'active-expanded' : ''}" 
												onclick={() => toggleOrders(adm.id)}
											>
												{expandedOrders[adm.id]?.expanded ? '📋 Ocultar órdenes auxiliares' : '📋 Ver órdenes auxiliares'}
											</button>
										</div>
									</div>

									<!-- Expandable clinical logs section -->
									{#if state?.expanded}
										<div class="expanded-clinical-logs">
											{#if state.loading}
												<div class="small-loading">
													<div class="spinner-small"></div>
													<span>Cargando controles clínicos...</span>
												</div>
											{:else if state.error}
												<div class="small-error">
													⚠️ {state.error}
												</div>
											{:else if state.logs.length === 0}
												<div class="no-logs-fallback">
													No se registraron controles clínicos durante esta internación.
												</div>
											{:else}
												<div class="logs-table-wrapper">
													<table class="clinical-logs-table">
														<thead>
															<tr>
																<th>Fecha / Hora</th>
																<th>Tensión Art.</th>
																<th>FC</th>
																<th>FR</th>
																<th>Tº</th>
																<th>SpO2</th>
																<th>Pinard</th>
																<th>Loquios</th>
																<th>Notas</th>
																<th>Registró</th>
															</tr>
														</thead>
														<tbody>
															{#each state.logs as log (log.id)}
																<tr>
																	<td class="time-col">{formatDateTime(log.created_at)}</td>
																	<td class="nowrap">{log.pa_systolic}/{log.pa_diastolic} <span class="unit">mmHg</span></td>
																	<td>{log.heart_rate} <span class="unit">bpm</span></td>
																	<td>{log.resp_rate} <span class="unit">rpm</span></td>
																	<td>{log.temperature}°C</td>
																	<td>{log.spo2}%</td>
																	<td>
																		{#if log.pinard_status}
																			<span class="status-dot ok" title="Pinard OK"></span> OK
																		{:else}
																			<span class="status-dot warn" title="Pinard No Satisfactorio"></span> No Sat.
																		{/if}
																	</td>
																	<td>
																		<div class="lochia-details">
																			<span>{['-', 'Hemático', 'Serosa', 'Alba'][log.lochia_type] || '-'}</span>
																			<span class="lochia-meta">
																				({['-', 'Escaso', 'Moderado', 'Abundante'][log.lochia_amount] || '-'})
																				{#if !log.lochia_odor}<span class="warning-text" title="Loquios Fétidos"> Fétido</span>{/if}
																				{#if log.has_clots}<span class="warning-text" title="Tiene coágulos"> Coág.</span>{/if}
																			</span>
																		</div>
																	</td>
																	<td class="notes-cell" title={log.notes}>{log.notes || '-'}</td>
																	<td class="author-col">{log.created_by_name || '-'}</td>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											{/if}
										</div>
									{/if}

									<!-- Expandable auxiliary orders section -->
									{#if expandedOrders[adm.id]?.expanded}
										{@const oState = expandedOrders[adm.id]}
										<div class="expanded-clinical-logs">
											{#if oState.loading}
												<div class="small-loading">
													<div class="spinner-small"></div>
													<span>Cargando órdenes auxiliares...</span>
												</div>
											{:else if oState.error}
												<div class="small-error">
													⚠️ {oState.error}
												</div>
											{:else if oState.orders.length === 0}
												<div class="no-logs-fallback">
													No se registraron órdenes auxiliares durante esta internación.
												</div>
											{:else}
												<div class="logs-table-wrapper">
													<table class="clinical-logs-table">
														<thead>
															<tr>
																<th>Fecha / Hora</th>
																<th>Categoría</th>
																<th>Descripción</th>
																<th>Estado</th>
																<th>Resultado</th>
																<th>Solicitó</th>
															</tr>
														</thead>
														<tbody>
															{#each oState.orders as order (order.id)}
																<tr>
																	<td class="time-col">{formatDateTime(order.created_at)}</td>
																	<td><span class="badge badge-{order.category}">{order.category}</span></td>
																	<td>{order.description}</td>
																	<td>
																		<span class="status-indicator status-{order.status}">
																			{order.status === 'pending' ? 'Pendiente' : order.status === 'done' ? 'Realizado' : 'Reportado'}
																		</span>
																	</td>
																	<td class="notes-cell" title={order.result}>{order.result || '-'}</td>
																	<td class="author-col">{order.created_by_name || '-'}</td>
																</tr>
															{/each}
														</tbody>
													</table>
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</main>
		</div>
	{/if}
</div>

<style>
	.patient-history-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		font-family: inherit;
	}

	.top-navigation {
		margin-bottom: 1.5rem;
	}

	.back-btn {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.6rem 1.2rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.9rem;
		font-weight: 500;
		transition: background 0.2s;
	}

	.back-btn:hover {
		background: #16213e;
	}

	.grid-container {
		display: grid;
		grid-template-columns: 320px 1fr;
		gap: 2rem;
		align-items: start;
	}

	@media (max-width: 900px) {
		.grid-container {
			grid-template-columns: 1fr;
		}
	}

	/* Profile Card Styling */
	.profile-card {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		border: 1px solid #eef2f6;
	}

	.profile-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		border-bottom: 1px solid #f1f5f9;
		padding-bottom: 1.25rem;
	}

	.avatar-placeholder {
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: #3b82f6;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.5rem;
		font-weight: 700;
		margin-bottom: 0.75rem;
		box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);
	}

	.profile-header h2 {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		color: #1e293b;
		font-weight: 600;
	}

	.status-badge {
		font-size: 0.75rem;
		padding: 0.25rem 0.75rem;
		border-radius: 9999px;
		font-weight: 600;
	}

	.status-badge.active-admitted {
		background: #fee2e2;
		color: #ef4444;
	}

	.status-badge.inactive-admitted {
		background: #f1f5f9;
		color: #64748b;
	}

	.profile-info-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.profile-info-section h3 {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
		color: #64748b;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		font-weight: 700;
	}

	.info-group {
		display: flex;
		justify-content: space-between;
		font-size: 0.95rem;
		border-bottom: 1px dashed #f1f5f9;
		padding-bottom: 0.4rem;
	}

	.info-label {
		color: #64748b;
	}

	.info-value {
		font-weight: 500;
		color: #1e293b;
	}

	.obstetric-summary-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		background: #f8fafc;
		border-radius: 8px;
		padding: 0.75rem;
		text-align: center;
		border: 1px solid #e2e8f0;
	}

	.obstetric-item {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.obs-count {
		font-size: 1.15rem;
		font-weight: 700;
		color: #1e293b;
	}

	.obs-label {
		font-size: 0.7rem;
		color: #64748b;
		margin-top: 0.15rem;
	}

	.action-btn-primary {
		background: #10b981;
		color: white;
		text-align: center;
		padding: 0.75rem;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.95rem;
		transition: background 0.2s;
		box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);
	}

	.action-btn-primary:hover {
		background: #059669;
	}

	/* History Timeline Styling */
	.history-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-title-wrapper {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.section-title-wrapper h2 {
		margin: 0;
		font-size: 1.35rem;
		color: #1e293b;
		font-weight: 600;
	}

	.count-badge {
		background: #e2e8f0;
		color: #475569;
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.2rem 0.6rem;
		border-radius: 9999px;
	}

	.admissions-timeline {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.admission-card {
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
		border: 1px solid #e2e8f0;
		overflow: hidden;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.admission-card:hover {
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
	}

	.admission-card.active-card {
		border-left: 5px solid #3b82f6;
		background: #f8fafc;
	}

	.card-header {
		background: #f8fafc;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #e2e8f0;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.active-card .card-header {
		background: #eff6ff;
		border-bottom-color: #dbeafe;
	}

	.card-header-main {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.card-header-main h3 {
		margin: 0;
		font-size: 1.1rem;
		color: #1e293b;
		font-weight: 600;
	}

	.badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
	}

	.badge.active-badge {
		background: #dbeafe;
		color: #2563eb;
	}

	.badge.discharged-badge {
		background: #e2e8f0;
		color: #475569;
	}

	.duration-tag {
		font-size: 0.8rem;
		color: #64748b;
		background: white;
		padding: 0.2rem 0.5rem;
		border-radius: 6px;
		border: 1px solid #e2e8f0;
		font-weight: 500;
	}

	.card-body {
		padding: 1.25rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		margin-bottom: 1.25rem;
	}

	.info-field {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.field-label {
		font-size: 0.75rem;
		color: #64748b;
		text-transform: uppercase;
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.field-value {
		font-size: 0.95rem;
		color: #1e293b;
		font-weight: 500;
	}

	.text-blue {
		color: #2563eb;
		font-weight: 600;
	}

	.capitalize {
		text-transform: capitalize;
	}

	.diagnosis-block {
		background: #f8fafc;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border: 1px solid #f1f5f9;
		margin-bottom: 1.25rem;
	}

	.diag-group {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	.diag-text {
		margin: 0;
		font-size: 0.95rem;
		color: #334155;
		white-space: pre-wrap;
	}

	.font-semibold {
		font-weight: 600;
		color: #0f172a;
	}

	.modifier-text {
		font-size: 0.75rem;
		color: #64748b;
		font-style: italic;
		margin-top: 0.2rem;
	}

	.card-actions-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem;
		border-top: 1px solid #f1f5f9;
		padding-top: 1rem;
	}

	.navigate-link {
		color: #2563eb;
		text-decoration: none;
		font-weight: 600;
		font-size: 0.9rem;
	}

	.navigate-link:hover {
		text-decoration: underline;
	}

	.expand-logs-btn {
		background: #f1f5f9;
		color: #475569;
		border: 1px solid #cbd5e1;
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.85rem;
		font-weight: 500;
		transition: all 0.2s;
		margin-left: auto;
	}

	.expand-logs-btn:hover {
		background: #e2e8f0;
		color: #1e293b;
	}

	.expand-logs-btn.active-expanded {
		background: #cbd5e1;
		color: #0f172a;
	}

	/* Expanded Clinical Logs Section */
	.expanded-clinical-logs {
		margin-top: 1rem;
		border-top: 2px dashed #e2e8f0;
		padding-top: 1rem;
		animation: slideDown 0.25s ease-out;
	}

	@keyframes slideDown {
		from { opacity: 0; transform: translateY(-10px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.small-loading {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: #64748b;
		padding: 1rem;
		font-size: 0.85rem;
	}

	.spinner-small {
		width: 16px;
		height: 16px;
		border: 2px solid #e2e8f0;
		border-top: 2px solid #3b82f6;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	.small-error {
		color: #ef4444;
		padding: 0.75rem;
		background: #fee2e2;
		border-radius: 6px;
		font-size: 0.85rem;
	}

	.no-logs-fallback {
		color: #64748b;
		font-style: italic;
		padding: 1rem;
		text-align: center;
		font-size: 0.85rem;
		background: #f8fafc;
		border-radius: 6px;
	}

	.logs-table-wrapper {
		overflow-x: auto;
		background: white;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
	}

	.clinical-logs-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.8rem;
		text-align: left;
	}

	.clinical-logs-table th {
		background: #f1f5f9;
		color: #475569;
		font-weight: 600;
		padding: 0.5rem;
		border-bottom: 2px solid #cbd5e1;
	}

	.clinical-logs-table td {
		padding: 0.5rem;
		border-bottom: 1px solid #e2e8f0;
		color: #334155;
		vertical-align: top;
	}

	.clinical-logs-table tr:hover {
		background: #f8fafc;
	}

	.nowrap {
		white-space: nowrap;
	}

	.unit {
		font-size: 0.7rem;
		color: #64748b;
	}

	.status-dot {
		display: inline-block;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		margin-right: 0.15rem;
	}

	.status-dot.ok {
		background: #10b981;
	}

	.status-dot.warn {
		background: #f59e0b;
	}

	.lochia-details {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.lochia-meta {
		font-size: 0.7rem;
		color: #64748b;
	}

	.warning-text {
		color: #ef4444;
		font-weight: 500;
	}

	.notes-cell {
		max-width: 180px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.notes-cell:hover {
		white-space: normal;
		overflow: visible;
		word-break: break-word;
	}

	.time-col {
		font-weight: 500;
		color: #475569;
		white-space: nowrap;
	}

	.author-col {
		white-space: nowrap;
		font-style: italic;
		color: #64748b;
	}

	/* Loader and Error spinners */
	.loading-spinner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem;
		color: #64748b;
	}

	.spinner {
		width: 40px;
		height: 40px;
		border: 4px solid #f3f3f3;
		border-top: 4px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-banner {
		background: #fee2e2;
		border: 1px solid #fecaca;
		padding: 1.5rem;
		border-radius: 8px;
		text-align: center;
		margin-top: 2rem;
	}

	.error-banner p {
		color: #dc2626;
		margin: 0 0 1rem 0;
		font-weight: 500;
	}

	.retry-btn {
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 4rem 2rem;
		background: white;
		border-radius: 12px;
		border: 1px dashed #cbd5e1;
		color: #64748b;
		text-align: center;
	}

	.action-buttons-group {
		display: flex;
		gap: 0.5rem;
		margin-left: auto;
		flex-wrap: wrap;
	}

	.badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
	}

	.badge-laboratorio { background: #e0f2fe; color: #0284c7; }
	.badge-imagen { background: #fef08a; color: #a16207; }
	.badge-procedimiento { background: #fce7f3; color: #be185d; }

	.status-indicator {
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.status-indicator.status-pending { background: #fee2e2; color: #991b1b; }
	.status-indicator.status-done { background: #dcfce7; color: #166534; }
	.status-indicator.status-reported { background: #dbeafe; color: #1e40af; }
</style>

<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getAdmission, getBedPatient, getBed, listClinicalLogs, listOrdersByAdmission, createOrder, updateOrderStatus, deleteOrder } from '$lib/api/client';
	import type { Admission, Patient, Bed, ClinicalLog, AuxiliaryOrder } from '$lib/api/client';
	import EventTypeSelector from '$lib/components/EventTypeSelector.svelte';
	import ControlStatusBadge from '$lib/components/ControlStatusBadge.svelte';
	import DischargeButton from '$lib/components/DischargeButton.svelte';

	const admissionId = $derived($page.params.id);

	let admission = $state<Admission | null>(null);
	let patient = $state<Patient | null>(null);
	let bed = $state<Bed | null>(null);
	let clinicalLogs = $state<ClinicalLog[]>([]);
	let orders = $state<AuxiliaryOrder[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Order Form State
	let showOrderForm = $state(false);
	let newOrderCategory = $state<'laboratorio' | 'imagen' | 'procedimiento'>('laboratorio');
	let newOrderDescription = $state('');
	let submittingOrder = $state(false);

	import { currentUser } from '$lib/auth';
	import { ordersUpdateTrigger } from '$lib/sse';

	$effect(() => {
		if ($ordersUpdateTrigger > 0) {
			loadOrders();
		}
	});

	$effect(() => {
		loadData();
	});

	async function loadData() {
		if (!admissionId) return;

		loading = true;
		error = null;

		try {
			const [admissionData, logsData, ordersData] = await Promise.all([
				getAdmission(admissionId),
				listClinicalLogs(admissionId),
				listOrdersByAdmission(admissionId)
			]);

			admission = admissionData;
			clinicalLogs = logsData;
			orders = ordersData;

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

	async function loadOrders() {
		if (!admissionId) return;
		try {
			orders = await listOrdersByAdmission(admissionId);
		} catch (e) {
			console.error('Failed to reload orders:', e);
		}
	}

	async function handleCreateOrder(e: Event) {
		e.preventDefault();
		if (!newOrderDescription.trim() || !admissionId) return;
		
		submittingOrder = true;
		try {
			await createOrder(admissionId, {
				category: newOrderCategory,
				description: newOrderDescription.trim()
			});
			showOrderForm = false;
			newOrderDescription = '';
			await loadOrders();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al crear orden');
		} finally {
			submittingOrder = false;
		}
	}

	async function handleOrderStatus(orderId: number, status: 'pending' | 'done' | 'reported') {
		try {
			await updateOrderStatus(orderId, { status });
			await loadOrders();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al actualizar estado');
		}
	}

	async function handleDeleteOrder(orderId: number) {
		if (!confirm('¿Seguro que desea eliminar esta orden?')) return;
		try {
			await deleteOrder(orderId);
			await loadOrders();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al eliminar orden');
		}
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
									{#if log.created_by_name}
										<span class="log-author">por {log.created_by_name}</span>
									{/if}
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

			<!-- Auxiliary Orders Section -->
			<section class="section">
				<div class="section-header">
					<h2>Órdenes Auxiliares</h2>
					{#if admission.status === 'active'}
						<button class="btn-add-order" onclick={() => showOrderForm = !showOrderForm}>
							{showOrderForm ? 'Cancelar' : '+ Nueva Orden'}
						</button>
					{/if}
				</div>

				{#if showOrderForm}
					<form class="order-form" onsubmit={handleCreateOrder}>
						<div class="form-group">
							<label for="category">Categoría</label>
							<select id="category" bind:value={newOrderCategory} required>
								<option value="laboratorio">Laboratorio</option>
								<option value="imagen">Imagen</option>
								<option value="procedimiento">Procedimiento</option>
							</select>
						</div>
						<div class="form-group">
							<label for="description">Descripción (max 150)</label>
							<input 
								type="text" 
								id="description" 
								bind:value={newOrderDescription} 
								maxlength="150" 
								required 
								placeholder="Ej: Ecografía abdominal"
							/>
						</div>
						<button type="submit" class="btn-submit" disabled={submittingOrder}>
							{submittingOrder ? 'Guardando...' : 'Crear Orden'}
						</button>
					</form>
				{/if}

				{#if orders.length === 0}
					<p class="no-logs">No hay órdenes registradas</p>
				{:else}
					<div class="logs-list">
						{#each orders as order (order.id)}
							<div class="log-entry order-entry">
								<div class="order-header">
									<div class="order-title">
										<span class="badge badge-{order.category}">{order.category}</span>
										<span class="order-desc">{order.description}</span>
									</div>
									<div class="order-meta">
										<span class="log-time">{formatDateTime(order.created_at)}</span>
										<span class="log-author">por {order.created_by_name}</span>
									</div>
								</div>
								
								<div class="order-footer">
									<div class="status-indicator status-{order.status}">
										{order.status === 'pending' ? 'Pendiente' : order.status === 'done' ? 'Realizado' : 'Reportado'}
									</div>
									
									<div class="order-actions">
										{#if order.status === 'pending'}
											<button class="btn-mini done" onclick={() => handleOrderStatus(order.id, 'done')}>Realizado</button>
										{/if}
										{#if order.status === 'pending' || order.status === 'done'}
											<button class="btn-mini reported" onclick={() => handleOrderStatus(order.id, 'reported')}>Reportado</button>
										{/if}
										{#if order.status !== 'pending'}
											<button class="btn-mini pending" onclick={() => handleOrderStatus(order.id, 'pending')}>Pendiente</button>
										{/if}
										{#if $currentUser?.role === 'admin'}
											<button class="btn-mini delete" onclick={() => handleDeleteOrder(order.id)}>🗑️</button>
										{/if}
									</div>
								</div>
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

	.log-author {
		font-size: 0.75rem;
		color: #888;
		font-style: italic;
		margin-left: 0.5rem;
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

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
	}

	.btn-add-order {
		background: var(--info-bg);
		color: var(--primary);
		border: 1px solid var(--primary);
		padding: 0.25rem 0.75rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
	}

	.order-form {
		background: var(--background);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		border: 1px solid var(--border-color);
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.form-group label {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
	}

	.form-group select, .form-group input {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 4px;
		font-size: 1rem;
	}

	.btn-submit {
		background: var(--primary);
		color: white;
		border: none;
		padding: 0.75rem;
		border-radius: 4px;
		font-weight: 600;
		cursor: pointer;
	}

	.btn-submit:disabled {
		opacity: 0.7;
	}

	.order-entry {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.order-header {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.order-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.badge-laboratorio { background: #e0f2fe; color: #0284c7; }
	.badge-imagen { background: #fef08a; color: #a16207; }
	.badge-procedimiento { background: #fce7f3; color: #be185d; }

	.order-desc {
		font-weight: 500;
	}

	.order-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dashed var(--border-color);
	}

	.status-indicator {
		font-size: 0.75rem;
		font-weight: bold;
		text-transform: uppercase;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.status-pending { background: #fee2e2; color: #991b1b; }
	.status-done { background: #dcfce7; color: #166534; }
	.status-reported { background: #dbeafe; color: #1e40af; }

	.order-actions {
		display: flex;
		gap: 0.25rem;
	}

	.btn-mini {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border-radius: 4px;
		border: none;
		cursor: pointer;
		font-weight: 600;
	}

	.btn-mini.done { background: #dcfce7; color: #166534; }
	.btn-mini.reported { background: #dbeafe; color: #1e40af; }
	.btn-mini.pending { background: #f1f5f9; color: #475569; }
	.btn-mini.delete { background: transparent; border: 1px solid var(--danger); font-size: 1rem; padding: 0.1rem 0.3rem;}

	@media (min-width: 640px) {
		.order-header {
			flex-direction: row;
			justify-content: space-between;
			align-items: flex-start;
		}
	}
</style>
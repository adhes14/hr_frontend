<script lang="ts">
	import { onMount } from 'svelte';
	import { listPendingOrders, updateOrderStatus, deleteOrder, type AuxiliaryOrder } from '$lib/api/client';
	import { ordersUpdateTrigger } from '$lib/sse';
	import { currentUser } from '$lib/auth';

	let orders = $state<AuxiliaryOrder[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	$effect(() => {
		if ($ordersUpdateTrigger > 0) {
			loadData();
		}
	});

	onMount(() => {
		loadData();
	});

	async function loadData() {
		loading = true;
		error = null;
		try {
			orders = await listPendingOrders();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar pendientes';
		} finally {
			loading = false;
		}
	}

	// Report Modal State
	let showReportModal = $state(false);
	let reportOrderId = $state<number | null>(null);
	let reportResultText = $state('');

	function openReportModal(orderId: number) {
		reportOrderId = orderId;
		reportResultText = '';
		showReportModal = true;
	}

	function closeReportModal() {
		showReportModal = false;
		reportOrderId = null;
		reportResultText = '';
	}

	async function submitReportResult() {
		if (reportOrderId === null) return;
		try {
			await updateOrderStatus(reportOrderId, {
				status: 'reported',
				result: reportResultText.trim()
			});
			closeReportModal();
			await loadData();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al registrar el resultado');
		}
	}

	async function handleStatusUpdate(orderId: number, status: 'done') {
		try {
			await updateOrderStatus(orderId, { status });
			await loadData();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al actualizar estado');
		}
	}

	async function handleDelete(orderId: number) {
		if (!confirm('¿Seguro que desea eliminar esta orden?')) return;
		try {
			await deleteOrder(orderId);
			await loadData();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al eliminar orden');
		}
	}

	// Agrupar por cama
	let groupedOrders = $derived(() => {
		const groups: Record<number, { admission_id: string; bed_number: number; bed_prefix: string; patient_name: string; orders: AuxiliaryOrder[] }> = {};
		for (const order of orders) {
			const key = order.bed_number || 0;
			if (!groups[key]) {
				groups[key] = {
					admission_id: order.admission_id,
					bed_number: order.bed_number!,
					bed_prefix: order.bed_prefix!,
					patient_name: order.patient_name!,
					orders: []
				};
			}
			groups[key].orders.push(order);
		}
		return Object.values(groups).sort((a, b) => a.bed_number - b.bed_number);
	});
</script>

<svelte:head>
	<title>Pendientes - Hospital</title>
</svelte:head>

<div class="pendientes-page">
	<div class="header">
		<h1>Vista Central de Pendientes</h1>
		<button class="btn-refresh" onclick={loadData} disabled={loading}>
			↻ Refrescar
		</button>
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
			<button onclick={loadData}>Reintentar</button>
		</div>
	{:else if loading && orders.length === 0}
		<div class="loading">Cargando pendientes...</div>
	{:else if orders.length === 0}
		<div class="empty-state">
			<span class="icon">✨</span>
			<p>No hay órdenes auxiliares pendientes</p>
		</div>
	{:else}
		<div class="groups-container">
			{#each groupedOrders() as group}
				<div class="bed-group">
					<div class="group-header">
						<a href="/admissions/{group.admission_id}" class="group-link">
							<span class="bed-badge">{group.bed_prefix}-{group.bed_number}</span>
							<span class="patient-name">{group.patient_name}</span>
						</a>
					</div>
					
					<div class="orders-list">
						{#each group.orders as order (order.id)}
							<div class="order-card">
								<div class="order-info">
									<div class="order-type">
										<span class="category badge-{order.category}">{order.category}</span>
										<span class="status-badge status-{order.status}">
											{order.status === 'pending' ? 'Pendiente' : 'Realizado'}
										</span>
										<span class="time">{new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
									</div>
									<p class="description">{order.description}</p>
									<div class="meta">
										<span>Por: {order.created_by_name}</span>
									</div>
								</div>
								
								<div class="order-actions">
									{#if order.status === 'pending'}
										<button class="btn-action done" onclick={() => handleStatusUpdate(order.id, 'done')}>
											Realizado
										</button>
									{:else if order.status === 'done'}
										<button class="btn-action reported" onclick={() => openReportModal(order.id)}>
											Reportar
										</button>
									{/if}
									{#if $currentUser?.role === 'admin'}
										<button class="btn-delete" onclick={() => handleDelete(order.id)} title="Eliminar">
											🗑️
										</button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if showReportModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeReportModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<h3>Registrar Resultado de Orden</h3>
			<p class="modal-subtitle">Ingrese el resultado en texto libre para la orden auxiliar.</p>
			
			<textarea
				placeholder="Escriba el resultado del estudio/procedimiento..."
				bind:value={reportResultText}
				rows="5"
			></textarea>
			
			<div class="modal-actions">
				<button class="btn-cancel" onclick={closeReportModal}>Cancelar</button>
				<button class="btn-confirm" onclick={submitReportResult}>
					Confirmar y Reportar
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.pendientes-page {
		max-width: 800px;
		margin: 0 auto;
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	h1 {
		margin: 0;
		color: var(--secondary);
		font-size: 1.5rem;
	}

	.btn-refresh {
		background: var(--surface);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-refresh:hover:not(:disabled) {
		background: var(--background);
	}

	.btn-refresh:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: var(--surface);
		border-radius: var(--border-radius-lg);
		border: 1px dashed var(--border-color);
		color: var(--text-muted);
	}

	.empty-state .icon {
		font-size: 3rem;
		display: block;
		margin-bottom: 1rem;
	}

	.groups-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.bed-group {
		background: var(--surface);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-sm);
		overflow: hidden;
	}

	.group-header {
		background: var(--info-bg);
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		gap: 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	.group-link {
		display: flex;
		align-items: center;
		gap: 1rem;
		text-decoration: none;
		color: inherit;
		cursor: pointer;
	}

	.group-link:hover .patient-name {
		text-decoration: underline;
		color: var(--primary);
	}

	.group-link:hover .bed-badge {
		opacity: 0.9;
	}

	.bed-badge {
		background: var(--primary);
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		font-weight: bold;
		font-size: 0.875rem;
	}

	.patient-name {
		font-weight: 600;
		color: var(--secondary);
	}

	.orders-list {
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.order-card {
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		background: var(--background);
	}

	@media (min-width: 640px) {
		.order-card {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
		}
	}

	.order-info {
		flex: 1;
	}

	.order-type {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.category {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.badge-laboratorio { background: #e0f2fe; color: #0284c7; }
	.badge-imagen { background: #fef08a; color: #a16207; }
	.badge-procedimiento { background: #fce7f3; color: #be185d; }

	.time {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.description {
		margin: 0 0 0.5rem 0;
		font-size: 1rem;
		color: var(--text-main);
	}

	.meta {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.order-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.btn-action {
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-md);
		font-weight: 600;
		font-size: 0.875rem;
		cursor: pointer;
		border: none;
		transition: all 0.2s;
	}

	.btn-action.done {
		background: #dcfce7;
		color: #166534;
	}

	.btn-action.done:hover {
		background: #bbf7d0;
	}

	.btn-action.reported {
		background: #dbeafe;
		color: #1e40af;
	}

	.btn-action.reported:hover {
		background: #bfdbfe;
	}

	.btn-delete {
		background: transparent;
		border: 1px solid var(--danger);
		padding: 0.5rem;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}

	.btn-delete:hover {
		background: var(--danger-bg);
	}

	.status-badge {
		font-size: 0.65rem;
		font-weight: bold;
		text-transform: uppercase;
		padding: 0.15rem 0.35rem;
		border-radius: 4px;
	}

	.status-pending { background: #fee2e2; color: #991b1b; }
	.status-done { background: #dcfce7; color: #166534; }

	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(15, 23, 42, 0.6);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		backdrop-filter: blur(4px);
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		width: 90%;
		max-width: 500px;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.modal-content h3 {
		margin: 0;
		color: var(--secondary);
		font-size: 1.25rem;
	}

	.modal-subtitle {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.modal-content textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		font-size: 0.9375rem;
		resize: vertical;
		font-family: inherit;
	}

	.modal-content textarea:focus {
		outline: none;
		border-color: var(--primary);
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.5rem;
	}

	.btn-cancel {
		background: #f1f5f9;
		color: var(--text-muted);
		border: none;
		padding: 0.625rem 1.25rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-cancel:hover {
		background: #e2e8f0;
	}

	.btn-confirm {
		background: var(--primary);
		color: white;
		border: none;
		padding: 0.625rem 1.25rem;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-confirm:hover {
		background: var(--primary-hover);
	}
</style>

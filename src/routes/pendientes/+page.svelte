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

	async function handleStatusUpdate(orderId: number, status: 'done' | 'reported') {
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
		const groups: Record<number, { bed_number: number; bed_prefix: string; patient_name: string; orders: AuxiliaryOrder[] }> = {};
		for (const order of orders) {
			const key = order.bed_number || 0;
			if (!groups[key]) {
				groups[key] = {
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
						<span class="bed-badge">{group.bed_prefix}-{group.bed_number}</span>
						<span class="patient-name">{group.patient_name}</span>
					</div>
					
					<div class="orders-list">
						{#each group.orders as order (order.id)}
							<div class="order-card">
								<div class="order-info">
									<div class="order-type">
										<span class="category badge-{order.category}">{order.category}</span>
										<span class="time">{new Date(order.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
									</div>
									<p class="description">{order.description}</p>
									<div class="meta">
										<span>Por: {order.created_by_name}</span>
									</div>
								</div>
								
								<div class="order-actions">
									<button class="btn-action done" onclick={() => handleStatusUpdate(order.id, 'done')}>
										Realizado
									</button>
									<button class="btn-action reported" onclick={() => handleStatusUpdate(order.id, 'reported')}>
										Reportado
									</button>
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
</style>

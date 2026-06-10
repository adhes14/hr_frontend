<script lang="ts">
	import type { Bed } from '$lib/api/client';
	import { getBeds } from '$lib/api/client';
	import BedCard from './BedCard.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { bedUpdateTrigger } from '$lib/sse';

	let beds = $state<Bed[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function loadBeds() {
		loading = true;
		error = null;
		try {
			beds = await getBeds();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar camas';
		} finally {
			loading = false;
		}
	}

	function handleBedClick(bed: Bed) {
		goto(`/admissions/new?bed_id=${bed.id}`);
	}

	onMount(() => {
		loadBeds();
	});

	$effect(() => {
		const trigger = $bedUpdateTrigger;
		if (trigger > 0) {
			loadBeds();
		}
	});
</script>

<div class="dashboard">
	<div class="header">
		<h2>Mapa de Camas</h2>
		<div class="header-actions">
			<button class="refresh-btn" onclick={loadBeds} disabled={loading}>
				{loading ? 'Cargando...' : '🔄 Actualizar'}
			</button>
			<a href="/beds/history" class="btn btn-secondary" data-sveltekit-preload-data="hover">
				📋 Historial de Camas
			</a>
		</div>
	</div>

	{#if error}
		<div class="error">
			<p>{error}</p>
			<button onclick={loadBeds}>Reintentar</button>
		</div>
	{:else if loading && beds.length === 0}
		<p class="loading">Cargando camas...</p>
	{:else if beds.length === 0}
		<p class="empty">No hay camas registradas</p>
	{:else}
		<div class="beds-grid">
			{#each beds as bed (bed.id)}
				<BedCard {bed} onclick={() => handleBedClick(bed)} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.dashboard {
		background: var(--surface);
		border-radius: var(--border-radius-lg); /* Slightly smaller on mobile */
		padding: 1rem; /* Reduced padding for mobile */
		box-shadow: var(--shadow-md);
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem; /* Reduced gap */
		margin-bottom: 1.5rem; /* Reduced margin */
	}

	h2 {
		margin: 0;
		color: var(--secondary);
		font-size: 1.25rem; /* Reduced for mobile */
	}

	.header-actions {
		display: flex;
		gap: 0.5rem;
		width: 100%;
		align-items: center;
	}

	.header-actions .refresh-btn,
	.header-actions .btn-secondary {
		flex: 1;
		margin: 0;
		padding: 0.625rem 0.5rem;
		text-align: center;
		font-size: 0.8125rem;
		font-weight: 600;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		white-space: nowrap;
		transition: all 0.2s ease;
		box-shadow: var(--shadow-sm);
	}

	.refresh-btn {
		background: var(--primary);
		color: white;
		border: none;
	}

	.refresh-btn:hover:not(:disabled) {
		background: var(--primary-hover);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: var(--surface);
		color: var(--secondary);
		border: 1px solid var(--border-color);
		text-decoration: none;
	}

	.btn-secondary:hover {
		background: var(--info-bg);
		border-color: var(--primary);
		color: var(--primary);
	}

	.beds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); /* Smaller minimum width for mobile */
		gap: 0.75rem; /* Reduced gap for mobile */
	}

	.loading, .empty {
		text-align: center;
		color: var(--text-muted);
		padding: 2rem 1rem; /* Reduced padding */
		font-size: 0.9375rem; /* Reduced font size */
	}

	.error {
		background: var(--danger-bg);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--border-radius-md);
		padding: 1rem; /* Reduced padding */
		text-align: center;
		color: var(--danger);
		font-size: 0.9375rem;
	}

	.error button {
		margin-top: 0.75rem;
		background: var(--danger);
		color: white;
		border: none;
		padding: 0.4rem 1rem;
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s ease;
	}
	
	.error button:hover {
		background: #dc2626; /* darker red */
	}

	@media (min-width: 640px) {
		.dashboard {
			padding: 2rem;
			border-radius: var(--border-radius-xl);
		}
		.header {
			flex-direction: row;
			justify-content: space-between;
			align-items: center;
			margin-bottom: 2rem;
		}
		.header-actions {
			width: auto;
			gap: 0.75rem;
		}
		.header-actions .refresh-btn,
		.header-actions .btn-secondary {
			flex: none;
			padding: 0.75rem 1.25rem;
			font-size: 0.875rem;
		}
		h2 {
			font-size: 1.5rem;
		}
		.beds-grid {
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); /* Desktop size */
			gap: 1.25rem;
		}
	}
</style>
<script lang="ts">
	import type { Bed } from '$lib/api/client';
	import { getBeds } from '$lib/api/client';
	import BedCard from './BedCard.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

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
</script>

<div class="dashboard">
	<div class="header">
		<h2>Mapa de Camas</h2>
		<button class="refresh-btn" onclick={loadBeds} disabled={loading}>
			{loading ? 'Cargando...' : '🔄 Actualizar'}
		</button>
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
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	h2 {
		margin: 0;
		color: #1a1a2e;
	}

	.refresh-btn {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.refresh-btn:hover:not(:disabled) {
		background: #16213e;
	}

	.refresh-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.beds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
		gap: 1rem;
	}

	.loading, .empty {
		text-align: center;
		color: #666;
		padding: 2rem;
	}

	.error {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
	}

	.error button {
		margin-top: 0.5rem;
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}
</style>
<script lang="ts">
	import type { Bed, Ward } from '$lib/api/client';
	import { getBeds, getWards } from '$lib/api/client';
	import BedCard from './BedCard.svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { bedUpdateTrigger } from '$lib/sse';

	let beds = $state<Bed[]>([]);
	let wards = $state<Ward[]>([]);
	let selectedWardId = $state<number | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const filteredBeds = $derived(
		beds.filter(bed => bed.ward_id === selectedWardId)
	);

	async function loadData() {
		loading = true;
		error = null;
		try {
			const [bedsData, wardsData] = await Promise.all([
				getBeds(),
				getWards()
			]);
			beds = bedsData;
			wards = wardsData;

			if (wards.length > 0) {
				const savedId = localStorage.getItem('selected_ward_id');
				const parsedId = savedId ? parseInt(savedId, 10) : null;
				if (parsedId !== null && wards.some(w => w.id === parsedId)) {
					selectedWardId = parsedId;
				} else {
					selectedWardId = wards[0].id;
				}
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar datos';
		} finally {
			loading = false;
		}
	}

	function selectWard(id: number) {
		selectedWardId = id;
		localStorage.setItem('selected_ward_id', String(id));
	}

	function handleBedClick(bed: Bed) {
		goto(`/admissions/new?bed_id=${bed.id}`);
	}

	onMount(() => {
		loadData();
	});

	$effect(() => {
		const trigger = $bedUpdateTrigger;
		if (trigger > 0) {
			loadData();
		}
	});
</script>

<div class="dashboard">
	<div class="header">
		<h2>Mapa de Camas</h2>
		<div class="header-actions">
			<button class="refresh-btn" onclick={loadData} disabled={loading}>
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
			<button onclick={loadData}>Reintentar</button>
		</div>
	{:else if loading && beds.length === 0}
		<p class="loading">Cargando camas...</p>
	{:else if beds.length === 0}
		<p class="empty">No hay camas registradas</p>
	{:else}
		<!-- Mobile Ward Selector (Dropdown) -->
		{#if wards.length > 0}
			<div class="ward-selector-mobile">
				<label for="ward-select">Sala:</label>
				<select id="ward-select" value={selectedWardId} onchange={(e) => selectWard(Number(e.currentTarget.value))}>
					{#each wards as ward}
						<option value={ward.id}>{ward.name}</option>
					{/each}
				</select>
			</div>

			<!-- Desktop Ward Selector (Tabs) -->
			<div class="ward-selector-desktop">
				{#each wards as ward}
					<button
						class="ward-tab {selectedWardId === ward.id ? 'active' : ''}"
						onclick={() => selectWard(ward.id)}
					>
						{ward.name}
					</button>
				{/each}
			</div>
		{/if}

		{#if filteredBeds.length === 0}
			<p class="empty">No hay camas en esta sala</p>
		{:else}
			<div class="beds-grid">
				{#each filteredBeds as bed (bed.id)}
					<BedCard {bed} onclick={() => handleBedClick(bed)} />
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	.dashboard {
		background: var(--surface);
		border-radius: var(--border-radius-lg);
		padding: 1rem;
		box-shadow: var(--shadow-md);
	}

	.header {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	h2 {
		margin: 0;
		color: var(--secondary);
		font-size: 1.25rem;
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

	/* Mobile ward selector (default) */
	.ward-selector-mobile {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.25rem;
		background: #f8fafc;
		padding: 0.75rem 1rem;
		border-radius: var(--border-radius-md);
		border: 1px solid var(--border-color);
	}

	.ward-selector-mobile label {
		font-weight: 600;
		color: var(--secondary);
		font-size: 0.875rem;
	}

	.ward-selector-mobile select {
		flex: 1;
		padding: 0.5rem;
		border-radius: var(--border-radius-sm);
		border: 1px solid var(--border-color);
		background: white;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-main);
	}

	.ward-selector-mobile select:focus {
		outline: none;
		border-color: var(--primary);
	}

	/* Desktop ward selector (hidden by default) */
	.ward-selector-desktop {
		display: none;
	}

	.beds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 0.75rem;
	}

	.loading, .empty {
		text-align: center;
		color: var(--text-muted);
		padding: 2rem 1rem;
		font-size: 0.9375rem;
	}

	.error {
		background: var(--danger-bg);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--border-radius-md);
		padding: 1rem;
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
		background: #dc2626;
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

		.ward-selector-mobile {
			display: none;
		}

		.ward-selector-desktop {
			display: flex;
			gap: 0.5rem;
			border-bottom: 2px solid var(--border-color);
			margin-bottom: 1.5rem;
		}

		.ward-tab {
			background: transparent;
			border: none;
			border-bottom: 3px solid transparent;
			padding: 0.75rem 1.25rem;
			font-size: 0.9375rem;
			font-weight: 600;
			color: var(--text-muted);
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.ward-tab:hover {
			color: var(--primary);
		}

		.ward-tab.active {
			color: var(--primary);
			border-bottom-color: var(--primary);
		}

		.beds-grid {
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: 1.25rem;
		}
	}
</style>
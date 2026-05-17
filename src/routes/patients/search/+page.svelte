<script lang="ts">
	import type { Patient } from '$lib/api/client';
	import { searchPatients } from '$lib/api/client';

	let query = $state('');
	let patients = $state<Patient[]>([]);
	let loading = $state(false);
	let searched = $state(false);

	async function handleSearch() {
		if (!query.trim()) return;
		loading = true;
		searched = true;
		try {
			patients = await searchPatients(query.trim());
		} catch (e) {
			console.error('Search error:', e);
			patients = [];
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			handleSearch();
		}
	}
</script>

<svelte:head>
	<title>Buscar Pacientes - Hospital</title>
</svelte:head>

<div class="search-page">
	<h1>Buscar Pacientes</h1>
	<p class="subtitle">Buscar por DNI (exacto) o nombre (parcial)</p>

	<div class="search-bar">
		<input
			type="text"
			placeholder="DNI o nombre del paciente..."
			bind:value={query}
			onkeydown={handleKeydown}
		/>
		<button onclick={handleSearch} disabled={loading || !query.trim()}>
			{loading ? 'Buscando...' : '🔍 Buscar'}
		</button>
	</div>

	{#if loading}
		<p class="message">Buscando pacientes...</p>
	{:else if searched && patients.length === 0}
		<p class="message">No se encontraron pacientes</p>
	{:else if patients.length > 0}
		<div class="results">
			<p class="count">{patients.length} paciente(s) encontrado(s)</p>
			{#each patients as patient (patient.id)}
				<div class="patient-card">
					<div class="patient-info">
						<strong>{patient.full_name}</strong>
						<span class="dni">DNI: {patient.identity_number}</span>
					</div>
					<a href="/admissions/new?patient_id={patient.id}" class="btn-internar">
						Internar
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.search-page {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	h1 {
		margin: 0 0 0.25rem 0;
		color: #1a1a2e;
	}

	.subtitle {
		color: #666;
		margin: 0 0 1.5rem 0;
	}

	.search-bar {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}

	input {
		flex: 1;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
	}

	input:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	button {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		white-space: nowrap;
	}

	button:hover:not(:disabled) {
		background: #16213e;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.message {
		text-align: center;
		color: #666;
		padding: 2rem;
	}

	.count {
		color: #666;
		margin-bottom: 1rem;
	}

	.patient-card {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border: 1px solid #eee;
		border-radius: 8px;
		margin-bottom: 0.5rem;
	}

	.patient-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.dni {
		color: #666;
		font-size: 0.875rem;
	}

	.btn-internar {
		background: #2ecc71;
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.875rem;
	}

	.btn-internar:hover {
		background: #27ae60;
	}
</style>
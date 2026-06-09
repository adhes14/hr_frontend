<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getBeds, listBedAdmissions, type AdmissionHistoryItem, type Bed, type PaginatedResponse } from '$lib/api/client';

	let beds = $state<Bed[]>([]);
	let selectedBedId = $state<number | null>(null);
	let fromDate = $state('');
	let toDate = $state('');
	let currentPage = $state(1);
	const pageSize = 10;

	let rows = $state<AdmissionHistoryItem[]>([]);
	let total = $state(0);
	let totalPages = $state(0);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Sync from URL on mount and on $page change
	$effect(() => {
		const bedParam = $page.url.searchParams.get('bed');
		if (bedParam != null) {
			const parsed = parseInt(bedParam, 10);
			selectedBedId = isNaN(parsed) ? null : parsed;
		}
		fromDate = $page.url.searchParams.get('from') ?? '';
		toDate = $page.url.searchParams.get('to') ?? '';
		const pageParam = $page.url.searchParams.get('page');
		currentPage = pageParam ? (parseInt(pageParam, 10) || 1) : 1;
	});

	// Debounced fetch (300ms on date changes; immediate on page/bed change)
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;
	$effect(() => {
		const bedId = selectedBedId;
		const from = fromDate;
		const to = toDate;
		const pg = currentPage;

		if (debounceTimer) clearTimeout(debounceTimer);

		if (bedId == null) {
			rows = [];
			total = 0;
			totalPages = 0;
			error = null;
			return;
		}

		const delay = (from || to) ? 300 : 0;
		debounceTimer = setTimeout(async () => {
			loading = true;
			error = null;
			try {
				const res: PaginatedResponse<AdmissionHistoryItem> = await listBedAdmissions(bedId, {
					page: pg,
					limit: pageSize,
					from: from || undefined,
					to: to || undefined
				});
				rows = res.data;
				total = res.total;
				totalPages = res.total_pages;
			} catch (e: unknown) {
				error = e instanceof Error ? e.message : 'Error al cargar historial';
				rows = [];
				total = 0;
				totalPages = 0;
			} finally {
				loading = false;
			}
		}, delay);
	});

	// URL sync (updates the browser URL when filters change)
	$effect(() => {
		const params = new URLSearchParams();
		if (selectedBedId != null) params.set('bed', String(selectedBedId));
		if (fromDate) params.set('from', fromDate);
		if (toDate) params.set('to', toDate);
		if (currentPage > 1) params.set('page', String(currentPage));
		const qs = params.toString();
		const target = `/beds/history${qs ? `?${qs}` : ''}`;
		if (typeof window !== 'undefined') {
			const current = window.location.pathname + window.location.search;
			if (current !== target) {
				goto(target, { replaceState: true, keepFocus: true, noScroll: true });
			}
		}
	});

	// Load beds on mount
	$effect(() => {
		getBeds().then((b) => (beds = b)).catch(() => {});
	});

	function onBedChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		selectedBedId = val ? parseInt(val, 10) : null;
		currentPage = 1;
	}

	function onFromChange(e: Event) {
		fromDate = (e.target as HTMLInputElement).value;
		currentPage = 1;
	}

	function onToChange(e: Event) {
		toDate = (e.target as HTMLInputElement).value;
		currentPage = 1;
	}

	function goToPage(p: number) {
		if (p >= 1 && p <= totalPages) currentPage = p;
	}

	function fmt(iso: string | null): string {
		if (!iso) return '—';
		return new Date(iso).toLocaleDateString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	function rowHref(id: string): string {
		return `/admissions/${id}`;
	}

	function bedLabel(b: Bed): string {
		return `${b.bed_type?.prefix ?? ''}${b.number}`;
	}
</script>

<svelte:head>
	<title>Historial de Camas - Hospital</title>
</svelte:head>

<div class="bed-history-page">
	<div class="header">
		<h1>Historial de Camas</h1>
		<button class="back-btn" onclick={() => goto('/')}>
			← Dashboard
		</button>
	</div>

	<div class="filters">
		<div class="filter-group">
			<label for="bed-select">Cama</label>
			<select id="bed-select" onchange={onBedChange} value={selectedBedId ?? ''}>
				<option value="">— Seleccionar cama —</option>
				{#each beds as b (b.id)}
					<option value={b.id}>{bedLabel(b)}</option>
				{/each}
			</select>
		</div>

		<div class="filter-group">
			<label for="from-date">Desde</label>
			<input id="from-date" type="date" value={fromDate} onchange={onFromChange} />
		</div>

		<div class="filter-group">
			<label for="to-date">Hasta</label>
			<input id="to-date" type="date" value={toDate} onchange={onToChange} />
		</div>
	</div>

	{#if error}
		<div class="error-banner">
			<p>{error}</p>
		</div>
	{/if}

	{#if selectedBedId == null}
		<p class="empty-state">Seleccioná una cama para ver su historial</p>
	{:else if loading}
		<p class="loading-msg">Cargando...</p>
	{:else if rows.length === 0 && !fromDate && !toDate}
		<p class="empty-state">Esta cama no tiene internaciones previas</p>
	{:else if rows.length === 0}
		<p class="empty-state">No hay altas registradas en este rango</p>
	{:else}
		<div class="table-wrapper">
			<table class="modern-table">
				<thead>
					<tr>
						<th>Paciente</th>
						<th>DNI</th>
						<th>Fecha de Ingreso</th>
						<th>Fecha de Alta</th>
						<th>Evento</th>
						<th>Diagnóstico</th>
						<th>Controles</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as admission (admission.id)}
						<tr
							class="clickable-row"
							role="link"
							tabindex="0"
							onclick={() => goto(rowHref(admission.id))}
							onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') goto(rowHref(admission.id)); }}
						>
							<td class="font-medium text-main">{admission.patient_name}</td>
							<td class="text-muted">{admission.patient_dni}</td>
							<td class="text-muted">{fmt(admission.created_at)}</td>
							<td class="text-muted">{fmt(admission.discharged_at)}</td>
							<td>
								{#if admission.event_type === 'parto'}
									<span class="badge badge-parto">Parto</span>
								{:else if admission.event_type === 'cesarea'}
									<span class="badge badge-cesarea">Cesárea</span>
								{:else}
									<span class="text-muted">—</span>
								{/if}
							</td>
							<td class="diagnosis-cell">{admission.current_diagnosis || admission.admission_diagnosis || '—'}</td>
							<td>
								<span class="control-badge" title={`${admission.clinical_log_count} controles`}>
									📘 {admission.clinical_log_count} {admission.clinical_log_count === 1 ? 'control' : 'controles'}
								</span>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{#if totalPages > 1}
			<div class="pagination">
				<button
					class="page-btn"
					disabled={currentPage <= 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					&laquo; Anterior
				</button>
				<span class="page-info">
					Página {currentPage} de {totalPages} ({total} altas)
				</span>
				<button
					class="page-btn"
					disabled={currentPage >= totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					Siguiente &raquo;
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.bed-history-page {
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

	h1 {
		margin: 0;
		color: #1a1a2e;
		font-size: 1.5rem;
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

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		margin-bottom: 1.5rem;
		align-items: end;
	}

	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.filter-group label {
		font-size: 0.8rem;
		font-weight: 600;
		color: #555;
	}

	.filter-group select,
	.filter-group input {
		padding: 0.5rem 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 0.9375rem;
		font-family: inherit;
		background: white;
	}

	.filter-group select:focus,
	.filter-group input:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.error-banner {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 0.75rem;
		color: #c00;
		margin-bottom: 1rem;
		text-align: center;
	}

	.error-banner p {
		margin: 0;
	}

	.empty-state {
		text-align: center;
		color: #666;
		padding: 2rem;
		font-style: italic;
	}

	.loading-msg {
		text-align: center;
		color: #888;
		padding: 2rem;
	}

	.table-wrapper {
		overflow-x: auto;
	}

	.modern-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.modern-table th {
		text-align: left;
		padding: 0.75rem;
		background: #f5f5f5;
		color: #555;
		font-weight: 600;
		border-bottom: 2px solid #ddd;
		white-space: nowrap;
	}

	.modern-table td {
		padding: 0.75rem;
		border-bottom: 1px solid #eee;
		color: #333;
	}

	.clickable-row {
		cursor: pointer;
		transition: background 0.15s ease;
	}

	.clickable-row:hover {
		background: #f0f7ff;
	}

	.font-medium {
		font-weight: 500;
	}

	.text-main {
		color: #1a1a2e;
	}

	.text-muted {
		color: #888;
	}

	.diagnosis-cell {
		max-width: 200px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.badge {
		padding: 0.2rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 600;
	}

	.badge-parto {
		background: #e0f2fe;
		color: #0284c7;
	}

	.badge-cesarea {
		background: #fce7f3;
		color: #be185d;
	}

	.control-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		background: #f0fdf4;
		color: #166534;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 500;
		white-space: nowrap;
	}

	.pagination {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 1rem;
		margin-top: 1.5rem;
	}

	.page-btn {
		background: #1a1a2e;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.page-btn:hover:not(:disabled) {
		background: #16213e;
	}

	.page-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.page-info {
		color: #666;
		font-size: 0.875rem;
	}

	@media (max-width: 640px) {
		.filters {
			flex-direction: column;
		}
		.filter-group select,
		.filter-group input {
			width: 100%;
		}
	}
</style>

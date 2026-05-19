<script lang="ts">
	import type { Bed } from '$lib/api/client';
	import { goto } from '$app/navigation';

	let { bed, onclick }: {
		bed: Bed;
		onclick?: () => void;
	} = $props();

	const isOccupied = $derived(bed.current_admission_id !== null);
	const statusClass = $derived(isOccupied ? 'occupied' : 'available');
	const statusText = $derived(isOccupied ? 'Ocupada' : 'Disponible');

	function handleClick() {
		if (isOccupied) {
			goto(`/admissions/${bed.current_admission_id}`);
		} else {
			onclick?.();
		}
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	class="bed-card {statusClass}"
	onclick={handleClick}
	role="button"
	tabindex="0"
>
	<div class="bed-header">
		<span class="bed-number">{bed.bed_type?.prefix}{bed.number}</span>
		<span class="bed-status">
			{statusText}
		</span>
	</div>

	<div class="bed-body">
		{#if isOccupied}
			<div class="patient-info">
				<p class="patient-name">
					<strong>Paciente:</strong> {bed.current_patient_name || 'Desconocido'}
				</p>
			</div>
		{/if}
		<div class="bed-type-info">
			<span class="bed-type-badge">{bed.bed_type?.name}</span>
		</div>
	</div>
</div>

<style>
	.bed-card {
		background: var(--surface);
		border-left: 4px solid var(--border-color); /* Thinner border on mobile */
		border-radius: var(--border-radius-md); /* Smaller radius on mobile */
		padding: 0.875rem; /* Reduced padding */
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		box-sizing: border-box;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem; /* Reduced gap */
		box-shadow: var(--shadow-sm);
		border-top: 1px solid var(--border-color);
		border-right: 1px solid var(--border-color);
		border-bottom: 1px solid var(--border-color);
	}

	.bed-card.available {
		border-left-color: var(--success);
	}

	.bed-card.occupied {
		border-left-color: var(--danger);
	}

	.bed-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.bed-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.bed-number {
		font-size: 1.125rem; /* Reduced from 1.5rem */
		font-weight: 700;
		color: var(--secondary);
		letter-spacing: -0.025em;
	}

	.bed-status {
		padding: 0.2rem 0.5rem; /* Reduced padding */
		border-radius: 9999px;
		font-size: 0.65rem; /* Reduced font size */
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.available .bed-status {
		background: var(--success-bg);
		color: var(--success);
	}

	.occupied .bed-status {
		background: var(--danger-bg);
		color: var(--danger);
	}

	.bed-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem; /* Reduced gap */
	}

	.patient-info {
		padding-top: 0.5rem; /* Reduced padding */
		border-top: 1px solid var(--border-color);
	}

	.patient-name {
		margin: 0;
		font-size: 0.8125rem; /* Reduced font size */
		color: var(--text-main);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}
	
	.patient-name strong {
		color: var(--text-muted);
		font-weight: 500;
	}

	.bed-type-info {
		margin-top: 0;
	}

	.bed-type-badge {
		background: var(--info-bg);
		color: var(--info);
		padding: 0.2rem 0.5rem; /* Reduced padding */
		border-radius: var(--border-radius-sm); /* Reduced radius */
		font-size: 0.65rem; /* Reduced font size */
		font-weight: 600;
		display: inline-block;
	}

	@media (min-width: 640px) {
		.bed-card {
			border-left-width: 6px;
			border-radius: var(--border-radius-lg);
			padding: 1.25rem;
			gap: 1rem;
		}

		.bed-number {
			font-size: 1.5rem;
		}

		.bed-status {
			padding: 0.25rem 0.75rem;
			font-size: 0.75rem;
		}

		.bed-body {
			gap: 0.75rem;
		}

		.patient-info {
			padding-top: 0.75rem;
		}

		.patient-name {
			font-size: 0.95rem;
		}

		.bed-type-badge {
			padding: 0.25rem 0.75rem;
			border-radius: var(--border-radius-md);
			font-size: 0.75rem;
		}
	}
</style>
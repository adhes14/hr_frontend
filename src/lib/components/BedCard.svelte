<script lang="ts">
	import type { Bed } from '$lib/api/client';
	import { goto } from '$app/navigation';

	let { bed, onclick }: {
		bed: Bed;
		onclick?: () => void;
	} = $props();

	const isOccupied = $derived(bed.current_admission_id !== null);
	const statusColor = $derived(isOccupied ? '#e74c3c' : '#2ecc71');
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
	class="bed-card"
	style="border-color: {statusColor}"
	onclick={handleClick}
	role="button"
	tabindex="0"
>
	<div class="bed-header">
		<span class="bed-number">{bed.bed_type?.prefix}{bed.number}</span>
		<span class="bed-status" style="background: {statusColor}">
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
		background: white;
		border: 3px solid;
		border-radius: 12px;
		padding: 1rem;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
		text-align: left;
		box-sizing: border-box;
		max-width: 100%;
		overflow: hidden;
		font-size: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bed-card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.bed-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.bed-number {
		font-size: 1.5rem;
		font-weight: bold;
	}

	.bed-status {
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 500;
	}

	.bed-body {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.patient-info {
		padding: 0.5rem 0;
		border-top: 1px solid #eee;
	}

	.patient-name {
		margin: 0;
		font-size: 0.95rem;
		color: #333;
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	.bed-type-info {
		margin-top: 0.25rem;
	}

	.bed-type-badge {
		background: #9b59b6;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
		display: inline-block;
	}
</style>
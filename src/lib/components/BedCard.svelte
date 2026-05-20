<script lang="ts">
	import type { Bed } from '$lib/api/client';
	import { goto } from '$app/navigation';
	import { overdueAlerts, dischargeReadyAlerts } from '$lib/sse';

	let { bed, onclick }: {
		bed: Bed;
		onclick?: () => void;
	} = $props();

	const isOccupied = $derived(bed.current_admission_id !== null);
	const statusClass = $derived(isOccupied ? 'occupied' : 'available');
	const statusText = $derived(isOccupied ? 'Ocupada' : 'Disponible');

	const inControlPeriod = $derived(
		isOccupied &&
		bed.bed_type?.requires_postpartum_followup &&
		bed.event_type && bed.event_type !== 'ninguno' &&
		(bed.control_count ?? 0) < 8
	);

	const isOverdue = $derived(
		isOccupied && (
			(bed.id in $overdueAlerts) || 
			(bed.next_control_at !== null && bed.next_control_at !== undefined && new Date(bed.next_control_at) < new Date())
		)
	);

	const isDischargeReady = $derived(
		isOccupied && (
			(bed.id in $dischargeReadyAlerts) ||
			(bed.estimated_discharge_at !== null && bed.estimated_discharge_at !== undefined && new Date(bed.estimated_discharge_at) < new Date())
		)
	);

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
	class:has-alert={isOverdue}
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

				<div class="bed-alerts">
					{#if isOverdue}
						<div class="alert-tag overdue">
							<span class="pulse-dot red"></span>
							<span>Control Atrasado</span>
						</div>
					{:else if inControlPeriod}
						<div class="alert-tag monitoring">
							<span class="pulse-dot orange"></span>
							<span>Monitoreo {bed.control_count}/8</span>
						</div>
					{/if}

					{#if isDischargeReady}
						<div class="alert-tag discharge">
							<span class="pulse-dot green"></span>
							<span>Alta Lista</span>
						</div>
					{/if}
				</div>
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
		border-left: 4px solid var(--border-color);
		border-radius: var(--border-radius-md);
		padding: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
		text-align: left;
		box-sizing: border-box;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
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

	.bed-card.has-alert {
		border-left-color: var(--danger);
		box-shadow: 0 0 10px rgba(239, 68, 68, 0.15);
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
		font-size: 1.125rem;
		font-weight: 700;
		color: var(--secondary);
		letter-spacing: -0.025em;
	}

	.bed-status {
		padding: 0.2rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.65rem;
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
		gap: 0.5rem;
	}

	.patient-info {
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-color);
	}

	.patient-name {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--text-main);
		white-space: nowrap;
		text-overflow: ellipsis;
		overflow: hidden;
		margin-bottom: 0.25rem;
	}
	
	.patient-name strong {
		color: var(--text-muted);
		font-weight: 500;
	}

	.bed-alerts {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.5rem;
		margin-bottom: 0.25rem;
	}

	.alert-tag {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.5rem;
		border-radius: var(--border-radius-sm);
		font-size: 0.75rem;
		font-weight: 600;
		width: max-content;
	}

	.alert-tag.overdue {
		background: var(--danger-bg);
		color: var(--danger);
		border: 1px solid rgba(239, 68, 68, 0.15);
	}

	.alert-tag.monitoring {
		background: var(--warning-bg);
		color: var(--warning);
		border: 1px solid rgba(245, 158, 11, 0.15);
	}

	.alert-tag.discharge {
		background: var(--info-bg);
		color: var(--info);
		border: 1px solid rgba(59, 130, 246, 0.15);
	}

	.pulse-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		display: inline-block;
	}

	.pulse-dot.red {
		background-color: var(--danger);
		animation: pulse-red 1.2s infinite alternate;
	}

	.pulse-dot.orange {
		background-color: var(--warning);
		animation: pulse-orange 1.5s infinite alternate;
	}

	.pulse-dot.green {
		background-color: var(--info);
		animation: pulse-green 1.8s infinite alternate;
	}

	@keyframes pulse-red {
		0% { transform: scale(0.85); opacity: 0.6; }
		100% { transform: scale(1.2); opacity: 1; }
	}

	@keyframes pulse-orange {
		0% { transform: scale(0.85); opacity: 0.6; }
		100% { transform: scale(1.2); opacity: 1; }
	}

	@keyframes pulse-green {
		0% { transform: scale(0.85); opacity: 0.6; }
		100% { transform: scale(1.2); opacity: 1; }
	}

	.bed-type-info {
		margin-top: 0;
	}

	.bed-type-badge {
		background: var(--info-bg);
		color: var(--info);
		padding: 0.2rem 0.5rem;
		border-radius: var(--border-radius-sm);
		font-size: 0.65rem;
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
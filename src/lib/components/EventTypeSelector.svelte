<script lang="ts">
	import { registerEvent } from '$lib/api/client';
	import type { Admission } from '$lib/api/client';

	let {
		admissionId,
		eventType,
		eventAt,
		estimatedDischargeAt,
		onregistered
	}: {
		admissionId: string;
		eventType: string;
		eventAt: string | null;
		estimatedDischargeAt: string | null;
		onregistered: (admission: Admission) => void;
	} = $props();

	let showConfirm = $state(false);
	let selectedEventType = $state<'parto' | 'cesarea' | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);

	const eventRegistered = $derived(eventType !== 'ninguno' && eventAt !== null);

	function selectEventType(type: 'parto' | 'cesarea') {
		selectedEventType = type;
		showConfirm = true;
	}

	function cancelConfirm() {
		showConfirm = false;
		selectedEventType = null;
	}

	async function confirmEvent() {
		if (!selectedEventType) return;

		loading = true;
		error = null;

		try {
			const admission = await registerEvent(admissionId, selectedEventType);
			showConfirm = false;
			onregistered(admission);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al registrar evento';
		} finally {
			loading = false;
		}
	}

	function formatDateTime(dateStr: string | null): string {
		if (!dateStr) return '-';
		const date = new Date(dateStr);
		return date.toLocaleString('es-AR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="event-type-selector">
	<h3 class="section-title">Registrar Evento</h3>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if !eventRegistered}
		<div class="event-buttons">
			<button
				type="button"
				class="event-btn parto"
				onclick={() => selectEventType('parto')}
			>
				Parto Vaginal
			</button>
			<button
				type="button"
				class="event-btn cesarea"
				onclick={() => selectEventType('cesarea')}
			>
				Cesárea
			</button>
		</div>

		{#if showConfirm}
			<div class="confirm-overlay">
				<div class="confirm-dialog">
					<p class="confirm-text">
						¿Confirmar registro de {selectedEventType === 'parto' ? 'Parto Vaginal' : 'Cesárea'}?
					</p>
					<div class="confirm-actions">
						<button
							type="button"
							class="btn-confirm"
							onclick={confirmEvent}
							disabled={loading}
						>
							{loading ? 'Registrando...' : 'Confirmar'}
						</button>
						<button
							type="button"
							class="btn-cancel"
							onclick={cancelConfirm}
							disabled={loading}
						>
							Cancelar
						</button>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<div class="event-registered">
			<span class="event-badge" class:parto={eventType === 'parto'} class:cesarea={eventType === 'cesarea'}>
				{eventType === 'parto' ? 'Parto Vaginal' : 'Cesárea'}
			</span>
			<div class="event-details">
				<p><strong>Fecha Evento:</strong> {formatDateTime(eventAt)}</p>
				<p><strong>Alta Estimada:</strong> {formatDateTime(estimatedDischargeAt)}</p>
			</div>
		</div>
	{/if}
</div>

<style>
	.event-type-selector {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.section-title {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a2e;
	}

	.error {
		color: #c00;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.event-buttons {
		display: flex;
		gap: 0.75rem;
	}

	.event-btn {
		flex: 1;
		min-height: 48px;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: transform 0.2s, box-shadow 0.2s;
	}

	.event-btn.parto {
		background: #27ae60;
		color: white;
	}

	.event-btn.cesarea {
		background: #e67e22;
		color: white;
	}

	.event-btn:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.event-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.confirm-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
		padding: 1rem;
	}

	.confirm-dialog {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		max-width: 400px;
		width: 100%;
		text-align: center;
	}

	.confirm-text {
		margin: 0 0 1.5rem 0;
		font-size: 1.125rem;
		font-weight: 500;
	}

	.confirm-actions {
		display: flex;
		gap: 0.75rem;
	}

	.btn-confirm {
		flex: 1;
		min-height: 44px;
		background: #27ae60;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-confirm:hover:not(:disabled) {
		background: #219a52;
	}

	.btn-cancel {
		flex: 1;
		min-height: 44px;
		background: #95a5a6;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
	}

	.btn-cancel:hover:not(:disabled) {
		background: #7f8c8d;
	}

	.btn-confirm:disabled, .btn-cancel:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.event-registered {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.event-badge {
		display: inline-block;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 1rem;
		font-weight: 600;
		text-align: center;
		color: white;
	}

	.event-badge.parto {
		background: #27ae60;
	}

	.event-badge.cesarea {
		background: #e67e22;
	}

	.event-details {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.event-details p {
		margin: 0;
		font-size: 0.875rem;
		color: #555;
	}

	.event-details strong {
		color: #333;
	}
</style>

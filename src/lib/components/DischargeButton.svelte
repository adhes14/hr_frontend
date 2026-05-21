<script lang="ts">
	import { dischargeAdmission } from '$lib/api/client';

	let { admissionId, onDischarged }: { admissionId: string; onDischarged?: () => void } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let confirmed = $state(false);

	async function handleDischarge(e: MouseEvent) {
		e.stopPropagation();
		if (!confirmed) {
			confirmed = true;
			return;
		}

		loading = true;
		error = null;

		try {
			await dischargeAdmission(admissionId);
			onDischarged?.();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Error al dar de alta';
			confirmed = false;
		} finally {
			loading = false;
		}
	}

	function handleCancel(e: MouseEvent) {
		e.stopPropagation();
		confirmed = false;
		error = null;
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div class="discharge-container" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()}>
	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if confirmed}
		<div class="confirm">
			<p>¿Confirmar alta médica?</p>
			<div class="actions">
				<button class="btn-confirm" onclick={handleDischarge} disabled={loading}>
					{loading ? 'Procesando...' : 'Sí, dar de alta'}
				</button>
				<button class="btn-cancel" onclick={handleCancel}>Cancelar</button>
			</div>
		</div>
	{:else}
		<button class="btn-discharge" onclick={handleDischarge} disabled={loading}>
			🏥 Dar de Alta
		</button>
	{/if}
</div>

<style>
	.discharge-container {
		margin-top: 1rem;
	}

	.error {
		color: var(--danger);
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.confirm {
		background: var(--warning-bg);
		border: 1px solid rgba(217, 119, 6, 0.3);
		border-radius: var(--border-radius-md);
		padding: 1rem;
		text-align: center;
	}

	.confirm p {
		margin: 0 0 0.75rem 0;
		font-weight: 500;
		color: var(--secondary);
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.btn-confirm {
		background: var(--danger);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.btn-confirm:hover:not(:disabled) {
		background: #b91c1c;
	}

	.btn-cancel {
		background: var(--text-muted);
		color: white;
		border: none;
		padding: 0.5rem 1.25rem;
		border-radius: var(--border-radius-sm);
		cursor: pointer;
		font-weight: 500;
		transition: background 0.2s ease;
	}

	.btn-cancel:hover {
		background: var(--secondary);
	}

	.btn-discharge {
		background: var(--danger);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		font-size: 1rem;
		width: 100%;
		font-weight: 600;
		transition: all 0.2s ease;
		box-shadow: var(--shadow-sm);
	}

	.btn-discharge:hover:not(:disabled) {
		background: #b91c1c;
		box-shadow: var(--shadow-md);
		transform: translateY(-1px);
	}

	.btn-discharge:active:not(:disabled) {
		transform: translateY(1px);
	}

	.btn-discharge:disabled, .btn-confirm:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
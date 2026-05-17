<script lang="ts">
	import { dischargeAdmission } from '$lib/api/client';

	let { admissionId, onDischarged }: { admissionId: string; onDischarged?: () => void } = $props();

	let loading = $state(false);
	let error = $state<string | null>(null);
	let confirmed = $state(false);

	async function handleDischarge() {
		if (!confirmed) {
			confirmed = true;
			return;
		}

		loading = true;
		error = null;

		try {
			await dischargeAdmission(admissionId);
			onDischarged?.();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al dar de alta';
			confirmed = false;
		} finally {
			loading = false;
		}
	}

	function handleCancel() {
		confirmed = false;
		error = null;
	}
</script>

<div class="discharge-container">
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
		color: #c00;
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}

	.confirm {
		background: #fff3cd;
		border: 1px solid #ffc107;
		border-radius: 8px;
		padding: 1rem;
		text-align: center;
	}

	.confirm p {
		margin: 0 0 0.75rem 0;
		font-weight: 500;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.btn-confirm {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
	}

	.btn-confirm:hover:not(:disabled) {
		background: #c0392b;
	}

	.btn-cancel {
		background: #6c757d;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		cursor: pointer;
	}

	.btn-discharge {
		background: #e74c3c;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-size: 1rem;
		width: 100%;
	}

	.btn-discharge:hover:not(:disabled) {
		background: #c0392b;
	}

	.btn-discharge:disabled, .btn-confirm:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
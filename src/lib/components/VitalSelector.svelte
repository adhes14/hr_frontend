<script lang="ts">
	let {
		label,
		value,
		min,
		max,
		step = 1,
		unit = "",
		onchange,
	}: {
		label: string;
		value: number;
		min: number;
		max: number;
		step?: number;
		unit?: string;
		onchange: (value: number) => void;
	} = $props();

	const canDecrement = $derived(value > min);
	const canIncrement = $derived(value < max);

	function decrement() {
		if (canDecrement) {
			onchange(value - step);
		}
	}

	function increment() {
		if (canIncrement) {
			onchange(value + step);
		}
	}
</script>

<div class="vital-selector">
	<span class="label">{label}</span>
	<div class="controls">
		<button
			type="button"
			class="btn"
			onclick={decrement}
			disabled={!canDecrement}
			aria-label="Decrementar"
		>
			−
		</button>
		<span class="value">
			{value}{unit ? ` ${unit}` : ""}
		</span>
		<button
			type="button"
			class="btn"
			onclick={increment}
			disabled={!canIncrement}
			aria-label="Incrementar"
		>
			+
		</button>
	</div>
</div>

<style>
	.vital-selector {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--surface);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		transition: all 0.25s ease;
	}

	.vital-selector:hover {
		border-color: rgba(15, 118, 110, 0.3);
		box-shadow: var(--shadow-sm);
	}

	.label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-muted);
		text-align: center;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn {
		width: 48px;
		height: 48px;
		border: 1px solid transparent;
		border-radius: var(--border-radius-md);
		background: var(--primary);
		color: white;
		font-size: 1.5rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: var(--shadow-sm);
	}

	.btn:hover:not(:disabled) {
		background: var(--primary-hover);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	.btn:active:not(:disabled) {
		transform: translateY(1px);
		box-shadow: var(--shadow-sm);
	}

	.btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
		background: var(--text-muted);
	}

	.value {
		font-size: 1.15rem;
		font-weight: 700;
		color: var(--secondary);
		min-width: 90px;
		height: 48px;
		display: flex;
		align-items: center;
		justify-content: center;
		text-align: center;
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-feature-settings: "tnum";
	}

	@media (max-width: 640px) {
		.vital-selector {
			padding: 0.5rem;
			gap: 0.375rem;
		}
		.label {
			font-size: 0.75rem;
			letter-spacing: 0.25px;
		}
		.btn {
			width: 30px;
			height: 30px;
			font-size: 1rem;
		}
		.value {
			font-size: 0.8rem;
			min-width: 76px;
			height: 40px;
		}
	}
</style>

<script lang="ts">
	let {
		label,
		value,
		min,
		max,
		step = 1,
		unit = '',
		onchange
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
		<button type="button" class="btn" onclick={decrement} disabled={!canDecrement} aria-label="Decrementar">
			−
		</button>
		<span class="value">
			{value}{unit ? ` ${unit}` : ''}
		</span>
		<button type="button" class="btn" onclick={increment} disabled={!canIncrement} aria-label="Incrementar">
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
	}

	.label {
		font-size: 0.875rem;
		font-weight: 500;
		color: #333;
		text-align: center;
	}

	.controls {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.btn {
		width: 44px;
		height: 44px;
		border: none;
		border-radius: 8px;
		background: #1a1a2e;
		color: white;
		font-size: 1.5rem;
		font-weight: bold;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s, transform 0.1s;
	}

	.btn:hover:not(:disabled) {
		background: #16213e;
		transform: scale(1.05);
	}

	.btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.value {
		font-size: 1.25rem;
		font-weight: bold;
		color: #1a1a2e;
		min-width: 80px;
		text-align: center;
	}
</style>
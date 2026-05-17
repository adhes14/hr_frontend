<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		nextControlAt,
		controlCount,
		requiresPostpartumFollowup
	}: {
		nextControlAt: string | null;
		controlCount: number;
		requiresPostpartumFollowup: boolean;
	} = $props();

	let now = $state(new Date());
	let intervalId: ReturnType<typeof setInterval>;

	// Update every second for smooth countdown
	onMount(() => {
		intervalId = setInterval(() => {
			now = new Date();
		}, 1000);

		return () => clearInterval(intervalId);
	});

	onDestroy(() => {
		if (intervalId) clearInterval(intervalId);
	});

	const hasFollowupTracking = $derived(requiresPostpartumFollowup && nextControlAt !== null);
	const isComplete = $derived(requiresPostpartumFollowup && nextControlAt === null && controlCount >= 8);

	const timeRemaining = $derived.by(() => {
		if (!nextControlAt) return null;
		const controlTime = new Date(nextControlAt);
		const diff = controlTime.getTime() - now.getTime();
		return diff;
	});

	const isOverdue = $derived(hasFollowupTracking && timeRemaining !== null && timeRemaining < 0);

	const statusClass = $derived.by(() => {
		if (isComplete) return 'complete';
		if (isOverdue) return 'overdue';
		if (timeRemaining !== null && timeRemaining <= 5 * 60 * 1000) return 'warning';
		return 'normal';
	});

	function formatCountdown(ms: number): string {
		const absMs = Math.abs(ms);
		const hours = Math.floor(absMs / 3600000);
		const minutes = Math.floor((absMs % 3600000) / 60000);
		const seconds = Math.floor((absMs % 60000) / 1000);

		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
		}
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	function formatNextControl(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleString('es-AR', {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	const statusText = $derived.by(() => {
		if (!requiresPostpartumFollowup) return null;

		if (isComplete) return { main: 'Vigilancia Completa', sub: null };

		if (nextControlAt === null && controlCount === 0) {
			return { main: 'Esperando primer control', sub: null };
		}

		if (isOverdue) {
			return {
				main: `ATRASADO ${formatCountdown(timeRemaining!)}`,
				sub: `Era a las ${formatNextControl(nextControlAt!)}`
			};
		}

		if (timeRemaining !== null) {
			return {
				main: formatCountdown(timeRemaining),
				sub: `Próximo: ${formatNextControl(nextControlAt!)}`
			};
		}

		return { main: 'Sin control próximo', sub: null };
	});
</script>

{#if statusText}
	<div class="control-status-badge {statusClass}">
		<span class="badge-main">{statusText.main}</span>
		{#if statusText.sub}
			<span class="badge-sub">{statusText.sub}</span>
		{/if}
	</div>
{/if}

<style>
	.control-status-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 52px;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		gap: 0.125rem;
	}

	.badge-main {
		font-size: 1rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.badge-sub {
		font-size: 0.7rem;
		font-weight: 500;
		opacity: 0.9;
	}

	.complete {
		background: #2ecc71;
		color: white;
	}

	.overdue {
		background: #e74c3c;
		color: white;
		animation: pulse 1.5s ease-in-out infinite;
	}

	.warning {
		background: #f39c12;
		color: white;
	}

	.normal {
		background: #3498db;
		color: white;
	}

	@keyframes pulse {
		0%, 100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}
</style>

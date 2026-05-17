<script lang="ts">
	import { onMount } from 'svelte';

	let {
		nextControlAt,
		controlCount
	}: {
		nextControlAt: string | null;
		controlCount: number;
	} = $props();

	let now = $state(new Date());

	// Update time every minute
	onMount(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 60000);

		return () => clearInterval(interval);
	});

	const timeRemaining = $derived(() => {
		if (!nextControlAt) return null;
		const controlTime = new Date(nextControlAt);
		const diff = controlTime.getTime() - now.getTime();
		return diff > 0 ? diff : 0;
	});

	const isOverdue = $derived(nextControlAt !== null && new Date(nextControlAt) < now);
	const isComplete = $derived(nextControlAt === null && controlCount >= 8);

	const statusClass = $derived(() => {
		if (isComplete) return 'complete';
		if (isOverdue) return 'overdue';
		const remaining = timeRemaining();
		if (remaining !== null && remaining <= 5 * 60 * 1000) return 'warning';
		return 'normal';
	});

	const statusText = $derived(() => {
		if (isComplete) return 'Vigilancia Completa';
		if (isOverdue) return 'ATRASADO';
		const remaining = timeRemaining();
		if (remaining === null) return 'Sin control próximo';
		if (remaining <= 0) return 'ATRASADO';
		if (remaining < 60 * 60 * 1000) {
			const minutes = Math.floor(remaining / 60000);
			return `${minutes} min`;
		}
		const hours = Math.floor(remaining / 3600000);
		const minutes = Math.floor((remaining % 3600000) / 60000);
		return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
	});
</script>

<div class="control-status-badge {statusClass()}">
	<span class="badge-text">{statusText()}</span>
</div>

<style>
	.control-status-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-height: 44px;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.875rem;
		font-weight: 600;
	}

	.badge-text {
		text-transform: uppercase;
		letter-spacing: 0.5px;
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
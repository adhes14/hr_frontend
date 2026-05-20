<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/admin', { replaceState: true });
	});
</script>

<div class="redirecting">Redireccionando al panel de administración...</div>
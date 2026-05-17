<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const pathname = $derived($page.url.pathname);
</script>

<nav>
	<a href="/" class:active={pathname === '/'}>
		🏠 Camas
	</a>
	<a href="/patients" class:active={pathname.startsWith('/patients')}>
		👥 Pacientes
	</a>
</nav>

<main>
	{@render children()}
</main>

<style>
	:global(body) {
		margin: 0;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: #f5f5f5;
	}

	nav {
		background: #1a1a2e;
		padding: 1rem;
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	nav a {
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 8px;
		transition: background 0.2s;
	}

	nav a:hover,
	nav a.active {
		background: rgba(255, 255, 255, 0.2);
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}
</style>
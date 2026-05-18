<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { restoreSession, currentUser, token, clearSession } from '$lib/auth';
	import { goto } from '$app/navigation';

	let { children }: { children: Snippet } = $props();

	const pathname = $derived($page.url.pathname);
	let authChecked = $state(false);

	onMount(() => {
		restoreSession();
		authChecked = true;
	});

	$effect(() => {
		if (authChecked && !$token && pathname !== '/login') {
			goto('/login');
		}
	});

	function handleLogout() {
		clearSession();
		goto('/login');
	}
</script>

{#if authChecked}
	{#if $token && pathname !== '/login'}
		<nav>
			<div class="nav-links">
				<a href="/" class:active={pathname === '/'}>
					🏠 Camas
				</a>
				<a href="/patients" class:active={pathname.startsWith('/patients')}>
					👥 Pacientes
				</a>
				{#if $currentUser?.role === 'admin'}
					<a href="/beds" class:active={pathname.startsWith('/beds')}>
						🛏️ Gestión Camas
					</a>
					<a href="/bed-types" class:active={pathname.startsWith('/bed-types')}>
						🏷️ Tipos de Cama
					</a>
					<a href="/users" class:active={pathname.startsWith('/users')}>
						👤 Usuarios
					</a>
				{/if}
			</div>
			<div class="user-info">
				<span class="username">👤 {$currentUser?.full_name}</span>
				<button class="logout-btn" onclick={handleLogout}>Salir</button>
			</div>
		</nav>
	{/if}

	<main>
		{@render children()}
	</main>
{/if}

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
		justify-content: space-between;
		align-items: center;
	}

	.nav-links {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
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

	.user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.username {
		color: #e0e0e0;
		font-size: 0.9rem;
	}

	.logout-btn {
		background: rgba(255, 60, 60, 0.2);
		color: #ffcccc;
		border: 1px solid rgba(255, 60, 60, 0.5);
		padding: 0.4rem 0.8rem;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		background: rgba(255, 60, 60, 0.4);
		color: white;
	}

	main {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
	}
</style>
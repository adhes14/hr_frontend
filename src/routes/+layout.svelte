<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { restoreSession, currentUser, token, clearSession } from '$lib/auth';
	import { goto } from '$app/navigation';
	import { pwaInfo } from 'virtual:pwa-info';
	import { connectSSE, disconnectSSE, requestNotificationPermission, pendingOrdersCount, ordersUpdateTrigger } from '$lib/sse';
	import { listPendingOrders } from '$lib/api/client';

	let { children }: { children: Snippet } = $props();

	let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

	const pathname = $derived($page.url.pathname);
	let authChecked = $state(false);
	let menuOpen = $state(false);

	onMount(() => {
		restoreSession();
		authChecked = true;
		requestNotificationPermission();
		updatePendingCount();
	});

	$effect(() => {
		if ($ordersUpdateTrigger > 0) {
			updatePendingCount();
		}
	});

	async function updatePendingCount() {
		if (!$token) return;
		try {
			const pending = await listPendingOrders();
			pendingOrdersCount.set(pending.length);
		} catch (e) {
			console.error('Failed to get pending orders count', e);
		}
	}

	$effect(() => {
		if (authChecked) {
			if (!$token && pathname !== '/login') {
				goto('/login');
			}
			if ($token) {
				connectSSE();
			} else {
				disconnectSSE();
			}
		}
	});

	function handleLogout() {
		clearSession();
		menuOpen = false;
		goto('/login');
	}

	function toggleMenu() {
		menuOpen = !menuOpen;
	}
	
	function closeMenu() {
		menuOpen = false;
	}
</script>

<svelte:head>
	{@html webManifestLink}
</svelte:head>

{#if authChecked}
	{#if $token && pathname !== '/login'}
		<header class="topbar">
			<div class="topbar-container">
				<div class="logo">
					<span class="logo-icon">🏥</span>
					<span class="logo-text">Hospital Manager</span>
				</div>
				
				<button class="hamburger" onclick={toggleMenu} aria-label="Menu" aria-expanded={menuOpen}>
					<span class="bar {menuOpen ? 'open' : ''}"></span>
					<span class="bar {menuOpen ? 'open' : ''}"></span>
					<span class="bar {menuOpen ? 'open' : ''}"></span>
				</button>

				<nav class="desktop-nav">
					<a href="/" class:active={pathname === '/'}>🏠 Camas</a>
					<a href="/patients" class:active={pathname.startsWith('/patients')}>👥 Pacientes</a>
					<a href="/quirofano" class:active={pathname.startsWith('/quirofano')}>📅 Quirófano</a>
					<a href="/pendientes" class:active={pathname.startsWith('/pendientes')}>
						📋 Pendientes
						{#if $pendingOrdersCount > 0}
							<span class="nav-badge">{$pendingOrdersCount}</span>
						{/if}
					</a>
					{#if $currentUser?.role === 'admin'}
						<a href="/admin" class:active={pathname.startsWith('/admin')}>⚙️ Panel Admin</a>
					{/if}
				</nav>

				<div class="desktop-user">
					<span class="username">{$currentUser?.full_name}</span>
					<button class="logout-btn" onclick={handleLogout}>Salir</button>
				</div>
			</div>
		</header>

		<!-- Mobile Menu Drawer -->
		<div class="mobile-menu {menuOpen ? 'is-open' : ''}">
			<nav class="mobile-nav">
				<a href="/" class:active={pathname === '/'} onclick={closeMenu}>🏠 Camas</a>
				<a href="/patients" class:active={pathname.startsWith('/patients')} onclick={closeMenu}>👥 Pacientes</a>
				<a href="/quirofano" class:active={pathname.startsWith('/quirofano')} onclick={closeMenu}>📅 Quirófano</a>
				<a href="/pendientes" class:active={pathname.startsWith('/pendientes')} onclick={closeMenu}>
					📋 Pendientes
					{#if $pendingOrdersCount > 0}
						<span class="nav-badge">{$pendingOrdersCount}</span>
					{/if}
				</a>
				{#if $currentUser?.role === 'admin'}
					<a href="/admin" class:active={pathname.startsWith('/admin')} onclick={closeMenu}>⚙️ Panel Admin</a>
				{/if}
			</nav>
			<div class="mobile-user-section">
				<span class="mobile-username">Usuario: {$currentUser?.full_name}</span>
				<button class="mobile-logout-btn" onclick={handleLogout}>Cerrar Sesión</button>
			</div>
		</div>
		{#if menuOpen}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div class="overlay" onclick={closeMenu}></div>
		{/if}
	{/if}

	<main class={$token && pathname !== '/login' ? 'with-nav' : ''}>
		{@render children()}
	</main>
{/if}

<style>
	/* Topbar */
	.topbar {
		background: var(--surface);
		box-shadow: var(--shadow-sm);
		position: sticky;
		top: 0;
		z-index: 50;
		border-bottom: 1px solid var(--border-color);
	}

	.topbar-container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0.75rem 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.logo {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 700;
		font-size: 1.125rem;
		color: var(--secondary);
	}

	.logo-text {
		display: none;
	}

	/* Hamburger Button */
	.hamburger {
		display: flex;
		flex-direction: column;
		justify-content: space-around;
		width: 30px;
		height: 24px;
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0;
		z-index: 60;
	}

	.hamburger .bar {
		width: 30px;
		height: 3px;
		background: var(--text-main);
		border-radius: 10px;
		transition: all 0.3s linear;
		position: relative;
		transform-origin: 1px;
	}

	.hamburger .bar.open:nth-child(1) {
		transform: rotate(45deg);
	}

	.hamburger .bar.open:nth-child(2) {
		opacity: 0;
		transform: translateX(20px);
	}

	.hamburger .bar.open:nth-child(3) {
		transform: rotate(-45deg);
	}

	/* Desktop Navigation (Hidden on Mobile) */
	.desktop-nav {
		display: none;
	}

	.desktop-user {
		display: none;
	}

	/* Mobile Menu */
	.mobile-menu {
		position: fixed;
		top: 60px; /* Below topbar */
		left: -100%;
		width: 80%;
		max-width: 300px;
		height: calc(100vh - 60px);
		background: var(--surface);
		box-shadow: var(--shadow-lg);
		transition: left 0.3s ease-in-out;
		z-index: 55;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
	}

	.mobile-menu.is-open {
		left: 0;
	}

	.mobile-nav {
		display: flex;
		flex-direction: column;
		padding: 1rem 0;
	}

	.mobile-nav a {
		padding: 1rem 1.5rem;
		color: var(--text-main);
		font-weight: 500;
		border-left: 4px solid transparent;
	}

	.mobile-nav a:active, .mobile-nav a.active {
		background: var(--info-bg);
		color: var(--primary);
		border-left-color: var(--primary);
	}

	.mobile-user-section {
		padding: 1.5rem;
		border-top: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.mobile-username {
		font-weight: 600;
		color: var(--secondary);
	}

	.mobile-logout-btn, .logout-btn {
		background: var(--danger-bg);
		color: var(--danger);
		border: 1px solid rgba(239, 68, 68, 0.2);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mobile-logout-btn:active, .logout-btn:hover {
		background: var(--danger);
		color: white;
	}

	.overlay {
		position: fixed;
		top: 60px;
		left: 0;
		width: 100vw;
		height: calc(100vh - 60px);
		background: rgba(0, 0, 0, 0.4);
		z-index: 50;
		backdrop-filter: blur(2px);
	}

	main {
		width: 100%;
		min-height: 100vh;
	}

	main.with-nav {
		max-width: 1400px;
		margin: 0 auto;
		padding: 1rem;
		min-height: calc(100vh - 60px);
	}

	.nav-badge {
		background: #e74c3c;
		color: white;
		border-radius: 9999px;
		padding: 0.125rem 0.375rem;
		font-size: 0.75rem;
		font-weight: bold;
		margin-left: 0.25rem;
		display: inline-block;
	}

	/* Desktop Adjustments */
	@media (min-width: 768px) {
		.hamburger {
			display: none;
		}

		.logo-text {
			display: block;
		}

		.mobile-menu, .overlay {
			display: none;
		}

		.desktop-nav {
			display: flex;
			gap: 0.5rem;
		}

		.desktop-nav a {
			color: var(--text-muted);
			font-weight: 500;
			padding: 0.5rem 0.75rem;
			border-radius: var(--border-radius-md);
			transition: all 0.2s;
		}

		.desktop-nav a:hover {
			color: var(--text-main);
			background: var(--background);
		}

		.desktop-nav a.active {
			color: var(--primary);
			background: var(--info-bg);
		}

		.desktop-user {
			display: flex;
			align-items: center;
			gap: 1rem;
		}

		.username {
			font-weight: 500;
			color: var(--secondary);
		}
	}
</style>
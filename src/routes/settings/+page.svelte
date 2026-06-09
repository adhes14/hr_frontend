<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
</script>

<svelte:head>
	<title>Configuración - Hospital</title>
</svelte:head>

<div class="settings-page">
	<div class="settings-header">
		<h1>⚙️ Configuración</h1>
		<p class="subtitle">Administra tus preferencias y seguridad de cuenta</p>
	</div>

	<div class="settings-sections">
		<div class="settings-section">
			<h2>Seguridad</h2>
			<div class="section-content">
				<a href="/settings/password" class="settings-link">
					<span class="link-icon">🔑</span>
					<div class="link-text">
						<span class="link-title">Cambiar Contraseña</span>
						<span class="link-desc">Actualiza tu contraseña de acceso</span>
					</div>
					<span class="link-arrow">→</span>
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.settings-page {
		max-width: 700px;
		margin: 0 auto;
		padding: 1.5rem 0;
	}

	.settings-header {
		margin-bottom: 2rem;
	}

	h1 {
		color: var(--secondary);
		font-size: 1.75rem;
		font-weight: 700;
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		color: var(--text-muted);
		font-size: 0.95rem;
		margin: 0;
	}

	.settings-section {
		background: var(--surface);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-lg);
		padding: 1.5rem;
		box-shadow: var(--shadow-sm);
	}

	h2 {
		color: var(--text-muted);
		font-size: 0.8125rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		margin: 0 0 1rem 0;
	}

	.section-content {
		display: flex;
		flex-direction: column;
	}

	.settings-link {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border-radius: var(--border-radius-md);
		text-decoration: none;
		color: var(--text-main);
		transition: background 0.15s ease;
	}

	.settings-link:hover {
		background: var(--background);
	}

	.link-icon {
		font-size: 1.5rem;
		flex-shrink: 0;
	}

	.link-text {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.link-title {
		font-weight: 600;
		font-size: 1rem;
		color: var(--secondary);
	}

	.link-desc {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.link-arrow {
		font-size: 1.25rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}
</style>

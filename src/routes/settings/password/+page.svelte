<script lang="ts">
	import { goto } from '$app/navigation';
	import { changeMyPassword } from '$lib/api/client';
	import PasswordInput from '$lib/components/PasswordInput.svelte';

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let errorMsg = $state('');
	let successMsg = $state('');
	let loading = $state(false);

	let newPasswordErrors = $state<string[]>([]);

	function handleNewPasswordErrors(errors: string[]) {
		newPasswordErrors = errors;
	}

	const passwordsMatch = $derived(newPassword === confirmPassword);
	const newPasswordValid = $derived(newPasswordErrors.length === 0 && newPassword.length > 0);
	const canSubmit = $derived(
		currentPassword.length > 0 &&
		newPasswordValid &&
		confirmPassword.length > 0 &&
		passwordsMatch &&
		!loading
	);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMsg = '';
		successMsg = '';

		if (!currentPassword) {
			errorMsg = 'Debes ingresar tu contraseña actual';
			return;
		}

		if (!passwordsMatch) {
			errorMsg = 'Las contraseñas no coinciden';
			return;
		}

		if (!newPasswordValid) {
			errorMsg = 'La nueva contraseña no cumple con los requisitos';
			return;
		}

		loading = true;

		try {
			await changeMyPassword({
				current_password: currentPassword,
				new_password: newPassword,
				confirm_password: confirmPassword
			});

			successMsg = 'Contraseña cambiada exitosamente';
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
		} catch (e: any) {
			errorMsg = e.message || 'Error al cambiar la contraseña';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Cambiar Contraseña - Hospital</title>
</svelte:head>

<div class="password-change-page">
	<div class="back-link">
		<a href="/settings">← Volver a Configuración</a>
	</div>

	<div class="password-card">
		<div class="icon">
			🔑
		</div>
		<h1>Cambiar Contraseña</h1>
		<p class="subtitle">
			Ingresa tu contraseña actual y la nueva contraseña que deseas usar.
		</p>

		<form onsubmit={handleSubmit}>
			<div class="field-group">
				<label for="current-password" class="field-label">Contraseña Actual</label>
				<input
					id="current-password"
					type="password"
					bind:value={currentPassword}
					class="text-field"
					placeholder="Ingresa tu contraseña actual"
				/>
			</div>

			<div class="field-group">
				<PasswordInput
					bind:value={newPassword}
					label="Nueva Contraseña"
					showValidation={true}
					onErrors={handleNewPasswordErrors}
				/>
			</div>

			<div class="field-group">
				<PasswordInput
					bind:value={confirmPassword}
					label="Confirmar Nueva Contraseña"
					showValidation={false}
				/>
				{#if confirmPassword.length > 0 && !passwordsMatch}
					<p class="validation-error">Las contraseñas no coinciden</p>
				{/if}
			</div>

			{#if errorMsg}
				<div class="error-msg">{errorMsg}</div>
			{/if}

			{#if successMsg}
				<div class="success-toast">
					<span class="toast-icon">✓</span>
					<span>{successMsg}</span>
				</div>
			{/if}

			<button type="submit" disabled={!canSubmit}>
				{loading ? 'Cambiando...' : 'Cambiar Contraseña'}
			</button>
		</form>
	</div>
</div>

<style>
	.password-change-page {
		max-width: 520px;
		margin: 0 auto;
		padding: 1.5rem 0;
	}

	.back-link {
		margin-bottom: 1.5rem;
	}

	.back-link a {
		color: var(--text-muted);
		text-decoration: none;
		font-size: 0.9rem;
		font-weight: 500;
		transition: color 0.15s ease;
	}

	.back-link a:hover {
		color: var(--primary);
	}

	.password-card {
		background: var(--surface);
		border: 1px solid var(--border-color);
		padding: 2.5rem;
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-md);
		text-align: center;
	}

	.icon {
		font-size: 2.5rem;
		margin-bottom: 0.75rem;
	}

	h1 {
		color: var(--secondary);
		margin: 0 0 0.5rem 0;
		font-size: 1.375rem;
		font-weight: 700;
	}

	.subtitle {
		color: var(--text-muted);
		margin-bottom: 2rem;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
		text-align: left;
	}

	.field-group {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.text-field {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-size: 1rem;
		color: var(--text-main);
		background: var(--background);
		font-family: inherit;
		outline: none;
		transition: all 0.2s ease;
		box-sizing: border-box;
	}

	.text-field:focus {
		border-color: var(--primary);
		background: var(--surface);
		box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
	}

	.text-field::placeholder {
		color: var(--text-muted);
		opacity: 0.5;
	}

	.validation-error {
		color: var(--danger);
		font-size: 0.8125rem;
		margin: 0.25rem 0 0 0;
		font-weight: 500;
	}

	.error-msg {
		color: var(--danger);
		background: var(--danger-bg);
		padding: 0.875rem;
		border-radius: var(--border-radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	.success-toast {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--success);
		background: rgba(16, 185, 129, 0.1);
		padding: 0.875rem;
		border-radius: var(--border-radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		border: 1px solid rgba(16, 185, 129, 0.2);
	}

	.toast-icon {
		flex-shrink: 0;
		font-weight: 700;
	}

	button {
		background: var(--primary);
		color: white;
		border: none;
		padding: 1rem;
		border-radius: var(--border-radius-md);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		margin-top: 0.5rem;
		box-shadow: var(--shadow-md);
	}

	button:hover:not(:disabled) {
		background: var(--primary-hover);
		transform: translateY(-1px);
		box-shadow: var(--shadow-lg);
	}

	button:active:not(:disabled) {
		transform: translateY(0);
	}

	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		background: var(--text-muted);
	}
</style>

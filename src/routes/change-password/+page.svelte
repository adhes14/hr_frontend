<script lang="ts">
	import { goto } from '$app/navigation';
	import { changeMyPassword } from '$lib/api/client';
	import { saveSession } from '$lib/auth';
	import PasswordInput from '$lib/components/PasswordInput.svelte';

	let newPassword = $state('');
	let confirmPassword = $state('');
	let errorMsg = $state('');
	let successMsg = $state('');
	let loading = $state(false);

	let newPasswordErrors = $state<string[]>([]);
	let confirmPasswordErrors = $state<string[]>([]);

	function handleNewPasswordErrors(errors: string[]) {
		newPasswordErrors = errors;
	}

	function handleConfirmPasswordErrors(errors: string[]) {
		confirmPasswordErrors = errors;
	}

	const passwordsMatch = $derived(newPassword === confirmPassword);
	const newPasswordValid = $derived(newPasswordErrors.length === 0 && newPassword.length > 0);
	const canSubmit = $derived(
		newPasswordValid &&
		confirmPassword.length > 0 &&
		passwordsMatch &&
		!loading
	);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		errorMsg = '';
		successMsg = '';

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
			const res = await changeMyPassword({
				new_password: newPassword,
				confirm_password: confirmPassword
			});

			saveSession(res.token, res.user);

			successMsg = 'Contraseña cambiada exitosamente';
			goto('/');
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

<div class="change-password-container">
	<div class="change-password-card">
		<div class="icon">
			🔒
		</div>
		<h1>Cambio de Contraseña Obligatorio</h1>
		<p class="subtitle">
			Por razones de seguridad, debes cambiar tu contraseña antes de continuar.
		</p>

		<form onsubmit={handleSubmit}>
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
					label="Confirmar Contraseña"
					showValidation={false}
					onErrors={handleConfirmPasswordErrors}
				/>
				{#if confirmPassword.length > 0 && !passwordsMatch}
					<p class="validation-error">Las contraseñas no coinciden</p>
				{/if}
			</div>

			{#if errorMsg}
				<div class="error-msg">{errorMsg}</div>
			{/if}

			{#if successMsg}
				<div class="success-msg">{successMsg}</div>
			{/if}

			<button type="submit" disabled={!canSubmit}>
				{loading ? 'Cambiando...' : 'Cambiar Contraseña'}
			</button>
		</form>
	</div>
</div>

<style>
	.change-password-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: calc(100vh - 60px);
		background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
		margin: -1rem;
		padding: 1rem;
	}

	.change-password-card {
		background: var(--surface);
		border: 1px solid var(--border-color);
		padding: 3rem 2.5rem;
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-lg);
		width: 100%;
		max-width: 480px;
		text-align: center;
	}

	.icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	h1 {
		color: var(--secondary);
		margin: 0 0 0.75rem 0;
		font-size: 1.5rem;
		font-weight: 700;
	}

	.subtitle {
		color: var(--text-muted);
		margin-bottom: 2rem;
		font-size: 0.95rem;
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
		gap: 0.25rem;
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

	.success-msg {
		color: var(--success);
		background: rgba(16, 185, 129, 0.1);
		padding: 0.875rem;
		border-radius: var(--border-radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		text-align: center;
		border: 1px solid rgba(16, 185, 129, 0.2);
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

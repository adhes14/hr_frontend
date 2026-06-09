<script lang="ts">
	import { goto } from '$app/navigation';
	import { login } from '$lib/api/auth';
	import { saveSession } from '$lib/auth';

	let username = $state('');
	let password = $state('');
	let errorMsg = $state('');
	let loading = $state(false);

	async function handleLogin(e: Event) {
		e.preventDefault();
		errorMsg = '';
		loading = true;

		try {
			const res = await login(username, password);
			saveSession(res.token, res.user);
			if (res.user.must_change_password) {
				goto('/change-password');
			} else {
				goto('/');
			}
		} catch (e: any) {
			errorMsg = e.message || 'Error de inicio de sesión';
		} finally {
			loading = false;
		}
	}
</script>

<div class="login-container">
	<div class="login-card">
		<div class="logo">
			🏥
		</div>
		<h1>Hospital Manager</h1>
		<p class="subtitle">Inicia sesión en tu cuenta</p>

		<form onsubmit={handleLogin}>
			<div class="form-group">
				<label for="username">Usuario</label>
				<input 
					type="text" 
					id="username" 
					bind:value={username} 
					required 
					placeholder="Ingresa tu usuario"
				/>
			</div>

			<div class="form-group">
				<label for="password">Contraseña</label>
				<input 
					type="password" 
					id="password" 
					bind:value={password} 
					required 
					placeholder="Ingresa tu contraseña"
				/>
			</div>

			{#if errorMsg}
				<div class="error-msg">{errorMsg}</div>
			{/if}

			<button type="submit" disabled={loading}>
				{loading ? 'Iniciando...' : 'Iniciar Sesión'}
			</button>
		</form>
	</div>
</div>

<style>
	/* Background handled globally, but we can add a subtle pattern here */
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%);
		margin: -1rem; /* Negate layout padding if any */
		padding: 1rem;
	}

	.login-card {
		background: var(--glass-bg);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		border: 1px solid var(--glass-border);
		padding: 3rem 2.5rem;
		border-radius: var(--border-radius-xl);
		box-shadow: var(--glass-shadow), var(--shadow-lg);
		width: 100%;
		max-width: 420px;
		text-align: center;
	}

	.logo {
		font-size: 3.5rem;
		margin-bottom: 0.5rem;
		animation: float 3s ease-in-out infinite;
	}

	@keyframes float {
		0% { transform: translateY(0px); }
		50% { transform: translateY(-10px); }
		100% { transform: translateY(0px); }
	}

	h1 {
		color: var(--secondary);
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
	}

	.subtitle {
		color: var(--text-muted);
		margin-bottom: 2.5rem;
		font-size: 0.95rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		text-align: left;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		color: var(--secondary);
		font-size: 0.875rem;
		font-weight: 600;
	}

	input {
		padding: 0.875rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-size: 1rem;
		background: var(--surface);
		transition: all 0.2s ease;
	}

	input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
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
</style>

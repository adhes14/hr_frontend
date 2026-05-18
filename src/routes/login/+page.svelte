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
			goto('/');
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
	:global(body) {
		background: #f0f2f5;
	}

	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: calc(100vh - 100px); /* Account for padding */
	}

	.login-card {
		background: white;
		padding: 2.5rem;
		border-radius: 16px;
		box-shadow: 0 10px 25px rgba(0,0,0,0.05);
		width: 100%;
		max-width: 400px;
		text-align: center;
	}

	.logo {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	h1 {
		color: #1a1a2e;
		margin: 0 0 0.5rem 0;
		font-size: 1.5rem;
	}

	.subtitle {
		color: #666;
		margin-bottom: 2rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.2rem;
		text-align: left;
	}

	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		color: #444;
		font-size: 0.9rem;
		font-weight: 500;
	}

	input {
		padding: 0.8rem;
		border: 1px solid #ccc;
		border-radius: 8px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	input:focus {
		outline: none;
		border-color: #3f51b5;
		box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.2);
	}

	button {
		background: #3f51b5;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
		margin-top: 1rem;
	}

	button:hover:not(:disabled) {
		background: #303f9f;
	}

	button:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.error-msg {
		color: #d32f2f;
		background: #ffebee;
		padding: 0.8rem;
		border-radius: 8px;
		font-size: 0.9rem;
		text-align: center;
	}
</style>

<script lang="ts">
	import { validatePassword, PASSWORD_RULES } from '$lib/validation/password';

	let {
		value = $bindable(''),
		label = 'Contraseña',
		showValidation = false,
		onErrors
	}: {
		value: string;
		label: string;
		showValidation: boolean;
		onErrors?: (errors: string[]) => void;
	} = $props();

	let showPassword = $state(false);
	let focused = $state(false);

	const validation = $derived(validatePassword(value));
	const errorsToShow = $derived(showValidation ? validation.errors : []);

	const rulesWithStatus = $derived([
		{ description: PASSWORD_RULES[0].description, passed: value.length >= 6 },
		{ description: PASSWORD_RULES[1].description, passed: /[A-Z]/.test(value) },
		{ description: PASSWORD_RULES[2].description, passed: /[a-z]/.test(value) },
		{ description: PASSWORD_RULES[3].description, passed: /\d/.test(value) }
	]);

	const passedCount = $derived(rulesWithStatus.filter((r) => r.passed).length);

	$effect(() => {
		onErrors?.(errorsToShow);
	});

	function toggleVisibility() {
		showPassword = !showPassword;
	}
</script>

<div class="password-input">
	<label class="input-label" for="password-field">{label}</label>
	<div class="input-group" class:focused class:has-value={value.length > 0}>
		<input
			id="password-field"
			type={showPassword ? 'text' : 'password'}
			bind:value
			class="input-field"
			placeholder="••••••••"
			onfocus={() => (focused = true)}
			onblur={() => (focused = false)}
		/>
		<button
			type="button"
			class="toggle-btn"
			onclick={toggleVisibility}
			aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
			tabindex="-1"
		>
			{#if showPassword}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
					<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
					<line x1="1" y1="1" x2="23" y2="23" />
					<line x1="14.12" y1="14.12" x2="9.88" y2="9.88" />
				</svg>
			{:else}
				<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
			{/if}
		</button>
	</div>

	{#if showValidation && value.length > 0}
		<ul class="errors-list">
			{#each rulesWithStatus as rule}
				<li class="error-item" class:passed={rule.passed}>
					<span class="check-icon">
						{#if rule.passed}
							✓
						{:else}
							✗
						{/if}
					</span>
					<span>{rule.description}</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if showValidation && value.length > 0}
		<div class="strength-hint">
			{passedCount === 4
				? 'Contraseña válida'
				: `${passedCount} de 4 requisitos cumplidos`}
		</div>
	{/if}
</div>

<style>
	.password-input {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		width: 100%;
		box-sizing: border-box;
	}

	.input-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.input-group {
		display: flex;
		align-items: center;
		background: var(--background);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		transition: all 0.2s ease;
		overflow: hidden;
		box-sizing: border-box;
	}

	.input-group.focused {
		border-color: var(--primary);
		background: var(--surface);
		box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
	}

	.input-group.has-value:not(.focused) {
		border-color: rgba(15, 118, 110, 0.2);
	}

	.input-field {
		flex: 1;
		padding: 0.625rem 0.75rem;
		border: none;
		background: transparent;
		font-size: 1rem;
		color: var(--text-main);
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.input-field::placeholder {
		color: var(--text-muted);
		opacity: 0.5;
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.5rem 0.625rem;
		margin-right: 0.25rem;
		background: transparent;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		border-radius: var(--border-radius-sm);
		transition: all 0.15s ease;
		flex-shrink: 0;
	}

	.toggle-btn:hover {
		color: var(--primary);
		background: rgba(15, 118, 110, 0.08);
	}

	.toggle-btn svg {
		display: block;
	}

	.errors-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.error-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--danger);
		transition: color 0.2s ease;
	}

	.error-item.passed {
		color: var(--success);
	}

	.check-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 18px;
		height: 18px;
		font-size: 0.75rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	.strength-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		margin-top: 0.125rem;
	}
</style>

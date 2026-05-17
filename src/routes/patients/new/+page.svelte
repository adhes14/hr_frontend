<script lang="ts">
	import { createPatient } from '$lib/api/client';
	import { goto } from '$app/navigation';

	let identityNumber = $state('');
	let fullName = $state('');
	let birthDate = $state('');
	let gestas = $state(0);
	let partos = $state(0);
	let cesareas = $state(0);
	let abortos = $state(0);
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit() {
		if (!identityNumber || !fullName || !birthDate) {
			error = 'Todos los campos son obligatorios';
			return;
		}

		loading = true;
		error = null;

		try {
			const obstetric_history = {
				gestas: gestas,
				partos: partos,
				cesareas: cesareas,
				abortos: abortos
			};

			await createPatient({
				identity_number: identityNumber,
				full_name: fullName,
				birth_date: birthDate,
				obstetric_history
			});

			goto('/patients/search');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al crear paciente';
		} finally {
			loading = false;
		}
	}
</script>

<svelte:head>
	<title>Nuevo Paciente - Hospital</title>
</svelte:head>

<div class="form-page">
	<h1>Nuevo Paciente</h1>

	{#if error}
		<div class="error">{error}</div>
	{/if}

	<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
		<div class="field">
			<label for="identity">DNI / Documento</label>
			<input
				id="identity"
				type="text"
				placeholder="12345678"
				bind:value={identityNumber}
				required
			/>
		</div>

		<div class="field">
			<label for="name">Nombre Completo</label>
			<input
				id="name"
				type="text"
				placeholder="María García"
				bind:value={fullName}
				required
			/>
		</div>

		<div class="field">
			<label for="birth">Fecha de Nacimiento</label>
			<input
				id="birth"
				type="date"
				bind:value={birthDate}
				required
			/>
		</div>

		<fieldset class="obstetric-fieldset">
			<legend>Antecedentes Obstétricos</legend>
			<p class="fieldset-hint">Gestas, Partos, Cesáreas, Abortos</p>

			<div class="obstetric-grid">
				<div class="obstetric-field">
					<label for="gestas">Gestas (G)</label>
					<input
						id="gestas"
						type="number"
						min="0"
						bind:value={gestas}
					/>
				</div>

				<div class="obstetric-field">
					<label for="partos">Partos (P)</label>
					<input
						id="partos"
						type="number"
						min="0"
						bind:value={partos}
					/>
				</div>

				<div class="obstetric-field">
					<label for="cesareas">Cesáreas (C)</label>
					<input
						id="cesareas"
						type="number"
						min="0"
						bind:value={cesareas}
					/>
				</div>

				<div class="obstetric-field">
					<label for="abortos">Abortos (A)</label>
					<input
						id="abortos"
						type="number"
						min="0"
						bind:value={abortos}
					/>
				</div>
			</div>
		</fieldset>

		<button type="submit" disabled={loading}>
			{loading ? 'Creando...' : 'Crear Paciente'}
		</button>
	</form>
</div>

<style>
	.form-page {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
		max-width: 600px;
		margin: 0 auto;
	}

	h1 {
		margin: 0 0 1.5rem 0;
		color: #1a1a2e;
	}

	.error {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 0.75rem;
		color: #c00;
		margin-bottom: 1rem;
	}

	.field {
		margin-bottom: 1rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #333;
	}

	input, textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
	}

	input:focus, textarea:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.obstetric-fieldset {
		border: 2px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
		margin-bottom: 1rem;
	}

	.obstetric-fieldset legend {
		font-weight: 600;
		color: #1a1a2e;
		padding: 0 0.5rem;
	}

	.fieldset-hint {
		color: #666;
		font-size: 0.875rem;
		margin: 0 0 1rem 0;
	}

	.obstetric-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	.obstetric-field label {
		font-size: 0.875rem;
		margin-bottom: 0.25rem;
	}

	.obstetric-field input {
		text-align: center;
		font-weight: 600;
	}

	.hint {
		display: block;
		margin-top: 0.25rem;
		color: #666;
		font-size: 0.875rem;
	}

	button[type="submit"] {
		width: 100%;
		background: #2ecc71;
		color: white;
		border: none;
		padding: 1rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		margin-top: 1rem;
	}

	button[type="submit"]:hover:not(:disabled) {
		background: #27ae60;
	}

	button[type="submit"]:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
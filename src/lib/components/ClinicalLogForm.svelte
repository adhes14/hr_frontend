<script lang="ts">
	import { createClinicalLog } from '$lib/api/client';
	import type { CreateClinicalLogInput } from '$lib/api/client';
	import VitalSelector from './VitalSelector.svelte';

	let {
		admissionId,
		onsuccess
	}: {
		admissionId: string;
		onsuccess: (nextControlAt: string | null) => void;
	} = $props();

	// Vital signs state
	let paSystolic = $state(120);
	let paDiastolic = $state(80);
	let heartRate = $state(80);
	let respRate = $state(18);
	let temperature = $state(36.5);
	let spo2 = $state(98);

	// Obstetric state
	let pinardStatus = $state<boolean | null>(null);
	let lochiaType = $state<number | null>(null);
	let lochiaAmount = $state<number | null>(null);
	let lochiaOdor = $state<boolean | null>(null);
	let hasClots = $state<boolean | null>(null);

	// Notes
	let notes = $state('');

	// Form state
	let loading = $state(false);
	let error = $state<string | null>(null);

	const isValid = $derived(
		pinardStatus !== null &&
		lochiaType !== null &&
		lochiaAmount !== null &&
		lochiaOdor !== null &&
		hasClots !== null
	);

	const charsRemaining = $derived(500 - notes.length);

	async function handleSubmit() {
		if (!isValid) return;

		loading = true;
		error = null;

		const input: CreateClinicalLogInput = {
			pa_systolic: paSystolic,
			pa_diastolic: paDiastolic,
			heart_rate: heartRate,
			resp_rate: respRate,
			temperature,
			spo2,
			pinard_status: pinardStatus!,
			lochia_type: lochiaType!,
			lochia_amount: lochiaAmount!,
			lochia_odor: lochiaOdor!,
			has_clots: hasClots!,
			notes: notes.trim() || undefined
		};

		try {
			const response = await createClinicalLog(admissionId, input);
			onsuccess(response.next_control_at);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al registrar control';
		} finally {
			loading = false;
		}
	}
</script>

<form class="clinical-log-form" onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	<!-- Signos Vitales -->
	<section class="section">
		<h3 class="section-header">Signos Vitales</h3>
		<div class="vitals-grid">
			<VitalSelector
				label="PA Sistólica"
				value={paSystolic}
				min={50}
				max={300}
				step={5}
				unit="mmHg"
				onchange={(v) => paSystolic = v}
			/>
			<VitalSelector
				label="PA Diastólica"
				value={paDiastolic}
				min={30}
				max={200}
				step={5}
				unit="mmHg"
				onchange={(v) => paDiastolic = v}
			/>
			<VitalSelector
				label="Frecuencia Cardíaca"
				value={heartRate}
				min={30}
				max={250}
				step={1}
				unit="bpm"
				onchange={(v) => heartRate = v}
			/>
			<VitalSelector
				label="Frecuencia Respiratoria"
				value={respRate}
				min={5}
				max={60}
				step={1}
				unit="rpm"
				onchange={(v) => respRate = v}
			/>
			<VitalSelector
				label="Temperatura"
				value={temperature}
				min={30}
				max={45}
				step={0.1}
				unit="°C"
				onchange={(v) => temperature = v}
			/>
			<VitalSelector
				label="SpO2"
				value={spo2}
				min={50}
				max={100}
				step={1}
				unit="%"
				onchange={(v) => spo2 = v}
			/>
		</div>
	</section>

	<!-- Parámetros Obstétricos -->
	<section class="section">
		<h3 class="section-header">Parámetros Obstétricos</h3>

		<div class="param-group">
			<span class="param-label">Pinard</span>
			<div class="toggle-group">
				<button
					type="button"
					class="toggle-btn"
					class:active={pinardStatus === true}
					onclick={() => pinardStatus = true}
				>
					Satisfactorio
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={pinardStatus === false}
					onclick={() => pinardStatus = false}
				>
					No Satisfactorio
				</button>
			</div>
		</div>

		<div class="param-group">
			<span class="param-label">Tipo de Loquios</span>
			<div class="toggle-group three">
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaType === 1}
					onclick={() => lochiaType = 1}
				>
					Rubra
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaType === 2}
					onclick={() => lochiaType = 2}
				>
					Serosa
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaType === 3}
					onclick={() => lochiaType = 3}
				>
					Alba
				</button>
			</div>
		</div>

		<div class="param-group">
			<span class="param-label">Cantidad de Loquios</span>
			<div class="toggle-group three">
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaAmount === 1}
					onclick={() => lochiaAmount = 1}
				>
					Escaso
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaAmount === 2}
					onclick={() => lochiaAmount = 2}
				>
					Moderado
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaAmount === 3}
					onclick={() => lochiaAmount = 3}
				>
					Abundante
				</button>
			</div>
		</div>

		<div class="param-group">
			<span class="param-label">Olor de Loquios</span>
			<div class="toggle-group">
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaOdor === true}
					onclick={() => lochiaOdor = true}
				>
					Normal
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaOdor === false}
					onclick={() => lochiaOdor = false}
				>
					Fétido
				</button>
			</div>
		</div>

		<div class="param-group">
			<span class="param-label">Coágulos</span>
			<div class="toggle-group">
				<button
					type="button"
					class="toggle-btn"
					class:active={hasClots === false}
					onclick={() => hasClots = false}
				>
					No
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={hasClots === true}
					onclick={() => hasClots = true}
				>
					Sí
				</button>
			</div>
		</div>
	</section>

	<!-- Notas -->
	<section class="section">
		<h3 class="section-header">Notas</h3>
		<div class="notes-group">
			<textarea
				bind:value={notes}
				maxlength="500"
				placeholder="Observaciones adicionales..."
				rows={3}
			></textarea>
			<span class="char-counter">{charsRemaining} caracteres restantes</span>
		</div>
	</section>

	<div class="submit-area">
		<button type="submit" class="btn-submit" disabled={!isValid || loading}>
			{loading ? 'Guardando...' : 'Registrar Control'}
		</button>
	</div>
</form>

<style>
	.clinical-log-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.error-banner {
		background: #fee;
		border: 1px solid #fcc;
		border-radius: 8px;
		padding: 0.75rem;
		color: #c00;
		text-align: center;
	}

	.section {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
	}

	.section-header {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1a1a2e;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #f0f0f0;
	}

	.vitals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 1rem;
		justify-items: center;
	}

	.param-group {
		margin-bottom: 1rem;
	}

	.param-group:last-child {
		margin-bottom: 0;
	}

	.param-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: #555;
		margin-bottom: 0.5rem;
	}

	.toggle-group {
		display: flex;
		gap: 0.5rem;
	}

	.toggle-group.three {
		gap: 0.375rem;
	}

	.toggle-btn {
		flex: 1;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		background: white;
		color: #333;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.toggle-btn:hover:not(.active) {
		border-color: #1a1a2e;
	}

	.toggle-btn.active {
		background: #1a1a2e;
		border-color: #1a1a2e;
		color: white;
	}

	.notes-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 8px;
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		box-sizing: border-box;
	}

	textarea:focus {
		outline: none;
		border-color: #1a1a2e;
	}

	.char-counter {
		font-size: 0.75rem;
		color: #888;
		text-align: right;
	}

	.submit-area {
		position: sticky;
		bottom: 0;
		background: #f5f5f5;
		padding: 1rem;
		margin: 0 -1rem;
		box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
	}

	.btn-submit {
		width: 100%;
		min-height: 48px;
		background: #2ecc71;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-submit:hover:not(:disabled) {
		background: #27ae60;
	}

	.btn-submit:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
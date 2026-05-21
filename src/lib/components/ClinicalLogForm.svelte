<script lang="ts">
	import { createClinicalLog } from "$lib/api/client";
	import type { CreateClinicalLogInput } from "$lib/api/client";
	import VitalSelector from "./VitalSelector.svelte";

	let {
		admissionId,
		onsuccess,
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
	let notes = $state("");

	// Form state
	let loading = $state(false);
	let error = $state<string | null>(null);

	const isValid = $derived(
		pinardStatus !== null &&
			lochiaType !== null &&
			lochiaAmount !== null &&
			lochiaOdor !== null &&
			hasClots !== null,
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
			notes: notes.trim() || undefined,
		};

		try {
			const response = await createClinicalLog(admissionId, input);
			onsuccess(response.next_control_at);
		} catch (e) {
			error =
				e instanceof Error ? e.message : "Error al registrar control";
		} finally {
			loading = false;
		}
	}
</script>

<form
	class="clinical-log-form"
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
>
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
				onchange={(v) => (paSystolic = v)}
			/>
			<VitalSelector
				label="PA Diastólica"
				value={paDiastolic}
				min={30}
				max={200}
				step={5}
				unit="mmHg"
				onchange={(v) => (paDiastolic = v)}
			/>
			<VitalSelector
				label="Frecuencia Cardíaca"
				value={heartRate}
				min={30}
				max={250}
				step={1}
				unit="bpm"
				onchange={(v) => (heartRate = v)}
			/>
			<VitalSelector
				label="Frecuencia Respiratoria"
				value={respRate}
				min={5}
				max={60}
				step={1}
				unit="rpm"
				onchange={(v) => (respRate = v)}
			/>
			<VitalSelector
				label="Temperatura"
				value={temperature}
				min={30}
				max={45}
				step={0.1}
				unit="°C"
				onchange={(v) => (temperature = v)}
			/>
			<VitalSelector
				label="SpO2"
				value={spo2}
				min={50}
				max={100}
				step={1}
				unit="%"
				onchange={(v) => (spo2 = v)}
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
					onclick={() => (pinardStatus = true)}
				>
					Satisfactorio
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={pinardStatus === false}
					onclick={() => (pinardStatus = false)}
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
					onclick={() => (lochiaType = 1)}
				>
					Hemático
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaType === 2}
					onclick={() => (lochiaType = 2)}
				>
					Serosa
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaType === 3}
					onclick={() => (lochiaType = 3)}
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
					onclick={() => (lochiaAmount = 1)}
				>
					Escaso
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaAmount === 2}
					onclick={() => (lochiaAmount = 2)}
				>
					Moderado
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaAmount === 3}
					onclick={() => (lochiaAmount = 3)}
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
					onclick={() => (lochiaOdor = true)}
				>
					Normal
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={lochiaOdor === false}
					onclick={() => (lochiaOdor = false)}
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
					onclick={() => (hasClots = false)}
				>
					No
				</button>
				<button
					type="button"
					class="toggle-btn"
					class:active={hasClots === true}
					onclick={() => (hasClots = true)}
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
			<span class="char-counter"
				>{charsRemaining} caracteres restantes</span
			>
		</div>
	</section>

	<div class="submit-area">
		<button type="submit" class="btn-submit" disabled={!isValid || loading}>
			{loading ? "Guardando..." : "Registrar Control"}
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
		background: var(--danger-bg);
		border: 1px solid rgba(220, 38, 38, 0.2);
		border-radius: var(--border-radius-md);
		padding: 0.75rem;
		color: var(--danger);
		text-align: center;
		font-weight: 500;
		font-size: 0.9rem;
	}

	.section {
		background: var(--surface);
		border-radius: var(--border-radius-lg);
		padding: 1.25rem;
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-sm);
	}

	.section-header {
		margin: 0 0 1.25rem 0;
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--secondary);
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-color);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.vitals-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.25rem;
		justify-items: center;
	}

	.param-group {
		margin-bottom: 1.25rem;
	}

	.param-group:last-child {
		margin-bottom: 0;
	}

	.param-label {
		display: block;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--text-muted);
		margin-bottom: 0.5rem;
	}

	.toggle-group {
		display: flex;
		background: var(--background);
		padding: 0.25rem;
		border-radius: var(--border-radius-md);
		border: 1px solid var(--border-color);
		width: 100%;
		box-sizing: border-box;
		gap: 0.25rem;
		flex-wrap: wrap;
	}

	.toggle-btn {
		flex: 1;
		min-width: 80px;
		min-height: 40px;
		padding: 0.5rem 0.75rem;
		border: 1px solid transparent;
		border-radius: calc(var(--border-radius-md) - 0.125rem);
		background: transparent;
		color: var(--text-muted);
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		text-align: center;
	}

	.toggle-btn:hover:not(.active) {
		color: var(--primary);
		background: rgba(15, 118, 110, 0.05);
	}

	.toggle-btn.active {
		background: var(--surface);
		color: var(--primary);
		box-shadow: var(--shadow-sm);
		border-color: rgba(15, 118, 110, 0.15);
	}

	.notes-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-size: 1rem;
		font-family: inherit;
		resize: vertical;
		box-sizing: border-box;
		background: var(--background);
		color: var(--text-main);
		transition: all 0.2s ease;
	}

	textarea:focus {
		outline: none;
		border-color: var(--primary);
		background: var(--surface);
		box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
	}

	.char-counter {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: right;
	}

	.submit-area {
		position: sticky;
		bottom: 1rem;
		background: var(--glass-bg);
		backdrop-filter: var(--glass-blur);
		-webkit-backdrop-filter: var(--glass-blur);
		border: 1px solid var(--glass-border);
		border-radius: var(--border-radius-lg);
		padding: 1rem;
		margin: 1.5rem 0 0 0;
		box-shadow: var(--glass-shadow);
		z-index: 10;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.btn-submit {
		width: 100%;
		min-height: 48px;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: var(--border-radius-md);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		box-shadow: var(--shadow-md);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.btn-submit:hover:not(:disabled) {
		background: var(--primary-hover);
		transform: translateY(-1px);
		box-shadow: var(--shadow-lg);
	}

	.btn-submit:active:not(:disabled) {
		transform: translateY(1px);
	}

	.btn-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
		background: var(--text-muted);
		box-shadow: none;
	}

	@media (max-width: 640px) {
		.clinical-log-form {
			gap: 1rem;
		}
		.section {
			padding: 0.875rem;
		}
		.section-header {
			font-size: 0.85rem;
			margin-bottom: 1rem;
			padding-bottom: 0.5rem;
		}
		.param-group {
			margin-bottom: 1rem;
		}
		.param-label {
			font-size: 0.8rem;
			margin-bottom: 0.375rem;
		}
		.toggle-btn {
			min-height: 36px;
			padding: 0.375rem 0.5rem;
			font-size: 0.8rem;
			min-width: 68px;
		}
		textarea {
			padding: 0.5rem;
			font-size: 0.9rem;
		}
		.submit-area {
			padding: 0.75rem;
			bottom: 0.5rem;
			margin-top: 1rem;
		}
		.btn-submit {
			min-height: 42px;
			font-size: 0.9rem;
		}
		.vitals-grid {
			grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		}
	}
</style>

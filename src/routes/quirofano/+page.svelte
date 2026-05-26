<script lang="ts">
	import { onMount } from 'svelte';
	import type { SurgicalSchedule, Patient } from '$lib/api/client';
	import { 
		getSurgicalSchedulesByMonth, 
		createSurgicalSchedule, 
		updateSurgicalSchedule, 
		deleteSurgicalSchedule,
		getSettings,
		searchPatients 
	} from '$lib/api/client';
	import { goto } from '$app/navigation';

	// Calendar state
	const today = new Date();
	let currentYear = $state(today.getFullYear());
	let currentMonth = $state(today.getMonth() + 1); // 1-12
	let selectedDate = $state(today.toISOString().split('T')[0]); // YYYY-MM-DD

	let monthSchedules = $state<SurgicalSchedule[]>([]);
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Configurable procedure types
	let procedureTypes = $state<string[]>([]);

	// Modal State
	let showModal = $state(false);
	let modalMode = $state<'create' | 'edit'>('create');
	let editingSchedule = $state<SurgicalSchedule | null>(null);

	// Form inputs
	let selectedPatientId = $state<string | null>(null);
	let selectedPatientName = $state('');
	let patientSearchQuery = $state('');
	let patientSearchResults = $state<Patient[]>([]);
	let searchingPatients = $state(false);
	let selectedProcedure = $state('');
	let scheduleDateTime = $state('');
	let preSurgicalDiagnosis = $state('');
	let formError = $state<string | null>(null);
	let formLoading = $state(false);

	const monthNames = [
		'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
		'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
	];

	const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

	// Derived calendar parameters
	const daysInMonth = $derived(new Date(currentYear, currentMonth, 0).getDate());
	const firstDayIndex = $derived(new Date(currentYear, currentMonth - 1, 1).getDay()); // 0: Sun, 1: Mon, etc.
	
	// Create complete list of days to display in calendar grid
	const calendarDays = $derived.by(() => {
		const days = [];
		// Padding days for previous month
		for (let i = 0; i < firstDayIndex; i++) {
			days.push({ day: null, dateString: '' });
		}
		// Current month days
		for (let d = 1; d <= daysInMonth; d++) {
			const monthStr = String(currentMonth).padStart(2, '0');
			const dayStr = String(d).padStart(2, '0');
			days.push({
				day: d,
				dateString: `${currentYear}-${monthStr}-${dayStr}`
			});
		}
		return days;
	});

	// Filter schedules for the selected date
	const selectedDateSchedules = $derived(
		monthSchedules.filter(s => s.scheduled_at.split('T')[0] === selectedDate)
	);

	// Load data
	async function loadSchedules() {
		loading = true;
		error = null;
		try {
			monthSchedules = await getSurgicalSchedulesByMonth(currentYear, currentMonth);
		} catch (e) {
			error = e instanceof Error ? e.message : 'Error al cargar programaciones';
		} finally {
			loading = false;
		}
	}

	async function loadSettings() {
		try {
			const settings = await getSettings();
			if (settings.surgical_procedure_types) {
				procedureTypes = JSON.parse(settings.surgical_procedure_types);
			} else {
				procedureTypes = ['Cesárea', 'Legrado', 'Laparoscopía', 'Colposcopía', 'Histeroscopía', 'Cirugía Electiva'];
			}
		} catch (e) {
			console.error('Error loading settings', e);
			procedureTypes = ['Cesárea', 'Legrado', 'Laparoscopía', 'Colposcopía', 'Histeroscopía', 'Cirugía Electiva'];
		}
	}

	onMount(async () => {
		await loadSettings();
		await loadSchedules();
	});

	// React to month changes
	$effect(() => {
		if (currentYear && currentMonth) {
			loadSchedules();
		}
	});

	function prevMonth() {
		if (currentMonth === 1) {
			currentMonth = 12;
			currentYear -= 1;
		} else {
			currentMonth -= 1;
		}
	}

	function nextMonth() {
		if (currentMonth === 12) {
			currentMonth = 1;
			currentYear += 1;
		} else {
			currentMonth += 1;
		}
	}

	function selectDay(dateString: string) {
		if (!dateString) return;
		selectedDate = dateString;
	}

	// Patient search for the schedule modal
	async function handlePatientSearch() {
		if (!patientSearchQuery.trim()) {
			patientSearchResults = [];
			return;
		}
		searchingPatients = true;
		try {
			const res = await searchPatients(patientSearchQuery.trim());
			// Filter out already admitted patients (since we only schedule non-admitted patients)
			patientSearchResults = res.filter(p => !p.is_admitted);
		} catch (e) {
			console.error('Patient search error:', e);
		} finally {
			searchingPatients = false;
		}
	}

	function selectPatient(patient: Patient) {
		selectedPatientId = patient.id;
		selectedPatientName = patient.full_name;
		patientSearchQuery = '';
		patientSearchResults = [];
	}

	function openCreateModal() {
		modalMode = 'create';
		editingSchedule = null;
		selectedPatientId = null;
		selectedPatientName = '';
		patientSearchQuery = '';
		patientSearchResults = [];
		selectedProcedure = procedureTypes[0] || '';
		// Pre-populate datetime-local input with selected date and current time or 8am
		scheduleDateTime = `${selectedDate}T08:00`;
		preSurgicalDiagnosis = '';
		formError = null;
		showModal = true;
	}

	function openEditModal(schedule: SurgicalSchedule) {
		modalMode = 'edit';
		editingSchedule = schedule;
		selectedPatientId = schedule.patient_id;
		selectedPatientName = schedule.patient_name || '';
		selectedProcedure = schedule.procedure_type;
		// Convert ISO to local datetime-local format: YYYY-MM-DDTHH:mm
		const d = new Date(schedule.scheduled_at);
		const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
		scheduleDateTime = localISO;
		preSurgicalDiagnosis = schedule.pre_surgical_diagnosis;
		formError = null;
		showModal = true;
	}

	function closeModal() {
		showModal = false;
		editingSchedule = null;
		formError = null;
	}

	async function handleFormSubmit() {
		if (!selectedPatientId) {
			formError = 'Por favor seleccione un paciente';
			return;
		}
		if (!selectedProcedure) {
			formError = 'Por favor seleccione un procedimiento';
			return;
		}
		if (!scheduleDateTime) {
			formError = 'Por favor seleccione fecha y hora';
			return;
		}

		formLoading = true;
		formError = null;

		// Convert datetime-local to full ISO string
		const scheduledISO = new Date(scheduleDateTime).toISOString();

		try {
			if (modalMode === 'create') {
				await createSurgicalSchedule({
					patient_id: selectedPatientId,
					procedure_type: selectedProcedure,
					scheduled_at: scheduledISO,
					pre_surgical_diagnosis: preSurgicalDiagnosis.trim()
				});
			} else if (modalMode === 'edit' && editingSchedule) {
				await updateSurgicalSchedule(editingSchedule.id, {
					procedure_type: selectedProcedure,
					scheduled_at: scheduledISO,
					pre_surgical_diagnosis: preSurgicalDiagnosis.trim()
				});
			}
			closeModal();
			await loadSchedules();
		} catch (e) {
			formError = e instanceof Error ? e.message : 'Error al guardar programación';
		} finally {
			formLoading = false;
		}
	}

	async function handleDelete(schedule: SurgicalSchedule) {
		if (!confirm(`¿Está seguro que desea eliminar la programación de ${schedule.patient_name} para ${schedule.procedure_type}?`)) {
			return;
		}
		try {
			await deleteSurgicalSchedule(schedule.id);
			await loadSchedules();
		} catch (e) {
			alert(e instanceof Error ? e.message : 'Error al eliminar');
		}
	}

	function formatTime(isoString: string): string {
		try {
			const d = new Date(isoString);
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
		} catch (e) {
			return '';
		}
	}

	function countSchedulesOnDate(dateString: string): number {
		return monthSchedules.filter(s => s.scheduled_at.split('T')[0] === dateString).length;
	}
</script>

<svelte:head>
	<title>Quirófano - Hospital</title>
</svelte:head>

<div class="quirofano-page">
	<div class="page-header">
		<div class="title-section">
			<h1>Programación de Quirófano</h1>
			<p class="subtitle">Calendario mensual y programación de procedimientos quirúrgicos</p>
		</div>
		<button class="btn-primary" onclick={openCreateModal}>
			📅 + Programar Procedimiento
		</button>
	</div>

	{#if error}
		<div class="error-banner">{error}</div>
	{/if}

	<div class="layout-grid">
		<!-- Calendar Card -->
		<div class="calendar-card">
			<div class="calendar-header">
				<button class="btn-nav" onclick={prevMonth}>&laquo; Anterior</button>
				<h2 class="month-title">{monthNames[currentMonth - 1]} {currentYear}</h2>
				<button class="btn-nav" onclick={nextMonth}>Siguiente &raquo;</button>
			</div>

			<div class="calendar-weekdays">
				{#each daysOfWeek as day}
					<div class="weekday">{day}</div>
				{/each}
			</div>

			<div class="calendar-days">
				{#each calendarDays as { day, dateString }}
					{#if day === null}
						<div class="day empty"></div>
					{:else}
						{@const schedCount = countSchedulesOnDate(dateString)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div 
							class="day active-day" 
							class:selected={selectedDate === dateString}
							class:has-events={schedCount > 0}
							onclick={() => selectDay(dateString)}
						>
							<span class="day-number">{day}</span>
							{#if schedCount > 0}
								<span class="event-indicator" title="{schedCount} programado(s)">
									{schedCount}
								</span>
							{/if}
						</div>
					{/if}
				{/each}
			</div>
		</div>

		<!-- Details Card -->
		<div class="details-card">
			<div class="details-header">
				<h3>Programaciones para el {selectedDate.split('-').reverse().join('/')}</h3>
				<span class="badge-count">{selectedDateSchedules.length}</span>
			</div>

			{#if loading}
				<div class="loading-state">Cargando programaciones...</div>
			{:else if selectedDateSchedules.length === 0}
				<div class="empty-state">
					<span class="empty-icon">🏥</span>
					<p>No hay procedimientos programados para este día.</p>
					<button class="btn-secondary" onclick={openCreateModal}>Programar Uno Ahora</button>
				</div>
			{:else}
				<div class="schedules-list">
					{#each selectedDateSchedules as schedule (schedule.id)}
						<div class="schedule-item">
							<div class="schedule-time">{formatTime(schedule.scheduled_at)}</div>
							<div class="schedule-content">
								<div class="patient-name">{schedule.patient_name}</div>
								<div class="procedure-tag">{schedule.procedure_type}</div>
								{#if schedule.pre_surgical_diagnosis}
									<div class="diagnosis-text">
										<strong>Diagnóstico:</strong> {schedule.pre_surgical_diagnosis}
									</div>
								{/if}
							</div>
							<div class="schedule-actions">
								<a href="/admissions/new?patient_id={schedule.patient_id}" class="btn-action btn-internar">
									📥 Internar
								</a>
								<button class="btn-action btn-edit" onclick={() => openEditModal(schedule)}>
									✏️ Editar
								</button>
								<button class="btn-action btn-delete" onclick={() => handleDelete(schedule)}>
									🗑️
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Create / Edit Modal -->
{#if showModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-overlay" onclick={closeModal}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{modalMode === 'create' ? 'Nueva Programación' : 'Editar Programación'}</h2>
				<button class="btn-close" onclick={closeModal}>&times;</button>
			</div>

			{#if formError}
				<div class="error-banner">{formError}</div>
			{/if}

			<form onsubmit={(e) => { e.preventDefault(); handleFormSubmit(); }}>
				<!-- Patient Search (Only available on create mode) -->
				<div class="field">
					<label for="patient">Paciente</label>
					{#if modalMode === 'create'}
						{#if selectedPatientId}
							<div class="selected-patient-box">
								<span>{selectedPatientName}</span>
								<button type="button" class="btn-link" onclick={() => { selectedPatientId = null; selectedPatientName = ''; }}>
									Cambiar
								</button>
							</div>
						{:else}
							<div class="search-input-wrapper">
								<input
									type="text"
									placeholder="Buscar por DNI o Nombre..."
									bind:value={patientSearchQuery}
									oninput={handlePatientSearch}
								/>
							</div>
							{#if patientSearchResults.length > 0}
								<div class="search-results-dropdown">
									{#each patientSearchResults as p}
										<button type="button" class="search-result-item" onclick={() => selectPatient(p)}>
											<strong>{p.full_name}</strong> - DNI: {p.identity_number}
										</button>
									{/each}
								</div>
							{:else if patientSearchQuery.trim() !== '' && !searchingPatients}
								<div class="search-no-results">No se encontraron pacientes activos</div>
							{/if}
						{/if}
					{:else}
						<div class="selected-patient-box disabled">
							<span>{selectedPatientName}</span>
						</div>
					{/if}
				</div>

				<!-- Procedure Type -->
				<div class="field">
					<label for="procedure">Procedimiento</label>
					<select id="procedure" bind:value={selectedProcedure} required>
						<option value="">Seleccione un procedimiento...</option>
						{#each procedureTypes as type}
							<option value={type}>{type}</option>
						{/each}
					</select>
				</div>

				<!-- Date and Time -->
				<div class="field">
					<label for="datetime">Fecha y Hora</label>
					<input 
						id="datetime" 
						type="datetime-local" 
						bind:value={scheduleDateTime} 
						required
					/>
				</div>

				<!-- Pre-surgical Diagnosis -->
				<div class="field">
					<label for="diagnosis">Diagnóstico Pre-Quirúrgico</label>
					<textarea 
						id="diagnosis" 
						rows="3" 
						placeholder="Escriba el diagnóstico pre-quirúrgico aquí..." 
						bind:value={preSurgicalDiagnosis}
					></textarea>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn-cancel" onclick={closeModal}>Cancelar</button>
					<button type="submit" class="btn-submit" disabled={formLoading}>
						{formLoading ? 'Guardando...' : modalMode === 'create' ? 'Programar' : 'Guardar Cambios'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.quirofano-page {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.page-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 1rem;
	}

	h1 {
		margin: 0;
		color: var(--text-main);
		font-size: 1.75rem;
		font-weight: 700;
	}

	.subtitle {
		margin: 0.25rem 0 0 0;
		color: var(--text-muted);
		font-size: 0.95rem;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
		border: none;
		padding: 0.75rem 1.25rem;
		border-radius: var(--border-radius-md);
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	.btn-primary:hover {
		background: #3182ce;
	}

	.error-banner {
		background: #fff5f5;
		border: 1px solid #fed7d7;
		color: #c53030;
		padding: 0.75rem;
		border-radius: var(--border-radius-md);
		font-weight: 500;
	}

	.layout-grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.5rem;
	}

	@media (min-width: 992px) {
		.layout-grid {
			grid-template-columns: 1.2fr 0.8fr;
		}
	}

	/* Card common styling */
	.calendar-card, .details-card {
		background: white;
		border-radius: 12px;
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--border-color);
		padding: 1.5rem;
	}

	/* Calendar card styling */
	.calendar-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.month-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.btn-nav {
		background: var(--background);
		border: 1px solid var(--border-color);
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		font-weight: 500;
		color: var(--text-main);
		transition: all 0.2s;
	}

	.btn-nav:hover {
		background: var(--border-color);
	}

	.calendar-weekdays {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		text-align: center;
		font-weight: 600;
		color: var(--text-muted);
		margin-bottom: 0.75rem;
	}

	.weekday {
		padding: 0.5rem 0;
	}

	.calendar-days {
		display: grid;
		grid-template-columns: repeat(7, 1fr);
		gap: 4px;
	}

	.day {
		aspect-ratio: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		border-radius: 8px;
		position: relative;
		font-weight: 500;
		color: var(--text-main);
	}

	.empty {
		background: transparent;
	}

	.active-day {
		cursor: pointer;
		background: var(--background);
		border: 1px solid transparent;
		transition: all 0.2s;
	}

	.active-day:hover {
		background: var(--info-bg);
		border-color: rgba(66, 153, 225, 0.3);
	}

	.active-day.selected {
		background: var(--primary);
		color: white;
	}

	.active-day.has-events {
		font-weight: 700;
		border-color: rgba(66, 153, 225, 0.4);
	}

	.event-indicator {
		position: absolute;
		bottom: 4px;
		font-size: 0.65rem;
		background: #e2e8f0;
		color: #4a5568;
		border-radius: 99px;
		width: 16px;
		height: 16px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.active-day.selected .event-indicator {
		background: white;
		color: var(--primary);
	}

	/* Details Card styling */
	.details-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 1rem;
		margin-bottom: 1rem;
	}

	.details-header h3 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--text-main);
	}

	.badge-count {
		background: var(--info-bg);
		color: var(--primary);
		font-weight: 700;
		font-size: 0.85rem;
		padding: 0.2rem 0.6rem;
		border-radius: 99px;
	}

	.loading-state, .empty-state {
		text-align: center;
		padding: 3rem 1rem;
		color: var(--text-muted);
	}

	.empty-icon {
		font-size: 2.5rem;
		display: block;
		margin-bottom: 1rem;
	}

	.btn-secondary {
		background: white;
		border: 1px solid var(--border-color);
		padding: 0.6rem 1.2rem;
		border-radius: var(--border-radius-md);
		font-weight: 600;
		color: var(--text-main);
		cursor: pointer;
		margin-top: 1rem;
		transition: background 0.2s;
	}

	.btn-secondary:hover {
		background: var(--background);
	}

	.schedules-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		max-height: 500px;
		overflow-y: auto;
	}

	.schedule-item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--background);
	}

	.schedule-time {
		font-size: 1.1rem;
		font-weight: 700;
		color: var(--primary);
		white-space: nowrap;
	}

	.schedule-content {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.patient-name {
		font-weight: 600;
		color: var(--text-main);
		font-size: 1rem;
	}

	.procedure-tag {
		align-self: flex-start;
		font-size: 0.75rem;
		background: #edf2f7;
		color: #4a5568;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		font-weight: 600;
	}

	.diagnosis-text {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.schedule-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.btn-action {
		border: none;
		padding: 0.35rem 0.6rem;
		border-radius: 4px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		text-align: center;
		text-decoration: none;
		transition: filter 0.2s;
	}

	.btn-action:hover {
		filter: brightness(0.9);
	}

	.btn-internar {
		background: var(--success);
		color: white;
	}

	.btn-edit {
		background: var(--info-bg);
		color: var(--primary);
		border: 1px solid rgba(66, 153, 225, 0.2);
	}

	.btn-delete {
		background: var(--danger-bg);
		color: var(--danger);
		border: 1px solid rgba(239, 68, 68, 0.2);
	}

	/* Modal styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0, 0, 0, 0.4);
		backdrop-filter: blur(2px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 100;
	}

	.modal-content {
		background: white;
		border-radius: 12px;
		width: 90%;
		max-width: 500px;
		box-shadow: var(--shadow-lg);
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.75rem;
	}

	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: var(--text-main);
	}

	.btn-close {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: var(--text-muted);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
		position: relative;
	}

	.field label {
		font-weight: 600;
		color: var(--text-main);
		font-size: 0.9rem;
	}

	.field input, .field select, .field textarea {
		padding: 0.6rem 0.8rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-family: inherit;
		font-size: 0.95rem;
	}

	.field input:focus, .field select:focus, .field textarea:focus {
		outline: none;
		border-color: var(--primary);
	}

	.selected-patient-box {
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--info-bg);
		padding: 0.6rem;
		border-radius: 6px;
		border: 1px solid rgba(66, 153, 225, 0.2);
	}

	.selected-patient-box.disabled {
		background: var(--background);
		color: var(--text-muted);
		border-color: var(--border-color);
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--danger);
		font-weight: 600;
		cursor: pointer;
	}

	.search-results-dropdown {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		max-height: 150px;
		overflow-y: auto;
		z-index: 10;
		box-shadow: var(--shadow-md);
	}

	.search-result-item {
		width: 100%;
		padding: 0.5rem 0.75rem;
		text-align: left;
		background: white;
		border: none;
		border-bottom: 1px solid var(--border-color);
		cursor: pointer;
		font-family: inherit;
	}

	.search-result-item:hover {
		background: var(--background);
	}

	.search-no-results {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-top: 0.25rem;
	}

	.modal-footer {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.btn-cancel {
		background: white;
		border: 1px solid var(--border-color);
		padding: 0.6rem 1.2rem;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		font-weight: 600;
		color: var(--text-main);
	}

	.btn-submit {
		background: var(--primary);
		color: white;
		border: none;
		padding: 0.6rem 1.2rem;
		border-radius: var(--border-radius-md);
		cursor: pointer;
		font-weight: 600;
	}

	.btn-submit:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>

<script lang="ts">
	import { onMount } from "svelte";
	import {
		listUsers,
		createUser,
		resetPassword,
		updateStaff,
		setUserActive,
		type Staff,
		getBeds,
		getBedTypes,
		createBed,
		updateBed,
		deleteBed,
		type Bed,
		createBedType,
		updateBedType,
		deleteBedType,
		type BedType,
		getSettings,
		updateSettings,
		getWards,
		createWard,
		updateWard,
		deleteWard,
		type Ward,
	} from "$lib/api/client";
	import { isAdmin } from "$lib/auth";
	import { goto } from "$app/navigation";
	import { playNotificationSound } from "$lib/sse";

	// General page state
	let activeTab = $state<"users" | "wards" | "beds" | "types" | "settings">(
		"users",
	);
	let loading = $state(true);
	let error = $state<string | null>(null);

	// Data stores
	let users = $state<Staff[]>([]);
	let beds = $state<Bed[]>([]);
	let bedTypes = $state<BedType[]>([]);
	let wards = $state<Ward[]>([]);
	let systemSettings = $state<Record<string, string>>({
		sound_alert_control_overdue: "true",
		sound_alert_discharge_ready: "false",
		sound_alert_patient_admitted: "false",
		sound_alert_patient_discharged: "false",
	});

	// Users State
	let showUserModal = $state(false);
	let selectedUser = $state<Staff | null>(null);
	let userFullName = $state("");
	let userUsername = $state("");
	let userPassword = $state("");
	let userRole = $state<"health_staff" | "admin">("health_staff");
	let showPasswordModal = $state(false);
	let selectedUserId = $state("");
	let selectedUserPassword = $state("");
	let createdTempPassword = $state("");
	let resetTempPassword = $state("");

	// Edit User State
	let showEditModal = $state(false);
	let editUserTarget = $state<Staff | null>(null);
	let editFullName = $state("");
	let editRole = $state<"health_staff" | "admin">("health_staff");

	// Beds State
	let showBedModal = $state(false);
	let selectedBed = $state<Bed | null>(null);
	let bedNumber = $state<number>(0);
	let bedTypeId = $state<number>(0);
	let bedWardId = $state<number>(0);
	let bedIsActive = $state(true);
	let deleteBedConfirm = $state<Bed | null>(null);

	// Bed Types State
	let showTypeModal = $state(false);
	let selectedType = $state<BedType | null>(null);
	let typeName = $state("");
	let typePrefix = $state("");
	let typeRequiresFollowup = $state(false);
	let deleteTypeConfirm = $state<BedType | null>(null);

	// Wards State
	let showWardModal = $state(false);
	let selectedWard = $state<Ward | null>(null);
	let wardName = $state("");
	let wardDescription = $state("");
	let deleteWardConfirm = $state<Ward | null>(null);

	// Form actions loading
	let formLoading = $state(false);
	let formError = $state<string | null>(null);

	onMount(async () => {
		if (!isAdmin()) {
			goto("/");
			return;
		}
		await loadAllData();
	});

	async function loadAllData() {
		loading = true;
		error = null;
		try {
			const [u, b, bt, s, w] = await Promise.all([
				listUsers(),
				getBeds(),
				getBedTypes(),
				getSettings(),
				getWards(),
			]);
			users = u;
			beds = b;
			bedTypes = bt;
			systemSettings = { ...systemSettings, ...s };
			wards = w;
		} catch (err: any) {
			error = err.message || "Error al cargar datos del panel";
		} finally {
			loading = false;
		}
	}

	// Tab switcher
	async function switchTab(tab: typeof activeTab) {
		activeTab = tab;
		formError = null;
		// Refresh selected data
		try {
			if (tab === "users") users = await listUsers();
			if (tab === "wards") {
				wards = await getWards();
				beds = await getBeds();
			}
			if (tab === "beds") {
				beds = await getBeds();
				bedTypes = await getBedTypes();
				wards = await getWards();
			}
			if (tab === "types") bedTypes = await getBedTypes();
			if (tab === "settings") systemSettings = await getSettings();
		} catch (err: any) {
			formError = err.message || "Error al refrescar datos";
		}
	}

	// --- USER CRUD ACTIONS ---
	function openCreateUserModal() {
		selectedUser = null;
		userFullName = "";
		userUsername = "";
		userPassword = "";
		userRole = "health_staff";
		formError = null;
		createdTempPassword = "";
		showUserModal = true;
	}

	async function handleUserSubmit(e: Event) {
		e.preventDefault();
		formLoading = true;
		formError = null;
		try {
			const res = await createUser({
				full_name: userFullName,
				username: userUsername,
				password: userPassword,
				role: userRole,
			});
			createdTempPassword = res.temporary_password;
			users = await listUsers();
		} catch (err: any) {
			formError = err.message || "Error al crear usuario";
		} finally {
			formLoading = false;
		}
	}

	async function handleToggleUserActive(user: Staff) {
		const action = user.is_active ? "desactivar" : "activar";
		if (
			confirm(`¿Estás seguro de ${action} al usuario ${user.username}?`)
		) {
			try {
				await setUserActive(user.id, !user.is_active);
				users = await listUsers();
			} catch (err: any) {
				alert("Error: " + err.message);
			}
		}
	}

	function openPasswordModal(id: string) {
		selectedUserId = id;
		selectedUserPassword = "";
		resetTempPassword = "";
		showPasswordModal = true;
	}

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		formLoading = true;
		try {
			const res = await resetPassword(selectedUserId);
			resetTempPassword = res.temporary_password;
		} catch (err: any) {
			alert("Error: " + err.message);
		} finally {
			formLoading = false;
		}
	}

	// --- EDIT USER ACTIONS ---
	function openEditModal(user: Staff) {
		editUserTarget = user;
		editFullName = user.full_name;
		editRole = user.role;
		formError = null;
		showEditModal = true;
	}

	function closeEditModal() {
		showEditModal = false;
		editUserTarget = null;
		editFullName = "";
		editRole = "health_staff";
		formError = null;
	}

	async function handleEditSubmit(e: Event) {
		e.preventDefault();
		if (!editUserTarget) return;
		formLoading = true;
		formError = null;
		try {
			await updateStaff(editUserTarget.id, {
				full_name: editFullName,
				role: editRole,
			});
			showEditModal = false;
			editUserTarget = null;
			users = await listUsers();
		} catch (err: any) {
			formError = err.message || "Error al actualizar usuario";
		} finally {
			formLoading = false;
		}
	}

	// --- BED CRUD ACTIONS ---
	function openCreateBedModal() {
		selectedBed = null;
		bedNumber = 0;
		bedTypeId = bedTypes.length > 0 ? bedTypes[0].id : 0;
		bedWardId = wards.length > 0 ? wards[0].id : 0;
		bedIsActive = true;
		formError = null;
		showBedModal = true;
	}

	function openEditBedModal(bed: Bed) {
		selectedBed = bed;
		bedNumber = bed.number;
		bedTypeId = bed.bed_type?.id || 0;
		bedWardId = bed.ward_id || 0;
		bedIsActive = bed.is_active;
		formError = null;
		showBedModal = true;
	}

	async function handleBedSubmit(e: Event) {
		e.preventDefault();
		if (!bedNumber || !bedTypeId || !bedWardId) {
			formError = "Número, tipo de cama y sala son obligatorios";
			return;
		}
		formLoading = true;
		formError = null;
		try {
			if (selectedBed) {
				await updateBed(selectedBed.id, {
					number: bedNumber,
					bed_type_id: bedTypeId,
					ward_id: bedWardId,
				});
			} else {
				await createBed({
					number: bedNumber,
					bed_type_id: bedTypeId,
					ward_id: bedWardId,
					is_active: bedIsActive,
				});
			}
			showBedModal = false;
			beds = await getBeds();
		} catch (err: any) {
			formError = err.message || "Error al guardar cama";
		} finally {
			formLoading = false;
		}
	}

	function confirmDeleteBed(bed: Bed) {
		deleteBedConfirm = bed;
		formError = null;
	}

	async function handleDeleteBed() {
		if (!deleteBedConfirm) return;
		formLoading = true;
		try {
			await deleteBed(deleteBedConfirm.id);
			deleteBedConfirm = null;
			beds = await getBeds();
		} catch (err: any) {
			formError =
				err.message || "No se puede eliminar: la cama está ocupada";
		} finally {
			formLoading = false;
		}
	}

	// --- BED TYPE CRUD ACTIONS ---
	function openCreateTypeModal() {
		selectedType = null;
		typeName = "";
		typePrefix = "";
		typeRequiresFollowup = false;
		formError = null;
		showTypeModal = true;
	}

	function openEditTypeModal(bt: BedType) {
		selectedType = bt;
		typeName = bt.name;
		typePrefix = bt.prefix;
		typeRequiresFollowup = bt.requires_postpartum_followup;
		formError = null;
		showTypeModal = true;
	}

	async function handleTypeSubmit(e: Event) {
		e.preventDefault();
		if (!typeName || !typePrefix) {
			formError = "Nombre y prefijo son obligatorios";
			return;
		}
		formLoading = true;
		formError = null;
		try {
			if (selectedType) {
				await updateBedType(selectedType.id, {
					name: typeName,
					prefix: typePrefix,
					requires_postpartum_followup: typeRequiresFollowup,
				});
			} else {
				await createBedType({
					name: typeName,
					prefix: typePrefix,
					requires_postpartum_followup: typeRequiresFollowup,
				});
			}
			showTypeModal = false;
			bedTypes = await getBedTypes();
		} catch (err: any) {
			formError = err.message || "Error al guardar tipo de cama";
		} finally {
			formLoading = false;
		}
	}

	function confirmDeleteType(bt: BedType) {
		deleteTypeConfirm = bt;
		formError = null;
	}

	async function handleDeleteType() {
		if (!deleteTypeConfirm) return;
		formLoading = true;
		try {
			await deleteBedType(deleteTypeConfirm.id);
			deleteTypeConfirm = null;
			bedTypes = await getBedTypes();
		} catch (err: any) {
			formError =
				err.message ||
				"No se puede eliminar: hay camas asignadas a este tipo";
		} finally {
			formLoading = false;
		}
	}

	// --- WARD CRUD ACTIONS ---
	function openCreateWardModal() {
		selectedWard = null;
		wardName = "";
		wardDescription = "";
		formError = null;
		showWardModal = true;
	}

	function openEditWardModal(w: Ward) {
		selectedWard = w;
		wardName = w.name;
		wardDescription = w.description;
		formError = null;
		showWardModal = true;
	}

	async function handleWardSubmit(e: Event) {
		e.preventDefault();
		if (!wardName) {
			formError = "El nombre de la sala es obligatorio";
			return;
		}
		formLoading = true;
		formError = null;
		try {
			if (selectedWard) {
				await updateWard(selectedWard.id, {
					name: wardName,
					description: wardDescription,
				});
			} else {
				await createWard({
					name: wardName,
					description: wardDescription,
				});
			}
			showWardModal = false;
			wards = await getWards();
			beds = await getBeds();
		} catch (err: any) {
			formError = err.message || "Error al guardar sala";
		} finally {
			formLoading = false;
		}
	}

	function confirmDeleteWard(w: Ward) {
		deleteWardConfirm = w;
		formError = null;
	}

	async function handleDeleteWard() {
		if (!deleteWardConfirm) return;
		formLoading = true;
		try {
			await deleteWard(deleteWardConfirm.id);
			deleteWardConfirm = null;
			wards = await getWards();
		} catch (err: any) {
			formError =
				err.message ||
				"No se puede eliminar: la sala tiene camas asignadas";
		} finally {
			formLoading = false;
		}
	}

	// --- SYSTEM SETTINGS ACTIONS ---
	async function handleSaveSettings() {
		formLoading = true;
		formError = null;
		try {
			await updateSettings(systemSettings);
			alert("Configuración guardada correctamente");
		} catch (err: any) {
			formError = err.message || "Error al guardar configuración";
		} finally {
			formLoading = false;
		}
	}
</script>

<svelte:head>
	<title>Panel de Administración - Hospital Manager</title>
</svelte:head>

<div class="admin-panel">
	<header class="panel-header">
		<h1>⚙️ Panel de Administración</h1>
		<p class="panel-subtitle">
			Gestiona usuarios, infraestructura de camas, alertas y sonidos del
			sistema.
		</p>
	</header>

	{#if error}
		<div class="error-alert">{error}</div>
	{/if}

	{#if loading}
		<div class="loading-state">
			<span class="spinner"></span>
			Cargando panel de administración...
		</div>
	{:else}
		<!-- Tab Controls -->
		<div class="tabs-nav">
			<button
				class:active={activeTab === "users"}
				onclick={() => switchTab("users")}
			>
				👤 Usuarios
			</button>
			<button
				class:active={activeTab === "wards"}
				onclick={() => switchTab("wards")}
			>
				📂 Salas
			</button>
			<button
				class:active={activeTab === "beds"}
				onclick={() => switchTab("beds")}
			>
				🛏️ Camas
			</button>
			<button
				class:active={activeTab === "types"}
				onclick={() => switchTab("types")}
			>
				🏷️ Tipos de Cama
			</button>
			<button
				class:active={activeTab === "settings"}
				onclick={() => switchTab("settings")}
			>
				🔊 Alertas y Configuración
			</button>
		</div>

		<!-- Tab Content Area -->
		<div class="tab-content card">
			<!-- USERS TAB -->
			{#if activeTab === "users"}
				<div class="tab-header">
					<h2>👤 Gestión de Usuarios</h2>
					<button
						class="btn btn-primary"
						onclick={openCreateUserModal}>+ Nuevo Usuario</button
					>
				</div>

				<div class="table-responsive-wrapper">
					<table class="modern-table">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Usuario</th>
								<th>Rol</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each users as user}
								<tr class:inactive={!user.is_active}>
									<td class="font-medium text-main"
										>{user.full_name}</td
									>
									<td><strong>{user.username}</strong></td>
									<td>
										<span class="badge {user.role}">
											{user.role === "admin"
												? "Administrador"
												: "Personal Médico"}
										</span>
									</td>
									<td>
										<span
											class="badge {user.is_active
												? 'active'
												: 'inactive'}"
										>
											{user.is_active
												? "Activo"
												: "Inactivo"}
										</span>
									</td>
									<td class="actions">
										<button
											class="btn btn-sm btn-info"
											onclick={() => openEditModal(user)}
										>
											✏️ Editar
										</button>
										<button
											class="btn btn-sm btn-secondary"
											onclick={() =>
												openPasswordModal(user.id)}
										>
											🔑 Clave
										</button>
										<button
											class="btn btn-sm {user.is_active
												? 'btn-danger'
												: 'btn-success'}"
											onclick={() =>
												handleToggleUserActive(user)}
										>
											{user.is_active
												? "Desactivar"
												: "Activar"}
										</button>
									</td>
								</tr>
							{/each}
							{#if users.length === 0}
								<tr>
									<td colspan="5" class="empty"
										>No hay usuarios registrados</td
									>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- WARDS TAB -->
			{#if activeTab === "wards"}
				<div class="tab-header">
					<h2>📂 Gestión de Salas</h2>
					<button
						class="btn btn-primary"
						onclick={openCreateWardModal}>+ Nueva Sala</button
					>
				</div>

				<div class="wards-list-container">
					{#each wards as ward (ward.id)}
						{@const wardBeds = beds.filter(
							(b) => b.ward_id === ward.id,
						)}
						<div class="ward-card">
							<div class="ward-card-header">
								<div class="ward-info">
									<h3>{ward.name}</h3>
									<p>
										{ward.description || "Sin descripción"}
									</p>
								</div>
								<div class="ward-actions">
									<button
										class="btn btn-sm btn-info"
										onclick={() => openEditWardModal(ward)}
										>✏️ Editar</button
									>
									<button
										class="btn btn-sm btn-danger"
										onclick={() => confirmDeleteWard(ward)}
										>🗑️ Eliminar</button
									>
								</div>
							</div>

							<div class="ward-beds-section">
								<div class="ward-beds-header">
									<h4>Camas asignadas ({wardBeds.length})</h4>
									<button
										class="btn btn-sm btn-primary"
										onclick={() => {
											openCreateBedModal();
											bedWardId = ward.id;
										}}
									>
										+ Agregar Cama a esta sala
									</button>
								</div>

								{#if wardBeds.length === 0}
									<p class="empty-mini">
										No hay camas asignadas a esta sala
									</p>
								{:else}
									<div class="ward-beds-grid">
										{#each wardBeds as bed (bed.id)}
											<div class="ward-bed-item">
												<span class="bed-tag"
													>{bed.bed_type
														?.prefix}{bed.number}</span
												>
												<span class="bed-type-label"
													>{bed.bed_type?.name}</span
												>
												<div class="bed-actions-mini">
													<button
														class="btn-info-mini"
														onclick={() =>
															openEditBedModal(
																bed,
															)}>✏️</button
													>
													<button
														class="btn-delete"
														onclick={() =>
															confirmDeleteBed(
																bed,
															)}>🗑️</button
													>
												</div>
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</div>
					{/each}
					{#if wards.length === 0}
						<div class="empty">No hay salas registradas</div>
					{/if}
				</div>
			{/if}

			<!-- BEDS TAB -->
			{#if activeTab === "beds"}
				<div class="tab-header">
					<h2>🛏️ Gestión de Camas</h2>
					<button class="btn btn-primary" onclick={openCreateBedModal}
						>+ Nueva Cama</button
					>
				</div>

				<div class="table-responsive-wrapper">
					<table class="modern-table">
						<thead>
							<tr>
								<th>Número</th>
								<th>Tipo</th>
								<th>Sala</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each beds as bed (bed.id)}
								<tr>
									<td class="font-medium text-main"
										><strong
											>{bed.bed_type
												?.prefix}{bed.number}</strong
										></td
									>
									<td>{bed.bed_type?.name ?? "N/A"}</td>
									<td>{bed.ward?.name ?? "N/A"}</td>
									<td>
										{#if bed.is_active}
											<span class="badge badge-active"
												>Activa</span
											>
										{:else}
											<span class="badge badge-inactive"
												>Inactiva</span
											>
										{/if}
									</td>
									<td class="col-actions">
										<button
											class="btn btn-sm btn-info"
											onclick={() =>
												openEditBedModal(bed)}
											>Editar</button
										>
										<button
											class="btn btn-sm btn-danger"
											onclick={() =>
												confirmDeleteBed(bed)}
											>Eliminar</button
										>
									</td>
								</tr>
							{/each}
							{#if beds.length === 0}
								<tr>
									<td colspan="4" class="empty"
										>No hay camas registradas</td
									>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- BED TYPES TAB -->
			{#if activeTab === "types"}
				<div class="tab-header">
					<h2>🏷️ Tipos de Cama</h2>
					<button
						class="btn btn-primary"
						onclick={openCreateTypeModal}>+ Nuevo Tipo</button
					>
				</div>

				<div class="table-responsive-wrapper">
					<table class="modern-table">
						<thead>
							<tr>
								<th>Nombre</th>
								<th>Prefijo</th>
								<th>Seguimiento Post-parto</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each bedTypes as bt (bt.id)}
								<tr>
									<td class="font-medium text-main"
										>{bt.name}</td
									>
									<td><strong>{bt.prefix}</strong></td>
									<td>
										{#if bt.requires_postpartum_followup}
											<span class="badge badge-active"
												>Requiere</span
											>
										{:else}
											<span class="badge badge-inactive"
												>No requiere</span
											>
										{/if}
									</td>
									<td class="col-actions">
										<button
											class="btn btn-sm btn-info"
											onclick={() =>
												openEditTypeModal(bt)}
											>Editar</button
										>
										<button
											class="btn btn-sm btn-danger"
											onclick={() =>
												confirmDeleteType(bt)}
											>Eliminar</button
										>
									</td>
								</tr>
							{/each}
							{#if bedTypes.length === 0}
								<tr>
									<td colspan="4" class="empty"
										>No hay tipos de cama registrados</td
									>
								</tr>
							{/if}
						</tbody>
					</table>
				</div>
			{/if}

			<!-- SYSTEM SETTINGS TAB -->
			{#if activeTab === "settings"}
				<div class="tab-header">
					<h2>🔊 Configuración de Notificaciones Sonoras</h2>
				</div>

				<div class="settings-form">
					<p class="settings-description">
						Elige qué eventos generan una alerta sonora (beep triple
						sintetizado) en los clientes de escritorio y móviles
						conectados. Los eventos desactivados se reflejarán
						visualmente de forma silenciosa.
					</p>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title"
								>🚨 Control Postparto Vencido (Monitoreo)</span
							>
							<span class="setting-help"
								>Se reproduce cuando vence alguna ventana de
								control entre la 1era y 8va hora del paciente
								post-parto.</span
							>
						</div>
						<div class="setting-input">
							<select
								bind:value={
									systemSettings.sound_alert_control_overdue
								}
							>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title"
								>✅ Paciente Alta Lista</span
							>
							<span class="setting-help"
								>Se reproduce cuando se cumplen las 24 horas
								(parto) o 48 horas (cesárea) de hospitalización.</span
							>
						</div>
						<div class="setting-input">
							<select
								bind:value={
									systemSettings.sound_alert_discharge_ready
								}
							>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title"
								>📥 Nueva Admisión (Ingreso)</span
							>
							<span class="setting-help"
								>Se reproduce al ingresar un paciente a una
								cama.</span
							>
						</div>
						<div class="setting-input">
							<select
								bind:value={
									systemSettings.sound_alert_patient_admitted
								}
							>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title"
								>📤 Alta de Paciente (Egreso)</span
							>
							<span class="setting-help"
								>Se reproduce cuando se egresa al paciente y se
								libera la cama.</span
							>
						</div>
						<div class="setting-input">
							<select
								bind:value={
									systemSettings.sound_alert_patient_discharged
								}
							>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title"
								>📥 Nueva Admisión (Ingreso)</span
							>
							<span class="setting-help"
								>Se reproduce al ingresar un paciente a una
								cama.</span
							>
						</div>
						<div class="setting-input">
							<select
								bind:value={
									systemSettings.sound_alert_patient_admitted
								}
							>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					<div class="setting-row">
						<div class="setting-info">
							<span class="setting-title"
								>📤 Alta de Paciente (Egreso)</span
							>
							<span class="setting-help"
								>Se reproduce cuando se egresa al paciente y se
								libera la cama.</span
							>
						</div>
						<div class="setting-input">
							<select
								bind:value={
									systemSettings.sound_alert_patient_discharged
								}
							>
								<option value="true">🔊 Con Sonido</option>
								<option value="false">🔇 Silencioso</option>
							</select>
						</div>
					</div>

					{#if formError}
						<div class="error-alert">{formError}</div>
					{/if}

					<div class="settings-actions">
						<button
							type="button"
							class="btn btn-secondary"
							onclick={playNotificationSound}
						>
							🔊 Probar Parlantes / Sonido
						</button>
						<button
							type="button"
							class="btn btn-primary"
							onclick={handleSaveSettings}
							disabled={formLoading}
						>
							{formLoading
								? "Guardando..."
								: "💾 Guardar Configuración"}
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- --- MODALS --- -->

<!-- Create User Modal -->
{#if showUserModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={() => {
			showUserModal = false;
			createdTempPassword = "";
		}}
	></div>
	<dialog open class="modal">
		{#if createdTempPassword}
			<h3>✅ Usuario Creado</h3>
			<div class="temp-password-box">
				<p>Contraseña temporal generada:</p>
				<div class="temp-password-display">
					<code>{createdTempPassword}</code>
					<button
						type="button"
						class="btn btn-sm btn-secondary"
						onclick={() =>
							navigator.clipboard.writeText(createdTempPassword)}
					>
						📋 Copiar
					</button>
				</div>
			</div>
			<p class="temp-password-warning">
				⚠️ Esta contraseña se muestra una sola vez. Asegúrate de
				copiarla.
			</p>
			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => {
						showUserModal = false;
						createdTempPassword = "";
					}}
				>
					Listo
				</button>
			</div>
		{:else}
			<h3>Crear Nuevo Usuario</h3>
			{#if formError}
				<div class="error-alert">{formError}</div>
			{/if}
			<form onsubmit={handleUserSubmit}>
				<label>
					Nombre Completo:
					<input
						type="text"
						bind:value={userFullName}
						required
						placeholder="Ej: Dr. Juan Pérez"
					/>
				</label>
				<label>
					Nombre de Usuario:
					<input
						type="text"
						bind:value={userUsername}
						required
						placeholder="Ej: jperez"
					/>
				</label>
				<label>
					Contraseña Inicial:
					<input type="password" bind:value={userPassword} required />
				</label>
				<label>
					Rol:
					<select bind:value={userRole}>
						<option value="health_staff"
							>Personal Médico (Enfermera, Médico, etc)</option
						>
						<option value="admin">Administrador del Sistema</option>
					</select>
				</label>
				<div class="modal-actions">
					<button
						type="button"
						class="btn btn-text"
						onclick={() => {
							showUserModal = false;
							createdTempPassword = "";
						}}>Cancelar</button
					>
					<button
						type="submit"
						class="btn btn-primary"
						disabled={formLoading}
					>
						{formLoading ? "Creando..." : "Crear Usuario"}
					</button>
				</div>
			</form>
		{/if}
	</dialog>
{/if}

<!-- Change Password Modal -->
{#if showPasswordModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={() => {
			showPasswordModal = false;
			resetTempPassword = "";
		}}
	></div>
	<dialog open class="modal">
		{#if resetTempPassword}
			<h3>✅ Contraseña Restablecida</h3>
			<div class="temp-password-box">
				<p>Nueva contraseña temporal:</p>
				<div class="temp-password-display">
					<code>{resetTempPassword}</code>
					<button
						type="button"
						class="btn btn-sm btn-secondary"
						onclick={() =>
							navigator.clipboard.writeText(resetTempPassword)}
					>
						📋 Copiar
					</button>
				</div>
			</div>
			<p class="temp-password-warning">
				⚠️ Esta contraseña se muestra una sola vez. Asegúrate de
				copiarla.
			</p>
			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-primary"
					onclick={() => {
						showPasswordModal = false;
						resetTempPassword = "";
					}}
				>
					Listo
				</button>
			</div>
		{:else}
			<h3>Restablecer Contraseña</h3>
			<p class="temp-password-warning">
				Se generará una nueva contraseña temporal para este usuario.
			</p>
			<form onsubmit={handleChangePassword}>
				<div class="modal-actions">
					<button
						type="button"
						class="btn btn-text"
						onclick={() => {
							showPasswordModal = false;
							resetTempPassword = "";
						}}>Cancelar</button
					>
					<button
						type="submit"
						class="btn btn-primary"
						disabled={formLoading}
					>
						{formLoading ? "Generando..." : "Generar Nueva Clave"}
					</button>
				</div>
			</form>
		{/if}
	</dialog>
{/if}

<!-- Edit User Modal -->
{#if showEditModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={closeEditModal}></div>
	<dialog open class="modal">
		<h3>Editar Usuario: {editUserTarget?.full_name}</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleEditSubmit}>
			<label>
				Nombre Completo:
				<input type="text" bind:value={editFullName} required />
			</label>
			<label>
				Rol:
				<select bind:value={editRole}>
					<option value="health_staff">Personal Médico</option>
					<option value="admin">Administrador</option>
				</select>
			</label>
			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-text"
					onclick={closeEditModal}>Cancelar</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={formLoading}
				>
					{formLoading ? "Guardando..." : "Guardar Cambios"}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Create/Edit Bed Modal -->
{#if showBedModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showBedModal = false)}></div>
	<dialog open class="modal">
		<h3>{selectedBed ? "Editar Cama" : "Nueva Cama"}</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleBedSubmit}>
			<label>
				Número de Cama:
				<input type="number" min="1" bind:value={bedNumber} required />
			</label>
			<label>
				Tipo de Cama:
				<select bind:value={bedTypeId} required>
					<option value={0} disabled>Seleccionar tipo...</option>
					{#each bedTypes as bt}
						<option value={bt.id}>{bt.name} ({bt.prefix})</option>
					{/each}
				</select>
			</label>
			<label>
				Sala (Ward):
				<select bind:value={bedWardId} required>
					<option value={0} disabled>Seleccionar sala...</option>
					{#each wards as ward}
						<option value={ward.id}>{ward.name}</option>
					{/each}
				</select>
			</label>
			{#if !selectedBed}
				<label class="checkbox-label">
					<input type="checkbox" bind:checked={bedIsActive} />
					Cama Activa
				</label>
			{/if}
			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-text"
					onclick={() => (showBedModal = false)}>Cancelar</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={formLoading}
				>
					{formLoading
						? "Guardando..."
						: selectedBed
							? "Guardar Cambios"
							: "Crear"}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Delete Bed Confirmation Modal -->
{#if deleteBedConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (deleteBedConfirm = null)}></div>
	<dialog open class="modal modal-confirm">
		<h3>Eliminar Cama</h3>
		<p>
			¿Está seguro que desea eliminar la cama <strong
				>{deleteBedConfirm.bed_type
					?.prefix}{deleteBedConfirm.number}</strong
			>?
		</p>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<div class="modal-actions">
			<button
				type="button"
				class="btn btn-text"
				onclick={() => (deleteBedConfirm = null)}>Cancelar</button
			>
			<button
				type="button"
				class="btn btn-danger"
				onclick={handleDeleteBed}
				disabled={formLoading}
			>
				{formLoading ? "Eliminando..." : "Eliminar"}
			</button>
		</div>
	</dialog>
{/if}

<!-- Create/Edit Bed Type Modal -->
{#if showTypeModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showTypeModal = false)}></div>
	<dialog open class="modal">
		<h3>{selectedType ? "Editar Tipo de Cama" : "Nuevo Tipo de Cama"}</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleTypeSubmit}>
			<label>
				Nombre:
				<input
					type="text"
					placeholder="Maternidad"
					bind:value={typeName}
					required
				/>
			</label>
			<label>
				Prefijo:
				<input
					type="text"
					placeholder="M"
					maxlength="5"
					bind:value={typePrefix}
					required
				/>
			</label>
			<label class="checkbox-label">
				<input type="checkbox" bind:checked={typeRequiresFollowup} />
				Requiere seguimiento post-parto
			</label>
			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-text"
					onclick={() => (showTypeModal = false)}>Cancelar</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={formLoading}
				>
					{formLoading
						? "Guardando..."
						: selectedType
							? "Guardar Cambios"
							: "Crear"}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Delete Type Confirmation Modal -->
{#if deleteTypeConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={() => (deleteTypeConfirm = null)}
	></div>
	<dialog open class="modal modal-confirm">
		<h3>Eliminar Tipo de Cama</h3>
		<p>
			¿Está seguro que desea eliminar el tipo de cama <strong
				>{deleteTypeConfirm.name}</strong
			>?
		</p>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<div class="modal-actions">
			<button
				type="button"
				class="btn btn-text"
				onclick={() => (deleteTypeConfirm = null)}>Cancelar</button
			>
			<button
				type="button"
				class="btn btn-danger"
				onclick={handleDeleteType}
				disabled={formLoading}
			>
				{formLoading ? "Eliminando..." : "Eliminar"}
			</button>
		</div>
	</dialog>
{/if}

<!-- Create/Edit Ward Modal -->
{#if showWardModal}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal-backdrop" onclick={() => (showWardModal = false)}></div>
	<dialog open class="modal">
		<h3>{selectedWard ? "Editar Sala" : "Nueva Sala"}</h3>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<form onsubmit={handleWardSubmit}>
			<label>
				Nombre de la Sala:
				<input
					type="text"
					placeholder="Ej: Sala de Partos"
					bind:value={wardName}
					required
				/>
			</label>
			<label>
				Descripción:
				<input
					type="text"
					placeholder="Ej: Camas de pre y post parto inmediato"
					bind:value={wardDescription}
				/>
			</label>
			<div class="modal-actions">
				<button
					type="button"
					class="btn btn-text"
					onclick={() => (showWardModal = false)}>Cancelar</button
				>
				<button
					type="submit"
					class="btn btn-primary"
					disabled={formLoading}
				>
					{formLoading
						? "Guardando..."
						: selectedWard
							? "Guardar Cambios"
							: "Crear"}
				</button>
			</div>
		</form>
	</dialog>
{/if}

<!-- Delete Ward Confirmation Modal -->
{#if deleteWardConfirm}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="modal-backdrop"
		onclick={() => (deleteWardConfirm = null)}
	></div>
	<dialog open class="modal modal-confirm">
		<h3>Eliminar Sala</h3>
		<p>
			¿Está seguro que desea eliminar la sala <strong
				>{deleteWardConfirm.name}</strong
			>?
		</p>
		{#if formError}
			<div class="error-alert">{formError}</div>
		{/if}
		<div class="modal-actions">
			<button
				type="button"
				class="btn btn-text"
				onclick={() => (deleteWardConfirm = null)}>Cancelar</button
			>
			<button
				type="button"
				class="btn btn-danger"
				onclick={handleDeleteWard}
				disabled={formLoading}
			>
				{formLoading ? "Eliminando..." : "Eliminar"}
			</button>
		</div>
	</dialog>
{/if}

<style>
	.admin-panel {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.panel-header {
		margin-bottom: 0.5rem;
	}

	.panel-subtitle {
		color: var(--text-muted);
		font-size: 1rem;
		margin-top: 0.25rem;
	}

	/* Tabs Styling */
	.tabs-nav {
		display: flex;
		gap: 0.5rem;
		border-bottom: 2px solid var(--border-color);
		padding-bottom: 2px;
		overflow-x: auto;
		scrollbar-width: none;
	}

	.tabs-nav::-webkit-scrollbar {
		display: none;
	}

	.tabs-nav button {
		background: transparent;
		border: none;
		padding: 0.75rem 1.25rem;
		font-size: 0.95rem;
		font-weight: 500;
		color: var(--text-muted);
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
		border-bottom: 3px solid transparent;
		margin-bottom: -2px;
	}

	.tabs-nav button:hover {
		color: var(--text-main);
	}

	.tabs-nav button.active {
		color: var(--primary);
		border-bottom-color: var(--primary);
		font-weight: 600;
	}

	/* Card and Containers */
	.card {
		background: var(--surface);
		border-radius: var(--border-radius-lg);
		box-shadow: var(--shadow-md);
		border: 1px solid var(--border-color);
		padding: 1.5rem;
	}

	.tab-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.tab-header h2 {
		margin: 0;
		font-size: 1.35rem;
	}

	/* Table Badges and Classes */
	tr.inactive {
		background: var(--background);
		opacity: 0.7;
	}

	.badge {
		padding: 0.25rem 0.5rem;
		border-radius: 9999px;
		font-size: 0.8rem;
		font-weight: 500;
		display: inline-block;
	}

	.badge.admin {
		background: var(--info-bg);
		color: var(--info);
	}
	.badge.health_staff {
		background: #f3e5f5;
		color: #7b1fa2;
	}
	.badge.active,
	.badge.badge-active {
		background: var(--success-bg);
		color: var(--success);
	}
	.badge.inactive,
	.badge.badge-inactive {
		background: var(--danger-bg);
		color: var(--danger);
	}

	.actions,
	.col-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	/* Buttons styling */
	.btn {
		border: 1px solid transparent;
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-md);
		font-weight: 500;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s ease;
		font-size: 0.9rem;
	}

	.btn-primary {
		background: var(--primary);
		color: white;
	}
	.btn-primary:hover {
		background: var(--primary-hover);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--background);
		color: var(--text-main);
		border-color: var(--border-color);
	}
	.btn-secondary:hover {
		background: var(--border-color);
	}

	.btn-danger {
		background: var(--danger-bg);
		color: var(--danger);
	}
	.btn-danger:hover {
		background: #fee2e2;
		border-color: rgba(239, 68, 68, 0.2);
	}

	.btn-success {
		background: var(--success-bg);
		color: var(--success);
	}
	.btn-success:hover {
		background: #d1fae5;
	}

	.btn-info {
		background: var(--info-bg);
		color: var(--info);
	}
	.btn-info:hover {
		background: #dbeafe;
	}

	.btn-text {
		background: transparent;
		color: var(--text-muted);
	}
	.btn-text:hover {
		background: var(--background);
	}

	.btn-sm {
		padding: 0.25rem 0.5rem;
		font-size: 0.8rem;
		border-radius: var(--border-radius-sm);
	}

	.empty {
		text-align: center;
		color: var(--text-muted);
		padding: 3rem;
	}

	/* Settings specific styling */
	.settings-form {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		max-width: 800px;
	}

	.settings-description {
		color: var(--text-muted);
		font-size: 0.95rem;
		line-height: 1.6;
		margin-bottom: 0.5rem;
	}

	.setting-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.25rem;
		background: var(--background);
		border-radius: var(--border-radius-md);
		border: 1px solid var(--border-color);
		gap: 2rem;
		flex-wrap: wrap;
	}

	.setting-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 250px;
	}

	.setting-title {
		font-weight: 600;
		font-size: 1rem;
		color: var(--text-main);
	}

	.setting-help {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.setting-input select {
		padding: 0.5rem 1rem;
		border-radius: var(--border-radius-sm);
		border: 1px solid var(--border-color);
		font-size: 0.95rem;
		background: white;
		cursor: pointer;
		min-width: 150px;
	}

	.settings-actions {
		display: flex;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 1rem;
		flex-wrap: wrap;
	}

	/* Modals styling */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(15, 23, 42, 0.5);
		backdrop-filter: blur(4px);
		z-index: 1000;
	}

	.modal {
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		background: white;
		padding: 2rem;
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--border-color);
		box-shadow: var(--shadow-lg);
		z-index: 1001;
		width: 90%;
		max-width: 480px;
	}

	.modal-confirm {
		max-width: 400px;
	}

	.modal h3 {
		margin-top: 0;
		margin-bottom: 1.5rem;
		color: var(--secondary);
		font-size: 1.25rem;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--text-main);
	}

	.checkbox-label {
		flex-direction: row;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	input[type="text"],
	input[type="password"],
	input[type="number"],
	select {
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		font-size: 0.95rem;
		width: 100%;
		background: white;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 2px var(--info-bg);
	}

	input[type="checkbox"] {
		width: auto;
		cursor: pointer;
	}

	.modal-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	/* Temp Password Display */
	.temp-password-box {
		background: var(--info-bg);
		border: 1px solid rgba(59, 130, 246, 0.2);
		border-radius: var(--border-radius-md);
		padding: 1rem;
		margin: 1rem 0;
	}

	.temp-password-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin: 0.5rem 0;
	}

	.temp-password-display code {
		background: var(--surface);
		padding: 0.5rem 0.75rem;
		border-radius: var(--border-radius-sm);
		font-family: monospace;
		font-size: 1.1rem;
		font-weight: 700;
		letter-spacing: 0.05em;
		flex: 1;
		text-align: center;
	}

	.temp-password-warning {
		color: var(--warning, #d97706);
		font-size: 0.85rem;
		font-weight: 500;
		margin: 0.5rem 0;
	}

	.error-alert {
		background: var(--danger-bg);
		border: 1px solid rgba(239, 68, 68, 0.2);
		border-radius: var(--border-radius-md);
		padding: 0.75rem 1rem;
		color: var(--danger);
		font-size: 0.9rem;
		font-weight: 500;
		margin-bottom: 1rem;
	}

	.loading-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 5rem 0;
		gap: 1rem;
		color: var(--text-muted);
	}

	.spinner {
		border: 3px solid var(--border-color);
		border-top: 3px solid var(--primary);
		border-radius: 50%;
		width: 2rem;
		height: 2rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% {
			transform: rotate(0deg);
		}
		100% {
			transform: rotate(360deg);
		}
	}

	/* Wards premium styles - mobile-first */
	.wards-list-container {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.ward-card {
		background: #f8fafc;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-lg);
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.ward-card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		border-bottom: 1px solid var(--border-color);
		padding-bottom: 0.75rem;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.ward-info h3 {
		margin: 0;
		color: var(--secondary);
		font-size: 1.15rem;
	}

	.ward-info p {
		margin: 0.25rem 0 0 0;
		color: var(--text-muted);
		font-size: 0.875rem;
	}

	.ward-beds-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.ward-beds-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.ward-beds-header h4 {
		margin: 0;
		font-size: 0.95rem;
		color: var(--text-main);
	}

	.empty-mini {
		color: var(--text-muted);
		font-style: italic;
		font-size: 0.85rem;
		padding: 0.5rem 0;
	}

	.ward-beds-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
		gap: 0.75rem;
	}

	.ward-bed-item {
		background: white;
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius-md);
		padding: 0.5rem 0.75rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.85rem;
	}

	.bed-tag {
		font-weight: 700;
		color: var(--secondary);
	}

	.bed-type-label {
		color: var(--text-muted);
		font-size: 0.75rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 80px;
	}

	.bed-actions-mini {
		display: flex;
		gap: 0.25rem;
	}

	.bed-actions-mini button {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 0.2rem;
		font-size: 0.85rem;
		border-radius: 4px;
	}

	.bed-actions-mini button:hover {
		background: var(--background);
	}

	.bed-actions-mini button.btn-delete:hover {
		background: var(--danger-bg);
	}
</style>

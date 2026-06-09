const PUBLIC_API_URL = import.meta.env?.VITE_PUBLIC_API_URL || '/api/v1';

export interface Staff {
	id: string;
	full_name: string;
	role: 'health_staff' | 'admin';
	username: string;
	is_active: boolean;
	must_change_password: boolean;
}

export interface BedType {
	id: number;
	name: string;
	prefix: string;
	requires_postpartum_followup: boolean;
}

export interface Bed {
	id: number;
	bed_type: BedType;
	number: number;
	current_admission_id: string | null;
	current_patient_name?: string;
	is_active: boolean;
	next_control_at?: string | null;
	estimated_discharge_at?: string | null;
	event_type?: 'parto' | 'cesarea' | 'ninguno' | null;
	control_count?: number;
}

export interface Patient {
	id: string;
	identity_number: string;
	full_name: string;
	birth_date: string;
	obstetric_history: Record<string, unknown>;
	is_admitted: boolean;
	current_admission_id: string | null;
	scheduled_at?: string;
}

export interface SurgicalSchedule {
	id: string;
	patient_id: string;
	patient_name?: string;
	procedure_type: string;
	scheduled_at: string;
	pre_surgical_diagnosis: string;
	created_at: string;
	updated_at: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	total_pages: number;
}

export interface Admission {
	id: string;
	patient_id: string;
	bed_id: number;
	status: 'active' | 'discharged';
	event_type: string;
	event_at: string | null;
	next_control_at: string | null;
	estimated_discharge_at: string | null;
	created_at: string;
	discharged_at: string | null;
	admission_diagnosis: string;
	current_diagnosis: string;
	current_diagnosis_updated_by?: string | null;
	current_diagnosis_updated_by_name?: string | null;
}

export interface ClinicalLog {
	id: number;
	admission_id: string;
	created_by: string | null;
	created_by_name: string | null;
	created_at: string;
	pa_systolic: number;
	pa_diastolic: number;
	heart_rate: number;
	resp_rate: number;
	temperature: number;
	spo2: number;
	pinard_status: boolean;
	lochia_type: number;
	lochia_amount: number;
	lochia_odor: boolean;
	has_clots: boolean;
	notes: string | null;
}

export interface AuxiliaryOrder {
	id: number;
	admission_id: string;
	category: 'laboratorio' | 'imagen' | 'procedimiento';
	description: string;
	status: 'pending' | 'done' | 'reported';
	created_by?: string;
	created_by_name?: string;
	updated_by?: string;
	updated_by_name?: string;
	created_at: string;
	updated_at: string;
	patient_name?: string;
	bed_number?: number;
	bed_prefix?: string;
}

export interface CreateOrderInput {
	category: 'laboratorio' | 'imagen' | 'procedimiento';
	description: string;
}

export interface UpdateOrderStatusInput {
	status: 'pending' | 'done' | 'reported';
}

export interface CreateClinicalLogInput {
	pa_systolic: number;
	pa_diastolic: number;
	heart_rate: number;
	resp_rate: number;
	temperature: number;
	spo2: number;
	pinard_status: boolean;
	lochia_type: number;
	lochia_amount: number;
	lochia_odor: boolean;
	has_clots: boolean;
	notes?: string;
}

export interface CreateClinicalLogResponse {
	log: ClinicalLog;
	next_control_at: string | null;
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};

	if (typeof window !== 'undefined') {
		const token = localStorage.getItem('token');
		if (token) {
			headers['Authorization'] = `Bearer ${token}`;
		}
	}

	const response = await fetch(`${PUBLIC_API_URL}${url}`, {
		...options,
		headers: {
			...headers,
			...options?.headers
		}
	});

	if (response.status === 401) {
		if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
			localStorage.removeItem('token');
			localStorage.removeItem('user');
			window.location.href = '/login';
		}
	}

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	const text = await response.text();
	return text ? JSON.parse(text) : {} as T;
}

// Bed Types
export async function getBedTypes(): Promise<BedType[]> {
	return fetchJSON<BedType[]>('/bed-types');
}

export async function getBedType(id: number): Promise<BedType> {
	return fetchJSON<BedType>(`/bed-types/${id}`);
}

export async function createBedType(data: {
	name: string;
	prefix: string;
	requires_postpartum_followup: boolean;
}): Promise<BedType> {
	return fetchJSON<BedType>('/bed-types', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateBedType(id: number, data: {
	name?: string;
	prefix?: string;
	requires_postpartum_followup?: boolean;
}): Promise<BedType> {
	return fetchJSON<BedType>(`/bed-types/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data)
	});
}

export async function deleteBedType(id: number): Promise<void> {
	await fetchJSON(`/bed-types/${id}`, {
		method: 'DELETE'
	});
}

// Beds
export async function getBeds(): Promise<Bed[]> {
	return fetchJSON<Bed[]>('/beds');
}

export async function getBed(id: number): Promise<Bed> {
	return fetchJSON<Bed>(`/beds/${id}`);
}

export async function createBed(data: {
	number: number;
	bed_type_id: number;
	is_active?: boolean;
}): Promise<Bed> {
	return fetchJSON<Bed>('/beds', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateBed(id: number, data: {
	number?: number;
	bed_type_id?: number;
}): Promise<Bed> {
	return fetchJSON<Bed>(`/beds/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data)
	});
}

export async function deleteBed(id: number): Promise<void> {
	await fetchJSON(`/beds/${id}`, {
		method: 'DELETE'
	});
}

export async function getBedPatient(bedId: number): Promise<Patient> {
	return fetchJSON<Patient>(`/beds/${bedId}/patient`);
}

// Patients
export async function createPatient(data: {
	identity_number: string;
	full_name: string;
	birth_date: string;
	obstetric_history?: Record<string, unknown>;
}): Promise<Patient> {
	return fetchJSON<Patient>('/patients', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function listPatients(page: number = 1, limit: number = 10): Promise<PaginatedResponse<Patient>> {
	return fetchJSON<PaginatedResponse<Patient>>(`/patients?page=${page}&limit=${limit}`);
}

export async function searchPatients(query: string): Promise<Patient[]> {
	return fetchJSON<Patient[]>(`/patients/search?q=${encodeURIComponent(query)}`);
}

export async function getPatient(id: string): Promise<Patient> {
	return fetchJSON<Patient>(`/patients/${id}`);
}

export async function updatePatient(id: string, data: {
	identity_number: string;
	full_name: string;
	birth_date: string;
	obstetric_history?: Record<string, unknown>;
}): Promise<Patient> {
	return fetchJSON<Patient>(`/patients/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data)
	});
}

export async function getPatientAdmissions(patientId: string): Promise<Admission[]> {
	return fetchJSON<Admission[]>(`/patients/${patientId}/admissions`);
}

// Admissions
export async function createAdmission(data: {
	patient_id: string;
	bed_id: number;
	admission_diagnosis: string;
}): Promise<Admission> {
	return fetchJSON<Admission>('/admissions', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function dischargeAdmission(admissionId: string): Promise<void> {
	await fetchJSON(`/admissions/${admissionId}/discharge`, {
		method: 'PUT'
	});
}

export async function updateAdmissionDiagnosis(admissionId: string, currentDiagnosis: string): Promise<Admission> {
	return fetchJSON<Admission>(`/admissions/${admissionId}/diagnosis`, {
		method: 'PUT',
		body: JSON.stringify({ current_diagnosis: currentDiagnosis })
	});
}

export async function getAdmission(id: string): Promise<Admission> {
	return fetchJSON<Admission>(`/admissions/${id}`);
}

export async function registerEvent(admissionId: string, eventType: 'parto' | 'cesarea'): Promise<Admission> {
	return fetchJSON<Admission>(`/admissions/${admissionId}/event`, {
		method: 'PUT',
		body: JSON.stringify({ event_type: eventType })
	});
}

export async function createClinicalLog(admissionId: string, input: CreateClinicalLogInput): Promise<CreateClinicalLogResponse> {
	return fetchJSON<CreateClinicalLogResponse>(`/admissions/${admissionId}/clinical-logs`, {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function listClinicalLogs(admissionId: string): Promise<ClinicalLog[]> {
	return fetchJSON<ClinicalLog[]>(`/admissions/${admissionId}/clinical-logs`);
}

// Auxiliary Orders
export async function createOrder(admissionId: string, input: CreateOrderInput): Promise<AuxiliaryOrder> {
	return fetchJSON<AuxiliaryOrder>(`/admissions/${admissionId}/orders`, {
		method: 'POST',
		body: JSON.stringify(input)
	});
}

export async function listOrdersByAdmission(admissionId: string): Promise<AuxiliaryOrder[]> {
	return fetchJSON<AuxiliaryOrder[]>(`/admissions/${admissionId}/orders`);
}

export async function listPendingOrders(): Promise<AuxiliaryOrder[]> {
	return fetchJSON<AuxiliaryOrder[]>('/orders/pending');
}

export async function updateOrderStatus(orderId: number, input: UpdateOrderStatusInput): Promise<void> {
	await fetchJSON(`/orders/${orderId}/status`, {
		method: 'PUT',
		body: JSON.stringify(input)
	});
}

export async function deleteOrder(orderId: number): Promise<void> {
	await fetchJSON(`/orders/${orderId}`, {
		method: 'DELETE'
	});
}

// Users (Admin only)
export async function listUsers(): Promise<Staff[]> {
	return fetchJSON<Staff[]>('/users');
}

export async function createUser(data: {
	username: string;
	full_name: string;
	role: 'health_staff' | 'admin';
	password?: string;
}): Promise<{ status: string; temporary_password: string }> {
	return fetchJSON<{ status: string; temporary_password: string }>('/users', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function updateStaff(id: string, data: { full_name: string; role: string }): Promise<Staff> {
	return fetchJSON<Staff>(`/users/${id}`, {
		method: 'PATCH',
		body: JSON.stringify(data)
	});
}

export async function resetPassword(id: string): Promise<{ temporary_password: string }> {
	return fetchJSON<{ temporary_password: string }>(`/users/${id}/reset-password`, {
		method: 'POST'
	});
}

export async function changeMyPassword(data: {
	current_password?: string;
	new_password: string;
	confirm_password: string;
}): Promise<{ token: string; user: Staff }> {
	return fetchJSON<{ token: string; user: Staff }>('/auth/change-password', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function changePassword(id: string, password: string): Promise<void> {
	await fetchJSON(`/users/${id}/password`, {
		method: 'PUT',
		body: JSON.stringify({ password })
	});
}

export async function setUserActive(id: string, is_active: boolean): Promise<void> {
	await fetchJSON(`/users/${id}/active`, {
		method: 'PUT',
		body: JSON.stringify({ is_active })
	});
}

// System Settings & SSE Ticket
export async function getSettings(): Promise<Record<string, string>> {
	return fetchJSON<Record<string, string>>('/settings');
}

export async function updateSettings(settings: Record<string, string>): Promise<{ message: string }> {
	return fetchJSON<{ message: string }>('/settings', {
		method: 'PUT',
		body: JSON.stringify(settings)
	});
}

export async function getSSETicket(): Promise<{ ticket: string }> {
	return fetchJSON<{ ticket: string }>('/auth/sse-ticket', {
		method: 'POST'
	});
}

// Surgical Schedules
export async function createSurgicalSchedule(data: {
	patient_id: string;
	procedure_type: string;
	scheduled_at: string;
	pre_surgical_diagnosis: string;
}): Promise<SurgicalSchedule> {
	return fetchJSON<SurgicalSchedule>('/surgical-schedules', {
		method: 'POST',
		body: JSON.stringify(data)
	});
}

export async function getSurgicalSchedulesByMonth(year: number, month: number): Promise<SurgicalSchedule[]> {
	return fetchJSON<SurgicalSchedule[]>(`/surgical-schedules?year=${year}&month=${month}`);
}

export async function getSurgicalSchedulesByDate(date: string): Promise<SurgicalSchedule[]> {
	return fetchJSON<SurgicalSchedule[]>(`/surgical-schedules/date?date=${encodeURIComponent(date)}`);
}

export async function getSurgicalScheduleByPatient(patientId: string): Promise<SurgicalSchedule | null> {
	return fetchJSON<SurgicalSchedule | null>(`/surgical-schedules/patient/${patientId}`);
}

export async function updateSurgicalSchedule(id: string, data: {
	procedure_type: string;
	scheduled_at: string;
	pre_surgical_diagnosis: string;
}): Promise<SurgicalSchedule> {
	return fetchJSON<SurgicalSchedule>(`/surgical-schedules/${id}`, {
		method: 'PUT',
		body: JSON.stringify(data)
	});
}

export async function deleteSurgicalSchedule(id: string): Promise<{ status: string }> {
	return fetchJSON<{ status: string }>(`/surgical-schedules/${id}`, {
		method: 'DELETE'
	});
}
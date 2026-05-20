const PUBLIC_API_URL = import.meta.env?.VITE_PUBLIC_API_URL || '/api/v1';

export interface Staff {
	id: string;
	full_name: string;
	role: 'health_staff' | 'admin';
	username: string;
	is_active: boolean;
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

// Admissions
export async function createAdmission(data: {
	patient_id: string;
	bed_id: number;
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

// Users (Admin only)
export async function listUsers(): Promise<Staff[]> {
	return fetchJSON<Staff[]>('/users');
}

export async function createUser(data: {
	username: string;
	full_name: string;
	role: 'health_staff' | 'admin';
	password?: string;
}): Promise<void> {
	await fetchJSON('/users', {
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
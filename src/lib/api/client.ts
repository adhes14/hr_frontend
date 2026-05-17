const BASE_URL = '/api/v1';

export interface BedType {
	id: number;
	name: string;
	prefix: string;
}

export interface Bed {
	id: number;
	bed_type: BedType;
	number: number;
	current_admission_id: string | null;
	is_active: boolean;
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
	const response = await fetch(`${BASE_URL}${url}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers
		}
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

// Beds
export async function getBeds(): Promise<Bed[]> {
	return fetchJSON<Bed[]>('/beds');
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
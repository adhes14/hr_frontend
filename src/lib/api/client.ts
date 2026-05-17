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
	created_at: string;
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
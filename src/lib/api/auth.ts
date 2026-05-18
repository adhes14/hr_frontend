import { type Staff } from './client';

const PUBLIC_API_URL = import.meta.env?.VITE_PUBLIC_API_URL || '/api/v1';

export interface LoginResponse {
	token: string;
	user: Staff;
}

export async function login(username: string, password: string):Promise<LoginResponse> {
	const response = await fetch(`${PUBLIC_API_URL}/auth/login`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ username, password })
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: 'Unknown error' }));
		throw new Error(error.error || `HTTP ${response.status}`);
	}

	return response.json();
}

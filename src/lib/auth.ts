import { writable, get } from 'svelte/store';

export interface User {
	id: string;
	username: string;
	full_name: string;
	role: 'health_staff' | 'admin';
	must_change_password: boolean;
}

export const currentUser = writable<User | null>(null);
export const token = writable<string | null>(null);

export function saveSession(newToken: string, user: User) {
	if (typeof window !== 'undefined') {
		localStorage.setItem('token', newToken);
		localStorage.setItem('user', JSON.stringify(user));
	}
	token.set(newToken);
	currentUser.set(user);
}

export function clearSession() {
	if (typeof window !== 'undefined') {
		localStorage.removeItem('token');
		localStorage.removeItem('user');
	}
	token.set(null);
	currentUser.set(null);
}

export function restoreSession() {
	if (typeof window !== 'undefined') {
		const storedToken = localStorage.getItem('token');
		const storedUser = localStorage.getItem('user');

		if (storedToken && storedUser) {
			try {
				token.set(storedToken);
				currentUser.set(JSON.parse(storedUser));
			} catch (e) {
				clearSession();
			}
		}
	}
}

export function isAuthenticated(): boolean {
	return get(token) !== null;
}

export function isAdmin(): boolean {
	const user = get(currentUser);
	return user !== null && user.role === 'admin';
}

export function isPasswordChangeRequired(): boolean {
	const user = get(currentUser);
	return user !== null && user.must_change_password === true;
}

export function getToken(): string | null {
	return get(token);
}

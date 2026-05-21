import { writable, get } from 'svelte/store';
import { getSSETicket, getSettings } from './api/client';
import { token } from './auth';

let eventSource: EventSource | null = null;
let reconnectTimeout: any = null;
let settings: Record<string, string> = {};

export const connectionStatus = writable<'connected' | 'disconnected' | 'connecting'>('disconnected');
export const overdueAlerts = writable<Record<number, { admission_id: string; next_control_at: string; patient_name: string; bed_number: number }>>({});
export const dischargeReadyAlerts = writable<Record<number, { admission_id: string; estimated_discharge_at: string; patient_name: string; bed_number: number }>>({});
export const bedUpdateTrigger = writable<number>(0);
export const ordersUpdateTrigger = writable<number>(0);
export const pendingOrdersCount = writable<number>(0);

export async function loadSettings() {
	try {
		settings = await getSettings();
	} catch (err) {
		console.error('Failed to load system settings:', err);
	}
}

function isSoundEnabled(settingKey: string): boolean {
	const val = settings[settingKey];
	return val === undefined ? true : val === 'true'; // Default to true if not set
}

export async function connectSSE() {
	if (typeof window === 'undefined') return;

	disconnectSSE();

	const userToken = get(token);
	if (!userToken) {
		connectionStatus.set('disconnected');
		return;
	}

	connectionStatus.set('connecting');

	try {
		await loadSettings();

		const res = await getSSETicket();
		const ticket = res.ticket;

		const PUBLIC_API_URL = import.meta.env?.VITE_PUBLIC_API_URL || '/api/v1';
		eventSource = new EventSource(`${PUBLIC_API_URL}/events?ticket=${ticket}`);

		eventSource.onopen = () => {
			connectionStatus.set('connected');
		};

		eventSource.onerror = (e) => {
			console.error('SSE Error:', e);
			connectionStatus.set('disconnected');
			eventSource?.close();
			// Auto-reconnect after 5 seconds if still authenticated
			if (get(token)) {
				reconnectTimeout = setTimeout(connectSSE, 5000);
			}
		};

		eventSource.addEventListener('connected', (e: MessageEvent) => {
			console.log('SSE connection acknowledged:', e.data);
		});

		eventSource.addEventListener('control_overdue', (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data);
				console.log('SSE control_overdue event:', data);
				
				overdueAlerts.update(alerts => {
					alerts[data.bed_id] = {
						admission_id: data.admission_id,
						next_control_at: data.next_control_at,
						patient_name: data.patient_name,
						bed_number: data.bed_number
					};
					return { ...alerts };
				});

				if (isSoundEnabled('sound_alert_control_overdue')) {
					playNotificationSound();
				}

				showBrowserNotification(
					'⚠️ Control Postparto Vencido',
					`Cama ${data.bed_number}: El control para ${data.patient_name} está atrasado.`
				);
			} catch (err) {
				console.error('Failed to parse control_overdue event data', err);
			}
		});

		eventSource.addEventListener('discharge_ready', (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data);
				console.log('SSE discharge_ready event:', data);

				let isNewAlert = false;
				dischargeReadyAlerts.update(alerts => {
					if (!alerts[data.bed_id] || alerts[data.bed_id].admission_id !== data.admission_id) {
						isNewAlert = true;
					}
					alerts[data.bed_id] = {
						admission_id: data.admission_id,
						estimated_discharge_at: data.estimated_discharge_at,
						patient_name: data.patient_name,
						bed_number: data.bed_number
					};
					return { ...alerts };
				});

				if (isNewAlert && data.sound) {
					playNotificationSound();
				}

				if (isNewAlert) {
					showBrowserNotification(
						'ℹ️ Paciente Alta Lista',
						`Cama ${data.bed_number}: ${data.patient_name} está lista para el alta.`
					);
				}
			} catch (err) {
				console.error('Failed to parse discharge_ready event data', err);
			}
		});

		eventSource.addEventListener('bed_updated', (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data);
				console.log('SSE bed_updated event:', data);
				bedUpdateTrigger.update(val => val + 1);

				if (data.action === 'admitted' && data.sound) {
					playNotificationSound();
				} else if (data.action === 'discharged' && data.sound) {
					playNotificationSound();
				}
			} catch (err) {
				console.error('Failed to parse bed_updated event data', err);
				bedUpdateTrigger.update(val => val + 1);
			}
		});

		eventSource.addEventListener('alert_cleared', (e: MessageEvent) => {
			try {
				const data = JSON.parse(e.data);
				console.log('SSE alert_cleared event:', data);
				const admissionId = data.admission_id;

				overdueAlerts.update(alerts => {
					for (const bedId in alerts) {
						if (alerts[bedId].admission_id === admissionId) {
							delete alerts[bedId];
						}
					}
					return { ...alerts };
				});

				dischargeReadyAlerts.update(alerts => {
					for (const bedId in alerts) {
						if (alerts[bedId].admission_id === admissionId) {
							delete alerts[bedId];
						}
					}
					return { ...alerts };
				});
			} catch (err) {
				console.error('Failed to parse alert_cleared event data', err);
			}
		});

		eventSource.addEventListener('orders_updated', (e: MessageEvent) => {
			console.log('SSE orders_updated event');
			ordersUpdateTrigger.update(val => val + 1);
		});

		eventSource.addEventListener('settings_updated', (e: MessageEvent) => {
			console.log('SSE settings_updated event');
			loadSettings();
		});

	} catch (err) {
		console.error('Failed to connect to SSE:', err);
		connectionStatus.set('disconnected');
		if (get(token)) {
			reconnectTimeout = setTimeout(connectSSE, 5000);
		}
	}
}

export function disconnectSSE() {
	if (eventSource) {
		eventSource.close();
		eventSource = null;
	}
	if (reconnectTimeout) {
		clearTimeout(reconnectTimeout);
		reconnectTimeout = null;
	}
	connectionStatus.set('disconnected');
}

export function requestNotificationPermission() {
	if (typeof window !== 'undefined' && 'Notification' in window) {
		if (Notification.permission === 'default') {
			Notification.requestPermission();
		}
	}
}

function showBrowserNotification(title: string, body: string) {
	if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
		try {
			new Notification(title, {
				body,
				tag: title + body,
				renotify: true
			} as any);
		} catch (e) {
			console.error('Failed to show notification', e);
		}
	}
}

// Web Audio API Synthesizer
let audioCtx: AudioContext | null = null;

function getAudioContext() {
	if (typeof window === 'undefined') return null;
	if (!audioCtx) {
		const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
		if (AudioContextClass) {
			audioCtx = new AudioContextClass();
		}
	}
	if (audioCtx && audioCtx.state === 'suspended') {
		audioCtx.resume().catch(() => {});
	}
	return audioCtx;
}

if (typeof window !== 'undefined') {
	const unlock = () => {
		const ctx = getAudioContext();
		if (ctx && ctx.state === 'running') {
			document.removeEventListener('click', unlock);
			document.removeEventListener('touchstart', unlock);
		}
	};
	document.addEventListener('click', unlock);
	document.addEventListener('touchstart', unlock);
}

export function playNotificationSound() {
	const ctx = getAudioContext();
	if (!ctx) return;

	const now = ctx.currentTime;
	const osc = ctx.createOscillator();
	const gain = ctx.createGain();

	osc.connect(gain);
	gain.connect(ctx.destination);

	osc.type = 'sine';

	// High quality synthesizer tone
	osc.frequency.setValueAtTime(880, now); // A5
	gain.gain.setValueAtTime(0, now);
	gain.gain.linearRampToValueAtTime(0.3, now + 0.05);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

	osc.frequency.setValueAtTime(880, now + 0.22);
	gain.gain.setValueAtTime(0, now + 0.22);
	gain.gain.linearRampToValueAtTime(0.3, now + 0.27);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.37);

	osc.frequency.setValueAtTime(880, now + 0.44);
	gain.gain.setValueAtTime(0, now + 0.44);
	gain.gain.linearRampToValueAtTime(0.3, now + 0.49);
	gain.gain.exponentialRampToValueAtTime(0.001, now + 0.59);

	osc.start(now);
	osc.stop(now + 0.62);
}

// biome-ignore-all lint/suspicious/noExplicitAny: Raw CDP messages have method-specific dynamic shapes; public callers can provide send<T> types.

export interface CDPResponse<T = any> {
	id?: number;
	method?: string;
	params?: any;
	result?: T;
	sessionId?: string;
	error?: {
		code: number;
		message: string;
		data?: string;
	};
}

export class CDPClient {
	private ws: WebSocket | null = null;
	private messageId = 0;
	private pendingRequests = new Map<
		number,
		{
			resolve: (result: any) => void;
			reject: (error: Error) => void;
			method: string;
			timer: ReturnType<typeof setTimeout>;
		}
	>();
	private eventListeners = new Map<string, Set<(params: any) => void>>();

	constructor(public readonly wsUrl: string) {}

	async connect(timeoutMs = 10000): Promise<void> {
		return new Promise((resolve, reject) => {
			let settled = false;
			const timer = setTimeout(() => {
				if (settled) return;
				settled = true;
				this.ws?.close();
				reject(new Error(`Timed out connecting to CDP WebSocket after ${timeoutMs}ms`));
			}, timeoutMs);
			try {
				const ws = new WebSocket(this.wsUrl);
				this.ws = ws;

				ws.onopen = () => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					resolve();
				};

				ws.onerror = (err) => {
					if (settled) return;
					settled = true;
					clearTimeout(timer);
					reject(new Error(`CDP WebSocket error: ${JSON.stringify(err)}`));
				};

				ws.onclose = () => {
					if (!settled) {
						settled = true;
						clearTimeout(timer);
						reject(new Error("CDP WebSocket closed before the connection was established"));
					}
					this.emitEvent("close", undefined);
					this.cleanup();
				};

				ws.onmessage = (event) => {
					this.handleMessage(event.data.toString());
				};
			} catch (err) {
				settled = true;
				clearTimeout(timer);
				reject(err);
			}
		});
	}

	private handleMessage(data: string) {
		let msg: CDPResponse;
		try {
			msg = JSON.parse(data);
		} catch {
			return;
		}

		// Handle response to a command
		if (typeof msg.id === "number") {
			const pending = this.pendingRequests.get(msg.id);
			if (pending) {
				this.pendingRequests.delete(msg.id);
				clearTimeout(pending.timer);
				if (msg.error) {
					pending.reject(
						new Error(`CDP Error in ${pending.method} (${msg.error.code}): ${msg.error.message}`),
					);
				} else {
					pending.resolve(msg.result);
				}
			}
			return;
		}

		// Handle event notification
		if (msg.method) {
			this.emitEvent(
				msg.method,
				msg.sessionId ? { ...(msg.params || {}), _sessionId: msg.sessionId } : msg.params,
			);
		}
	}

	private emitEvent(event: string, params: any): void {
		const listeners = this.eventListeners.get(event);
		if (!listeners) return;
		for (const listener of [...listeners]) {
			try {
				listener(params);
			} catch (error) {
				console.error(`Error in CDP event listener for ${event}:`, error);
			}
		}
	}

	send<T = any>(
		method: string,
		params: Record<string, any> = {},
		sessionId?: string,
		timeoutMs = 30000,
	): Promise<T> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return Promise.reject(new Error("CDP WebSocket is not connected"));
		}

		const id = ++this.messageId;
		return new Promise<T>((resolve, reject) => {
			const timer = setTimeout(() => {
				if (!this.pendingRequests.delete(id)) return;
				reject(new Error(`CDP command timed out after ${timeoutMs}ms: ${method}`));
			}, timeoutMs);
			this.pendingRequests.set(id, { resolve, reject, method, timer });
			const payload: Record<string, any> = { id, method, params };
			if (sessionId) payload.sessionId = sessionId;
			try {
				this.ws?.send(JSON.stringify(payload));
			} catch (error) {
				clearTimeout(timer);
				this.pendingRequests.delete(id);
				reject(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}

	on(event: string, callback: (params: any) => void): () => void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event)?.add(callback);
		return () => {
			this.eventListeners.get(event)?.delete(callback);
		};
	}

	once(event: string): Promise<any> {
		return new Promise((resolve) => {
			const unsubscribe = this.on(event, (params) => {
				unsubscribe();
				resolve(params);
			});
		});
	}

	private cleanup() {
		for (const [, { reject, method, timer }] of this.pendingRequests) {
			clearTimeout(timer);
			reject(new Error(`CDP connection closed while awaiting ${method}`));
		}
		this.pendingRequests.clear();
		this.eventListeners.clear();
	}

	close() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
		this.cleanup();
	}
}

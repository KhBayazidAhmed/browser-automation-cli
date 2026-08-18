export interface CDPEventMap {
	[eventName: string]: any;
}

export interface CDPResponse<T = any> {
	id?: number;
	method?: string;
	params?: any;
	result?: T;
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
		}
	>();
	private eventListeners = new Map<string, Set<(params: any) => void>>();

	constructor(public readonly wsUrl: string) {}

	async connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				const ws = new WebSocket(this.wsUrl);
				this.ws = ws;

				ws.onopen = () => {
					resolve();
				};

				ws.onerror = (err) => {
					reject(new Error(`CDP WebSocket error: ${JSON.stringify(err)}`));
				};

				ws.onclose = () => {
					this.cleanup();
				};

				ws.onmessage = (event) => {
					this.handleMessage(event.data.toString());
				};
			} catch (err) {
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
				if (msg.error) {
					pending.reject(
						new Error(
							`CDP Error in ${pending.method} (${msg.error.code}): ${msg.error.message}`,
						),
					);
				} else {
					pending.resolve(msg.result);
				}
			}
			return;
		}

		// Handle event notification
		if (msg.method) {
			const listeners = this.eventListeners.get(msg.method);
			if (listeners) {
				for (const listener of listeners) {
					try {
						listener(msg.params);
					} catch (e) {
						console.error(`Error in CDP event listener for ${msg.method}:`, e);
					}
				}
			}
		}
	}

	send<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			return Promise.reject(new Error("CDP WebSocket is not connected"));
		}

		const id = ++this.messageId;
		return new Promise<T>((resolve, reject) => {
			this.pendingRequests.set(id, { resolve, reject, method });
			this.ws!.send(JSON.stringify({ id, method, params }));
		});
	}

	on(event: string, callback: (params: any) => void): () => void {
		if (!this.eventListeners.has(event)) {
			this.eventListeners.set(event, new Set());
		}
		this.eventListeners.get(event)!.add(callback);
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
		for (const [, { reject, method }] of this.pendingRequests) {
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

import { AuthoringSession } from "./session.js";
import type { AuthoringSessionOptions } from "./types.js";

export class AuthoringSessionManager {
	private readonly sessions = new Map<string, AuthoringSession>();

	async start(options: AuthoringSessionOptions): Promise<AuthoringSession> {
		const session = await AuthoringSession.start(options);
		this.sessions.set(session.id, session);
		return session;
	}

	get(sessionId: string): AuthoringSession {
		const session = this.sessions.get(sessionId);
		if (!session) throw new Error(`Unknown authoring session "${sessionId}"`);
		return session;
	}

	async close(sessionId: string): Promise<void> {
		const session = this.get(sessionId);
		try {
			await session.close();
		} finally {
			this.sessions.delete(sessionId);
		}
	}

	async closeAll(): Promise<void> {
		const sessions = [...this.sessions.values()];
		this.sessions.clear();
		await Promise.allSettled(sessions.map((session) => session.close()));
	}
}

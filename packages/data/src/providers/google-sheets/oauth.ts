import { createHash, randomBytes } from "node:crypto";
import { DataError } from "../../errors.js";
import { type GoogleCredentials, SecureCredentialStore } from "./credentials.js";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const DEFAULT_SCOPE =
	"openid email https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly";

function oauthConfig() {
	const clientId = process.env.GOOGLE_CLIENT_ID;
	const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
	if (!clientId)
		throw new DataError("GOOGLE_CLIENT_ID is required for Google Sheets login", "AUTH_ERROR");
	return { clientId, clientSecret };
}

export function assertOAuthState(expected: string, actual: string | null): void {
	if (actual !== expected) {
		throw new DataError("OAuth state validation failed", "AUTH_ERROR");
	}
}

async function tokenRequest(params: Record<string, string>): Promise<Record<string, unknown>> {
	let response: Response;
	try {
		response = await fetch(TOKEN_URL, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams(params),
		});
	} catch (error) {
		throw new DataError(
			`Google OAuth network error: ${error instanceof Error ? error.message : String(error)}`,
			"AUTH_ERROR",
			true,
			undefined,
			error,
		);
	}
	const raw = await response.text();
	let data: Record<string, unknown>;
	try {
		data = JSON.parse(raw) as Record<string, unknown>;
	} catch {
		data = { error_description: raw || response.statusText };
	}
	if (!response.ok)
		throw new DataError(
			String(data.error_description || data.error || "OAuth token exchange failed"),
			"AUTH_ERROR",
		);
	return data;
}

function accessTokenFrom(data: Record<string, unknown>): string {
	if (typeof data.access_token !== "string" || !data.access_token) {
		throw new DataError("Google OAuth response did not include an access token", "AUTH_ERROR");
	}
	return data.access_token;
}

async function openAuthorizationPage(url: string): Promise<void> {
	const command =
		process.platform === "darwin"
			? ["open", url]
			: process.platform === "win32"
				? ["cmd", "/c", "start", url]
				: ["xdg-open", url];
	const result = Bun.spawn(command, { stdout: "ignore", stderr: "ignore" });
	await result.exited;
}

export class GoogleOAuth {
	constructor(private readonly store = new SecureCredentialStore()) {}

	async login(accountHint?: string): Promise<GoogleCredentials> {
		const { clientId, clientSecret } = oauthConfig();
		const state = randomBytes(24).toString("base64url");
		const verifier = randomBytes(48).toString("base64url");
		const challenge = createHash("sha256").update(verifier).digest("base64url");
		let resolveCode!: (code: string) => void;
		let rejectCode!: (error: Error) => void;
		const codePromise = new Promise<string>((resolve, reject) => {
			resolveCode = resolve;
			rejectCode = reject;
		});
		const server = Bun.serve({
			port: 0,
			fetch(request) {
				const url = new URL(request.url);
				if (url.pathname !== "/callback") {
					return new Response("Not found", { status: 404 });
				}
				try {
					assertOAuthState(state, url.searchParams.get("state"));
				} catch (error) {
					rejectCode(error as Error);
					return new Response("Invalid OAuth state", { status: 400 });
				}
				const code = url.searchParams.get("code");
				if (!code) {
					rejectCode(
						new DataError(url.searchParams.get("error") || "OAuth login denied", "AUTH_ERROR"),
					);
					return new Response("Authorization failed", { status: 400 });
				}
				resolveCode(code);
				return new Response("Google Sheets authorization complete. You may close this window.");
			},
		});
		const redirectUri = `http://127.0.0.1:${server.port}/callback`;
		const query = new URLSearchParams({
			client_id: clientId,
			redirect_uri: redirectUri,
			response_type: "code",
			scope: DEFAULT_SCOPE,
			access_type: "offline",
			prompt: "consent",
			state,
			code_challenge: challenge,
			code_challenge_method: "S256",
		});
		if (accountHint) query.set("login_hint", accountHint);
		try {
			await openAuthorizationPage(`${AUTH_URL}?${query}`);
			const code = await Promise.race([
				codePromise,
				Bun.sleep(300_000).then(() => {
					throw new DataError("Google OAuth login timed out", "AUTH_ERROR");
				}),
			]);
			const data = await tokenRequest({
				client_id: clientId,
				...(clientSecret ? { client_secret: clientSecret } : {}),
				code,
				code_verifier: verifier,
				grant_type: "authorization_code",
				redirect_uri: redirectUri,
			});
			const accessToken = accessTokenFrom(data);
			const userResponse = await fetch(USERINFO_URL, {
				headers: { authorization: `Bearer ${accessToken}` },
			});
			if (!userResponse.ok) {
				throw new DataError(`Google account lookup failed (${userResponse.status})`, "AUTH_ERROR");
			}
			const user = (await userResponse.json()) as { email?: string; sub?: string };
			const credentials: GoogleCredentials = {
				account: user.email || user.sub || accountHint || "default",
				email: user.email,
				accessToken,
				refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
				expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
				scope: String(data.scope || DEFAULT_SCOPE),
			};
			await this.store.set(credentials);
			return credentials;
		} finally {
			server.stop(true);
		}
	}

	async accessToken(account?: string, forceRefresh = false): Promise<string> {
		const credentials = await this.store.get(account);
		if (!credentials)
			throw new DataError("No Google account is logged in. Run sheets login.", "AUTH_ERROR");
		if (!forceRefresh && credentials.expiresAt > Date.now() + 60_000) {
			return credentials.accessToken;
		}
		if (!credentials.refreshToken)
			throw new DataError("Google session expired; run sheets login again", "AUTH_ERROR");
		const { clientId, clientSecret } = oauthConfig();
		const data = await tokenRequest({
			client_id: clientId,
			...(clientSecret ? { client_secret: clientSecret } : {}),
			refresh_token: credentials.refreshToken,
			grant_type: "refresh_token",
		});
		const refreshed = {
			...credentials,
			accessToken: accessTokenFrom(data),
			expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
		};
		await this.store.set(refreshed);
		return refreshed.accessToken;
	}

	async logout(account?: string): Promise<void> {
		const credentials = await this.store.get(account);
		if (!credentials) return;
		await fetch(REVOKE_URL, {
			method: "POST",
			headers: { "content-type": "application/x-www-form-urlencoded" },
			body: new URLSearchParams({ token: credentials.refreshToken || credentials.accessToken }),
		}).catch(() => undefined);
		await this.store.delete(credentials.account);
	}

	listAccounts() {
		return this.store.list();
	}
}

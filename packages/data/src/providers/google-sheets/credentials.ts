import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { DataError } from "../../errors.js";

export interface GoogleCredentials {
	account: string;
	email?: string;
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
	scope: string;
}

interface EncryptedPayload {
	iv: string;
	tag: string;
	data: string;
}
type AccountIndexEntry = Pick<GoogleCredentials, "account" | "email" | "expiresAt">;
const KEYCHAIN_SERVICE = "browser-automation-cli.google-sheets";

function configDirectory(): string {
	return (
		process.env.BROWSER_AUTOMATION_CONFIG_DIR ||
		join(homedir(), ".config", "browser-automation-cli")
	);
}

function hasMacKeychain(): boolean {
	return (
		process.env.BROWSER_AUTOMATION_DISABLE_KEYCHAIN !== "1" &&
		process.platform === "darwin" &&
		Boolean(Bun.which("security"))
	);
}

function keychainRead(account: string): GoogleCredentials | null {
	const result = Bun.spawnSync([
		"security",
		"find-generic-password",
		"-s",
		KEYCHAIN_SERVICE,
		"-a",
		account,
		"-w",
	]);
	if (result.exitCode !== 0) return null;
	try {
		return JSON.parse(result.stdout.toString()) as GoogleCredentials;
	} catch {
		return null;
	}
}

function keychainWrite(credentials: GoogleCredentials): void {
	const result = Bun.spawnSync([
		"security",
		"add-generic-password",
		"-U",
		"-s",
		KEYCHAIN_SERVICE,
		"-a",
		credentials.account,
		"-w",
		JSON.stringify(credentials),
	]);
	if (result.exitCode !== 0) {
		throw new DataError("Unable to save credentials in macOS Keychain", "AUTH_ERROR");
	}
}

function keychainDelete(account: string): void {
	Bun.spawnSync(["security", "delete-generic-password", "-s", KEYCHAIN_SERVICE, "-a", account]);
}

async function ensureSecret(path: string): Promise<Buffer> {
	const environmentKey = process.env.BROWSER_AUTOMATION_CREDENTIAL_KEY;
	if (environmentKey) return scryptSync(environmentKey, "browser-automation-cli", 32);
	try {
		return Buffer.from((await readFile(path, "utf8")).trim(), "base64");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
		await mkdir(dirname(path), { recursive: true });
		const key = randomBytes(32);
		await writeFile(path, key.toString("base64"), { mode: 0o600 });
		await chmod(path, 0o600);
		return key;
	}
}

function encrypt(value: unknown, key: Buffer): EncryptedPayload {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const data = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
	return {
		iv: iv.toString("base64"),
		tag: cipher.getAuthTag().toString("base64"),
		data: data.toString("base64"),
	};
}

function decrypt<T>(payload: EncryptedPayload, key: Buffer): T {
	const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
	decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
	const raw = Buffer.concat([
		decipher.update(Buffer.from(payload.data, "base64")),
		decipher.final(),
	]);
	return JSON.parse(raw.toString("utf8")) as T;
}

export class SecureCredentialStore {
	private readonly file = join(configDirectory(), "google-accounts.enc.json");
	private readonly keyFile = join(configDirectory(), "credential-key");
	private readonly indexFile = join(configDirectory(), "google-accounts.json");
	private mutationChain: Promise<void> = Promise.resolve();

	private async readIndex(): Promise<AccountIndexEntry[]> {
		try {
			return JSON.parse(await readFile(this.indexFile, "utf8")) as AccountIndexEntry[];
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
			throw error;
		}
	}

	private async writeIndex(entries: AccountIndexEntry[]): Promise<void> {
		await mkdir(dirname(this.indexFile), { recursive: true });
		const temporary = `${this.indexFile}.${process.pid}.tmp`;
		await writeFile(temporary, JSON.stringify(entries, null, 2), { mode: 0o600 });
		await rename(temporary, this.indexFile);
	}

	private async readAll(): Promise<Record<string, GoogleCredentials>> {
		try {
			const payload = JSON.parse(await readFile(this.file, "utf8")) as EncryptedPayload;
			return decrypt(payload, await ensureSecret(this.keyFile));
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return {};
			throw new DataError(
				"Unable to decrypt stored Google credentials",
				"AUTH_ERROR",
				false,
				undefined,
				error,
			);
		}
	}

	private async writeAll(accounts: Record<string, GoogleCredentials>): Promise<void> {
		await mkdir(dirname(this.file), { recursive: true });
		const temporary = `${this.file}.${process.pid}.tmp`;
		await writeFile(
			temporary,
			JSON.stringify(encrypt(accounts, await ensureSecret(this.keyFile))),
			{ mode: 0o600 },
		);
		await chmod(temporary, 0o600);
		await rename(temporary, this.file);
	}

	async list(): Promise<AccountIndexEntry[]> {
		if (hasMacKeychain()) return this.readIndex();
		return Object.values(await this.readAll()).map(({ account, email, expiresAt }) => ({
			account,
			email,
			expiresAt,
		}));
	}

	async get(account?: string): Promise<GoogleCredentials | null> {
		if (hasMacKeychain()) {
			const selected = account || (await this.readIndex())[0]?.account;
			return selected ? keychainRead(selected) : null;
		}
		const accounts = await this.readAll();
		return account ? accounts[account] || null : Object.values(accounts)[0] || null;
	}

	async set(credentials: GoogleCredentials): Promise<void> {
		const operation = this.mutationChain.then(async () => {
			if (hasMacKeychain()) {
				keychainWrite(credentials);
				const entries = (await this.readIndex()).filter(
					(item) => item.account !== credentials.account,
				);
				entries.push({
					account: credentials.account,
					email: credentials.email,
					expiresAt: credentials.expiresAt,
				});
				await this.writeIndex(entries);
				return;
			}
			const accounts = await this.readAll();
			accounts[credentials.account] = credentials;
			await this.writeAll(accounts);
		});
		this.mutationChain = operation.catch(() => undefined);
		await operation;
	}

	async delete(account?: string): Promise<number> {
		const operation = this.mutationChain.then(async () => {
			if (hasMacKeychain()) {
				const entries = await this.readIndex();
				for (const item of entries) {
					if (!account || item.account === account) keychainDelete(item.account);
				}
				const remaining = account ? entries.filter((item) => item.account !== account) : [];
				await this.writeIndex(remaining);
				return remaining.length;
			}
			const accounts = await this.readAll();
			if (account) delete accounts[account];
			else for (const key of Object.keys(accounts)) delete accounts[key];
			await this.writeAll(accounts);
			return Object.keys(accounts).length;
		});
		this.mutationChain = operation.then(
			() => undefined,
			() => undefined,
		);
		return operation;
	}
}

import fs from "fs";
import path from "path";

export const BASE_URL = process.env.TEST_API_URL || "http://localhost:3000/api";
export const ADMIN_EMAIL = "mdshahriarhimel@gmail.com";

function getEffectiveAdminPassword(): string {
  try {
    const credsPath = path.resolve(process.cwd(), "data", "credentials.json");
    if (fs.existsSync(credsPath)) {
      const data = JSON.parse(fs.readFileSync(credsPath, "utf-8"));
      if (data && data[ADMIN_EMAIL]) return data[ADMIN_EMAIL];
    }
  } catch {}
  return process.env.TEST_ADMIN_PASSWORD || "Ababil@2025";
}

export const ADMIN_PASSWORD = getEffectiveAdminPassword();

export interface TestSession {
  token: string;
  user: any;
  headers: Record<string, string>;
}

let cachedAdminSession: TestSession | null = null;

export async function getAdminSession(): Promise<TestSession> {
  if (cachedAdminSession) return cachedAdminSession;

  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin login failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedAdminSession = {
    token: data.token,
    user: data.user,
    headers: {
      "Authorization": `Bearer ${data.token}`,
      "Content-Type": "application/json"
    }
  };
  return cachedAdminSession;
}

export function getTenantHeaders(session: TestSession, messId: string): Record<string, string> {
  return {
    ...session.headers,
    "x-mess-id": messId
  };
}

export async function createTestMess(session: TestSession, name: string): Promise<{ id: string; name: string; messCode: string }> {
  const res = await fetch(`${BASE_URL}/admin/messes`, {
    method: "POST",
    headers: session.headers,
    body: JSON.stringify({ name })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create mess "${name}": ${res.status} ${text}`);
  }

  const data = await res.json();
  const created = (data.messes || []).find((m: any) => m.id === data.newMessId);
  return {
    id: data.newMessId,
    name: created?.name || name,
    messCode: created?.messCode || ""
  };
}

export async function deleteTestMess(messId: string): Promise<void> {
  try {
    const DB_DIR = path.resolve(process.cwd(), "data");
    const messesFile = path.join(DB_DIR, "messes.json");
    if (fs.existsSync(messesFile)) {
      const data = JSON.parse(fs.readFileSync(messesFile, "utf-8"));
      if (data && Array.isArray(data.messes)) {
        data.messes = data.messes.filter((m: any) => m.id !== messId);
        fs.writeFileSync(messesFile, JSON.stringify(data, null, 2), "utf-8");
      }
    }

    const backupFile = path.join(DB_DIR, `database_backup_${messId}.json`);
    if (fs.existsSync(backupFile)) {
      fs.unlinkSync(backupFile);
    }

    const settingsFile = path.join(DB_DIR, `settings_${messId}.json`);
    if (fs.existsSync(settingsFile)) {
      fs.unlinkSync(settingsFile);
    }

    try {
      const { db } = await import("../../src/db/index.js");
      const { tenantSettings } = await import("../../src/db/schema.js");
      const { eq } = await import("drizzle-orm");
      await db.delete(tenantSettings).where(eq(tenantSettings.messId, messId));
    } catch {}
  } catch (err) {
    console.warn(`[Cleanup] Warning deleting test mess ${messId}:`, err);
  }
}


import postgres from "postgres@3.4.7";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3@3.1169.0";
const databaseUrl = Bun.env.DATABASE_URL || "";
const openAiKey = Bun.env.OPENAI_API_KEY || "";
const bucketName = Bun.env.S3_BUCKET || "";
const bucketClient = new S3Client({
  region: Bun.env.S3_REGION || "auto",
  endpoint: Bun.env.S3_ENDPOINT || undefined,
  forcePathStyle: false,
  credentials: {
    accessKeyId: Bun.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: Bun.env.S3_SECRET_ACCESS_KEY || ""
  }
});
const appOrigin = Bun.env.APP_ORIGIN || "";
const sql = databaseUrl ? postgres(databaseUrl, { max: 5, connect_timeout: 10, idle_timeout: 20, ssl: { rejectUnauthorized: false } }) : null;
let dbReady = false;
async function initDatabase() {
  if (!sql) return;
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, password_hash text NOT NULL, password_salt text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_sessions (token_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_sessions_user_idx ON expert_ai_sessions(user_id)");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_chats (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, title text NOT NULL DEFAULT 'New chat', messages jsonb NOT NULL DEFAULT '[]'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_chats_user_updated_idx ON expert_ai_chats(user_id, updated_at DESC)");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, name text NOT NULL, description text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_projects_user_idx ON expert_ai_projects(user_id, updated_at DESC)");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_preferences (user_id uuid PRIMARY KEY REFERENCES expert_ai_users(id) ON DELETE CASCADE, preferences jsonb NOT NULL DEFAULT '{}'::jsonb, updated_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, name text NOT NULL, content_type text NOT NULL, size bigint NOT NULL DEFAULT 0, object_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("ALTER TABLE expert_ai_files ADD COLUMN IF NOT EXISTS is_temporary boolean NOT NULL DEFAULT false");
  await sql.unsafe("ALTER TABLE expert_ai_files ADD COLUMN IF NOT EXISTS expires_at timestamptz");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_files_user_idx ON expert_ai_files(user_id, created_at DESC)");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_family_invites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, invite_hash text NOT NULL UNIQUE, role text NOT NULL CHECK (role IN ('member','child')), expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_family_members (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, member_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, role text NOT NULL CHECK (role IN ('member','child')), safe_mode boolean NOT NULL DEFAULT true, allow_images boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_id, member_id), CHECK(owner_id <> member_id))");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_family_member_idx ON expert_ai_family_members(member_id)");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_oauth_states (state_hash text PRIMARY KEY, user_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, provider text NOT NULL CHECK (provider IN ('google','github','slack','notion')), redirect_uri text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now())");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_oauth_states_expiry_idx ON expert_ai_oauth_states(expires_at)");
  await sql.unsafe("CREATE TABLE IF NOT EXISTS expert_ai_integrations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES expert_ai_users(id) ON DELETE CASCADE, provider text NOT NULL CHECK (provider IN ('google','github','slack','notion')), provider_account_id text, account_email text, workspace_name text, access_token_enc text NOT NULL, refresh_token_enc text, token_type text, scopes text NOT NULL DEFAULT '', expires_at timestamptz, metadata jsonb NOT NULL DEFAULT '{}'::jsonb, connected_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, provider))");
  await sql.unsafe("CREATE INDEX IF NOT EXISTS expert_ai_integrations_user_idx ON expert_ai_integrations(user_id, provider)");
  dbReady = true;
}
try { await initDatabase(); } catch (error) { console.error("Database initialization failed", String(error)); }
const encoder = new TextEncoder();
const limiter = new Map<string, { count: number; expires: number }>();
function json(data: unknown, status = 200, origin?: string | null) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "vary": "Origin" });
  const allowedOrigins = appOrigin.split(",").map(value => value.trim()).filter(Boolean);
  if (origin && allowedOrigins.includes(origin)) headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-headers", "authorization, content-type");
  headers.set("access-control-allow-methods", "GET, POST, PUT, DELETE, OPTIONS");
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}
function rateLimit(request: Request, bucket: string, max = 12) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = bucket + ":" + ip;
  const now = Date.now();
  const entry = limiter.get(key);
  if (!entry || entry.expires <= now) {
    limiter.set(key, { count: 1, expires: now + 600000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= max;
}
async function parseBody(request: Request) {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > 7_000_000) throw new Error("Request body is too large.");
  return await request.json() as Record<string, any>;
}
function randomHex(length = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
}
async function digest(value: string) {
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(buffer), value => value.toString(16).padStart(2, "0")).join("");
}
async function passwordHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: encoder.encode(salt), iterations: 310000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), value => value.toString(16).padStart(2, "0")).join("");
}
function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function createSession(userId: string) {
  const token = randomHex(32);
  await sql!.unsafe("INSERT INTO expert_ai_sessions(token_hash, user_id, expires_at) VALUES($1, $2, now() + interval '30 days')", [await digest(token), userId]);
  return token;
}
async function currentUser(request: Request) {
  if (!sql || !dbReady) return null;
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "");
  if (!match) return null;
  const rows = await sql.unsafe("SELECT u.id, u.email FROM expert_ai_sessions s JOIN expert_ai_users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at > now()", [await digest(match[1])]);
  return rows[0] || null;
}
function extractText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text.trim();
  const pieces: string[] = [];
  for (const item of Array.isArray(data?.output) ? data.output : []) {
    if (item?.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) if (block?.type === "output_text" && typeof block.text === "string") pieces.push(block.text);
    }
  }
  return pieces.join("\n").trim();
}
async function openAiResponse(payload: Record<string, unknown>) {
  if (!openAiKey) throw new Error("OPENAI_API_KEY is not configured on this Railway service.");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: "Bearer " + openAiKey, "content-type": "application/json" },
    body: JSON.stringify({ ...payload, store: false })
  });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(String(data?.error?.message || "OpenAI request failed.").slice(0, 400));
  return data;
}

const fallbackChatModels = [
  { id: "gpt-6-astra", name: "GPT-6 Astra" },
  { id: "gpt-6.1-sol", name: "GPT-6.1 Sol" },
  { id: "gpt-6.1-terra", name: "GPT-6.1 Terra" },
  { id: "gpt-6-luna", name: "GPT-6 Luna" },
  { id: "gpt-6-cyber", name: "GPT-6 Cyber" },
  { id: "gpt-5.6", name: "GPT-5.6" },
  { id: "gpt-5.5", name: "GPT-5.5" }
];
let chatModelCache: { fetchedAt: number; models: Array<{ id: string; name: string }> } = { fetchedAt: 0, models: [] };
async function listOpenAIChatModels(force = false) {
  if (!openAiKey) return fallbackChatModels;
  if (!force && chatModelCache.models.length && Date.now() - chatModelCache.fetchedAt < 300000) return chatModelCache.models;
  const response = await fetch("https://api.openai.com/v1/models", { headers: { authorization: "Bearer " + openAiKey } });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) throw new Error(String(data?.error?.message || "Could not load available OpenAI models.").slice(0, 300));
  const excluded = /(image|audio|tts|transcrib|whisper|embedding|moderation|realtime|diariz|computer-use|deep-research)/i;
  const items = (Array.isArray(data?.data) ? data.data : [])
    .map((item: any) => String(item?.id || ""))
    .filter((id: string) => /^(gpt-|chat-latest)/i.test(id) && !excluded.test(id))
    .map((id: string) => ({ id, name: id === "chat-latest" ? "Chat Latest" : id.replace(/^gpt-/i, "GPT-").replace(/-/g, " ") }));
  const unique = Array.from(new Map(items.map((item: any) => [item.id, item])).values()) as Array<{ id: string; name: string }>;
  if (!unique.length) throw new Error("No chat-capable GPT models were returned for this API project.");
  const priority = ["gpt-6-astra", "gpt-6.1-sol", "gpt-6.1-terra", "gpt-6-luna", "gpt-5.6", "gpt-5.5"];
  unique.sort((a,b) => {
    const ai = priority.indexOf(a.id), bi = priority.indexOf(b.id);
    if (ai >= 0 || bi >= 0) return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    return a.id.localeCompare(b.id);
  });
  chatModelCache = { fetchedAt: Date.now(), models: unique };
  return unique;
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join("");
}
function validProvider(provider: string) {
  return ["google", "github", "slack", "notion"].includes(provider);
}
function providerReady(provider: string) {
  const names: Record<string, [string, string]> = {
    google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    slack: ["SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"],
    notion: ["NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"]
  };
  const keys = names[provider];
  return !!keys && !!Bun.env[keys[0]] && !!Bun.env[keys[1]] && /^[a-f0-9]{64}$/i.test(Bun.env.INTEGRATION_ENCRYPTION_KEY || "");
}

function integrationRedirectUri(provider: string) {
  const base = (Bun.env.PUBLIC_API_URL || "https://expert-ai-api-production.up.railway.app").replace(/\/+$/, "");
  return base + "/api/oauth/" + provider + "/callback";
}
function integrationReturnUrl(provider: string, ok: boolean, reason = "") {
  const base = appOrigin.split(",").map(value => value.trim()).filter(Boolean)[0] || "https://expert-ai-web-mxja-production.up.railway.app";
  const target = new URL(base);
  if (ok) target.searchParams.set("connected", provider);
  else target.searchParams.set("integration_error", (provider + ": " + reason).slice(0, 160));
  return new Response(null, { status: 303, headers: { location: target.toString(), "cache-control": "no-store", "referrer-policy": "no-referrer" } });
}
function integrationKeyBytes() {
  const hex = Bun.env.INTEGRATION_ENCRYPTION_KEY || "";
  if (!/^[a-f0-9]{64}$/i.test(hex)) throw new Error("Integration token vault is not configured.");
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
async function encryptIntegrationSecret(value: string) {
  const key = await crypto.subtle.importKey("raw", integrationKeyBytes(), { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value));
  return Buffer.from(iv).toString("base64") + "." + Buffer.from(encrypted).toString("base64");
}
async function decryptIntegrationSecret(value: string) {
  const parts = String(value || "").split(".");
  if (parts.length !== 2) throw new Error("Stored integration token is invalid.");
  const key = await crypto.subtle.importKey("raw", integrationKeyBytes(), { name: "AES-GCM" }, false, ["decrypt"]);
  const iv = new Uint8Array(Buffer.from(parts[0], "base64"));
  const encrypted = new Uint8Array(Buffer.from(parts[1], "base64"));
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);
  return new TextDecoder().decode(plain);
}
function oauthClient(provider: string) {
  const values: Record<string, [string, string]> = {
    google: [Bun.env.GOOGLE_CLIENT_ID || "", Bun.env.GOOGLE_CLIENT_SECRET || ""],
    github: [Bun.env.GITHUB_CLIENT_ID || "", Bun.env.GITHUB_CLIENT_SECRET || ""],
    slack: [Bun.env.SLACK_CLIENT_ID || "", Bun.env.SLACK_CLIENT_SECRET || ""],
    notion: [Bun.env.NOTION_CLIENT_ID || "", Bun.env.NOTION_CLIENT_SECRET || ""]
  };
  return values[provider] || ["", ""];
}
function oauthAuthorizationUrl(provider: string, state: string) {
  const [clientId] = oauthClient(provider);
  const redirectUri = integrationRedirectUri(provider);
  let endpoint = "";
  const params = new URLSearchParams();
  params.set("response_type", "code");
  params.set("client_id", clientId);
  params.set("redirect_uri", redirectUri);
  params.set("state", state);
  if (provider === "google") {
    endpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    params.set("scope", [
      "openid", "email", "profile",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.compose",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.events"
    ].join(" "));
    params.set("access_type", "offline");
    params.set("prompt", "consent");
    params.set("include_granted_scopes", "true");
  } else if (provider === "github") {
    endpoint = "https://github.com/login/oauth/authorize";
    params.set("scope", "read:user user:email repo");
  } else if (provider === "slack") {
    endpoint = "https://slack.com/oauth/v2/authorize";
    params.set("scope", "channels:read,groups:read,users:read,chat:write");
    params.set("user_scope", "search:read");
  } else if (provider === "notion") {
    endpoint = "https://api.notion.com/v1/oauth/authorize";
    params.set("owner", "user");
  } else {
    throw new Error("Unsupported integration provider.");
  }
  return endpoint + "?" + params.toString();
}
async function providerJson(url: string, token: string, init: RequestInit = {}, extraHeaders: Record<string,string> = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("authorization", "Bearer " + token);
  headers.set("accept", "application/json");
  for (const [key,value] of Object.entries(extraHeaders)) headers.set(key, value);
  const response = await fetch(url, { ...init, headers });
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok || data?.ok === false || data?.object === "error") {
    throw new Error(String(data?.error?.message || data?.error || data?.message || ("Provider request failed (" + response.status + ").")).slice(0, 260));
  }
  return data;
}
async function handleOAuthCallback(provider: string, request: Request) {
  const url = new URL(request.url);
  const state = String(url.searchParams.get("state") || "");
  const code = String(url.searchParams.get("code") || "");
  const oauthError = String(url.searchParams.get("error_description") || url.searchParams.get("error") || "");
  if (oauthError) {
    if (state && sql) await sql.unsafe("DELETE FROM expert_ai_oauth_states WHERE state_hash=$1 AND provider=$2", [await digest(state), provider]);
    return integrationReturnUrl(provider, false, oauthError);
  }
  if (!state || state.length > 256 || !code || code.length > 4096 || !sql || !dbReady) return integrationReturnUrl(provider, false, "The authorization response was incomplete.");
  const stateRows = await sql.unsafe("DELETE FROM expert_ai_oauth_states WHERE state_hash=$1 AND provider=$2 AND expires_at>now() RETURNING user_id", [await digest(state), provider]);
  if (!stateRows.length) return integrationReturnUrl(provider, false, "The sign-in state expired or was already used. Try connecting again.");
  const [clientId, clientSecret] = oauthClient(provider);
  const redirectUri = integrationRedirectUri(provider);
  let tokenResponse: Response;
  if (provider === "google") {
    const form = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" });
    tokenResponse = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
  } else if (provider === "github") {
    tokenResponse = await fetch("https://github.com/login/oauth/access_token", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }) });
  } else if (provider === "slack") {
    const form = new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri });
    tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: form });
  } else {
    tokenResponse = await fetch("https://api.notion.com/v1/oauth/token", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Basic " + Buffer.from(clientId + ":" + clientSecret).toString("base64") },
      body: JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: redirectUri })
    });
  }
  const tokenData = await tokenResponse.json().catch(() => ({})) as any;
  if (!tokenResponse.ok || tokenData?.ok === false || !tokenData?.access_token) {
    console.error("Integration OAuth token exchange failed", provider, tokenResponse.status, String(tokenData?.error || tokenData?.message || "").slice(0,160));
    return integrationReturnUrl(provider, false, "The provider could not complete authorization. Check the OAuth app settings and callback URL.");
  }
  let accountId = String(tokenData?.team?.id || tokenData?.authed_user?.id || tokenData?.workspace_id || tokenData?.bot_id || "");
  let accountEmail = String(tokenData?.owner?.user?.email || "");
  let workspaceName = String(tokenData?.team?.name || tokenData?.workspace_name || "");
  const accessToken = String(tokenData.access_token || "");
  try {
    if (provider === "google") {
      const profile = await providerJson("https://openidconnect.googleapis.com/v1/userinfo", accessToken);
      accountId = String(profile.sub || accountId);
      accountEmail = String(profile.email || accountEmail);
    } else if (provider === "github") {
      const profile = await providerJson("https://api.github.com/user", accessToken, {}, { "user-agent": "Expert-AI-Integration", "x-github-api-version": "2022-11-28" });
      accountId = String(profile.id || accountId);
      accountEmail = String(profile.email || accountEmail);
      if (!accountEmail) {
        const emails = await providerJson("https://api.github.com/user/emails", accessToken, {}, { "user-agent": "Expert-AI-Integration", "x-github-api-version": "2022-11-28" });
        accountEmail = String((Array.isArray(emails) ? emails.find((entry:any) => entry.primary && entry.verified) : null)?.email || "");
      }
    } else if (provider === "slack") {
      const profile = await providerJson("https://slack.com/api/auth.test", accessToken);
      accountId = String(profile.user_id || accountId);
      workspaceName = String(profile.team || workspaceName);
    }
  } catch (error) {
    console.error("Integration profile lookup failed", provider, String(error).slice(0,160));
  }
  const refreshToken = String(tokenData.refresh_token || tokenData?.authed_user?.refresh_token || "");
  const accessEncrypted = await encryptIntegrationSecret(accessToken);
  const refreshEncrypted = refreshToken ? await encryptIntegrationSecret(refreshToken) : null;
  const expiresAt = Number(tokenData.expires_in || tokenData?.authed_user?.expires_in || 0) > 0
    ? new Date(Date.now() + Number(tokenData.expires_in || tokenData?.authed_user?.expires_in) * 1000).toISOString()
    : null;
  const scopes = String(tokenData.scope || tokenData?.authed_user?.scope || "");
  const metadata = {
    provider_account_id: accountId || null,
    workspace_id: String(tokenData.team?.id || tokenData.workspace_id || ""),
    workspace_name: workspaceName || "",
    bot_id: String(tokenData.bot_id || ""),
    connected_by: provider === "github" ? "oauth_app" : "user_consent"
  };
  await sql.unsafe(
    "INSERT INTO expert_ai_integrations(user_id,provider,provider_account_id,account_email,workspace_name,access_token_enc,refresh_token_enc,token_type,scopes,expires_at,metadata,connected_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,now(),now()) ON CONFLICT(user_id,provider) DO UPDATE SET provider_account_id=EXCLUDED.provider_account_id,account_email=EXCLUDED.account_email,workspace_name=EXCLUDED.workspace_name,access_token_enc=EXCLUDED.access_token_enc,refresh_token_enc=COALESCE(EXCLUDED.refresh_token_enc,expert_ai_integrations.refresh_token_enc),token_type=EXCLUDED.token_type,scopes=EXCLUDED.scopes,expires_at=EXCLUDED.expires_at,metadata=EXCLUDED.metadata,connected_at=now(),updated_at=now()",
    [stateRows[0].user_id,provider,accountId || null,accountEmail || null,workspaceName || null,accessEncrypted,refreshEncrypted,tokenData.token_type || null,scopes,expiresAt,JSON.stringify(metadata)]
  );
  return integrationReturnUrl(provider, true);
}
async function getIntegrationAccess(userId: string, provider: string) {
  const rows = await sql!.unsafe("SELECT access_token_enc,refresh_token_enc,expires_at FROM expert_ai_integrations WHERE user_id=$1 AND provider=$2 LIMIT 1", [userId,provider]);
  if (!rows.length) throw new Error("Connect " + provider + " before using this connector.");
  let accessToken = await decryptIntegrationSecret(rows[0].access_token_enc);
  const expiry = rows[0].expires_at ? new Date(rows[0].expires_at).getTime() : 0;
  if (expiry && expiry <= Date.now() + 60000) {
    if (!rows[0].refresh_token_enc || provider === "notion") throw new Error("The " + provider + " connection has expired. Disconnect it and connect again.");
    const refreshToken = await decryptIntegrationSecret(rows[0].refresh_token_enc);
    const [clientId,clientSecret] = oauthClient(provider);
    let response: Response;
    const form = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret });
    if (provider === "google") response = await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
    else if (provider === "github") response = await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded",accept:"application/json"},body:form});
    else if (provider === "slack") response = await fetch("https://slack.com/api/oauth.v2.access",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:form});
    else throw new Error("This provider does not support automatic token renewal.");
    const refreshed = await response.json().catch(() => ({})) as any;
    if (!response.ok || refreshed?.ok === false || !refreshed?.access_token) throw new Error("Could not refresh the " + provider + " connection. Reconnect the account.");
    accessToken = String(refreshed.access_token);
    const nextRefresh = String(refreshed.refresh_token || refreshToken);
    const expiryDate = Number(refreshed.expires_in || 0) > 0 ? new Date(Date.now() + Number(refreshed.expires_in) * 1000).toISOString() : null;
    await sql!.unsafe("UPDATE expert_ai_integrations SET access_token_enc=$1,refresh_token_enc=$2,expires_at=$3,updated_at=now() WHERE user_id=$4 AND provider=$5", [await encryptIntegrationSecret(accessToken),await encryptIntegrationSecret(nextRefresh),expiryDate,userId,provider]);
  }
  return accessToken;
}
async function connectedProvider(userId: string, provider: string, action: (accessToken: string) => Promise<any>) {
  try {
    const accessToken = await getIntegrationAccess(userId,provider);
    return { data: await action(accessToken), error: null as string | null, status: 200 };
  } catch (error) {
    const message = String((error as any)?.message || "The provider request failed.").slice(0,260);
    return { data: null, error: message, status: message.startsWith("Connect ") || message.includes("connection has expired") ? 409 : 502 };
  }
}
async function deleteStoredFile(row: any) {
  if (row?.object_key && bucketName) {
    await bucketClient.send(new DeleteObjectCommand({ Bucket: bucketName, Key: row.object_key }));
  }
  if (row?.id) await sql!.unsafe("DELETE FROM expert_ai_files WHERE id=$1", [row.id]);
}
async function loadAttachmentBlocks(userId: string, ids: string[]) {
  if (!ids.length) return [];
  const validIds = [...new Set(ids)].filter(id => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 5);
  if (!validIds.length) return [];
  const rows = await sql!.unsafe(
    "SELECT id,name,content_type,size,object_key,is_temporary,expires_at FROM expert_ai_files WHERE id=ANY($1::uuid[]) AND user_id=$2 AND (expires_at IS NULL OR expires_at>now())",
    [validIds, userId]
  );
  const blocks: any[] = [];
  for (const row of rows) {
    const object = await bucketClient.send(new GetObjectCommand({ Bucket: bucketName, Key: row.object_key }));
    const bytes = Buffer.from(await object.Body.transformToByteArray());
    const mime = String(row.content_type || "application/octet-stream").toLowerCase();
    const filename = String(row.name || "attachment").replace(/[\r\n"]/g, "_").slice(0, 180);
    const base64 = bytes.toString("base64");
    const acceptedFile = /\.(pdf|doc|docx|rtf|odt|ppt|pptx|xls|xlsx|csv|tsv|txt|md|json|xml|html|js|ts|py|sql|log|yaml|yml)$/i.test(filename);
    const imageFile = /^image\/(png|jpeg|webp|gif)$/.test(mime);
    if (imageFile) {
      blocks.push({ type: "input_text", text: "Attached image: " + filename });
      blocks.push({ type: "input_image", image_url: "data:" + mime + ";base64," + base64, detail: "auto" });
    } else if (acceptedFile) {
      blocks.push({ type: "input_file", filename, file_data: "data:" + mime + ";base64," + base64, detail: "auto" });
    } else if (mime.startsWith("text/") || /json|javascript|xml|csv/.test(mime)) {
      blocks.push({ type: "input_text", text: "Attached file " + filename + ":\n" + bytes.toString("utf8").slice(0, 30000) });
    } else {
      blocks.push({ type: "input_text", text: "An uploaded file named " + filename + " is attached, but its format is not supported for AI reading." });
    }
  }
  return blocks;
}
async function cleanExpiredFiles() {
  const rows = await sql!.unsafe("SELECT id,object_key FROM expert_ai_files WHERE is_temporary=true AND expires_at<=now() LIMIT 30");
  for (const row of rows) {
    try { await deleteStoredFile(row); } catch (error) { console.error("Temporary file cleanup failed", String(error)); }
  }
}

async function handler(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return json({ ok: true }, 204, origin);
  if ((request.method === "GET" || request.method === "POST") && url.pathname === "/health") {
    let database = "not_configured";
    if (sql && dbReady) {
      try { await sql.unsafe("SELECT 1"); database = "ready"; } catch { database = "unavailable"; }
    }
    return json({ service: "expert-ai-api", status: "ok", database, openai: openAiKey ? "configured" : "not_configured" }, 200, origin);
  }
  if (url.pathname === "/api/auth/signup" && request.method === "POST") {
    if (!rateLimit(request, "signup", 5)) return json({ error: "Too many sign-up attempts. Try again later." }, 429, origin);
    if (!sql || !dbReady) return json({ error: "Database is not ready." }, 503, origin);
    const body = await parseBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return json({ error: "Enter a valid email address." }, 400, origin);
    if (password.length < 10 || password.length > 256) return json({ error: "Password must be between 10 and 256 characters." }, 400, origin);
    const salt = randomHex(16);
    const hash = await passwordHash(password, salt);
    const users = await sql.unsafe("INSERT INTO expert_ai_users(email, password_hash, password_salt) VALUES($1, $2, $3) RETURNING id, email", [email, hash, salt]);
    const token = await createSession(users[0].id);
    return json({ user: users[0], access_token: token, token_type: "bearer", expires_in: 2592000 }, 201, origin);
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    if (!rateLimit(request, "login", 10)) return json({ error: "Too many login attempts. Try again later." }, 429, origin);
    if (!sql || !dbReady) return json({ error: "Database is not ready." }, 503, origin);
    const body = await parseBody(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const users = await sql.unsafe("SELECT id, email, password_hash, password_salt FROM expert_ai_users WHERE email=$1 LIMIT 1", [email]);
    if (!users[0] || !equal(await passwordHash(password, users[0].password_salt), users[0].password_hash)) return json({ error: "Email or password is incorrect." }, 401, origin);
    const token = await createSession(users[0].id);
    return json({ user: { id: users[0].id, email: users[0].email }, access_token: token, token_type: "bearer", expires_in: 2592000 }, 200, origin);
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") {
    const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "");
    if (match && sql) await sql.unsafe("DELETE FROM expert_ai_sessions WHERE token_hash=$1", [await digest(match[1])]);
    return json({ ok: true }, 200, origin);
  }
  const oauthCallbackMatch = /^\/api\/oauth\/(google|github|slack|notion)\/callback$/.exec(url.pathname);
  if (oauthCallbackMatch && request.method === "GET") {
    try { return await handleOAuthCallback(oauthCallbackMatch[1],request); }
    catch (error) {
      console.error("OAuth callback failed",oauthCallbackMatch[1],String(error).slice(0,220));
      return integrationReturnUrl(oauthCallbackMatch[1],false,"The connection could not be completed. Check provider settings and try again.");
    }
  }
  if (url.pathname.startsWith("/api/")) {
    if (!sql || !dbReady) return json({ error: "Database is not ready." }, 503, origin);
    const user = await currentUser(request);
    if (!user) return json({ error: "Sign in to continue." }, 401, origin);
    if (url.pathname === "/api/models" && request.method === "GET") {
      try {
        const models = await listOpenAIChatModels();
        return json({ models, defaultModel: "gpt-6.1-sol", provider: "OpenAI Platform", dynamic: !!openAiKey }, 200, origin);
      } catch (error) {
        return json({ models: fallbackChatModels, defaultModel: "gpt-6.1-sol", provider: "OpenAI Platform", dynamic: false, warning: String(error).slice(0, 240) }, 200, origin);
      }
    }
    if (url.pathname === "/api/me" && request.method === "GET") return json({ user }, 200, origin);
    if (url.pathname === "/api/chats" && request.method === "GET") {
      const chats = await sql.unsafe("SELECT id, title, messages, created_at, updated_at FROM expert_ai_chats WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100", [user.id]);
      return json({ chats, items: chats }, 200, origin);
    }
    const chatMatch = /^\/api\/chats\/([0-9a-f-]{36})$/i.exec(url.pathname);
    if (chatMatch && request.method === "GET") {
      const rows = await sql.unsafe("SELECT id,title,messages,created_at,updated_at FROM expert_ai_chats WHERE id=$1 AND user_id=$2", [chatMatch[1], user.id]);
      return rows.length ? json({ chat: rows[0] }, 200, origin) : json({ error: "Chat not found." }, 404, origin);
    }
    if (chatMatch && request.method === "DELETE") {
      const rows = await sql.unsafe("DELETE FROM expert_ai_chats WHERE id=$1 AND user_id=$2 RETURNING id", [chatMatch[1], user.id]);
      return json({ ok: !!rows.length }, rows.length ? 200 : 404, origin);
    }
    if (url.pathname === "/api/preferences" && request.method === "GET") {
      const rows = await sql.unsafe("SELECT preferences FROM expert_ai_preferences WHERE user_id=$1", [user.id]);
      return json({ preferences: rows[0]?.preferences || {} }, 200, origin);
    }
    if (url.pathname === "/api/preferences" && request.method === "PUT") {
      const body = await parseBody(request);
      const preferences = body.preferences && typeof body.preferences === "object" && !Array.isArray(body.preferences) ? body.preferences : {};
      await sql.unsafe("INSERT INTO expert_ai_preferences(user_id,preferences) VALUES($1,$2::jsonb) ON CONFLICT(user_id) DO UPDATE SET preferences=EXCLUDED.preferences,updated_at=now()", [user.id, JSON.stringify(preferences)]);
      return json({ ok: true, preferences }, 200, origin);
    }
    if (url.pathname === "/api/projects" && request.method === "GET") {
      const items = await sql.unsafe("SELECT id,name,description,created_at,updated_at FROM expert_ai_projects WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 100", [user.id]);
      return json({ items }, 200, origin);
    }
    if (url.pathname === "/api/projects" && request.method === "POST") {
      const body = await parseBody(request);
      const name = String(body.name || "").trim();
      if (!name || name.length > 160) return json({ error: "Enter a project name." }, 400, origin);
      const rows = await sql.unsafe("INSERT INTO expert_ai_projects(user_id,name,description) VALUES($1,$2,$3) RETURNING id,name,description,created_at,updated_at", [user.id, name, String(body.description || "").slice(0,4000)]);
      return json(rows[0], 201, origin);
    }
    const projectMatch = /^\/api\/projects\/([0-9a-f-]{36})$/i.exec(url.pathname);
    if (projectMatch && request.method === "PUT") {
      const body = await parseBody(request);
      const rows = await sql.unsafe("UPDATE expert_ai_projects SET name=COALESCE(NULLIF($1,''),name),description=COALESCE($2,description),updated_at=now() WHERE id=$3 AND user_id=$4 RETURNING id,name,description,created_at,updated_at", [String(body.name || ""), body.description === undefined ? null : String(body.description).slice(0,4000), projectMatch[1], user.id]);
      return rows.length ? json(rows[0], 200, origin) : json({ error: "Project not found." }, 404, origin);
    }
    if (projectMatch && request.method === "DELETE") {
      const rows = await sql.unsafe("DELETE FROM expert_ai_projects WHERE id=$1 AND user_id=$2 RETURNING id", [projectMatch[1], user.id]);
      return json({ ok: !!rows.length }, rows.length ? 200 : 404, origin);
    }
    if (url.pathname === "/api/files" && request.method === "GET") {
      await cleanExpiredFiles();
      const items = await sql.unsafe("SELECT id,name,content_type,size,created_at,'/api/files/'||id||'/download' AS url FROM expert_ai_files WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100", [user.id]);
      return json({ items }, 200, origin);
    }
    if (url.pathname === "/api/files" && request.method === "POST") {
      const body = await parseBody(request);
      const name = String(body.name || "upload.bin").replace(/[\\/\0]/g, "_").slice(0,180);
      const type = String(body.contentType || "application/octet-stream").slice(0,160);
      const encoded = String(body.contentBase64 || "");
      if (!encoded || encoded.length > 6 * 1024 * 1024) return json({ error: "File data is missing or exceeds 4 MB." }, 413, origin);
      const bytes = Buffer.from(encoded, "base64");
      if (!bytes.length || bytes.length > 4 * 1024 * 1024) return json({ error: "Files over 4 MB are unsupported." }, 413, origin);
      if (!bucketName) return json({ error: "Secure file storage is not configured." }, 503, origin);
      await cleanExpiredFiles();
      const id = crypto.randomUUID();
      const objectKey = "users/" + user.id + "/" + id + "/" + name;
      await bucketClient.send(new PutObjectCommand({ Bucket: bucketName, Key: objectKey, Body: bytes, ContentType: type }));
      const temporary = body.temporary === true;
      const rows = await sql.unsafe("INSERT INTO expert_ai_files(id,user_id,name,content_type,size,object_key,is_temporary,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $7 THEN now()+interval '24 hours' ELSE NULL END) RETURNING id,name,content_type,size,created_at", [id,user.id,name,type,bytes.length,objectKey,temporary]);
      return json({ ...rows[0], url: "/api/files/" + id + "/download" }, 201, origin);
    }
    const fileMatch = /^\/api\/files\/([0-9a-f-]{36})\/download$/i.exec(url.pathname);
    if (fileMatch && request.method === "GET") {
      const rows = await sql.unsafe("SELECT name,content_type,object_key FROM expert_ai_files WHERE id=$1 AND user_id=$2 AND (expires_at IS NULL OR expires_at>now())", [fileMatch[1], user.id]);
      if (!rows.length) return json({ error: "File not found." }, 404, origin);
      const object = await bucketClient.send(new GetObjectCommand({ Bucket: bucketName, Key: rows[0].object_key }));
      const bytes = await object.Body.transformToByteArray();
      return new Response(bytes, { headers: { "content-type": rows[0].content_type || "application/octet-stream", "content-disposition": "inline; filename*=UTF-8''" + encodeURIComponent(rows[0].name), "cache-control": "private, no-store", "access-control-allow-origin": origin || "" } });
    }
    if (url.pathname === "/api/integrations" && request.method === "GET") {
      const rows = await sql.unsafe("SELECT provider,provider_account_id,account_email,workspace_name,connected_at,updated_at,metadata FROM expert_ai_integrations WHERE user_id=$1", [user.id]);
      const connectedByProvider = new Map(rows.map((row:any) => [row.provider,row]));
      const labels: Record<string,string> = { google:"Google Workspace",github:"GitHub",slack:"Slack",notion:"Notion" };
      const items = ["google","github","slack","notion"].map(provider => {
        const row:any = connectedByProvider.get(provider);
        const ready = providerReady(provider);
        return {
          provider, name: labels[provider], connected: !!row, credentials_ready: ready,
          status: row ? "connected" : ready ? "ready_to_connect" : "needs_credentials",
          account: row?.account_email || row?.workspace_name || null,
          account_id: row?.provider_account_id || null,
          connected_at: row?.connected_at || null,
          note: row ? "Connected. Provider access is stored encrypted for this account." : ready ? "Ready. Select Connect to authorize this account." : "Add this provider's OAuth client ID and secret, and register the Expert AI callback URL."
        };
      });
      const builtInFeatures = [
        { id:"web_search",name:"Live Web Search",provider:"OpenAI Platform",available:!!openAiKey,status:openAiKey?"available":"needs_openai_key" },
        { id:"deep_research",name:"Deep Research",provider:"OpenAI Platform",available:!!openAiKey,status:openAiKey?"available":"needs_openai_key" },
        { id:"image_generation",name:"Image Generation",provider:"OpenAI Platform",available:!!openAiKey,status:openAiKey?"available":"needs_openai_key" },
        { id:"file_analysis",name:"File and Document Analysis",provider:"OpenAI Platform",available:!!openAiKey && !!bucketName,status:openAiKey && bucketName?"available":"needs_setup" },
        { id:"code_interpreter",name:"Code Interpreter and Data Analysis",provider:"OpenAI Platform",available:!!openAiKey,status:openAiKey?"available":"needs_openai_key" },
        { id:"voice",name:"Voice Generation and Transcription",provider:"OpenAI Platform",available:!!openAiKey,status:openAiKey?"available":"needs_openai_key" }
      ];
      return json({ items, builtInFeatures }, 200, origin);
    }
    const integrationStartMatch = /^\/api\/integrations\/(google|github|slack|notion)\/start$/.exec(url.pathname);
    if (integrationStartMatch && request.method === "POST") {
      const provider = integrationStartMatch[1];
      if (!providerReady(provider)) return json({ error: "OAuth setup is incomplete. Add " + provider.toUpperCase() + "_CLIENT_ID and " + provider.toUpperCase() + "_CLIENT_SECRET, and keep the server token vault configured." }, 503, origin);
      if (!rateLimit(request,"oauth-"+provider,8)) return json({ error: "Too many connection attempts. Try again later." }, 429, origin);
      const state = randomHex(32);
      const redirectUri = integrationRedirectUri(provider);
      await sql.unsafe("DELETE FROM expert_ai_oauth_states WHERE expires_at<=now()");
      await sql.unsafe("INSERT INTO expert_ai_oauth_states(state_hash,user_id,provider,redirect_uri,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')", [await digest(state),user.id,provider,redirectUri]);
      return json({ authorizationUrl: oauthAuthorizationUrl(provider,state), redirectUri, expiresIn:600 }, 200, origin);
    }
    const integrationDisconnectMatch = /^\/api\/integrations\/(google|github|slack|notion)\/disconnect$/.exec(url.pathname);
    if (integrationDisconnectMatch && request.method === "POST") {
      const provider = integrationDisconnectMatch[1];
      const rows = await sql.unsafe("SELECT access_token_enc FROM expert_ai_integrations WHERE user_id=$1 AND provider=$2", [user.id,provider]);
      if (rows.length) {
        try {
          const accessToken = await decryptIntegrationSecret(rows[0].access_token_enc);
          if (provider === "google") await fetch("https://oauth2.googleapis.com/revoke?token="+encodeURIComponent(accessToken),{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"}}).catch(()=>null);
          if (provider === "slack") await fetch("https://slack.com/api/auth.revoke",{method:"POST",headers:{authorization:"Bearer "+accessToken}}).catch(()=>null);
        } catch {}
      }
      await sql.unsafe("DELETE FROM expert_ai_integrations WHERE user_id=$1 AND provider=$2", [user.id,provider]);
      await sql.unsafe("DELETE FROM expert_ai_oauth_states WHERE user_id=$1 AND provider=$2", [user.id,provider]);
      return json({ ok:true, provider, connected:false }, 200, origin);
    }
    if (url.pathname === "/api/connectors/google/drive" && request.method === "GET") {
      const result = await connectedProvider(user.id,"google",async token => {
        const data = await providerJson("https://www.googleapis.com/drive/v3/files?pageSize=30&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink),nextPageToken",token);
        return { items:(data.files || []).map((file:any)=>({id:file.id,name:file.name,mimeType:file.mimeType,modifiedTime:file.modifiedTime,url:file.webViewLink,iconUrl:file.iconLink})),nextPageToken:data.nextPageToken || null };
      });
      return result.error ? json({error:result.error},result.status,origin) : json(result.data,200,origin);
    }
    if (url.pathname === "/api/connectors/google/gmail" && request.method === "GET") {
      const result = await connectedProvider(user.id,"google",async token => {
        const list = await providerJson("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=20",token);
        const items = await Promise.all((list.messages || []).slice(0,20).map(async (message:any) => {
          const detail = await providerJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/"+encodeURIComponent(message.id)+"?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date",token);
          const headers = detail.payload?.headers || [];
          const header = (name:string) => String(headers.find((entry:any)=>String(entry.name||"").toLowerCase()===name.toLowerCase())?.value || "");
          return {id:message.id,threadId:message.threadId,snippet:detail.snippet || "",subject:header("Subject"),from:header("From"),date:header("Date"),unread:(detail.labelIds || []).includes("UNREAD")};
        }));
        return {items,nextPageToken:list.nextPageToken || null};
      });
      return result.error ? json({error:result.error},result.status,origin) : json(result.data,200,origin);
    }
    if (url.pathname === "/api/connectors/google/calendar" && request.method === "GET") {
      const result = await connectedProvider(user.id,"google",async token => {
        const from = new Date().toISOString();
        const data = await providerJson("https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=30&singleEvents=true&orderBy=startTime&timeMin="+encodeURIComponent(from),token);
        return {items:(data.items || []).map((event:any)=>({id:event.id,summary:event.summary,start:event.start,end:event.end,status:event.status,htmlLink:event.htmlLink,location:event.location})),timeZone:data.timeZone || null};
      });
      return result.error ? json({error:result.error},result.status,origin) : json(result.data,200,origin);
    }
    if (url.pathname === "/api/connectors/github/repos" && request.method === "GET") {
      const result = await connectedProvider(user.id,"github",async token => {
        const data = await providerJson("https://api.github.com/user/repos?sort=updated&per_page=30&affiliation=owner,collaborator,organization_member",token,{},{"user-agent":"Expert-AI-Integration","x-github-api-version":"2022-11-28"});
        return {items:(Array.isArray(data)?data:[]).map((repo:any)=>({id:repo.id,name:repo.name,full_name:repo.full_name,private:repo.private,description:repo.description,html_url:repo.html_url,default_branch:repo.default_branch,updated_at:repo.updated_at}))};
      });
      return result.error ? json({error:result.error},result.status,origin) : json(result.data,200,origin);
    }
    if (url.pathname === "/api/connectors/slack/channels" && request.method === "GET") {
      const result = await connectedProvider(user.id,"slack",async token => {
        const data = await providerJson("https://slack.com/api/conversations.list?limit=100&exclude_archived=true&types=public_channel,private_channel",token);
        return {items:(data.channels || []).map((channel:any)=>({id:channel.id,name:channel.name,is_private:channel.is_private,is_member:channel.is_member,purpose:channel.purpose?.value || ""}))};
      });
      return result.error ? json({error:result.error},result.status,origin) : json(result.data,200,origin);
    }
    if (url.pathname === "/api/connectors/notion/search" && request.method === "POST") {
      const body = await parseBody(request);
      const query = String(body.query || "").trim().slice(0,200);
      const result = await connectedProvider(user.id,"notion",async token => {
        const data = await providerJson("https://api.notion.com/v1/search",token,{method:"POST",headers:{"content-type":"application/json","Notion-Version":"2022-06-28"},body:JSON.stringify({query,page_size:30})});
        return {items:(data.results || []).map((item:any)=>({id:item.id,object:item.object,title:(item.title || item.properties?.title?.title || []).map((part:any)=>part.plain_text || "").join(""),url:item.url,last_edited_time:item.last_edited_time}))};
      });
      return result.error ? json({error:result.error},result.status,origin) : json(result.data,200,origin);
    }
    if (url.pathname === "/api/connectors/google/gmail/drafts" && request.method === "POST") {
      const body = await parseBody(request);
      const to = String(body.to || "").trim().slice(0,500);
      const subject = String(body.subject || "").trim().slice(0,500);
      const messageBody = String(body.body || "").slice(0,20000);
      if (!to || !subject || !messageBody) return json({error:"A recipient, subject and message body are required."},400,origin);
      const raw = Buffer.from("To: "+to+"\r\nSubject: "+subject+"\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"+messageBody,"utf8").toString("base64url");
      const result = await connectedProvider(user.id,"google",async token => providerJson("https://gmail.googleapis.com/gmail/v1/users/me/drafts",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({message:{raw}})}));
      return result.error ? json({error:result.error},result.status,origin) : json({ok:true,draft:result.data},201,origin);
    }
    if (url.pathname === "/api/connectors/google/calendar/events" && request.method === "POST") {
      const body = await parseBody(request);
      const summary = String(body.summary || "").trim().slice(0,300);
      const start = body.start, end = body.end;
      if (!summary || !start || !end) return json({error:"An event title, start time and end time are required."},400,origin);
      const event:any = {summary,start:typeof start==="string"?{dateTime:start}:start,end:typeof end==="string"?{dateTime:end}:end};
      if (body.description) event.description = String(body.description).slice(0,4000);
      const result = await connectedProvider(user.id,"google",async token => providerJson("https://www.googleapis.com/calendar/v3/calendars/primary/events",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(event)}));
      return result.error ? json({error:result.error},result.status,origin) : json({ok:true,event:result.data},201,origin);
    }
    if (url.pathname === "/api/connectors/github/issues" && request.method === "POST") {
      const body = await parseBody(request);
      const owner = String(body.owner || "").trim(), repo = String(body.repo || "").trim(), title = String(body.title || "").trim().slice(0,300);
      if (!/^[A-Za-z0-9_.-]{1,100}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || !title) return json({error:"A valid repository owner, repository name and issue title are required."},400,origin);
      const payload:any = {title};
      if (body.body) payload.body = String(body.body).slice(0,60000);
      const result = await connectedProvider(user.id,"github",async token => providerJson("https://api.github.com/repos/"+encodeURIComponent(owner)+"/"+encodeURIComponent(repo)+"/issues",token,{method:"POST",headers:{"content-type":"application/json","user-agent":"Expert-AI-Integration","x-github-api-version":"2022-11-28"},body:JSON.stringify(payload)}));
      return result.error ? json({error:result.error},result.status,origin) : json({ok:true,issue:result.data},201,origin);
    }
    if (url.pathname === "/api/connectors/slack/messages" && request.method === "POST") {
      const body = await parseBody(request);
      const channel = String(body.channel || "").trim(), textValue = String(body.text || "").trim().slice(0,40000);
      if (!channel || !textValue) return json({error:"A channel and message are required."},400,origin);
      const result = await connectedProvider(user.id,"slack",async token => providerJson("https://slack.com/api/chat.postMessage",token,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({channel,text:textValue})}));
      return result.error ? json({error:result.error},result.status,origin) : json({ok:true,message:result.data},201,origin);
    }
    if (url.pathname === "/api/connectors/notion/pages" && request.method === "POST") {
      const body = await parseBody(request);
      const parentPageId = String(body.parentPageId || "").trim(), title = String(body.title || "").trim().slice(0,300), content = String(body.content || "").slice(0,10000);
      if (!/^[0-9a-f-]{32,36}$/i.test(parentPageId) || !title) return json({error:"A valid parent page ID and page title are required."},400,origin);
      const children = content ? content.split(/\n{2,}/).slice(0,50).map((line:string)=>({object:"block",type:"paragraph",paragraph:{rich_text:[{type:"text",text:{content:line.slice(0,2000)}}]}})) : [];
      const payload = {parent:{page_id:parentPageId},properties:{title:{title:[{type:"text",text:{content:title}}]}},children};
      const result = await connectedProvider(user.id,"notion",async token => providerJson("https://api.notion.com/v1/pages",token,{method:"POST",headers:{"content-type":"application/json","Notion-Version":"2022-06-28"},body:JSON.stringify(payload)}));
      return result.error ? json({error:result.error},result.status,origin) : json({ok:true,page:result.data},201,origin);
    }

    if (url.pathname === "/api/family" && request.method === "GET") {
      const members = await sql.unsafe("SELECT fm.id,fm.member_id,u.email,fm.role,fm.safe_mode,fm.allow_images,fm.created_at FROM expert_ai_family_members fm JOIN expert_ai_users u ON u.id=fm.member_id WHERE fm.owner_id=$1 ORDER BY fm.created_at DESC", [user.id]);
      const linkedTo = await sql.unsafe("SELECT fm.id,fm.owner_id,u.email AS owner_email,fm.role,fm.safe_mode,fm.allow_images,fm.created_at FROM expert_ai_family_members fm JOIN expert_ai_users u ON u.id=fm.owner_id WHERE fm.member_id=$1 ORDER BY fm.created_at DESC", [user.id]);
      const invites = await sql.unsafe("SELECT id,role,expires_at,created_at FROM expert_ai_family_invites WHERE owner_id=$1 AND consumed_at IS NULL AND expires_at>now() ORDER BY created_at DESC", [user.id]);
      return json({ members, linkedTo, invites, items: members }, 200, origin);
    }
    if (url.pathname === "/api/family/invites" && request.method === "POST") {
      const body = await parseBody(request);
      const role = body.role === "child" ? "child" : "member";
      const code = randomCode();
      const inviteHash = await digest(code);
      await sql.unsafe("INSERT INTO expert_ai_family_invites(owner_id,invite_hash,role,expires_at) VALUES($1,$2,$3,now()+interval '7 days')", [user.id,inviteHash,role]);
      return json({ code, role, expires_in: 604800 }, 201, origin);
    }
    if (url.pathname === "/api/family/join" && request.method === "POST") {
      const body = await parseBody(request);
      const code = String(body.code || "").toUpperCase().replace(/[^A-Z2-9]/g, "");
      if (code.length !== 10) return json({ error: "Enter a valid family invite code." }, 400, origin);
      const inviteHash = await digest(code);
      const joined = await sql.begin(async tx => {
        const rows = await tx.unsafe("SELECT id,owner_id,role FROM expert_ai_family_invites WHERE invite_hash=$1 AND consumed_at IS NULL AND expires_at>now() FOR UPDATE", [inviteHash]);
        if (!rows.length) return null;
        if (rows[0].owner_id === user.id) return null;
        const member = await tx.unsafe("INSERT INTO expert_ai_family_members(owner_id,member_id,role) VALUES($1,$2,$3) ON CONFLICT(owner_id,member_id) DO UPDATE SET role=EXCLUDED.role RETURNING id,owner_id,member_id,role,safe_mode,allow_images", [rows[0].owner_id,user.id,rows[0].role]);
        await tx.unsafe("UPDATE expert_ai_family_invites SET consumed_at=now() WHERE id=$1", [rows[0].id]);
        return member[0];
      });
      return joined ? json({ ok: true, member: joined }, 200, origin) : json({ error: "This invite code is invalid, expired or already used." }, 404, origin);
    }
    const familyControlMatch = /^\/api\/family\/controls\/([0-9a-f-]{36})$/i.exec(url.pathname);
    if (familyControlMatch && request.method === "PUT") {
      const body = await parseBody(request);
      const rows = await sql.unsafe("UPDATE expert_ai_family_members SET safe_mode=$1,allow_images=$2 WHERE owner_id=$3 AND member_id=$4 RETURNING id,member_id,role,safe_mode,allow_images", [body.safe_mode !== false,body.allow_images === true,user.id,familyControlMatch[1]]);
      return rows.length ? json({ member: rows[0] }, 200, origin) : json({ error: "Family member not found." }, 404, origin);
    }
    if (url.pathname === "/api/voice/synthesize" && request.method === "POST") {
      const body = await parseBody(request);
      const input = String(body.text || "").trim();
      if (input.length < 1 || input.length > 3000) return json({ error: "Voice text must be between 1 and 3,000 characters." }, 400, origin);
      if (!openAiKey) return json({ error: "OpenAI API key has not been configured on Railway." }, 503, origin);
      const allowedVoices = ["alloy","ash","ballad","coral","echo","fable","nova","onyx","sage","shimmer","verse","marin","cedar"];
      const voice = allowedVoices.includes(String(body.voiceId || "")) ? String(body.voiceId) : "marin";
      const speech = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: { authorization: "Bearer " + openAiKey, "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini-tts", input, voice, response_format: "mp3" })
      });
      if (!speech.ok) {
        const err = await speech.json().catch(() => ({})) as any;
        return json({ error: String(err?.error?.message || "Voice generation failed.").slice(0,300) }, 502, origin);
      }
      const audio = Buffer.from(await speech.arrayBuffer()).toString("base64");
      return json({ contentType: "audio/mpeg", audioBase64: audio }, 200, origin);
    }
    if (url.pathname === "/api/voice/transcribe" && request.method === "POST") {
      const body = await parseBody(request);
      const audioBase64 = String(body.audioBase64 || "");
      if (!audioBase64 || audioBase64.length > 8 * 1024 * 1024) return json({error:"Audio data is missing or exceeds the 6 MB limit."},413,origin);
      if (!openAiKey) return json({error:"OpenAI API key has not been configured on Railway."},503,origin);
      const mime = String(body.contentType || "audio/webm").toLowerCase();
      const ext = mime.includes("wav") ? "wav" : mime.includes("mpeg") || mime.includes("mp3") ? "mp3" : mime.includes("mp4") ? "m4a" : mime.includes("ogg") ? "ogg" : "webm";
      const bytes = Buffer.from(audioBase64,"base64");
      if (!bytes.length || bytes.length > 6 * 1024 * 1024) return json({error:"Audio data is invalid or exceeds the 6 MB limit."},413,origin);
      const form = new FormData();
      form.set("model","gpt-4o-mini-transcribe");
      if (body.language) form.set("language",String(body.language).slice(0,20));
      form.set("file",new Blob([bytes],{type:mime}),"recording."+ext);
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{authorization:"Bearer "+openAiKey},body:form});
      const data = await response.json().catch(()=>({})) as any;
      if (!response.ok) return json({error:String(data?.error?.message || "Audio transcription failed.").slice(0,300)},502,origin);
      return json({text:String(data.text || ""),model:"gpt-4o-mini-transcribe"},200,origin);
    }
    if (url.pathname === "/api/chat" && request.method === "POST") {
      if (!rateLimit(request, "chat", 30)) return json({ error: "Too many requests. Try again later." }, 429, origin);
      const body = await parseBody(request);
      if (!openAiKey) return json({ error: "OpenAI API key has not been configured on Railway." }, 503, origin);
      const preferenceRows = await sql.unsafe("SELECT preferences FROM expert_ai_preferences WHERE user_id=$1", [user.id]);
      const userPreferences = preferenceRows[0]?.preferences && typeof preferenceRows[0].preferences === "object" ? preferenceRows[0].preferences : {};
      const shouldPersistHistory = body.temporary !== true && userPreferences.saveHistory !== false;
      const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
      const toolMatch = /^\[\[EXPERT_AI_(SEARCH|DEEP_RESEARCH)\]\]\s*/.exec(rawMessage);
      const webTask = toolMatch ? toolMatch[1] : "";
      const cleanMessage = toolMatch ? rawMessage.slice(toolMatch[0].length).trim() : rawMessage;
      let incoming = Array.isArray(body.messages) ? body.messages.slice(-40) : [];
      const requestedChatId = typeof body.chatId === "string" && /^[0-9a-f-]{36}$/i.test(body.chatId) ? body.chatId : null;
      const temporary = body.temporary === true;
      if (!incoming.length && cleanMessage) {
        const previous = !temporary && requestedChatId ? await sql.unsafe("SELECT messages FROM expert_ai_chats WHERE id=$1 AND user_id=$2", [requestedChatId, user.id]) : [];
        incoming = [...(Array.isArray(previous[0]?.messages) ? previous[0].messages : []), { role: "user", content: cleanMessage }].slice(-40);
      }
      if (!incoming.length || incoming.some((m: any) => !["user", "assistant"].includes(m?.role) || typeof m?.content !== "string" || m.content.length > 20000)) return json({ error: "Provide up to 40 user/assistant messages with text content." }, 400, origin);
      const mode = String(body.responseMode || body.mode || "STANDARD").toUpperCase();
      const defaultModel = mode === "LIVE" ? "gpt-6-luna" : mode === "ADVANCED" ? "gpt-6-astra" : "gpt-6.1-sol";
      const requestedModel = String(body.modelId || body.model || "").trim();
      let model = defaultModel;
      if (requestedModel) {
        let availableModels: Array<{ id: string; name: string }>;
        try { availableModels = await listOpenAIChatModels(); }
        catch (error) { return json({ error: String(error).slice(0, 240) }, 502, origin); }
        if (!availableModels.some(item => item.id === requestedModel)) {
          return json({ error: "This model is not available to your OpenAI API project. Refresh the model list and choose an available GPT model." }, 400, origin);
        }
        model = requestedModel;
      }
      const familyLinks = await sql.unsafe("SELECT safe_mode,allow_images FROM expert_ai_family_members WHERE member_id=$1 AND role='child' ORDER BY created_at DESC LIMIT 1", [user.id]);
      const childSafeMode = familyLinks.length > 0 && familyLinks[0].safe_mode === true;
      const safetyInstruction = childSafeMode ? "This is a linked child account. Use age-appropriate language, avoid graphic or sexually explicit content, do not provide dangerous instructions, and encourage trusted adult support for serious concerns. " : "";
      const studyInstruction = body.taskMode === "STUDY" ? "Teach step by step. Explain the reasoning, define key terms, and ask a short check-for-understanding question when useful. " : "";
      const attachmentIds = Array.isArray(body.attachmentIds) ? body.attachmentIds.map(String).slice(0,5) : [];
      const savedMemories = userPreferences.useMemory === false || !Array.isArray(userPreferences.memoryItems) ? [] : userPreferences.memoryItems
        .map((item: any) => typeof item === "string" ? item : String(item?.text || item?.content || ""))
        .map((item: string) => item.trim())
        .filter((item: string) => item && !["Prefers concise explanations","Interested in creative image prompts"].includes(item))
        .slice(0, 30);
      const personalContext = [
        userPreferences.personalisation !== false && userPreferences.nickname ? "Preferred name: " + String(userPreferences.nickname).slice(0,80) : "",
        userPreferences.personalisation !== false && userPreferences.occupation ? "Occupation: " + String(userPreferences.occupation).slice(0,240) : "",
        userPreferences.personalisation !== false && userPreferences.aboutYou ? "About the user: " + String(userPreferences.aboutYou).slice(0,1200) : "",
        userPreferences.personalisation !== false && userPreferences.styleTone ? "Preferred response style: " + String(userPreferences.styleTone).slice(0,100) : "",
        userPreferences.personalisation !== false && userPreferences.personalityInstructions ? "Personality preferences: " + String(userPreferences.personalityInstructions).slice(0,1200) : "",
        userPreferences.personalisation !== false && userPreferences.customInstructions ? "Custom instructions: " + String(userPreferences.customInstructions).slice(0,2000) : "",
        savedMemories.length ? "Saved user memories (user-provided): " + savedMemories.join("; ").slice(0,4000) : ""
      ].filter(Boolean).join("\n");
      let modelInput: any = userPreferences.referenceMemory === false ? incoming.slice(-1) : incoming;
      if (attachmentIds.length) {
        const attachmentBlocks = await loadAttachmentBlocks(user.id, attachmentIds);
        if (attachmentBlocks.length) {
          const userIndex = incoming.findLastIndex((item: any) => item.role === "user");
          if (userIndex >= 0) {
            modelInput = incoming.map((item: any, index: number) => index === userIndex
              ? { role: "user", content: [{ type: "input_text", text: String(item.content || "") }, ...attachmentBlocks] }
              : item);
          }
        }
      }
      const imageLink = familyLinks.length > 0 && familyLinks[0].allow_images === true;
      if (body.taskMode === "STUDY") {
        // Study mode is an instruction profile, not a fabricated separate model.
      }
      let response: any;
      const deepThinking = mode === "ADVANCED" || body.thinkingMode === "DEEP" || webTask === "DEEP_RESEARCH";
      const effectiveModel = (webTask || (body.thinkingMode === "DEEP" && mode !== "ADVANCED")) ? "gpt-6-astra" : model;
      const nativeTools: any[] = [];
      if (webTask) nativeTools.push({ type: "web_search", search_context_size: webTask === "DEEP_RESEARCH" ? "high" : "medium", external_web_access: true });
      if (body.taskMode === "DATA_ANALYSIS" || body.enableCodeInterpreter === true) nativeTools.push({ type: "code_interpreter", container: { type: "auto" } });
      const searchTools = nativeTools.length ? { tools: nativeTools, ...(webTask ? { tool_choice: "required" } : {}) } : {};
      const taskInstructions = webTask === "SEARCH"
        ? "Perform a live web search for the user's request. Summarize current results, include dates where relevant, and cite source URLs."
        : webTask === "DEEP_RESEARCH"
          ? "Perform deep multi-angle live web research. Prefer primary sources, cross-check claims, include dates, distinguish evidence from inference, and cite important factual claims."
          : "";
      try {
        response = await openAiResponse({ model: effectiveModel, instructions: safetyInstruction + studyInstruction + taskInstructions + ((body.taskMode === "DATA_ANALYSIS" || body.enableCodeInterpreter === true) ? "Use the OpenAI Code Interpreter Python sandbox for calculations, data processing and charts where it materially improves accuracy. Explain results and limitations. " : "") + (personalContext ? "Use the following saved personalization only when relevant; do not repeat it unnecessarily.\\n" + personalContext + "\\n" : "") + "You are Expert AI, a helpful and accurate AI assistant. Be clear about uncertainty. Do not invent sources or capabilities.", input: modelInput, reasoning: { effort: deepThinking ? "high" : mode === "LIVE" ? "low" : "medium" }, ...searchTools, max_output_tokens: webTask === "DEEP_RESEARCH" ? 7000 : 4096 });
      } finally {
        if (temporary && attachmentIds.length) {
          for (const id of attachmentIds) {
            const rows = await sql.unsafe("SELECT id,object_key FROM expert_ai_files WHERE id=$1 AND user_id=$2", [id,user.id]);
            if (rows[0]) { try { await deleteStoredFile(rows[0]); } catch (error) { console.error("Temporary attachment cleanup failed", String(error)); } }
          }
        }
      }
      const answerText = extractText(response);
      if (!answerText) return json({ error: "OpenAI returned an empty response." }, 502, origin);
      const citationMap = new Map<string, { title: string; url: string }>();
      const addCitation = (item: any) => {
        let parsed: URL;
        try { parsed = new URL(String(item?.url || "")); } catch { return; }
        if (!["http:","https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hostname === "localhost" || parsed.hostname.endsWith(".local")) return;
        const url = parsed.toString();
        if (!citationMap.has(url)) citationMap.set(url, { title: String(item?.title || parsed.hostname).slice(0,160), url });
      };
      for (const item of Array.isArray(response.output) ? response.output : []) {
        if (item?.type === "web_search_call") {
          for (const source of Array.isArray(item?.action?.sources) ? item.action.sources : []) addCitation(source);
        }
        for (const block of Array.isArray(item?.content) ? item.content : []) {
          for (const annotation of Array.isArray(block?.annotations) ? block.annotations : []) {
            if (annotation?.type === "url_citation") addCitation(annotation.url_citation || annotation);
          }
        }
      }
      const sources = Array.from(citationMap.values()).slice(0,12);
      const answer = sources.length
        ? answerText + "\n\nSources\n" + sources.map((source,index) => "[" + (index+1) + "] " + source.title + "\n" + source.url).join("\n\n")
        : answerText;
      const messages = [...incoming, { role: "assistant", content: answer }];
      let chatId = !temporary && typeof body.chatId === "string" && /^[0-9a-f-]{36}$/i.test(body.chatId) ? body.chatId : crypto.randomUUID();
      const title = String(body.title || incoming.find((m: any) => m.role === "user")?.content || "New chat").slice(0, 120);
      if (shouldPersistHistory) {
        const existing = await sql.unsafe("SELECT id FROM expert_ai_chats WHERE id=$1 AND user_id=$2", [chatId, user.id]);
        if (existing.length) await sql.unsafe("UPDATE expert_ai_chats SET title=$1, messages=$2::jsonb, updated_at=now() WHERE id=$3 AND user_id=$4", [title, JSON.stringify(messages), chatId, user.id]);
        else await sql.unsafe("INSERT INTO expert_ai_chats(id, user_id, title, messages) VALUES($1,$2,$3,$4::jsonb)", [chatId, user.id, title, JSON.stringify(messages)]);
      }
      return json({ chatId, chat: { id: chatId, title, messages, updated_at: new Date().toISOString(), temporary: body.temporary === true || !shouldPersistHistory }, answer, sources, model: effectiveModel, usage: response.usage || null }, 200, origin);
    }
    if (url.pathname === "/api/openai/test" && request.method === "POST") {
      const response = await openAiResponse({ model: "gpt-6-luna", input: "Reply with exactly: OpenAI Platform connection successful.", max_output_tokens: 32 });
      return json({ connected: true, provider: "OpenAI Platform", model: "gpt-6-luna", reply: extractText(response) }, 200, origin);
    }
    if (url.pathname === "/api/search" && request.method === "POST") {
      const body = await parseBody(request);
      const query = String(body.query || "").trim();
      if (query.length < 2 || query.length > 2000) return json({ error: "Enter a search query." }, 400, origin);
      const response = await openAiResponse({ model: "gpt-6-astra", input: "Search the live web for: " + query + ". Summarize reliable current findings, distinguish confirmed facts from uncertain claims, and include clickable source URLs in the answer.", tools: [{ type: "web_search", search_context_size: "high", external_web_access: true }], tool_choice: "required", max_output_tokens: 3000 });
      return json({ answer: extractText(response), output: response.output || [] }, 200, origin);
    }
    if ((url.pathname === "/api/research" || url.pathname === "/api/research/deep") && request.method === "POST") {
      const body = await parseBody(request);
      const suppliedUrl = String(body.url || "").trim();
      const query = String(body.query || "").trim();
      if ((!query && !suppliedUrl) || query.length > 4000 || suppliedUrl.length > 2000) return json({ error: "Enter a research question or public webpage URL." }, 400, origin);
      if (suppliedUrl) {
        let parsed: URL;
        try { parsed = new URL(suppliedUrl); } catch { return json({ error: "Enter a valid public webpage URL." }, 400, origin); }
        if (!["http:","https:"].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hostname === "localhost" || parsed.hostname.endsWith(".local") || parsed.hostname.endsWith(".localhost")) return json({ error: "Only public webpage URLs are supported." }, 400, origin);
      }
      const deep = url.pathname === "/api/research/deep";
      const researchPrompt = suppliedUrl
        ? "Research and summarize this public webpage: " + suppliedUrl + ". Open and inspect the page where possible, then explain its key claims, evidence, dates, limitations and useful context. Cite the source URLs."
        : query;
      const response = await openAiResponse({ model: "gpt-6-astra", instructions: deep ? "Conduct deep, multi-angle research using live web search. Prefer primary sources, cross-check important claims, include relevant dates, distinguish fact from inference, and cite every important factual claim. Be explicit about limitations." : "Research the supplied webpage or question using live web search. Prefer primary sources and cite sources. State any limits in page access.", input: researchPrompt, tools: [{ type: "web_search", search_context_size: "high", external_web_access: true }], tool_choice: "required", reasoning: { effort: deep ? "high" : "medium" }, max_output_tokens: deep ? 7000 : 5000 });
      return json({ answer: extractText(response), summary: extractText(response), title: suppliedUrl || (query.slice(0,120)), url: suppliedUrl || null, output: response.output || [] }, 200, origin);
    }
    if ((url.pathname === "/api/images/generate" || url.pathname === "/api/images") && request.method === "POST") {
      const body = await parseBody(request);
      const prompt = String(body.prompt || "").trim();
      if (prompt.length < 3 || prompt.length > 30000) return json({ error: "Enter an image prompt." }, 400, origin);
      if (!openAiKey) return json({ error: "OpenAI API key has not been configured on Railway." }, 503, origin);
      const family = await sql.unsafe("SELECT allow_images FROM expert_ai_family_members WHERE member_id=$1 AND role='child' ORDER BY created_at DESC LIMIT 1", [user.id]);
      if (family.length && family[0].allow_images !== true) return json({ error: "Image generation is disabled by the family account settings." }, 403, origin);
      const imageResponse = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: { authorization: "Bearer " + openAiKey, "content-type": "application/json" },
        body: JSON.stringify({ model: "gpt-image-2.6-flare", prompt, size: "1024x1024", quality: "medium", output_format: "png" })
      });
      const imageData = await imageResponse.json().catch(() => ({})) as any;
      if (!imageResponse.ok) return json({ error: String(imageData?.error?.message || "Image generation failed.").slice(0, 400) }, 502, origin);
      return json({ image: imageData?.data?.[0]?.b64_json ? "data:image/png;base64," + imageData.data[0].b64_json : null }, 200, origin);
    }
  }
  return json({ error: "Not found." }, 404, origin);
}
export default {
  async fetch(request: Request) {
    try {
      return await handler(request);
    } catch (error) {
      const message = String((error as any)?.message || "Unexpected server error.");
      console.error("Expert AI API error:", message);
      if (message.includes("unique") || message.includes("duplicate key")) return json({ error: "An account with this email already exists." }, 409, request.headers.get("origin"));
      return json({ error: "The request could not be completed." }, 500, request.headers.get("origin"));
    }
  }
};

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var OAUTH_STATE_COOKIE = "__Host-oauth_state";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// server/_core/oauth.ts
import { parse as parseCookieHeader2 } from "cookie";

// server/db.ts
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// drizzle/schema.ts
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  index,
  varchar
} from "drizzle-orm/pg-core";
var userRoleEnum = pgEnum("user_role", ["user", "reclutador", "admin"]);
var applicationStatusEnum = pgEnum("application_status", [
  "en_revision",
  "calificado",
  "no_calificado",
  "entrevista_iniciada",
  "entrevista_en_curso",
  "entrevista_finalizada",
  "pendiente_revision_humana",
  "error_procesamiento"
]);
var evaluationStatusEnum = pgEnum("evaluation_status", [
  "calificado",
  "no_calificado",
  "pendiente_revision_humana",
  "error_procesamiento"
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull()
});
var countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  iso2: varchar("iso2", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  dialingCode: varchar("dialing_code", { length: 8 }).notNull(),
  active: boolean("active").default(true).notNull()
});
var geoDepartments = pgTable("geo_departments", {
  id: serial("id").primaryKey(),
  countryId: integer("country_id").references(() => countries.id).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull()
}, (table) => ({ uniqueCountryCode: uniqueIndex("geo_departments_country_code_uq").on(table.countryId, table.code) }));
var geoMunicipalities = pgTable("geo_municipalities", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => geoDepartments.id).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull()
}, (table) => ({ uniqueDepartmentCode: uniqueIndex("geo_municipalities_department_code_uq").on(table.departmentId, table.code) }));
var geoZones = pgTable("geo_zones", {
  id: serial("id").primaryKey(),
  municipalityId: integer("municipality_id").references(() => geoMunicipalities.id).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull()
}, (table) => ({ uniqueMunicipalityCode: uniqueIndex("geo_zones_municipality_code_uq").on(table.municipalityId, table.code) }));
var jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  publicSlug: varchar("public_slug", { length: 80 }).notNull().unique(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  department: varchar("department", { length: 160 }),
  locationLabel: varchar("location_label", { length: 240 }),
  description: text("description"),
  published: boolean("published").default(false).notNull(),
  agentKey: varchar("agent_key", { length: 120 }).notNull(),
  whatsappMessage: text("whatsapp_message").default("Gracias por aplicar. Te contactaremos para continuar con tu proceso de evaluaci\xF3n."),
  defaultCountry: varchar("default_country", { length: 2 }).default("GT").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var applicationForms = pgTable("application_forms", {
  id: serial("id").primaryKey(),
  jobPositionId: integer("job_position_id").references(() => jobPositions.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").default(1).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  intro: text("intro"),
  published: boolean("published").default(false).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ oneVersion: uniqueIndex("application_forms_job_version_uq").on(table.jobPositionId, table.version) }));
var formQuestions = pgTable("form_questions", {
  id: serial("id").primaryKey(),
  formId: integer("form_id").references(() => applicationForms.id, { onDelete: "cascade" }).notNull(),
  fieldKey: varchar("field_key", { length: 100 }).notNull(),
  label: text("label").notNull(),
  helpText: text("help_text"),
  type: varchar("type", { length: 40 }).notNull(),
  required: boolean("required").default(false).notNull(),
  orderIndex: integer("order_index").default(0).notNull(),
  answerConfig: jsonb("answer_config").default({}).notNull(),
  acceptedAnswers: jsonb("accepted_answers").default([]).notNull(),
  hardFail: boolean("hard_fail").default(false).notNull(),
  evaluationCriteria: text("evaluation_criteria"),
  aiPrompt: text("ai_prompt"),
  active: boolean("active").default(true).notNull()
}, (table) => ({ uniqueFieldPerForm: uniqueIndex("form_questions_form_field_uq").on(table.formId, table.fieldKey), formOrderIdx: index("form_questions_form_order_idx").on(table.formId, table.orderIndex) }));
var candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  phoneInternational: varchar("phone_international", { length: 32 }).notNull().unique(),
  phoneCountry: varchar("phone_country", { length: 2 }).default("GT").notNull(),
  fullName: varchar("full_name", { length: 240 }),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  jobPositionId: integer("job_position_id").references(() => jobPositions.id).notNull(),
  formId: integer("form_id").references(() => applicationForms.id).notNull(),
  status: applicationStatusEnum("status").default("en_revision").notNull(),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
  evaluationAt: timestamp("evaluation_at", { withTimezone: true }),
  evaluationReason: text("evaluation_reason"),
  profileSummary: text("profile_summary"),
  reviewHoldUntil: timestamp("review_hold_until", { withTimezone: true }),
  reviewToken: varchar("review_token", { length: 80 }),
  whatsappStatus: varchar("whatsapp_status", { length: 48 }).default("no_enviado").notNull(),
  lastWhatsappError: text("last_whatsapp_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ candidatePositionUq: uniqueIndex("applications_candidate_position_uq").on(table.candidateId, table.jobPositionId), statusIdx: index("applications_status_idx").on(table.status), positionIdx: index("applications_position_idx").on(table.jobPositionId) }));
var applicationAnswers = pgTable("application_answers", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  questionId: integer("question_id").references(() => formQuestions.id).notNull(),
  valueJson: jsonb("value_json").notNull(),
  normalizedValue: text("normalized_value"),
  deterministicResult: varchar("deterministic_result", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ applicationQuestionUq: uniqueIndex("application_answers_application_question_uq").on(table.applicationId, table.questionId) }));
var evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  status: evaluationStatusEnum("status").notNull(),
  reason: text("reason").notNull(),
  profileSummary: text("profile_summary").notNull(),
  ruleResults: jsonb("rule_results").default([]).notNull(),
  aiPayload: jsonb("ai_payload"),
  aiModel: varchar("ai_model", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ evaluationApplicationIdx: index("evaluations_application_idx").on(table.applicationId) }));
var conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 48 }).default("apichat").notNull(),
  externalConversationId: varchar("external_conversation_id", { length: 180 }),
  status: varchar("status", { length: 48 }).default("pendiente").notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});
var conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  direction: varchar("direction", { length: 16 }).notNull(),
  messageType: varchar("message_type", { length: 40 }).default("text").notNull(),
  body: text("body"),
  providerMessageId: varchar("provider_message_id", { length: 180 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId) }));
var internalAlertRecipients = pgTable("internal_alert_recipients", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  phoneInternational: varchar("phone_international", { length: 32 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});
var integrationSettings = pgTable("integration_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull(),
  settingKey: varchar("setting_key", { length: 120 }).notNull(),
  settingValue: text("setting_value"),
  isSecret: boolean("is_secret").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
}, (table) => ({ providerKeyUq: uniqueIndex("integration_settings_provider_key_uq").on(table.provider, table.settingKey) }));

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// server/db.ts
var _pool = null;
var _db = null;
async function getPool() {
  if (!_pool && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({ connectionString: process.env.DATABASE_URL });
    } catch (error) {
      console.warn("[Database] Failed to create pool:", error);
      _pool = null;
    }
  }
  return _pool;
}
async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = await getPool();
      if (!_pool) return null;
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _pool = null;
      _db = null;
    }
  }
  return _db;
}
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values = {
    openId: user.openId,
    name: user.name ?? null,
    email: user.email ?? null,
    loginMethod: user.loginMethod ?? null,
    role: user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user"),
    lastSignedIn: user.lastSignedIn ?? /* @__PURE__ */ new Date()
  };
  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: {
      name: values.name,
      email: values.email,
      loginMethod: values.loginMethod,
      role: values.role,
      lastSignedIn: values.lastSignedIn,
      updatedAt: /* @__PURE__ */ new Date()
    }
  });
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req.headers.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    const { nonce } = decodeOAuthState(state);
    const expectedNonce = parseCookieHeader2(req.headers.cookie ?? "")[OAUTH_STATE_COOKIE];
    if (!nonce || nonce !== expectedNonce) {
      res.status(403).json({ error: "invalid oauth state" });
      return;
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/storageProxy.ts
function registerStorageProxy(app) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }
    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }
    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/"
      );
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` }
      });
      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = await forgeResp.json();
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";

// server/phone.ts
import { parsePhoneNumberFromString } from "libphonenumber-js";
function normalizePhone(input, defaultCountry = "GT") {
  const clean = input.trim();
  const parsed = parsePhoneNumberFromString(clean, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    throw new Error("El n\xFAmero de tel\xE9fono no es v\xE1lido. Usa un celular de Guatemala, por ejemplo +502 5555 5555.");
  }
  return {
    e164: parsed.number,
    country: parsed.country ?? defaultCountry
  };
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var recruiterProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || !["admin", "reclutador"].includes(ctx.user.role)) {
      throw new TRPCError2({ code: "FORBIDDEN", message: "Se requiere rol de reclutador o administrador." });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  })
);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
var statusValues = ["en_revision", "calificado", "no_calificado", "entrevista_iniciada", "entrevista_en_curso", "entrevista_finalizada", "pendiente_revision_humana", "error_procesamiento"];
var roleProcedure = recruiterProcedure;
async function requirePool() {
  const pool = await getPool();
  if (!pool) throw new TRPCError3({ code: "PRECONDITION_FAILED", message: "PostgreSQL no est\xE1 configurado todav\xEDa." });
  return pool;
}
function asJson(value) {
  return JSON.stringify(value ?? null);
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    })
  }),
  publicJobs: router({
    getByToken: publicProcedure.input(z2.object({ token: z2.string().min(8).max(120) })).query(async ({ input }) => {
      const pool = await getPool();
      if (!pool) return null;
      const result = await pool.query(
        `SELECT p.id, p.public_slug, p.title, p.department, p.location_label, p.description, p.agent_key,
                f.id AS form_id, f.title AS form_title, f.intro AS form_intro,
                q.id AS question_id, q.field_key, q.label, q.help_text, q.type, q.required,
                q.order_index, q.answer_config, q.accepted_answers, q.hard_fail, q.evaluation_criteria
           FROM job_positions p
           JOIN application_forms f ON f.job_position_id = p.id AND f.published = true
           JOIN form_questions q ON q.form_id = f.id AND q.active = true
          WHERE p.public_slug = $1 AND p.published = true
          ORDER BY q.order_index ASC`,
        [input.token]
      );
      if (!result.rows.length) return null;
      const first = result.rows[0];
      return {
        id: first.id,
        token: first.public_slug,
        title: first.title,
        department: first.department,
        locationLabel: first.location_label,
        description: first.description,
        agentKey: first.agent_key,
        form: { id: first.form_id, title: first.form_title, intro: first.form_intro },
        questions: result.rows.map((row) => ({
          id: row.question_id,
          fieldKey: row.field_key,
          label: row.label,
          helpText: row.help_text,
          type: row.type,
          required: row.required,
          orderIndex: row.order_index,
          answerConfig: row.answer_config ?? {},
          acceptedAnswers: row.accepted_answers ?? [],
          hardFail: row.hard_fail
        }))
      };
    }),
    submit: publicProcedure.input(z2.object({
      token: z2.string().min(8).max(120),
      fullName: z2.string().trim().min(2).max(240),
      email: z2.string().email().max(320).optional().or(z2.literal("")),
      phone: z2.string().min(7).max(40),
      answers: z2.record(z2.string(), z2.unknown())
    })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const phone = normalizePhone(input.phone, "GT");
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const positionResult = await client.query(
          `SELECT p.id, f.id AS form_id FROM job_positions p
             JOIN application_forms f ON f.job_position_id = p.id AND f.published = true
            WHERE p.public_slug = $1 AND p.published = true LIMIT 1`,
          [input.token]
        );
        if (!positionResult.rows[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "La plaza no est\xE1 publicada o ya no est\xE1 disponible." });
        const position = positionResult.rows[0];
        const duplicate = await client.query(
          `SELECT a.id FROM applications a JOIN candidates c ON c.id = a.candidate_id
            WHERE c.phone_international = $1 AND a.job_position_id = $2 LIMIT 1`,
          [phone.e164, position.id]
        );
        if (duplicate.rows[0]) {
          await client.query("ROLLBACK");
          return { alreadyApplied: true, message: "Esta solicitud ya fue enviada previamente para esta plaza." };
        }
        const candidate = await client.query(
          `INSERT INTO candidates (phone_international, phone_country, full_name, email)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (phone_international) DO UPDATE SET full_name = EXCLUDED.full_name, email = EXCLUDED.email, updated_at = now()
           RETURNING id`,
          [phone.e164, phone.country, input.fullName, input.email || null]
        );
        const application = await client.query(
          `INSERT INTO applications (candidate_id, job_position_id, form_id, status)
           VALUES ($1, $2, $3, 'en_revision') RETURNING id`,
          [candidate.rows[0].id, position.id, position.form_id]
        );
        const questions = await client.query(`SELECT id, field_key FROM form_questions WHERE form_id = $1 AND active = true`, [position.form_id]);
        for (const question of questions.rows) {
          if (input.answers[question.field_key] === void 0) continue;
          await client.query(
            `INSERT INTO application_answers (application_id, question_id, value_json, normalized_value)
             VALUES ($1, $2, $3::jsonb, $4)`,
            [application.rows[0].id, question.id, asJson(input.answers[question.field_key]), String(input.answers[question.field_key] ?? "")]
          );
        }
        await client.query("COMMIT");
        return { alreadyApplied: false, applicationId: application.rows[0].id, phone: phone.e164 };
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof TRPCError3) throw error;
        if (error.code === "23505") return { alreadyApplied: true, message: "Esta solicitud ya fue enviada previamente para esta plaza." };
        throw error;
      } finally {
        client.release();
      }
    })
  }),
  dashboard: router({
    summary: roleProcedure.query(async () => {
      const pool = await getPool();
      if (!pool) return { total: 0, enRevision: 0, calificados: 0, entrevistas: 0, positions: 0 };
      const result = await pool.query(`SELECT
        (SELECT count(*)::int FROM applications) AS total,
        (SELECT count(*)::int FROM applications WHERE status = 'en_revision') AS en_revision,
        (SELECT count(*)::int FROM applications WHERE status = 'calificado') AS calificados,
        (SELECT count(*)::int FROM applications WHERE status IN ('entrevista_iniciada','entrevista_en_curso','entrevista_finalizada')) AS entrevistas,
        (SELECT count(*)::int FROM job_positions) AS positions`);
      const row = result.rows[0];
      return { total: row.total ?? 0, enRevision: row.en_revision ?? 0, calificados: row.calificados ?? 0, entrevistas: row.entrevistas ?? 0, positions: row.positions ?? 0 };
    })
  }),
  positions: router({
    list: roleProcedure.query(async () => {
      const pool = await getPool();
      if (!pool) return [];
      const result = await pool.query(`SELECT p.*, f.id AS form_id, f.title AS form_title, f.published AS form_published,
        (SELECT count(*)::int FROM applications a WHERE a.job_position_id = p.id) AS applications_count
        FROM job_positions p LEFT JOIN application_forms f ON f.job_position_id = p.id ORDER BY p.created_at DESC`);
      return result.rows;
    }),
    upsert: adminProcedure.input(z2.object({
      id: z2.number().optional(),
      code: z2.string().min(2).max(80),
      title: z2.string().min(2).max(180),
      department: z2.string().max(160).optional(),
      locationLabel: z2.string().max(240).optional(),
      description: z2.string().max(5e3).optional(),
      agentKey: z2.string().min(2).max(120),
      whatsappMessage: z2.string().max(1e3).optional(),
      defaultCountry: z2.string().length(2).default("GT"),
      published: z2.boolean().default(false)
    })).mutation(async ({ input, ctx }) => {
      const pool = await requirePool();
      const publicSlug = input.id ? void 0 : `${input.code.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID().slice(0, 8)}`;
      if (input.id) {
        const result2 = await pool.query(`UPDATE job_positions SET code=$1,title=$2,department=$3,location_label=$4,description=$5,agent_key=$6,whatsapp_message=$7,default_country=$8,published=$9,updated_at=now() WHERE id=$10 RETURNING *`, [input.code, input.title, input.department ?? null, input.locationLabel ?? null, input.description ?? null, input.agentKey, input.whatsappMessage ?? null, input.defaultCountry, input.published, input.id]);
        return result2.rows[0];
      }
      const result = await pool.query(`INSERT INTO job_positions (public_slug,code,title,department,location_label,description,agent_key,whatsapp_message,default_country,published,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [publicSlug, input.code, input.title, input.department ?? null, input.locationLabel ?? null, input.description ?? null, input.agentKey, input.whatsappMessage ?? null, input.defaultCountry, input.published, ctx.user.id]);
      await pool.query(`INSERT INTO application_forms (job_position_id,version,title,intro,published,created_by_user_id) VALUES ($1,1,$2,$3,false,$4)`, [result.rows[0].id, `Formulario \xB7 ${input.title}`, "Completa tus datos para aplicar a esta plaza.", ctx.user.id]);
      return result.rows[0];
    }),
    setPublished: adminProcedure.input(z2.object({ id: z2.number(), published: z2.boolean() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const result = await pool.query(`UPDATE job_positions SET published=$1,updated_at=now() WHERE id=$2 RETURNING *`, [input.published, input.id]);
      return result.rows[0];
    }),
    remove: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      await pool.query(`DELETE FROM job_positions WHERE id=$1`, [input.id]);
      return { success: true };
    })
  }),
  candidates: router({
    list: roleProcedure.input(z2.object({ status: z2.enum(statusValues).optional(), search: z2.string().max(120).optional(), positionId: z2.number().optional(), from: z2.string().optional(), to: z2.string().optional() }).optional()).query(async ({ input }) => {
      const pool = await getPool();
      if (!pool) return [];
      const values = [];
      const clauses = [];
      if (input?.status) {
        values.push(input.status);
        clauses.push(`a.status = $${values.length}`);
      }
      if (input?.search) {
        values.push(`%${input.search}%`);
        clauses.push(`(c.full_name ILIKE $${values.length} OR c.phone_international ILIKE $${values.length} OR p.title ILIKE $${values.length})`);
      }
      if (input?.positionId) {
        values.push(input.positionId);
        clauses.push(`p.id = $${values.length}`);
      }
      if (input?.from) {
        values.push(input.from);
        clauses.push(`a.submitted_at >= $${values.length}`);
      }
      if (input?.to) {
        values.push(input.to);
        clauses.push(`a.submitted_at < ($${values.length}::date + interval '1 day')`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const result = await pool.query(`SELECT a.id, a.status, a.submitted_at, a.evaluation_at, a.evaluation_reason, a.profile_summary, a.whatsapp_status, c.full_name, c.phone_international, c.email, p.title AS position_title, p.public_slug FROM applications a JOIN candidates c ON c.id=a.candidate_id JOIN job_positions p ON p.id=a.job_position_id ${where} ORDER BY a.submitted_at DESC LIMIT 200`, values);
      return result.rows;
    }),
    detail: roleProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const pool = await requirePool();
      const application = await pool.query(`SELECT a.*, c.full_name, c.phone_international, c.email, p.title AS position_title, p.public_slug FROM applications a JOIN candidates c ON c.id=a.candidate_id JOIN job_positions p ON p.id=a.job_position_id WHERE a.id=$1`, [input.id]);
      if (!application.rows[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "Candidato no encontrado." });
      const answers = await pool.query(`SELECT q.label, q.field_key, aa.value_json, aa.normalized_value, aa.deterministic_result FROM application_answers aa JOIN form_questions q ON q.id=aa.question_id WHERE aa.application_id=$1 ORDER BY q.order_index`, [input.id]);
      const evaluations2 = await pool.query(`SELECT * FROM evaluations WHERE application_id=$1 ORDER BY created_at DESC`, [input.id]);
      const audit = await pool.query(`SELECT al.*, u.name AS actor_name FROM audit_log al LEFT JOIN users u ON u.id=al.actor_user_id WHERE al.entity_type='application' AND al.entity_id=$1 ORDER BY al.created_at DESC`, [input.id]);
      const conversation = await pool.query(`SELECT * FROM conversations WHERE application_id=$1 ORDER BY created_at DESC LIMIT 1`, [input.id]);
      const messages = conversation.rows[0] ? await pool.query(`SELECT * FROM conversation_messages WHERE conversation_id=$1 ORDER BY created_at ASC`, [conversation.rows[0].id]) : { rows: [] };
      return { application: application.rows[0], answers: answers.rows, evaluations: evaluations2.rows, audit: audit.rows, conversation: conversation.rows[0] ?? null, messages: messages.rows };
    }),
    setStatus: roleProcedure.input(z2.object({ id: z2.number(), status: z2.enum(statusValues), comment: z2.string().max(1e3).optional() })).mutation(async ({ input, ctx }) => {
      const pool = await requirePool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const before = await client.query(`SELECT * FROM applications WHERE id=$1 FOR UPDATE`, [input.id]);
        if (!before.rows[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "Candidato no encontrado." });
        const after = await client.query(`UPDATE applications SET status=$1, review_hold_until=CASE WHEN $1='calificado' THEN now() + interval '10 minutes' ELSE NULL END, updated_at=now() WHERE id=$2 RETURNING *`, [input.status, input.id]);
        await client.query(`INSERT INTO audit_log (actor_user_id,entity_type,entity_id,action,before_json,after_json,comment) VALUES ($1,'application',$2,'status_changed',$3::jsonb,$4::jsonb,$5)`, [ctx.user.id, input.id, asJson(before.rows[0]), asJson(after.rows[0]), input.comment ?? null]);
        await client.query("COMMIT");
        const webhook = process.env.N8N_MANUAL_STATUS_WEBHOOK_URL;
        if (webhook) {
          void fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ applicationId: input.id, status: input.status, actorType: "human", actorUserId: ctx.user.id, comment: input.comment ?? null }) }).catch((error) => console.warn("[n8n] Manual status webhook failed:", error));
        }
        return after.rows[0];
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })
  }),
  reports: router({
    overview: roleProcedure.input(z2.object({ from: z2.string().optional(), to: z2.string().optional() }).optional()).query(async ({ input }) => {
      const pool = await getPool();
      if (!pool) return { byStatus: [], byPosition: [], reasons: [] };
      const values = [];
      const clauses = [];
      if (input?.from) {
        values.push(input.from);
        clauses.push(`a.submitted_at >= $${values.length}`);
      }
      if (input?.to) {
        values.push(input.to);
        clauses.push(`a.submitted_at < ($${values.length}::date + interval '1 day')`);
      }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      const [byStatus, byPosition, reasons, responseTime] = await Promise.all([
        pool.query(`SELECT status, count(*)::int AS count FROM applications a ${where} GROUP BY status ORDER BY count DESC`, values),
        pool.query(`SELECT p.title, count(*)::int AS count FROM applications a JOIN job_positions p ON p.id=a.job_position_id ${where} GROUP BY p.title ORDER BY count DESC`, values),
        pool.query(`SELECT COALESCE(NULLIF(evaluation_reason,''),'Sin motivo') AS reason, count(*)::int AS count FROM applications a ${where} GROUP BY reason ORDER BY count DESC LIMIT 8`, values),
        pool.query(`SELECT ROUND(AVG(EXTRACT(EPOCH FROM (evaluation_at - submitted_at)) / 3600.0)::numeric, 1) AS average_hours FROM applications a ${where} AND evaluation_at IS NOT NULL`, values)
      ]);
      return { byStatus: byStatus.rows, byPosition: byPosition.rows, reasons: reasons.rows, responseTime: responseTime.rows[0] ?? { average_hours: null } };
    })
  }),
  geo: router({
    departments: publicProcedure.input(z2.object({ countryIso: z2.string().length(2).default("GT") }).optional()).query(async ({ input }) => {
      const pool = await getPool();
      if (!pool) return [];
      const result = await pool.query(`SELECT d.* FROM geo_departments d JOIN countries c ON c.id=d.country_id WHERE c.iso2=$1 AND d.active=true ORDER BY d.code`, [input?.countryIso ?? "GT"]);
      return result.rows;
    }),
    municipalities: publicProcedure.input(z2.object({ departmentId: z2.number() })).query(async ({ input }) => {
      const pool = await getPool();
      if (!pool) return [];
      const result = await pool.query(`SELECT * FROM geo_municipalities WHERE department_id=$1 AND active=true ORDER BY code`, [input.departmentId]);
      return result.rows;
    }),
    adminCatalog: adminProcedure.query(async () => {
      const pool = await getPool();
      if (!pool) return { departments: [], municipalities: [], zones: [] };
      const [departments, municipalities, zones] = await Promise.all([pool.query(`SELECT d.id,d.code,d.name,d.active FROM geo_departments d ORDER BY d.code`), pool.query(`SELECT m.id,m.code,m.name,m.active,d.code AS department_code,d.name AS department_name FROM geo_municipalities m JOIN geo_departments d ON d.id=m.department_id ORDER BY m.code`), pool.query(`SELECT z.id,z.code,z.name,z.active,m.code AS municipality_code,m.name AS municipality_name FROM geo_zones z JOIN geo_municipalities m ON m.id=z.municipality_id ORDER BY z.code`)]);
      return { departments: departments.rows, municipalities: municipalities.rows, zones: zones.rows };
    }),
    updateItem: adminProcedure.input(z2.object({ entity: z2.enum(["department", "municipality", "zone"]), id: z2.number(), name: z2.string().min(1).max(160), active: z2.boolean() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const table = input.entity === "department" ? "geo_departments" : input.entity === "municipality" ? "geo_municipalities" : "geo_zones";
      const result = await pool.query(`UPDATE ${table} SET name=$1,active=$2 WHERE id=$3 RETURNING *`, [input.name, input.active, input.id]);
      return result.rows[0];
    }),
    importCatalog: adminProcedure.input(z2.object({ departments: z2.array(z2.object({ code: z2.string(), name: z2.string() })), municipalities: z2.array(z2.object({ departmentCode: z2.string(), code: z2.string(), name: z2.string() })), zones: z2.array(z2.object({ municipalityCode: z2.string(), code: z2.string(), name: z2.string() })).default([]) })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(`INSERT INTO countries (iso2,name,dialing_code,active) VALUES ('GT','Guatemala','+502',true) ON CONFLICT (iso2) DO UPDATE SET active=true`);
        for (const department of input.departments) await client.query(`INSERT INTO geo_departments (country_id,code,name,active) SELECT id,$1,$2,true FROM countries WHERE iso2='GT' ON CONFLICT (country_id,code) DO UPDATE SET name=EXCLUDED.name,active=true`, [department.code, department.name]);
        for (const municipality of input.municipalities) await client.query(`INSERT INTO geo_municipalities (department_id,code,name,active) SELECT d.id,$1,$2,true FROM geo_departments d WHERE d.code=$3 AND d.country_id=(SELECT id FROM countries WHERE iso2='GT') ON CONFLICT (department_id,code) DO UPDATE SET name=EXCLUDED.name,active=true`, [municipality.code, municipality.name, municipality.departmentCode]);
        for (const zone of input.zones) await client.query(`INSERT INTO geo_zones (municipality_id,code,name,active) SELECT m.id,$1,$2,true FROM geo_municipalities m WHERE m.code=$3 ON CONFLICT (municipality_id,code) DO UPDATE SET name=EXCLUDED.name,active=true`, [zone.code, zone.name, zone.municipalityCode]);
        await client.query("COMMIT");
        return { departments: input.departments.length, municipalities: input.municipalities.length, zones: input.zones.length };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })
  }),
  forms: router({
    getByPosition: roleProcedure.input(z2.object({ positionId: z2.number() })).query(async ({ input }) => {
      const pool = await getPool();
      if (!pool) return null;
      const form = await pool.query(`SELECT * FROM application_forms WHERE job_position_id=$1 ORDER BY version DESC LIMIT 1`, [input.positionId]);
      if (!form.rows[0]) return null;
      const questions = await pool.query(`SELECT * FROM form_questions WHERE form_id=$1 ORDER BY order_index`, [form.rows[0].id]);
      return { ...form.rows[0], questions: questions.rows };
    }),
    upsert: adminProcedure.input(z2.object({ id: z2.number().optional(), positionId: z2.number(), title: z2.string().min(2).max(240), intro: z2.string().max(3e3).optional(), published: z2.boolean().default(false) })).mutation(async ({ input, ctx }) => {
      const pool = await requirePool();
      if (input.id) {
        const result2 = await pool.query(`UPDATE application_forms SET title=$1,intro=$2,published=$3,updated_at=now() WHERE id=$4 RETURNING *`, [input.title, input.intro ?? null, input.published, input.id]);
        return result2.rows[0];
      }
      const version = await pool.query(`SELECT COALESCE(MAX(version),0)+1 AS version FROM application_forms WHERE job_position_id=$1`, [input.positionId]);
      const result = await pool.query(`INSERT INTO application_forms (job_position_id,version,title,intro,published,created_by_user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [input.positionId, version.rows[0].version, input.title, input.intro ?? null, input.published, ctx.user.id]);
      return result.rows[0];
    }),
    saveQuestion: adminProcedure.input(z2.object({ id: z2.number().optional(), formId: z2.number(), fieldKey: z2.string().min(2).max(100), label: z2.string().min(2), helpText: z2.string().max(600).optional(), type: z2.string().min(2).max(40), required: z2.boolean().default(false), orderIndex: z2.number().int().default(0), answerConfig: z2.record(z2.string(), z2.unknown()).default({}), acceptedAnswers: z2.array(z2.unknown()).default([]), hardFail: z2.boolean().default(false), evaluationCriteria: z2.string().max(2e3).optional(), aiPrompt: z2.string().max(2e3).optional() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      if (input.id) {
        const result2 = await pool.query(`UPDATE form_questions SET field_key=$1,label=$2,help_text=$3,type=$4,required=$5,order_index=$6,answer_config=$7::jsonb,accepted_answers=$8::jsonb,hard_fail=$9,evaluation_criteria=$10,ai_prompt=$11 WHERE id=$12 RETURNING *`, [input.fieldKey, input.label, input.helpText ?? null, input.type, input.required, input.orderIndex, asJson(input.answerConfig), asJson(input.acceptedAnswers), input.hardFail, input.evaluationCriteria ?? null, input.aiPrompt ?? null, input.id]);
        return result2.rows[0];
      }
      const result = await pool.query(`INSERT INTO form_questions (form_id,field_key,label,help_text,type,required,order_index,answer_config,accepted_answers,hard_fail,evaluation_criteria,ai_prompt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,$12) RETURNING *`, [input.formId, input.fieldKey, input.label, input.helpText ?? null, input.type, input.required, input.orderIndex, asJson(input.answerConfig), asJson(input.acceptedAnswers), input.hardFail, input.evaluationCriteria ?? null, input.aiPrompt ?? null]);
      return result.rows[0];
    }),
    deleteQuestion: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(`SELECT form_id FROM form_questions WHERE id=$1 FOR UPDATE`, [input.id]);
        if (!current.rows[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "Pregunta no encontrada." });
        await client.query(`DELETE FROM form_questions WHERE id=$1`, [input.id]);
        await client.query(`WITH ordered AS (SELECT id, row_number() OVER (ORDER BY order_index,id)-1 AS new_order FROM form_questions WHERE form_id=$1) UPDATE form_questions q SET order_index=ordered.new_order FROM ordered WHERE q.id=ordered.id`, [current.rows[0].form_id]);
        await client.query("COMMIT");
        return { success: true };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
    setPublished: adminProcedure.input(z2.object({ id: z2.number(), published: z2.boolean() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const result = await pool.query(`UPDATE application_forms SET published=$1,updated_at=now() WHERE id=$2 RETURNING *`, [input.published, input.id]);
      return result.rows[0];
    }),
    remove: adminProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      await pool.query(`DELETE FROM application_forms WHERE id=$1`, [input.id]);
      return { success: true };
    }),
    setQuestionActive: adminProcedure.input(z2.object({ id: z2.number(), active: z2.boolean() })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const result = await pool.query(`UPDATE form_questions SET active=$1 WHERE id=$2 RETURNING *`, [input.active, input.id]);
      return result.rows[0];
    }),
    moveQuestion: adminProcedure.input(z2.object({ id: z2.number(), direction: z2.enum(["up", "down"]) })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(`SELECT id,form_id,order_index FROM form_questions WHERE id=$1 FOR UPDATE`, [input.id]);
        if (!current.rows[0]) throw new TRPCError3({ code: "NOT_FOUND", message: "Pregunta no encontrada." });
        const delta = input.direction === "up" ? -1 : 1;
        const target = await client.query(`SELECT id,order_index FROM form_questions WHERE form_id=$1 AND order_index=$2 ORDER BY id LIMIT 1 FOR UPDATE`, [current.rows[0].form_id, current.rows[0].order_index + delta]);
        if (target.rows[0]) {
          await client.query(`UPDATE form_questions SET order_index=$1 WHERE id=$2`, [current.rows[0].order_index, target.rows[0].id]);
          await client.query(`UPDATE form_questions SET order_index=$1 WHERE id=$2`, [target.rows[0].order_index, current.rows[0].id]);
        }
        const result = await client.query(`SELECT * FROM form_questions WHERE id=$1`, [input.id]);
        await client.query("COMMIT");
        return result.rows[0];
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    })
  }),
  config: router({
    settings: adminProcedure.query(async () => {
      const pool = await getPool();
      if (!pool) return [];
      const result = await pool.query(`SELECT provider,setting_key,setting_value,is_secret FROM integration_settings WHERE provider IN ('recruitment','apichat') ORDER BY provider,setting_key`);
      return result.rows;
    }),
    saveSetting: adminProcedure.input(z2.object({ provider: z2.string().min(2).max(64), settingKey: z2.string().min(2).max(120), settingValue: z2.string().max(3e3), isSecret: z2.boolean().default(false) })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const result = await pool.query(`INSERT INTO integration_settings (provider,setting_key,setting_value,is_secret,updated_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (provider,setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,is_secret=EXCLUDED.is_secret,updated_at=now() RETURNING provider,setting_key,setting_value,is_secret`, [input.provider, input.settingKey, input.settingValue, input.isSecret]);
      return result.rows[0];
    }),
    recipients: adminProcedure.query(async () => {
      const pool = await getPool();
      if (!pool) return [];
      const result = await pool.query(`SELECT * FROM internal_alert_recipients ORDER BY label`);
      return result.rows;
    }),
    saveRecipient: adminProcedure.input(z2.object({ id: z2.number().optional(), label: z2.string().min(2).max(120), phone: z2.string().min(7).max(40), active: z2.boolean().default(true) })).mutation(async ({ input }) => {
      const pool = await requirePool();
      const phone = normalizePhone(input.phone, "GT");
      if (input.id) {
        const result2 = await pool.query(`UPDATE internal_alert_recipients SET label=$1,phone_international=$2,active=$3 WHERE id=$4 RETURNING *`, [input.label, phone.e164, input.active, input.id]);
        return result2.rows[0];
      }
      const result = await pool.query(`INSERT INTO internal_alert_recipients (label,phone_international,active) VALUES ($1,$2,$3) RETURNING *`, [input.label, phone.e164, input.active]);
      return result.rows[0];
    })
  })
});

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/vite.ts
import express from "express";
import fs2 from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var PROJECT_ROOT = import.meta.dirname;
var LOG_DIR = path.join(PROJECT_ROOT, ".manus-logs");
var MAX_LOG_SIZE_BYTES = 1 * 1024 * 1024;
var TRIM_TARGET_BYTES = Math.floor(MAX_LOG_SIZE_BYTES * 0.6);
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}
function trimLogFile(logPath, maxSize) {
  try {
    if (!fs.existsSync(logPath) || fs.statSync(logPath).size <= maxSize) {
      return;
    }
    const lines = fs.readFileSync(logPath, "utf-8").split("\n");
    const keptLines = [];
    let keptBytes = 0;
    const targetSize = TRIM_TARGET_BYTES;
    for (let i = lines.length - 1; i >= 0; i--) {
      const lineBytes = Buffer.byteLength(`${lines[i]}
`, "utf-8");
      if (keptBytes + lineBytes > targetSize) break;
      keptLines.unshift(lines[i]);
      keptBytes += lineBytes;
    }
    fs.writeFileSync(logPath, keptLines.join("\n"), "utf-8");
  } catch {
  }
}
function writeToLogFile(source, entries) {
  if (entries.length === 0) return;
  ensureLogDir();
  const logPath = path.join(LOG_DIR, `${source}.log`);
  const lines = entries.map((entry) => {
    const ts = (/* @__PURE__ */ new Date()).toISOString();
    return `[${ts}] ${JSON.stringify(entry)}`;
  });
  fs.appendFileSync(logPath, `${lines.join("\n")}
`, "utf-8");
  trimLogFile(logPath, MAX_LOG_SIZE_BYTES);
}
function vitePluginManusDebugCollector() {
  return {
    name: "manus-debug-collector",
    transformIndexHtml(html) {
      if (process.env.NODE_ENV === "production") {
        return html;
      }
      return {
        html,
        tags: [
          {
            tag: "script",
            attrs: {
              src: "/__manus__/debug-collector.js",
              defer: true
            },
            injectTo: "head"
          }
        ]
      };
    },
    configureServer(server) {
      server.middlewares.use("/__manus__/logs", (req, res, next) => {
        if (req.method !== "POST") {
          return next();
        }
        const handlePayload = (payload) => {
          if (payload.consoleLogs?.length > 0) {
            writeToLogFile("browserConsole", payload.consoleLogs);
          }
          if (payload.networkRequests?.length > 0) {
            writeToLogFile("networkRequests", payload.networkRequests);
          }
          if (payload.sessionEvents?.length > 0) {
            writeToLogFile("sessionReplay", payload.sessionEvents);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true }));
        };
        const reqBody = req.body;
        if (reqBody && typeof reqBody === "object") {
          try {
            handlePayload(reqBody);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
          return;
        }
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", () => {
          try {
            const payload = JSON.parse(body);
            handlePayload(payload);
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ success: false, error: String(e) }));
          }
        });
      });
    }
  };
}
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime(), vitePluginManusDebugCollector()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs2.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = process.env.NODE_ENV === "development" ? path2.resolve(import.meta.dirname, "../..", "dist", "public") : path2.resolve(import.meta.dirname, "public");
  if (!fs2.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 3e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
startServer().catch(console.error);

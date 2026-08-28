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
  varchar,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "reclutador", "admin"]);
export const applicationStatusEnum = pgEnum("application_status", [
  "en_revision",
  "calificado",
  "no_calificado",
  "entrevista_iniciada",
  "entrevista_en_curso",
  "entrevista_finalizada",
  "pendiente_revision_humana",
  "error_procesamiento",
]);
export const evaluationStatusEnum = pgEnum("evaluation_status", [
  "calificado",
  "no_calificado",
  "pendiente_revision_humana",
  "error_procesamiento",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("open_id", { length: 128 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("login_method", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("last_signed_in", { withTimezone: true }).defaultNow().notNull(),
});

export const countries = pgTable("countries", {
  id: serial("id").primaryKey(),
  iso2: varchar("iso2", { length: 2 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  dialingCode: varchar("dialing_code", { length: 8 }).notNull(),
  active: boolean("active").default(true).notNull(),
});

export const geoDepartments = pgTable("geo_departments", {
  id: serial("id").primaryKey(),
  countryId: integer("country_id").references(() => countries.id).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull(),
}, table => ({ uniqueCountryCode: uniqueIndex("geo_departments_country_code_uq").on(table.countryId, table.code) }));

export const geoMunicipalities = pgTable("geo_municipalities", {
  id: serial("id").primaryKey(),
  departmentId: integer("department_id").references(() => geoDepartments.id).notNull(),
  code: varchar("code", { length: 20 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull(),
}, table => ({ uniqueDepartmentCode: uniqueIndex("geo_municipalities_department_code_uq").on(table.departmentId, table.code) }));

export const geoZones = pgTable("geo_zones", {
  id: serial("id").primaryKey(),
  municipalityId: integer("municipality_id").references(() => geoMunicipalities.id).notNull(),
  code: varchar("code", { length: 40 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  active: boolean("active").default(true).notNull(),
}, table => ({ uniqueMunicipalityCode: uniqueIndex("geo_zones_municipality_code_uq").on(table.municipalityId, table.code) }));

export const jobPositions = pgTable("job_positions", {
  id: serial("id").primaryKey(),
  publicSlug: varchar("public_slug", { length: 80 }).notNull().unique(),
  code: varchar("code", { length: 80 }).notNull().unique(),
  title: varchar("title", { length: 180 }).notNull(),
  department: varchar("department", { length: 160 }),
  locationLabel: varchar("location_label", { length: 240 }),
  description: text("description"),
  published: boolean("published").default(false).notNull(),
  agentKey: varchar("agent_key", { length: 120 }).notNull(),
  whatsappMessage: text("whatsapp_message").default("Gracias por aplicar. Te contactaremos para continuar con tu proceso de evaluación."),
  defaultCountry: varchar("default_country", { length: 2 }).default("GT").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applicationForms = pgTable("application_forms", {
  id: serial("id").primaryKey(),
  jobPositionId: integer("job_position_id").references(() => jobPositions.id, { onDelete: "cascade" }).notNull(),
  version: integer("version").default(1).notNull(),
  title: varchar("title", { length: 240 }).notNull(),
  intro: text("intro"),
  published: boolean("published").default(false).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ oneVersion: uniqueIndex("application_forms_job_version_uq").on(table.jobPositionId, table.version) }));

export const formQuestions = pgTable("form_questions", {
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
  active: boolean("active").default(true).notNull(),
}, table => ({ uniqueFieldPerForm: uniqueIndex("form_questions_form_field_uq").on(table.formId, table.fieldKey), formOrderIdx: index("form_questions_form_order_idx").on(table.formId, table.orderIndex) }));

export const candidates = pgTable("candidates", {
  id: serial("id").primaryKey(),
  phoneInternational: varchar("phone_international", { length: 32 }).notNull().unique(),
  phoneCountry: varchar("phone_country", { length: 2 }).default("GT").notNull(),
  fullName: varchar("full_name", { length: 240 }),
  email: varchar("email", { length: 320 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const applications = pgTable("applications", {
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
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ candidatePositionUq: uniqueIndex("applications_candidate_position_uq").on(table.candidateId, table.jobPositionId), statusIdx: index("applications_status_idx").on(table.status), positionIdx: index("applications_position_idx").on(table.jobPositionId) }));

export const applicationAnswers = pgTable("application_answers", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  questionId: integer("question_id").references(() => formQuestions.id).notNull(),
  valueJson: jsonb("value_json").notNull(),
  normalizedValue: text("normalized_value"),
  deterministicResult: varchar("deterministic_result", { length: 32 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ applicationQuestionUq: uniqueIndex("application_answers_application_question_uq").on(table.applicationId, table.questionId) }));

export const evaluations = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  status: evaluationStatusEnum("status").notNull(),
  reason: text("reason").notNull(),
  profileSummary: text("profile_summary").notNull(),
  ruleResults: jsonb("rule_results").default([]).notNull(),
  aiPayload: jsonb("ai_payload"),
  aiModel: varchar("ai_model", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ evaluationApplicationIdx: index("evaluations_application_idx").on(table.applicationId) }));

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  applicationId: integer("application_id").references(() => applications.id, { onDelete: "cascade" }).notNull(),
  provider: varchar("provider", { length: 48 }).default("apichat").notNull(),
  externalConversationId: varchar("external_conversation_id", { length: 180 }),
  status: varchar("status", { length: 48 }).default("pendiente").notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversationMessages = pgTable("conversation_messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  direction: varchar("direction", { length: 16 }).notNull(),
  messageType: varchar("message_type", { length: 40 }).default("text").notNull(),
  body: text("body"),
  providerMessageId: varchar("provider_message_id", { length: 180 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  entityType: varchar("entity_type", { length: 80 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar("action", { length: 80 }).notNull(),
  beforeJson: jsonb("before_json"),
  afterJson: jsonb("after_json"),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ entityIdx: index("audit_log_entity_idx").on(table.entityType, table.entityId) }));

export const internalAlertRecipients = pgTable("internal_alert_recipients", {
  id: serial("id").primaryKey(),
  label: varchar("label", { length: 120 }).notNull(),
  phoneInternational: varchar("phone_international", { length: 32 }).notNull().unique(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const integrationSettings = pgTable("integration_settings", {
  id: serial("id").primaryKey(),
  provider: varchar("provider", { length: 64 }).notNull(),
  settingKey: varchar("setting_key", { length: 120 }).notNull(),
  settingValue: text("setting_value"),
  isSecret: boolean("is_secret").default(false).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, table => ({ providerKeyUq: uniqueIndex("integration_settings_provider_key_uq").on(table.provider, table.settingKey) }));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type JobPosition = typeof jobPositions.$inferSelect;
export type ApplicationForm = typeof applicationForms.$inferSelect;
export type FormQuestion = typeof formQuestions.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type ApplicationAnswer = typeof applicationAnswers.$inferSelect;
export type Evaluation = typeof evaluations.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;

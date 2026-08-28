CREATE TYPE "public"."application_status" AS ENUM('en_revision', 'calificado', 'no_calificado', 'entrevista_iniciada', 'entrevista_en_curso', 'entrevista_finalizada', 'pendiente_revision_humana', 'error_procesamiento');--> statement-breakpoint
CREATE TYPE "public"."evaluation_status" AS ENUM('calificado', 'no_calificado', 'pendiente_revision_humana', 'error_procesamiento');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TABLE "application_answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"value_json" jsonb NOT NULL,
	"normalized_value" text,
	"deterministic_result" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_forms" (
	"id" serial PRIMARY KEY NOT NULL,
	"job_position_id" integer NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"title" varchar(240) NOT NULL,
	"intro" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"candidate_id" integer NOT NULL,
	"job_position_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"status" "application_status" DEFAULT 'en_revision' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"evaluation_at" timestamp with time zone,
	"evaluation_reason" text,
	"profile_summary" text,
	"review_hold_until" timestamp with time zone,
	"review_token" varchar(80),
	"whatsapp_status" varchar(48) DEFAULT 'no_enviado' NOT NULL,
	"last_whatsapp_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_user_id" integer,
	"entity_type" varchar(80) NOT NULL,
	"entity_id" integer NOT NULL,
	"action" varchar(80) NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone_international" varchar(32) NOT NULL,
	"phone_country" varchar(2) DEFAULT 'GT' NOT NULL,
	"full_name" varchar(240),
	"email" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_phone_international_unique" UNIQUE("phone_international")
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"direction" varchar(16) NOT NULL,
	"message_type" varchar(40) DEFAULT 'text' NOT NULL,
	"body" text,
	"provider_message_id" varchar(180),
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"provider" varchar(48) DEFAULT 'apichat' NOT NULL,
	"external_conversation_id" varchar(180),
	"status" varchar(48) DEFAULT 'pendiente' NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY NOT NULL,
	"iso2" varchar(2) NOT NULL,
	"name" varchar(120) NOT NULL,
	"dialing_code" varchar(8) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "countries_iso2_unique" UNIQUE("iso2")
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_id" integer NOT NULL,
	"status" "evaluation_status" NOT NULL,
	"reason" text NOT NULL,
	"profile_summary" text NOT NULL,
	"rule_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"ai_payload" jsonb,
	"ai_model" varchar(120),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"form_id" integer NOT NULL,
	"field_key" varchar(100) NOT NULL,
	"label" text NOT NULL,
	"help_text" text,
	"type" varchar(40) NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"answer_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"accepted_answers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hard_fail" boolean DEFAULT false NOT NULL,
	"evaluation_criteria" text,
	"ai_prompt" text,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_municipalities" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geo_zones" (
	"id" serial PRIMARY KEY NOT NULL,
	"municipality_id" integer NOT NULL,
	"code" varchar(40) NOT NULL,
	"name" varchar(160) NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(64) NOT NULL,
	"setting_key" varchar(120) NOT NULL,
	"setting_value" text,
	"is_secret" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_alert_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"label" varchar(120) NOT NULL,
	"phone_international" varchar(32) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "internal_alert_recipients_phone_international_unique" UNIQUE("phone_international")
);
--> statement-breakpoint
CREATE TABLE "job_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"public_slug" varchar(80) NOT NULL,
	"code" varchar(80) NOT NULL,
	"title" varchar(180) NOT NULL,
	"department" varchar(160),
	"location_label" varchar(240),
	"description" text,
	"published" boolean DEFAULT false NOT NULL,
	"agent_key" varchar(120) NOT NULL,
	"created_by_user_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "job_positions_public_slug_unique" UNIQUE("public_slug"),
	CONSTRAINT "job_positions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(128) NOT NULL,
	"name" text,
	"email" varchar(320),
	"login_method" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_signed_in" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_answers" ADD CONSTRAINT "application_answers_question_id_form_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."form_questions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_forms" ADD CONSTRAINT "application_forms_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_forms" ADD CONSTRAINT "application_forms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_position_id_job_positions_id_fk" FOREIGN KEY ("job_position_id") REFERENCES "public"."job_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_form_id_application_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_forms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_questions" ADD CONSTRAINT "form_questions_form_id_application_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."application_forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_departments" ADD CONSTRAINT "geo_departments_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_municipalities" ADD CONSTRAINT "geo_municipalities_department_id_geo_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."geo_departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "geo_zones" ADD CONSTRAINT "geo_zones_municipality_id_geo_municipalities_id_fk" FOREIGN KEY ("municipality_id") REFERENCES "public"."geo_municipalities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_positions" ADD CONSTRAINT "job_positions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "application_answers_application_question_uq" ON "application_answers" USING btree ("application_id","question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "application_forms_job_version_uq" ON "application_forms" USING btree ("job_position_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "applications_candidate_position_uq" ON "applications" USING btree ("candidate_id","job_position_id");--> statement-breakpoint
CREATE INDEX "applications_status_idx" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "applications_position_idx" ON "applications" USING btree ("job_position_id");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "evaluations_application_idx" ON "evaluations" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "form_questions_form_field_uq" ON "form_questions" USING btree ("form_id","field_key");--> statement-breakpoint
CREATE INDEX "form_questions_form_order_idx" ON "form_questions" USING btree ("form_id","order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_departments_country_code_uq" ON "geo_departments" USING btree ("country_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_municipalities_department_code_uq" ON "geo_municipalities" USING btree ("department_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "geo_zones_municipality_code_uq" ON "geo_zones" USING btree ("municipality_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_settings_provider_key_uq" ON "integration_settings" USING btree ("provider","setting_key");
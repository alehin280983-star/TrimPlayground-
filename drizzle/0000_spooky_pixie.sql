CREATE TYPE "public"."outcome_source" AS ENUM('auto', 'judge', 'user');--> statement-breakpoint
CREATE TYPE "public"."pricing_status" AS ENUM('verified', 'stale', 'manual');--> statement-breakpoint
CREATE TYPE "public"."run_mode" AS ENUM('live', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."task_class" AS ENUM('chat', 'rag', 'json_extract', 'coding', 'agentic', 'research');--> statement-breakpoint
CREATE TABLE "calibration_record" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_class" "task_class" NOT NULL,
	"template_id" varchar(64) NOT NULL,
	"model_id" varchar(128) NOT NULL,
	"estimated_cost_per_task" numeric(20, 10),
	"actual_cost_per_task" numeric(20, 10),
	"error_pct" numeric(10, 4),
	"sample_count" integer DEFAULT 1 NOT NULL,
	"calibration_status" varchar(32) DEFAULT 'pending' NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"price_input" numeric(20, 10) NOT NULL,
	"price_output" numeric(20, 10) NOT NULL,
	"price_cached" numeric(20, 10),
	"price_tool" numeric(20, 10),
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	"status" "pricing_status" DEFAULT 'manual' NOT NULL,
	"valid_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "step_log" (
	"step_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"agent_id" varchar(128) NOT NULL,
	"provider" varchar(64) NOT NULL,
	"model" varchar(128) NOT NULL,
	"started_at" timestamp with time zone,
	"first_byte_at" timestamp with time zone,
	"first_token_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"input_tokens" integer,
	"output_tokens" integer,
	"cached_input_tokens" integer,
	"reasoning_tokens" integer,
	"tool_tokens" integer,
	"success" boolean,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"fallback_used" boolean DEFAULT false NOT NULL,
	"human_review_required" boolean DEFAULT false NOT NULL,
	"accepted" boolean,
	"outcome_source" "outcome_source",
	"schema_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_run" (
	"run_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"mode" "run_mode" NOT NULL,
	"task_class" "task_class" NOT NULL,
	"architecture_pattern" varchar(128),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "step_log" ADD CONSTRAINT "step_log_run_id_workflow_run_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."workflow_run"("run_id") ON DELETE no action ON UPDATE no action;
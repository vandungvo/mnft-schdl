-- SQL dump generated using DBML (dbml.dbdiagram.io)
-- Database: PostgreSQL
-- Generated at: 2026-07-15T18:45:23.249Z

CREATE TYPE "notification_status" AS ENUM (
  'unread',
  'read',
  'archived'
);

CREATE TYPE "channel_status" AS ENUM (
  'active',
  'muted'
);

CREATE TYPE "digest_job_status" AS ENUM (
  'pending',
  'sent',
  'failed'
);

CREATE TABLE "channel_preferences" (
  "id" uuid PRIMARY KEY,
  "channel_name" varchar NOT NULL,
  "status" channel_status DEFAULT 'active',
  "muted_until" timestamp,
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "notifications" (
  "id" uuid PRIMARY KEY,
  "channel_id" uuid,
  "title" varchar NOT NULL,
  "summary" text,
  "status" notification_status NOT NULL DEFAULT 'unread',
  "created_at" timestamp DEFAULT (now())
);

CREATE TABLE "digest_jobs" (
  "id" uuid PRIMARY KEY,
  "channel_id" uuid,
  "status" digest_job_status NOT NULL DEFAULT 'pending',
  "scheduled_at" timestamp NOT NULL,
  "retry_count" int DEFAULT 0
);

CREATE INDEX "idx_notifications_channel_time" ON "notifications" ("channel_id", "created_at");

COMMENT ON COLUMN "channel_preferences"."channel_name" IS 'tên kênh (vd: Bài học mới, Nhắc học)';

COMMENT ON COLUMN "channel_preferences"."status" IS 'active | muted';

COMMENT ON COLUMN "channel_preferences"."muted_until" IS 'hạn tự bật lại, tối đa 30 ngày (BR-smart-notification-001)';

COMMENT ON COLUMN "notifications"."channel_id" IS 'kênh phát sinh thông báo';

COMMENT ON COLUMN "notifications"."title" IS 'tiêu đề thông báo';

COMMENT ON COLUMN "notifications"."summary" IS 'tóm tắt nội dung';

COMMENT ON COLUMN "notifications"."created_at" IS 'thời điểm phát sinh';

COMMENT ON COLUMN "digest_jobs"."channel_id" IS 'kênh được gộp vào digest';

COMMENT ON COLUMN "digest_jobs"."scheduled_at" IS 'thời điểm gửi theo múi giờ user';

COMMENT ON COLUMN "digest_jobs"."retry_count" IS 'số lần retry đã thực hiện, tối đa 3 (E-smart-notification-003)';

ALTER TABLE "notifications" ADD FOREIGN KEY ("channel_id") REFERENCES "channel_preferences" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "digest_jobs" ADD FOREIGN KEY ("channel_id") REFERENCES "channel_preferences" ("id") DEFERRABLE INITIALLY IMMEDIATE;

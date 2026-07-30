-- Premium "Bugünkü Kişisel Planım" storage.
--
-- Keeps a day's generated plan stable and gives the composer a short history window so it
-- can avoid repeating the same life-area/action-intent combination on consecutive days.

CREATE TABLE IF NOT EXISTS daily_personal_plans (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    plan_date           DATE         NOT NULL,
    locale              VARCHAR(8)   NOT NULL,
    plan_version        VARCHAR(32)  NOT NULL,
    context_hash        VARCHAR(64)  NOT NULL,
    payload_json        TEXT         NOT NULL,
    fingerprints        VARCHAR(1024),
    highlight_texts     TEXT,
    regeneration_count  INTEGER      NOT NULL DEFAULT 0,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_daily_personal_plan_user_date_locale UNIQUE (user_id, plan_date, locale)
);

CREATE INDEX IF NOT EXISTS idx_daily_personal_plan_user_date
    ON daily_personal_plans (user_id, plan_date);

-- Feedback reason lets "Çok genel" / "Tekrarlı" influence the next generation instead of
-- collapsing every complaint into a thumbs-down.
ALTER TABLE feedback
    ADD COLUMN IF NOT EXISTS reason VARCHAR(32);

CREATE INDEX IF NOT EXISTS idx_feedback_user_reason
    ON feedback (user_id, reason);

CREATE TABLE IF NOT EXISTS planner_reminders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    reminder_date DATE NOT NULL,
    date_time_utc TIMESTAMP NOT NULL,
    local_time VARCHAR(5) NOT NULL,
    timezone VARCHAR(64) NOT NULL,
    type VARCHAR(24) NOT NULL,
    payload_json TEXT,
    payload_hash VARCHAR(64) NOT NULL,
    message_title VARCHAR(120) NOT NULL,
    message_body VARCHAR(240) NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'SCHEDULED',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_utc TIMESTAMP NOT NULL,
    last_error VARCHAR(240),
    sent_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_planner_reminder_dedupe
    ON planner_reminders (user_id, type, payload_hash, date_time_utc);

CREATE INDEX IF NOT EXISTS idx_planner_reminders_user_date
    ON planner_reminders (user_id, reminder_date);

CREATE INDEX IF NOT EXISTS idx_planner_reminders_status_due
    ON planner_reminders (status, enabled, next_attempt_utc);

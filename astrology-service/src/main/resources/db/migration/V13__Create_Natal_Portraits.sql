-- Structured natal interpretations ("Haritam" redesign).
-- One row per (user, birth-data signature, contract version, locale); a natal chart never
-- changes, so this table is read far more often than it is written.
CREATE TABLE IF NOT EXISTS natal_portraits (
    id                     BIGSERIAL PRIMARY KEY,
    user_id                VARCHAR(255) NOT NULL,
    chart_id               BIGINT,
    chart_signature        VARCHAR(64)  NOT NULL,
    interpretation_version VARCHAR(40)  NOT NULL,
    locale                 VARCHAR(10)  NOT NULL,
    status                 VARCHAR(20)  NOT NULL,
    source                 VARCHAR(20)  NOT NULL,
    portrait_json          TEXT         NOT NULL,
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP,
    CONSTRAINT uk_natal_portraits_scope
        UNIQUE (user_id, chart_signature, interpretation_version, locale)
);

CREATE INDEX IF NOT EXISTS idx_natal_portraits_user  ON natal_portraits (user_id);
CREATE INDEX IF NOT EXISTS idx_natal_portraits_chart ON natal_portraits (chart_id);

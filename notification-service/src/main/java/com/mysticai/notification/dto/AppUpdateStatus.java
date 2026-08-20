package com.mysticai.notification.dto;

/** Normalized update decision returned to the mobile client. */
public enum AppUpdateStatus {
    /** Installed build is at (or ahead of) the configured latest build. */
    UP_TO_DATE,
    /** Still supported, but a newer build is available and the nudge is enabled. */
    OPTIONAL_UPDATE,
    /** Installed build is below the enforced minimum — the app must block until updated. */
    FORCE_UPDATE
}

package com.mysticai.notification.tutorial.dto.admin;

import com.mysticai.notification.tutorial.entity.TutorialConfigStatus;
import com.mysticai.notification.tutorial.entity.TutorialPlatform;
import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.Max;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TutorialConfigAdminUpsertRequest {

    @NotBlank
    @Size(max = 120)
    private String tutorialId;

    @NotBlank
    @Size(max = 255)
    private String name;

    @NotBlank
    @Size(max = 120)
    private String screenKey;

    @NotNull
    private TutorialPlatform platform;

    @NotNull
    @Min(1)
    private Integer version;

    @NotNull
    private Boolean isActive;

    @NotNull
    @Min(0)
    private Integer priority;

    @NotNull
    private TutorialPresentationType presentationType;

    private LocalDateTime startAt;
    private LocalDateTime endAt;

    @Size(max = 1000)
    private String description;

    @Size(max = 10000)
    private String audienceRules;

    @Size(max = 40)
    private String minAppVersion;

    @Size(max = 40)
    private String maxAppVersion;

    @Size(max = 12)
    private String locale;

    @Size(max = 120)
    private String experimentKey;

    @Min(0)
    @Max(100)
    private Integer rolloutPercentage;

    private TutorialConfigStatus status;

    @NotEmpty
    @Valid
    private List<TutorialConfigAdminStepRequest> steps;
}

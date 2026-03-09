package com.mysticai.notification.tutorial.dto.admin;

import com.mysticai.notification.tutorial.entity.TutorialPresentationType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class TutorialConfigAdminStepRequest {

    @NotBlank
    @Size(max = 120)
    private String stepId;

    @NotNull
    @Min(0)
    private Integer orderIndex;

    @NotBlank
    @Size(max = 120)
    private String title;

    @NotBlank
    @Size(max = 500)
    private String body;

    @NotBlank
    @Size(max = 160)
    private String targetKey;

    @Size(max = 120)
    private String iconKey;

    private TutorialPresentationType presentationType;

    @NotNull
    private Boolean isActive;
}

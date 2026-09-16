package study.spring.topic;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public record CreateTopicRequest(
    @NotBlank(message = "slug is required")
    @Pattern(
        regexp = "[a-z0-9]+(?:-[a-z0-9]+)*",
        message = "slug must use lowercase letters, numbers, and single hyphens"
    )
    String slug,
    @NotBlank(message = "title is required")
    @Size(
        max = 80,
        message = "title must not exceed 80 characters"
    )
    String title,
    @Positive(message = "estimatedMinutes must be greater than zero")
    int estimatedMinutes
) {
}

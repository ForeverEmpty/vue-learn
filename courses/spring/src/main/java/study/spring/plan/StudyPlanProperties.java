package study.spring.plan;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "study.plan")
public record StudyPlanProperties(
        String displayName,
        int dailyMinutes,
        boolean remindersEnabled
) {
    public StudyPlanProperties {
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException();
        }

        if (dailyMinutes <= 0) {
            throw new IllegalArgumentException();
        }
    }
}
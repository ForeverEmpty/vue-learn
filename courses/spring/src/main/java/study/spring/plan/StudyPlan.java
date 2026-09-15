package study.spring.plan;

public record StudyPlan(
        String displayName,
        String topicSlug,
        String topicTitle,
        int totalMinutes,
        int dailyMinutes,
        int estimatedDays,
        boolean remindersEnabled
) {
}

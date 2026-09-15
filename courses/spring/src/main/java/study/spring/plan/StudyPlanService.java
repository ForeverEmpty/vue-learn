package study.spring.plan;

import java.util.Optional;

import org.springframework.stereotype.Service;

import study.spring.topic.StudyTopic;
import study.spring.topic.TopicCatalogService;

@Service 
public final class StudyPlanService {

    private final TopicCatalogService topicCatalogService;
    private final StudyPlanProperties properties;

    public StudyPlanService(
            TopicCatalogService topicCatalogService,
            StudyPlanProperties properties
    ) {
        this.topicCatalogService = topicCatalogService;
        this.properties = properties;
    }

    public Optional<StudyPlan> createFor(String slug) {
        Optional<StudyTopic> topic = topicCatalogService.findBySlug(slug);
        if (topic.isEmpty()) return Optional.empty();

        Optional<StudyPlan> plan = topic.map(
            (t) -> new StudyPlan(
                properties.displayName(), 
                t.slug(), 
                t.title(), 
                t.estimatedMinutes(), 
                properties.dailyMinutes(), 
                (t.estimatedMinutes() + properties.dailyMinutes() - 1) / properties.dailyMinutes(), 
                properties.remindersEnabled()
            )
        );

        return plan;
    }
}

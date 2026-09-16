package study.spring.topic;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

@Service
public final class TopicCatalogService {

    private final Map<String, StudyTopic> topics = new ConcurrentHashMap<>(
        Map.of(
            "spring-boot", new StudyTopic("spring-boot", "Spring Boot", 45),
            "dependency-injection", new StudyTopic("dependency-injection", "Dependency Injection", 35)
        )
    );

    public Optional<StudyTopic> findBySlug(String slug) {
        return Optional.ofNullable(topics.get(slug));
    }

    public StudyTopic create(String slug, String title, int estimatedMinutes) {
        StudyTopic topic = new StudyTopic(slug, title, estimatedMinutes);

        StudyTopic existing = topics.putIfAbsent(slug, topic);

        if (existing != null) throw new TopicAlreadyExistsException(slug);

        return topic;
    }
}

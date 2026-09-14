package study.spring.topic;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

@Service
public final class TopicCatalogService {

    private final List<StudyTopic> topics = List.of(
            new StudyTopic("spring-boot", "Spring Boot", 45),
            new StudyTopic("dependency-injection", "Dependency Injection", 35)
    );

    public Optional<StudyTopic> findBySlug(String slug) {
        Optional<StudyTopic> topic = topics.stream()
                                           .filter((t) -> t.slug().equals(slug))
                                           .findFirst();
        return topic;
    }
}

package study.spring.topic;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class TopicCatalogServiceTest {

    private final TopicCatalogService service = new TopicCatalogService();

    @Test
    void findsAnExistingTopicBySlug() {
        Optional<StudyTopic> result = service.findBySlug("spring-boot");

        assertThat(result).contains(
                new StudyTopic("spring-boot", "Spring Boot", 45)
        );
    }

    @Test
    void returnsEmptyWhenTopicDoesNotExist() {
        assertThat(service.findBySlug("missing")).isEmpty();
    }
}

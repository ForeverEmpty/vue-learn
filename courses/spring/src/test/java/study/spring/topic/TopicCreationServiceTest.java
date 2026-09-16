package study.spring.topic;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TopicCreationServiceTest {

    private TopicCatalogService service;

    @BeforeEach
    void createService() {
        service = new TopicCatalogService();
    }

    @Test
    void createsAndStoresTopic() {
        StudyTopic created = service.create("http-caching", "HTTP Caching", 50);

        assertThat(created).isEqualTo(new StudyTopic("http-caching", "HTTP Caching", 50));
        assertThat(service.findBySlug("http-caching")).contains(created);
    }

    @Test
    void rejectsDuplicateSlug() {
        assertThatThrownBy(() -> service.create("spring-boot", "Another Spring Course", 90))
                .isInstanceOf(TopicAlreadyExistsException.class)
                .hasMessage("Study topic already exists: spring-boot");
    }
}

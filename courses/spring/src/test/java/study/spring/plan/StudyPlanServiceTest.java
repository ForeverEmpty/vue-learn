package study.spring.plan;

import org.junit.jupiter.api.Test;
import study.spring.topic.TopicCatalogService;

import static org.assertj.core.api.Assertions.assertThat;

class StudyPlanServiceTest {

    private final StudyPlanProperties properties = new StudyPlanProperties(
            "Focused Plan",
            20,
            true
    );
    private final StudyPlanService service = new StudyPlanService(
            new TopicCatalogService(),
            properties
    );

    @Test
    void createsPlanByCombiningTopicAndConfiguration() {
        assertThat(service.createFor("spring-boot")).contains(
                new StudyPlan(
                        "Focused Plan",
                        "spring-boot",
                        "Spring Boot",
                        45,
                        20,
                        3,
                        true
                )
        );
    }

    @Test
    void keepsMissingTopicAsAnEmptyResult() {
        assertThat(service.createFor("missing")).isEmpty();
    }
}

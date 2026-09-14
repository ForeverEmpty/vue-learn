package study.spring;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import study.spring.topic.TopicCatalogService;
import study.spring.topic.TopicController;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class SpringCourseApplicationTests {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void contextLoads() {
        assertThat(applicationContext).isNotNull();
    }

    @Test
    void serviceAndControllerAreManagedBeans() {
        assertThat(applicationContext.getBeansOfType(TopicCatalogService.class)).hasSize(1);
        assertThat(applicationContext.getBeansOfType(TopicController.class)).hasSize(1);
    }
}

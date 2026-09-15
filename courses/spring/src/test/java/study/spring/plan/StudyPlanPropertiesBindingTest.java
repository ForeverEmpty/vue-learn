package study.spring.plan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class StudyPlanPropertiesBindingTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void bindsBaseConfigurationIntoTypedProperties() {
        StudyPlanProperties properties = applicationContext.getBean(StudyPlanProperties.class);

        assertThat(properties.displayName()).isEqualTo("Spring Study Plan");
        assertThat(properties.dailyMinutes()).isEqualTo(30);
        assertThat(properties.remindersEnabled()).isFalse();
    }
}

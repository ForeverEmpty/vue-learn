package study.spring.plan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("local")
class StudyPlanLocalProfileTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Test
    void localProfileOverridesOnlyEnvironmentSpecificValues() {
        StudyPlanProperties properties = applicationContext.getBean(StudyPlanProperties.class);

        assertThat(properties.displayName()).isEqualTo("Local Intensive Plan");
        assertThat(properties.dailyMinutes()).isEqualTo(60);
        assertThat(properties.remindersEnabled()).isTrue();
    }
}

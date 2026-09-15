package study.spring.plan;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StudyPlanPropertiesTest {

    @Test
    void rejectsBlankDisplayName() {
        assertThatThrownBy(() -> new StudyPlanProperties(" ", 30, false))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsNonPositiveDailyMinutes() {
        assertThatThrownBy(() -> new StudyPlanProperties("Plan", 0, false))
                .isInstanceOf(IllegalArgumentException.class);
    }
}

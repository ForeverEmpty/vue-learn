package study.spring.plan;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class StudyPlanControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsConfiguredStudyPlanAsJson() throws Exception {
        mockMvc.perform(get("/api/study-plans/spring-boot"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.displayName").value("Spring Study Plan"))
                .andExpect(jsonPath("$.topicSlug").value("spring-boot"))
                .andExpect(jsonPath("$.topicTitle").value("Spring Boot"))
                .andExpect(jsonPath("$.totalMinutes").value(45))
                .andExpect(jsonPath("$.dailyMinutes").value(30))
                .andExpect(jsonPath("$.estimatedDays").value(2))
                .andExpect(jsonPath("$.remindersEnabled").value(false));
    }

    @Test
    void reusesStructuredNotFoundResponseForMissingTopic() throws Exception {
        mockMvc.perform(get("/api/study-plans/missing"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("TOPIC_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Unknown study topic: missing"));
    }

    @Test
    void rejectsUnsupportedHttpMethod() throws Exception {
        mockMvc.perform(post("/api/study-plans/spring-boot"))
                .andExpect(status().isMethodNotAllowed());
    }
}

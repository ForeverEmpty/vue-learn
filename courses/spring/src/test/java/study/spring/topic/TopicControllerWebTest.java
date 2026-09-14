package study.spring.topic;

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
class TopicControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void returnsTopicAsJson() throws Exception {
        mockMvc.perform(get("/api/topics/spring-boot"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.slug").value("spring-boot"))
                .andExpect(jsonPath("$.title").value("Spring Boot"))
                .andExpect(jsonPath("$.estimatedMinutes").value(45));
    }

    @Test
    void rejectsUnsupportedHttpMethod() throws Exception {
        mockMvc.perform(post("/api/topics/spring-boot"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    void returnsStructuredNotFoundResponse() throws Exception {
        mockMvc.perform(get("/api/topics/missing"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.code").value("TOPIC_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Unknown study topic: missing"));
    }
}

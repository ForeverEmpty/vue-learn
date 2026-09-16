package study.spring.topic;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TopicCreationControllerWebTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void createsTopicAndExposesItsLocation() throws Exception {
        mockMvc.perform(post("/api/topics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "http-caching",
                                  "title": "HTTP Caching",
                                  "estimatedMinutes": 50
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/topics/http-caching"))
                .andExpect(jsonPath("$.slug").value("http-caching"))
                .andExpect(jsonPath("$.title").value("HTTP Caching"))
                .andExpect(jsonPath("$.estimatedMinutes").value(50));

        mockMvc.perform(get("/api/topics/http-caching"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("http-caching"));
    }

    @Test
    void translatesDuplicateSlugIntoConflictResponse() throws Exception {
        mockMvc.perform(post("/api/topics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "spring-boot",
                                  "title": "Duplicate Spring Boot",
                                  "estimatedMinutes": 90
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("TOPIC_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.message").value("Study topic already exists: spring-boot"))
                .andExpect(jsonPath("$.violations").isEmpty());
    }

    @Test
    void returnsFieldViolationsForInvalidRequest() throws Exception {
        mockMvc.perform(post("/api/topics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "slug": "Not Valid",
                                  "title": " ",
                                  "estimatedMinutes": 0
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.message").value("Request validation failed"))
                .andExpect(jsonPath("$.violations.length()").value(3))
                .andExpect(jsonPath("$.violations[0].field").value("estimatedMinutes"))
                .andExpect(jsonPath("$.violations[1].field").value("slug"))
                .andExpect(jsonPath("$.violations[2].field").value("title"));
    }

    @Test
    void returnsStableErrorForMalformedJson() throws Exception {
        mockMvc.perform(post("/api/topics")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not-json}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
                .andExpect(jsonPath("$.message").value("Request body is not valid JSON"))
                .andExpect(jsonPath("$.violations").isEmpty());
    }
}

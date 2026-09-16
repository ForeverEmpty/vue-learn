package study.spring.topic;

import java.net.URI;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;


@RestController
@RequestMapping("/api/topics")
public final class TopicController {

    private final TopicCatalogService topicCatalogService;

    public TopicController(TopicCatalogService topicCatalogService) {
        this.topicCatalogService = topicCatalogService;
    }

    @GetMapping("/{slug}")
    public StudyTopic findBySlug(@PathVariable String slug) {
        return topicCatalogService.findBySlug(slug).orElseThrow(() -> new TopicNotFoundException(slug));
    }

    @PostMapping
    public ResponseEntity<StudyTopic> create(@Valid @RequestBody CreateTopicRequest request) {
        StudyTopic topic = topicCatalogService.create(
            request.slug(),
            request.title(),
            request.estimatedMinutes()
        );

        URI location = URI.create("/api/topics/" + topic.slug());

        return ResponseEntity.created(location).body(topic);
    }

}

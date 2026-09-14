package study.spring.topic;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}

package study.spring.plan;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import study.spring.topic.TopicNotFoundException;

@RestController
@RequestMapping("/api/study-plans")
public final class StudyPlanController {

    private final StudyPlanService studyPlanService;

    public StudyPlanController(StudyPlanService studyPlanService) {
        this.studyPlanService = studyPlanService;
    }

    @GetMapping("/{slug}")
    public StudyPlan findBySlug(@PathVariable String slug) {
        return studyPlanService.createFor(slug).orElseThrow(() -> new TopicNotFoundException(slug));
    }
}

package study.spring.topic;

import java.util.Set;
import java.util.stream.Collectors;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CreateTopicRequestValidationTest {

    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    @Test
    void acceptsACompleteRequest() {
        CreateTopicRequest request = new CreateTopicRequest("http-caching", "HTTP Caching", 50);

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void rejectsSlugOutsideThePublicUrlFormat() {
        CreateTopicRequest requestWithSpaces = new CreateTopicRequest("Not Valid", "HTTP Caching", 50);
        CreateTopicRequest requestWithSymbol = new CreateTopicRequest("spring-+boot", "HTTP Caching", 50);

        assertThat(invalidFields(requestWithSpaces)).containsExactly("slug");
        assertThat(invalidFields(requestWithSymbol)).containsExactly("slug");
    }

    @Test
    void rejectsBlankTitle() {
        CreateTopicRequest request = new CreateTopicRequest("http-caching", "   ", 50);

        assertThat(invalidFields(request)).containsExactly("title");
    }

    @Test
    void rejectsNonPositiveDuration() {
        CreateTopicRequest request = new CreateTopicRequest("http-caching", "HTTP Caching", 0);

        assertThat(invalidFields(request)).containsExactly("estimatedMinutes");
    }

    private Set<String> invalidFields(CreateTopicRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath)
                .map(Object::toString)
                .collect(Collectors.toSet());
    }
}

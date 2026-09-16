package study.spring.topic;

import java.util.List;

public record ApiError(
        String code,
        String message,
        List<ApiFieldViolation> violations
) {
    public ApiError {
        violations = List.copyOf(violations);
    }

    public ApiError(String code, String message) {
        this(code, message, List.of());
    }
}

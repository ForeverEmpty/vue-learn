package study.spring.topic;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public final class TopicExceptionHandler {

    @ExceptionHandler(TopicNotFoundException.class)
    public ResponseEntity<ApiError> handle(TopicNotFoundException exception) {
        ApiError error = new ApiError("TOPIC_NOT_FOUND", exception.getMessage());

        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(error);
    }
}

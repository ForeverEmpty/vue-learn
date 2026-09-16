package study.spring.topic;

import java.util.Comparator;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
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

    @ExceptionHandler(TopicAlreadyExistsException.class)
    public ResponseEntity<ApiError> handle(TopicAlreadyExistsException exception) {
        ApiError error = new ApiError("TOPIC_ALREADY_EXISTS", exception.getMessage());

        return ResponseEntity.status(HttpStatus.CONFLICT)
                             .body(error);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handle(MethodArgumentNotValidException exception) {
        List<ApiFieldViolation> violations = exception.getBindingResult()
                                                    .getFieldErrors()
                                                    .stream()
                                                    .map(error -> new ApiFieldViolation(
                                                        error.getField(),
                                                        error.getDefaultMessage()
                                                    ))
                                                    .sorted(Comparator.comparing(ApiFieldViolation::field))
                                                    .toList();

        ApiError error = new ApiError("VALIDATION_FAILED", "Request validation failed", violations);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiError> handle(HttpMessageNotReadableException exception) {
        ApiError error = new ApiError("MALFORMED_REQUEST", "Request body is not valid JSON");

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
}

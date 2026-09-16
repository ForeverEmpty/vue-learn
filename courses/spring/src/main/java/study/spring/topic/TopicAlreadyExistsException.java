package study.spring.topic;

public final class TopicAlreadyExistsException extends RuntimeException {

    private final String slug;

    public TopicAlreadyExistsException(String slug) {
        super("Study topic already exists: " + slug);
        this.slug = slug;
    }

    public String getSlug() {
        return slug;
    }
}

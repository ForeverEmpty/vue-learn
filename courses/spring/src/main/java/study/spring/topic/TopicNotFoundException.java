package study.spring.topic;

public final class TopicNotFoundException extends RuntimeException {

    private final String slug;

    public TopicNotFoundException(String slug) {
        super("Unknown study topic: " + slug);
        this.slug = slug;
    }

    public String getSlug() {
        return slug;
    }
}

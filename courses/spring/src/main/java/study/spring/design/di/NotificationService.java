package study.spring.design.di;

import java.util.Objects;

public final class NotificationService {

    private final NotificationSender sender;

    public NotificationService(NotificationSender sender) {
        this.sender = Objects.requireNonNull(sender);
    }

    public void welcome(String username) {
        sender.send(username, "Welcome to Spring learning");
    }
}

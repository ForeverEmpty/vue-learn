package study.spring.design.di;

public final class ConsoleNotificationSender implements NotificationSender {

    @Override
    public void send(String recipient, String message) {
        System.out.println("to=" + recipient + ", message=" + message);
    }
}

package study.spring.design.di;

public final class DependencyInjectionExample {

    private DependencyInjectionExample() {
    }

    public static void main(String[] args) {
        NotificationSender sender = new ConsoleNotificationSender();
        NotificationService service = new NotificationService(sender);

        service.welcome("learner");
    }
}

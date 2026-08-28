package study.concurrency;

public final class ConcurrencyCourseApp {
    private ConcurrencyCourseApp() {
    }

    public static void main(String[] args) throws InterruptedException {
        String mainThreadName = Thread.currentThread().getName();
        System.out.println("main 方法运行在线程：" + mainThreadName);

        Runnable printTask = () -> {
            String workerThreadName = Thread.currentThread().getName();
            System.out.println("任务运行在线程：" + workerThreadName);
        };

        Thread worker = ThreadBasics.createWorker("chapter-01-worker", printTask);
        ThreadBasics.startAndWait(worker);

        System.out.println("工作线程状态：" + worker.getState());
    }
}

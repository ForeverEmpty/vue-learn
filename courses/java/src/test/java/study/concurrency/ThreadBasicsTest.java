package study.concurrency;

import java.util.concurrent.atomic.AtomicInteger;

public final class ThreadBasicsTest {
    private static int passed;
    private static int failed;

    private ThreadBasicsTest() {
    }

    public static void main(String[] args) {
        runCase("createWorker 只创建线程，不提前执行任务", ThreadBasicsTest::createsNewWorker);
        runCase("startAndWait 启动线程并等待任务结束", ThreadBasicsTest::startsAndWaitsForWorker);

        System.out.printf("%nJava chapter 01: %d passed, %d failed%n", passed, failed);
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static void createsNewWorker() {
        AtomicInteger taskRuns = new AtomicInteger();

        Thread worker = ThreadBasics.createWorker("test-worker", taskRuns::incrementAndGet);

        assertEquals("test-worker", worker.getName(), "线程名称");
        assertEquals(Thread.State.NEW, worker.getState(), "创建后的线程状态");
        assertEquals(0, taskRuns.get(), "创建线程时任务执行次数");
    }

    private static void startsAndWaitsForWorker() throws InterruptedException {
        AtomicInteger taskRuns = new AtomicInteger();
        Thread worker = new Thread(() -> {
            try {
                Thread.sleep(80);
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("测试工作线程被意外中断", error);
            }
            taskRuns.incrementAndGet();
        }, "wait-worker");

        ThreadBasics.startAndWait(worker);

        assertEquals(1, taskRuns.get(), "方法返回时任务执行次数");
        assertEquals(Thread.State.TERMINATED, worker.getState(), "方法返回时线程状态");
    }

    private static void runCase(String name, TestCase testCase) {
        try {
            testCase.run();
            passed++;
            System.out.println("PASS  " + name);
        } catch (Throwable error) {
            failed++;
            System.out.println("FAIL  " + name);
            System.out.println("      " + error);
        }
    }

    private static void assertEquals(Object expected, Object actual, String label) {
        if (!expected.equals(actual)) {
            throw new AssertionError(label + "：期望 " + expected + "，实际 " + actual);
        }
    }

    @FunctionalInterface
    private interface TestCase {
        void run() throws Exception;
    }
}

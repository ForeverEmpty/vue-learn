package study.concurrency;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import java.util.concurrent.atomic.AtomicReference;

public final class SharedCounterTest {
    private static int passed;
    private static int failed;

    private SharedCounterTest() {
    }

    public static void main(String[] args) {
        runCase("increment 在单线程中将计数加一", SharedCounterTest::incrementsInCurrentThread);
        runCase("increment 使用对象内置锁保护临界区", SharedCounterTest::incrementUsesIntrinsicLock);
        runCase("多个线程的更新不会丢失", SharedCounterTest::preservesConcurrentIncrements);

        System.out.printf("%nJava chapter 02: %d passed, %d failed%n", passed, failed);
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static void incrementsInCurrentThread() {
        SharedCounter counter = new SharedCounter();

        counter.increment();

        assertEquals(1, counter.get(), "执行一次 increment 后的计数");
    }

    private static void incrementUsesIntrinsicLock() throws NoSuchMethodException {
        Method increment = SharedCounter.class.getDeclaredMethod("increment");

        assertTrue(
            Modifier.isSynchronized(increment.getModifiers()),
            "increment 应声明为 synchronized 方法"
        );
    }

    private static void preservesConcurrentIncrements() throws InterruptedException {
        int workerCount = 4;
        int incrementsPerWorker = 50_000;
        int expected = workerCount * incrementsPerWorker;
        SharedCounter counter = new SharedCounter();
        AtomicReference<Throwable> workerFailure = new AtomicReference<>();
        Thread[] workers = new Thread[workerCount];

        for (int workerIndex = 0; workerIndex < workerCount; workerIndex++) {
            workers[workerIndex] = new Thread(() -> {
                try {
                    for (int incrementIndex = 0; incrementIndex < incrementsPerWorker; incrementIndex++) {
                        counter.increment();
                    }
                } catch (Throwable error) {
                    workerFailure.compareAndSet(null, error);
                }
            }, "counter-worker-" + workerIndex);
        }

        for (Thread worker : workers) {
            worker.start();
        }
        for (Thread worker : workers) {
            worker.join();
        }

        if (workerFailure.get() != null) {
            throw new AssertionError("工作线程执行 increment 时不应抛出异常", workerFailure.get());
        }
        assertEquals(expected, counter.get(), "全部工作线程结束后的计数");
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

    private static void assertTrue(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
    }

    @FunctionalInterface
    private interface TestCase {
        void run() throws Exception;
    }
}

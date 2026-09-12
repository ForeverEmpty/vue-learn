package study.concurrency;

import java.util.AbstractList;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

public final class BoundedBufferTest {
    private static final long STATE_TIMEOUT_MILLIS = 2_000;
    private static final long COMPLETION_TIMEOUT_MILLIS = 5_000;

    private static int passed;
    private static int failed;

    private BoundedBufferTest() {
    }

    public static void main(String[] args) {
        runCase("构造函数校验并保存容量", BoundedBufferTest::validatesAndReportsCapacity);
        runCase("单线程放入和取出保持 FIFO", BoundedBufferTest::preservesFifoAndSize);
        runCase("空缓冲区让消费者等待元素", BoundedBufferTest::consumerWaitsForElement);
        runCase("满缓冲区让生产者等待空间", BoundedBufferTest::producerWaitsForSpace);
        runCase("多生产者和多消费者不丢失元素", BoundedBufferTest::transfersEveryElementConcurrently);
        runCase("等待中的消费者响应中断", BoundedBufferTest::waitingConsumerPropagatesInterruption);
        runCase("综合场景按顺序传递全部消息", BoundedBufferTest::pipelineTransfersMessages);

        System.out.printf("%nJava chapter 03: %d passed, %d failed%n", passed, failed);
        if (failed > 0) {
            System.exit(1);
        }
    }

    private static void validatesAndReportsCapacity() {
        assertThrows(
            IllegalArgumentException.class,
            () -> new BoundedBuffer<>(0),
            "容量为 0"
        );
        assertThrows(
            IllegalArgumentException.class,
            () -> new BoundedBuffer<>(-1),
            "容量为负数"
        );

        BoundedBuffer<String> buffer = new BoundedBuffer<>(2);
        assertEquals(2, buffer.capacity(), "缓冲区容量");
        assertEquals(0, buffer.size(), "新缓冲区大小");
    }

    private static void preservesFifoAndSize() throws InterruptedException {
        BoundedBuffer<String> buffer = new BoundedBuffer<>(3);

        buffer.put("A");
        buffer.put("B");
        buffer.put("C");

        assertEquals(3, buffer.size(), "放入三个元素后的大小");
        assertEquals("A", buffer.take(), "第一次取出");
        assertEquals("B", buffer.take(), "第二次取出");
        assertEquals("C", buffer.take(), "第三次取出");
        assertEquals(0, buffer.size(), "全部取出后的大小");
    }

    private static void consumerWaitsForElement() throws InterruptedException {
        BoundedBuffer<String> buffer = new BoundedBuffer<>(1);
        AtomicReference<String> received = new AtomicReference<>();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Thread consumer = new Thread(() -> {
            try {
                received.set(buffer.take());
            } catch (Throwable error) {
                failure.set(error);
            }
        }, "waiting-consumer");

        consumer.start();
        awaitState(consumer, Thread.State.WAITING, "空缓冲区中的消费者");
        assertEquals(null, received.get(), "生产前的消费结果");

        buffer.put("ready");
        joinOrFail(consumer, "放入元素后的消费者");

        assertNoFailure(failure.get(), "消费者");
        assertEquals("ready", received.get(), "消费者收到的元素");
    }

    private static void producerWaitsForSpace() throws InterruptedException {
        BoundedBuffer<String> buffer = new BoundedBuffer<>(1);
        AtomicReference<Throwable> failure = new AtomicReference<>();
        buffer.put("first");

        Thread producer = new Thread(() -> {
            try {
                buffer.put("second");
            } catch (Throwable error) {
                failure.set(error);
            }
        }, "waiting-producer");

        producer.start();
        awaitState(producer, Thread.State.WAITING, "满缓冲区中的生产者");
        assertEquals(1, buffer.size(), "生产者等待时的大小");
        assertEquals("first", buffer.take(), "腾出空间时取出的元素");

        joinOrFail(producer, "腾出空间后的生产者");
        assertNoFailure(failure.get(), "生产者");
        assertEquals("second", buffer.take(), "等待后放入的元素");
    }

    private static void transfersEveryElementConcurrently() throws InterruptedException {
        int producerCount = 2;
        int consumerCount = 2;
        int elementsPerWorker = 500;
        int totalElements = producerCount * elementsPerWorker;
        BoundedBuffer<Integer> buffer = new BoundedBuffer<>(3);
        Set<Integer> received = ConcurrentHashMap.newKeySet();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Thread[] workers = new Thread[producerCount + consumerCount];

        for (int producerIndex = 0; producerIndex < producerCount; producerIndex++) {
            int firstValue = producerIndex * elementsPerWorker;
            workers[producerIndex] = guardedWorker("producer-" + producerIndex, failure, () -> {
                for (int offset = 0; offset < elementsPerWorker; offset++) {
                    buffer.put(firstValue + offset);
                }
            });
        }

        for (int consumerIndex = 0; consumerIndex < consumerCount; consumerIndex++) {
            workers[producerCount + consumerIndex] = guardedWorker(
                "consumer-" + consumerIndex,
                failure,
                () -> {
                    for (int count = 0; count < elementsPerWorker; count++) {
                        received.add(buffer.take());
                    }
                }
            );
        }

        for (Thread worker : workers) {
            worker.start();
        }
        joinAllOrFail(workers, "多生产者和多消费者");

        assertNoFailure(failure.get(), "并发传递 worker");
        assertEquals(0, buffer.size(), "传递完成后的缓冲区大小");
        assertEquals(totalElements, received.size(), "收到的不同元素数量");
        for (int expected = 0; expected < totalElements; expected++) {
            assertTrue(received.contains(expected), "缺少元素 " + expected);
        }
    }

    private static void waitingConsumerPropagatesInterruption() throws InterruptedException {
        BoundedBuffer<String> buffer = new BoundedBuffer<>(1);
        AtomicBoolean interrupted = new AtomicBoolean();
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Thread consumer = new Thread(() -> {
            try {
                buffer.take();
            } catch (InterruptedException expected) {
                interrupted.set(true);
            } catch (Throwable error) {
                failure.set(error);
            }
        }, "interruptible-consumer");

        consumer.start();
        awaitState(consumer, Thread.State.WAITING, "等待中断的消费者");
        consumer.interrupt();
        joinOrFail(consumer, "收到中断后的消费者");

        assertNoFailure(failure.get(), "等待中断的消费者");
        assertTrue(interrupted.get(), "take 应把 InterruptedException 交给调用者");
    }

    private static void pipelineTransfersMessages() throws InterruptedException {
        List<String> input = List.of("alpha", "beta", "gamma", "delta", "epsilon");

        List<String> output = ProducerConsumerScenario.transfer(input, 2);

        assertEquals(input, output, "流水线传递结果");
        assertThrows(
            UnsupportedOperationException.class,
            () -> output.add("unexpected"),
            "流水线结果应为不可变副本"
        );

        IllegalStateException workerError = new IllegalStateException("预期的生产者失败");
        List<String> failingInput = failsAfterIteration(List.of("delivered"), workerError);

        IllegalStateException scenarioError = assertThrows(
            IllegalStateException.class,
            () -> ProducerConsumerScenario.transfer(failingInput, 1),
            "工作线程失败不能静默返回部分结果"
        );
        assertEquals(workerError, scenarioError.getCause(), "场景异常保留的工作线程原因");
    }

    private static <T> List<T> failsAfterIteration(List<T> elements, RuntimeException failure) {
        return new AbstractList<>() {
            @Override
            public T get(int index) {
                return elements.get(index);
            }

            @Override
            public int size() {
                return elements.size();
            }

            @Override
            public Iterator<T> iterator() {
                Iterator<T> delegate = elements.iterator();
                return new Iterator<>() {
                    private boolean failureThrown;

                    @Override
                    public boolean hasNext() {
                        if (delegate.hasNext()) {
                            return true;
                        }
                        if (!failureThrown) {
                            failureThrown = true;
                            throw failure;
                        }
                        return false;
                    }

                    @Override
                    public T next() {
                        return delegate.next();
                    }
                };
            }
        };
    }

    private static Thread guardedWorker(
        String name,
        AtomicReference<Throwable> failure,
        InterruptibleTask task
    ) {
        return new Thread(() -> {
            try {
                task.run();
            } catch (Throwable error) {
                failure.compareAndSet(null, error);
            }
        }, name);
    }

    private static void awaitState(Thread thread, Thread.State expected, String label)
        throws InterruptedException {
        long deadline = System.nanoTime() + STATE_TIMEOUT_MILLIS * 1_000_000;
        while (System.nanoTime() < deadline) {
            Thread.State actual = thread.getState();
            if (actual == expected) {
                return;
            }
            if (actual == Thread.State.TERMINATED) {
                throw new AssertionError(label + "在线程进入 " + expected + " 前已经结束");
            }
            Thread.sleep(5);
        }
        throw new AssertionError(label + "未在限定时间内进入 " + expected + "，实际 " + thread.getState());
    }

    private static void joinOrFail(Thread thread, String label) throws InterruptedException {
        thread.join(COMPLETION_TIMEOUT_MILLIS);
        if (thread.isAlive()) {
            thread.interrupt();
            thread.join(STATE_TIMEOUT_MILLIS);
            throw new AssertionError(label + "未在限定时间内结束");
        }
    }

    private static void joinAllOrFail(Thread[] threads, String label) throws InterruptedException {
        long deadline = System.nanoTime() + COMPLETION_TIMEOUT_MILLIS * 1_000_000;
        for (Thread thread : threads) {
            long remainingNanos = deadline - System.nanoTime();
            if (remainingNanos > 0) {
                thread.join(Math.max(1, remainingNanos / 1_000_000));
            }
        }

        for (Thread thread : threads) {
            if (thread.isAlive()) {
                for (Thread worker : threads) {
                    worker.interrupt();
                }
                for (Thread worker : threads) {
                    worker.join(STATE_TIMEOUT_MILLIS);
                }
                throw new AssertionError(label + "未在限定时间内全部结束");
            }
        }
    }

    private static <T extends Throwable> T assertThrows(
        Class<T> expectedType,
        TestCase testCase,
        String label
    ) {
        try {
            testCase.run();
        } catch (Throwable actual) {
            if (expectedType.isInstance(actual)) {
                return expectedType.cast(actual);
            }
            throw new AssertionError(
                label + "：期望异常 " + expectedType.getSimpleName()
                    + "，实际 " + actual.getClass().getSimpleName(),
                actual
            );
        }
        throw new AssertionError(label + "：期望抛出 " + expectedType.getSimpleName());
    }

    private static void assertNoFailure(Throwable failure, String label) {
        if (failure != null) {
            throw new AssertionError(label + "不应执行失败", failure);
        }
    }

    private static void assertEquals(Object expected, Object actual, String label) {
        if (expected == null ? actual != null : !expected.equals(actual)) {
            throw new AssertionError(label + "：期望 " + expected + "，实际 " + actual);
        }
    }

    private static void assertTrue(boolean condition, String message) {
        if (!condition) {
            throw new AssertionError(message);
        }
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

    @FunctionalInterface
    private interface TestCase {
        void run() throws Exception;
    }

    @FunctionalInterface
    private interface InterruptibleTask {
        void run() throws InterruptedException;
    }
}

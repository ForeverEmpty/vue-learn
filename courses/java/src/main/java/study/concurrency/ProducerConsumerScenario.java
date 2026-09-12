package study.concurrency;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

/**
 * 第三章综合练习：使用 BoundedBuffer 在线程之间传递一组元素。
 */
public final class ProducerConsumerScenario {
    private ProducerConsumerScenario() {
    }

    /**
     * 启动一个生产者和一个消费者，把 input 中的元素全部传递到结果列表。
     */
    public static <T> List<T> transfer(List<T> input, int capacity) throws InterruptedException {
        BoundedBuffer<T> buffer = new BoundedBuffer<>(capacity);
        List<T> result = mutableResultList();
        AtomicReference<Throwable> workerFailure = new AtomicReference<>();

        Thread producer = createWorker("producer", () -> {
            for (T element : input) {
                buffer.put(element);
            }
        }, workerFailure);

        Thread consumer = createWorker("consumer", () -> {
            for (int i = 0; i < input.size(); i++) {
                result.add(buffer.take());
            }
        }, workerFailure);

        producer.start();
        consumer.start();

        producer.join();
        consumer.join();

        Throwable failure = workerFailure.get();
        if (failure != null) throw new IllegalStateException("生产者—消费者执行失败", failure);

        return List.copyOf(result);
    }

    static Thread createWorker(
        String workerName,
        InterruptibleTask task,
        AtomicReference<Throwable> workerFailure
    ) {
        return new Thread(() -> {
            try {
                task.run();
            } catch (Throwable error) {
                workerFailure.compareAndSet(null, error);
                if (error instanceof InterruptedException) {
                    Thread.currentThread().interrupt();
                }
            }
        }, workerName);
    }

    static <T> List<T> mutableResultList() {
        return new ArrayList<>();
    }

    @FunctionalInterface
    interface InterruptibleTask {
        void run() throws InterruptedException;
    }
}

package study.concurrency;

import java.util.ArrayDeque;
import java.util.Deque;

/**
 * 第三章练习：使用对象监视器实现有容量限制的阻塞缓冲区。
 *
 * @param <T> 缓冲区元素类型
 */
public final class BoundedBuffer<T> {
    private final int capacity;
    private final Deque<T> elements = new ArrayDeque<>();

    /**
     * 创建指定容量的缓冲区。
     *
     * @param capacity 最大元素数量，必须大于 0
     */
    public BoundedBuffer(int capacity) {
        if (capacity <= 0) throw new IllegalArgumentException();
        this.capacity = capacity;
    }

    /**
     * 返回创建时指定的最大容量。
     */
    public int capacity() {
        return capacity;
    }

    /**
     * 返回当前元素数量。
     */
    public synchronized int size() {
        return elements.size();
    }

    /**
     * 在队尾放入元素；缓冲区已满时等待空间。
     */
    public synchronized void put(T element) throws InterruptedException {
        while (size() >= capacity) wait();
        elements.addLast(element);
        notifyAll();
    }

    /**
     * 从队头取出元素；缓冲区为空时等待元素。
     */
    public synchronized T take() throws InterruptedException {
        while (elements.isEmpty()) wait();
        T element = elements.removeFirst();
        notifyAll();
        return element;
    }
}

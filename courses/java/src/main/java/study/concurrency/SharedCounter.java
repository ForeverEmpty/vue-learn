package study.concurrency;

/**
 * 第二章练习：让多个线程安全地修改同一个计数器。
 */
public final class SharedCounter {
    private int value;

    /**
     * 将共享计数加一。
     *
     * <p>先完成单线程行为，再根据教学文档为临界区增加互斥保护。</p>
     */
    public synchronized void increment() {
        value++;
    }

    /**
     * 返回当前计数。课程测试会在线程全部 join 后读取。
     */
    public int get() {
        return value;
    }
}

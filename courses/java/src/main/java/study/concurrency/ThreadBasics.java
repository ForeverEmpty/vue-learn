package study.concurrency;

/**
 * 第一章练习：创建线程，并等待线程执行结束。
 *
 * <p>方法签名和文件结构已经准备好。请按照教学文档逐个检查点实现方法体。</p>
 */
public final class ThreadBasics {
    private ThreadBasics() {
    }

    /**
     * 创建一个尚未启动的工作线程。
     *
     * @param workerName 工作线程名称
     * @param task 工作线程要执行的任务
     * @return 状态仍为 NEW 的 Thread 对象
     */
    public static Thread createWorker(String workerName, Runnable task) {
        throw new UnsupportedOperationException("检查点二：请创建并返回工作线程");
    }

    /**
     * 启动工作线程，并等待它执行结束后再返回。
     *
     * @param worker 尚未启动的工作线程
     * @throws InterruptedException 当前等待线程被中断时抛出
     */
    public static void startAndWait(Thread worker) throws InterruptedException {
        throw new UnsupportedOperationException("检查点三：请启动线程并等待结束");
    }
}

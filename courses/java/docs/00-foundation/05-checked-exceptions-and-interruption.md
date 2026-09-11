# Java 00·05：受检异常与 `InterruptedException`

Java 的受检异常要求调用者明确处理。`Thread.join()` 在等待期间可能被中断，因此会声明 `InterruptedException`。

调用者通常有两种选择。

## 在当前方法处理

```java
try {
    worker.join();
} catch (InterruptedException exception) {
    // 当前方法决定如何恢复或继续传递中断信息
}
```

## 继续交给上层调用者

```java
public static void startAndWait(Thread worker) throws InterruptedException {
    worker.join();
}
```

`throws` 不表示异常一定发生，也不负责处理异常；它是在方法签名中说明“调用这个方法的人需要面对这种可能性”。

第一章已经提前写好 `throws InterruptedException`，当前只需理解为什么调用 `join()` 后方法签名会受到影响。完整的线程中断策略会在后续并发章节学习。

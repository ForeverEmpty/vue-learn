# Java 00·06：`AtomicInteger` 入门

第一章测试需要让工作线程修改计数，再由测试线程读取结果：

```java
AtomicInteger taskRuns = new AtomicInteger();
taskRuns.incrementAndGet();
int currentRuns = taskRuns.get();
```

- `new AtomicInteger()` 创建初始值为 `0` 的计数器。
- `incrementAndGet()` 安全地加一，并返回增加后的值。
- `get()` 读取当前值。

测试没有使用普通 `int`，因为普通自增表达式不是为多个线程共同操作数据而设计的。`AtomicInteger` 提供了适合并发场景的原子操作和可见性保证。

第一章只把它当作可靠的测试计数器。原子操作、竞态条件和内存可见性的完整原理会在共享状态章节展开。

# Java 并发 01·02：共享变量、竞态条件与 synchronized

第一章让一个工作线程完成任务；这一章让多个线程修改同一个对象，并解决“所有线程都执行了，结果却仍然不正确”的问题。

> 当前进度：已完成。普通 `value++` 曾在多线程测试中只保留 78,960/200,000 次更新；加入实例方法 `synchronized` 后，第二章达到 `3 passed, 0 failed`。4 道复习题已完成批改，其中第 3、4 题由 Codex 应要求补充答案。

## 本章目标

- 理解什么是共享可变状态。
- 知道 `value++` 不是一个不可分割的动作。
- 能根据线程交错过程解释丢失更新。
- 区分 `join()` 的等待保证与 `synchronized` 的互斥保证。
- 使用 `synchronized` 实例方法保护临界区。
- 知道实例同步方法锁住的是当前对象 `this`。

## 从“两个线程共享同一个对象”开始

```java
SharedCounter counter = new SharedCounter();

Thread first = new Thread(counter::increment);
Thread second = new Thread(counter::increment);
```

两个线程各自拥有独立的调用栈，但它们保存的是同一个 `counter` 引用，因此会读写同一个 `value` 字段：

```text
first  ─┐
        ├─→ 同一个 SharedCounter 对象 ─→ value
second ─┘
```

“共享”本身不是错误。危险来自多个线程同时读写同一份可变数据，并且操作之间没有正确协调。

## `value++` 实际包含多个步骤

下面的代码看起来只有一行：

```java
value++;
```

但它至少包含这样的逻辑过程：

```text
1. 读取 value
2. 计算 value + 1
3. 把结果写回 value
```

线程可能在这些步骤之间被切换。假设初始值为 `10`：

| 时刻 | 线程 A | 线程 B | 共享 value |
| --- | --- | --- | --- |
| 1 | 读取到 10 |  | 10 |
| 2 |  | 读取到 10 | 10 |
| 3 | 计算出 11 |  | 10 |
| 4 |  | 计算出 11 | 10 |
| 5 | 写入 11 |  | 11 |
| 6 |  | 写入 11 | 11 |

两个线程都执行了一次加一，最终却只增加了 `1`。其中一次更新被覆盖，这叫作丢失更新。

如果程序的正确结果取决于多个线程不可预测的执行时序，就出现了竞态条件。

## `join()` 为什么不够

第一章中的 `join()` 保证调用者等待目标线程结束：

```text
启动多个 worker
→ worker 之间仍可能同时修改 value
→ main 对每个 worker 调用 join
→ main 最后读取已经完成的结果
```

它能保证 main 不会过早读取，却不会限制多个 worker 如何交错执行 `value++`。因此“所有线程都结束了”与“所有更新都正确保留了”是两个不同问题。

## 临界区与 synchronized

访问共享状态、并且不能被多个线程交错执行的代码区域叫临界区。本章的临界区就是计数加一。

Java 可以给实例方法加上 `synchronized`：

```java
public synchronized void increment() {
    value++;
}
```

线程进入这个方法前必须先获得当前对象的内置锁。对于同一个 `counter` 对象：

```text
线程 A 获得 counter 的锁并执行 increment
→ 线程 B 在入口等待
→ 线程 A 退出方法并释放锁
→ 线程 B 获得锁并执行 increment
```

这样一次完整的“读取、计算、写回”不会与另一次交错。

## 实例同步方法锁住哪个对象

实例方法中的 `synchronized` 锁住当前对象，也就是 `this`：

```text
counterA.increment() 锁住 counterA
counterB.increment() 锁住 counterB
```

两个线程调用同一个 `counterA` 的同步方法会互斥；分别调用 `counterA` 和 `counterB` 时使用的是两把不同的锁，不会因为方法名相同就互相等待。

锁不仅影响同一个方法。只要其他同步代码也使用同一个对象作为锁，它们就参与同一套互斥关系。

## 第二章源码结构

```text
courses/java/src/main/java/study/concurrency/
└─ SharedCounter.java

courses/java/src/test/java/study/concurrency/
└─ SharedCounterTest.java
```

测试分成三个层次：

1. 单线程调用一次 `increment()` 后得到 `1`。
2. `increment()` 明确使用实例内置锁。
3. 4 个线程各自增加 50,000 次后，不丢失任何更新。

第二项会检查方法是否声明了 `synchronized`，因为第三项中的竞态具有调度不确定性：错误实现通常会丢失更新，但不能把“这一次恰好发生竞态”当成唯一证据。

## 检查点一：观察起点并追踪交错

运行：

```bash
npm run java:compile
npm run java:test:chapter-02
```

预期结果：

```text
Java chapter 02: 0 passed, 3 failed
```

源码能够编译，是因为抛出 `UnsupportedOperationException` 仍然是合法方法体；测试失败表示行为尚未完成。

在修改代码前，先回答本章第一个问题：如果 `value` 初始为 `10`，两个线程都执行了一次 `value++`，为什么结果可能是 `11` 而不是 `12`？请按读取、计算、写回的顺序描述。

## 检查点二：先完成单线程行为

打开 `SharedCounter.java`，只让 `increment()` 完成字段加一，暂时不要添加 `synchronized`。

再次运行：

```bash
npm run java:test:chapter-02
```

此时单线程测试应通过，锁检查仍会失败；多线程结果通常也会失败。由于线程调度不确定，多线程行为测试的单次结果可能变化，但锁检查不会依赖运气。

观察之后，说明为什么第一项测试通过仍不能证明这个计数器适合多线程共享。

## 检查点三：保护临界区

为 `increment()` 实例方法添加本章介绍的同步修饰符，不需要修改方法体中的加一表达式，也不要把字段换成 `AtomicInteger`。

完成后运行：

```bash
npm run java:test:chapter-02
npm run java:test
```

章节测试应为 `3 passed, 0 failed`；完整 Java 测试还应同时保留第一章的通过结果。

## 本章暂不处理

- `synchronized` 代码块与自定义锁对象。
- 多个锁之间形成的死锁。
- `volatile` 的可见性规则。
- `Lock`、原子类和线程池。
- 高并发计数器的性能选择。

这些内容需要先建立“共享状态、临界区和互斥”三者的关系，再逐章展开。

## 完成标准

- 能把 `value++` 展开为读取、计算和写回。
- 能用一次线程交错解释丢失更新。
- 能解释 `join()` 与 `synchronized` 解决的是不同问题。
- 知道实例同步方法锁住 `this`。
- 第二章测试达到 `3 passed, 0 failed`，完整 Java 测试全部通过。
- 完成 [第二章复习题](../../review_questions/01-concurrency/02-shared-state-race-and-synchronized.md)。

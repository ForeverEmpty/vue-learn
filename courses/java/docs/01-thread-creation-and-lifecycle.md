# Java 第一章：线程创建与生命周期

这一章先建立最小多线程闭环：在 main 线程中创建一个工作线程，让工作线程执行任务，并让 main 线程等待它完成。

## 本章目标

- 区分进程、线程、并发和并行。
- 知道 main 方法本身已经运行在 main 线程中。
- 区分 `Runnable`、`Thread`、`run()` 和 `start()`。
- 理解创建 `Thread` 对象不等于启动线程。
- 使用 `join()` 等待工作线程结束。
- 观察 `NEW`、`RUNNABLE`、`TIMED_WAITING` 和 `TERMINATED` 等状态。
- 能读懂一个不依赖 JUnit 的最小 Java 测试运行器。

## 先建立正确的关系

一个运行中的 Java 程序至少有一个进程，JVM 在进程中管理多个线程。

```text
Java 进程
├─ main 线程：从 main 方法开始执行
└─ worker 线程：由我们创建，用来执行另一段任务
```

- 并发：多个任务在同一段时间内都在推进，不保证同一时刻真的同时执行。
- 并行：多个任务在同一时刻分别由不同 CPU 核心执行。

本章代码只能证明出现了两个线程，不能仅凭输出顺序证明它们一定并行。

## Runnable 与 Thread 的职责

```java
Runnable printTask = () -> {
    System.out.println(Thread.currentThread().getName());
};
```

这段代码只创建了一个任务对象，没有创建或启动新线程。如果直接调用：

```java
printTask.run();
```

任务会由当前调用它的线程执行。

把任务交给 Thread：

```java
Thread worker = new Thread(printTask, "chapter-01-worker");
```

此时只创建了 Java 对象。`worker.getState()` 应为 `NEW`，任务还没有执行。

## run() 与 start() 不能混淆

```java
worker.run();
```

这是一次普通方法调用，不会创建新的执行路线；哪个线程调用 `run()`，任务就在哪个线程上执行。

```java
worker.start();
```

`start()` 请求 JVM 启动新线程。新线程准备好后，JVM 会让它执行 `run()` 中的任务。

可以记成：

```text
直接 run  = 当前线程执行普通方法
调用 start = JVM 启动新线程，新线程再执行 run
```

同一个 `Thread` 对象只能成功 `start()` 一次。线程结束后不能再次启动；要再次执行，需要创建新的 `Thread` 对象。

## start() 不会等待任务结束

```java
worker.start();
System.out.println("main 继续执行");
```

`start()` 的职责是发出启动请求，它不会等 worker 完成。之后 main 与 worker 的先后顺序由调度决定。

如果 main 必须等 worker 完成，再继续下一步，需要：

```java
worker.join();
```

这里是 main 线程调用 `worker.join()`，所以含义是：

```text
main 线程暂停在 join
→ 等待 worker 结束
→ worker 状态成为 TERMINATED
→ main 线程从 join 后面继续
```

`join()` 不会让 worker 启动，因此正确顺序必须是先 `start()`，再 `join()`。

## 第一章的源码结构

```text
courses/java/src/main/java/study/concurrency/
├─ ThreadBasics.java          你要完成的两个方法
└─ ConcurrencyCourseApp.java  完成后用于观察输出

courses/java/src/test/java/study/concurrency/
└─ ThreadBasicsTest.java      已提前建立的学习测试
```

为什么包名写成：

```java
package study.concurrency;
```

因为源码路径是 `study/concurrency`。Java 通常让包名与目录结构保持一致，类的完整名称就是：

```text
study.concurrency.ThreadBasics
```

## 检查点一：只观察起点

先编译：

```bash
npm run java:compile
```

预期编译成功。`UnsupportedOperationException` 是合法实现，所以不会造成编译失败。

再运行测试：

```bash
npm run java:test
```

起点预期：

```text
Java chapter 01: 0 passed, 2 failed
```

两个失败分别代表：

1. `createWorker` 还没有返回一个尚未启动的线程。
2. `startAndWait` 还没有启动线程并等待它结束。

先回答：为什么源码能编译，测试却失败？编译器与测试分别检查什么？

## 检查点二：只创建线程

打开：

```text
courses/java/src/main/java/study/concurrency/ThreadBasics.java
```

只修改 `createWorker`，暂时不要处理第二个方法。

你已经拥有两个参数：

| 参数 | 类型 | 含义 |
| --- | --- | --- |
| `workerName` | `String` | 新线程的名称 |
| `task` | `Runnable` | 新线程以后要执行的任务 |

需要寻找的构造方法形状是：

```java
new Thread(Runnable任务, String名称)
```

你的方法需要返回这个新建对象，但不要调用 `start()`。测试会检查：

- 名称等于 `workerName`。
- 状态仍为 `Thread.State.NEW`。
- `task` 的执行次数仍为 0。

推荐变量名：

| 含义 | 推荐名称 |
| --- | --- |
| 新建的工作线程 | `worker` |
| 工作线程名称 | `workerName` |
| 要执行的任务 | `task` |

完成后运行 `npm run java:test`。预期变为 `1 passed, 1 failed`。

## 检查点三：启动并等待

只修改 `startAndWait`。

这个方法收到已经创建但尚未启动的 `worker`。按顺序完成两件事：

```text
1. 请求 JVM 启动 worker
2. 当前调用线程等待 worker 结束
```

你需要使用本章介绍的两个 `Thread` 实例方法。不要调用 `worker.run()`，也不要用 `Thread.sleep()` 猜测任务何时完成。

为什么签名已经包含：

```java
throws InterruptedException
```

因为等待方法可能让当前线程进入等待状态，而等待可能被中断。当前检查点允许异常继续交给调用者处理。

完成后再次运行测试，预期 `2 passed, 0 failed`；再执行：

```bash
npm run java:run
```

你应该看到 main 线程名、worker 线程名以及最终 `TERMINATED` 状态。

## 测试为什么不使用 JUnit

当前 `ThreadBasicsTest` 自己提供了三件事：

```text
main 方法       → 测试程序入口
runCase         → 分别运行测试并捕获失败
assertEquals    → 比较期望值与实际值
```

这样现在只需 JDK 21 就能运行。等开始较大的 Java 项目后，再独立学习 Maven 或 Gradle 与 JUnit，不会把“线程为什么工作”和“构建工具怎么配置”混成一个问题。

## 本章暂不处理

- 多个线程同时修改共享变量。
- `synchronized`、锁和死锁。
- `volatile` 与 Java 内存模型。
- 中断后的完整恢复策略。
- 线程池、虚拟线程和结构化并发。

这些内容都依赖本章的线程创建、状态和等待关系，后续会逐步加入。

## 完成标准

- 能解释 `Runnable` 与 `Thread` 的职责区别。
- 能解释直接调用 `run()` 为什么没有新线程。
- `createWorker` 创建线程但不提前启动。
- `startAndWait` 先启动，再等待结束。
- Java 第一章 2 个测试通过。
- 完成 [第一章复习题](../review_questions/01-thread-creation-and-lifecycle.md)。

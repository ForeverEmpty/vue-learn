# Java 21 并发学习目录

本目录只记录 Java 课程，不混入 Vue 章节状态。当前 Java 是支线，Vue 仍是主要学习路线。

## 基础复习

| 编号 | 内容 | 作用 |
| --- | --- | --- |
| 00 | [Java 基础快速复习](./00-foundation-review.md) | 复习类、静态方法、函数式接口、lambda 与异常 |

## 多线程主课程

| 章节 | 内容 | 状态 | 核心问题 |
| --- | --- | --- | --- |
| 01 | [线程创建与生命周期](./01-thread-creation-and-lifecycle.md) | 待开始 | `Thread` 对象何时真正启动，怎样等待工作线程完成？ |

## 后续路线

1. 共享变量、竞态条件与 `synchronized`。
2. `wait`、`notify` 与线程协作。
3. `volatile` 与 Java 内存模型的可见性。
4. `Lock`、`Condition` 和原子类。
5. 线程池、`ExecutorService`、`Future` 与 `CompletableFuture`。
6. 并发集合与常见并发设计。

章节会根据理解难度调整检查点和复习题数量，不固定每章题数。

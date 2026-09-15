# Java 21：并发编程

这是独立的 Java 学习区。当前仍以 Vue 为主线，Java 作为支线推进；Java 的章节状态、源码和测试不会写入 Vue README。

## 学习起点

- 不把基础语法设为固定前置课程，直接从正式章节开始。
- 学习中如果出现必要的前置知识，就临时进入对应的基础知识章；基础知识章不安排复习题。
- 正式第一章是“线程创建与生命周期”。
- 当前使用本机 Java 21 LTS 与原生 `javac`。
- 暂不引入 Maven、Gradle 和 JUnit，先看清编译、线程与测试本身。

## 目录

```text
courses/java/
  docs/
    00-foundation/  按需插入的 Java 基础小章
    01-concurrency/ Java 并发主课程
  src/main/java/    课程源码
  src/test/java/    不依赖第三方库的学习测试
  scripts/          编译、运行和测试脚本
  review_questions/
    01-concurrency/ 并发章节的复习题与批改
```

## 当前章节

1. [第一章：线程创建与生命周期](./docs/01-concurrency/01-thread-creation-and-lifecycle.md) 已完成。
2. [第二章：共享变量、竞态条件与 synchronized](./docs/01-concurrency/02-shared-state-race-and-synchronized.md) 已完成。
3. [第三章：wait、notifyAll 与有界缓冲区](./docs/01-concurrency/03-wait-notify-and-bounded-buffer.md) 已完成：7 项实现测试全部通过，6 道复习题已完成修正复核。
4. 本章按需补充了无复习题的 [00·07：泛型与 Deque、List](./docs/00-foundation/07-generics-and-deque.md)、[00·08：AtomicReference](./docs/00-foundation/08-atomic-reference.md)，并扩充 [00·03：@FunctionalInterface 与 lambda](./docs/00-foundation/03-runnable-functional-interface-and-lambda.md)。
5. 为独立的 Spring 课程按需增加了 [00·09：注解与元注解](./docs/00-foundation/09-annotations-and-meta-annotations.md)、[00·10：record](./docs/00-foundation/10-record-data-carriers.md)、[00·11：Optional](./docs/00-foundation/11-optional.md) 和 [00·12：Stream、filter 与 findFirst](./docs/00-foundation/12-stream-filter-and-find-first.md)；这些仍属于 Java 语言基础，不计入 Spring 正式章节。
6. Spring Boot 第二章继续按需增加 [00·13：record 紧凑构造器与对象不变量](./docs/00-foundation/13-record-compact-constructor-and-invariants.md)，用于在配置进入业务代码前固定有效条件。

## 命令

在仓库根目录执行：

```bash
npm run java:compile  # 只编译，起点应成功
npm run java:run      # 运行第一章的线程创建演示
npm run java:test     # 运行当前全部 Java 章节测试
npm run java:test:chapter-02  # 只运行第二章测试
npm run java:test:chapter-03  # 只运行第三章测试
```

生成的 `.class` 文件位于 `courses/java/.build/`，不会提交到 Git。

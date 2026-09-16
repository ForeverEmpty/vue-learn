# Java 21：核心机制与高级应用

这是与 Vue、Spring 同级的独立 Java 学习区。课程不再限定为并发编程：并发是第一个已经完成的正式模块，后续将继续学习反射、注解元数据、动态代理、泛型类型系统、I/O/NIO、JVM、类加载、SPI 与模块化等高级主题。

课程目标不是罗列 API，而是通过逐步扩展的程序理解 Java 的运行机制，并把这些机制组合成可以解释、调试和维护的实际工具。

## 课程边界

- `00-foundation/` 保存按需补充的语言基础，每个知识点独立成章，不自动设置复习题。
- 正式模块负责完整的机制、实现检查点、综合应用和复习题。
- 已完成的并发代码继续位于 `study.concurrency`，未来模块使用各自独立包，例如 `study.reflection`。
- Java 课程不依赖 Spring；反射、注解和代理会先用纯 Java 实现，再帮助理解框架为何能够工作。
- 测试用于自动验收程序行为；复习题不考测试框架，除非学习者主动要求。

## 课程结构

```text
courses/java/
  docs/
    00-foundation/                 按需插入的 Java 基础小章
    01-concurrency/                线程、共享状态与协作（已完成）
    02-reflection-and-metaprogramming/
                                   反射、运行时注解、动态代理与迷你容器（下一模块）
  src/main/java/study/
    concurrency/                   已完成的并发源码
    reflection/                    后续反射模块源码
  src/test/java/study/             不依赖第三方测试框架的行为验收
  scripts/                         编译、运行和测试脚本
  review_questions/                正式章节复习题与批改
```

后续模块会在真正开启时创建目录和起始代码，不提前堆放空章节。

## 当前进度

### 00 · 基础查询

已经按学习需要积累 15 个独立主题，包括函数式接口、异常与中断、泛型集合、原子类、注解、record、Optional、Stream、并发 Map 和正则表达式。它们仍是整个 Java 课程共享的查询手册，不只服务于并发模块。

### 01 · 线程、共享状态与协作

1. [01·01：线程创建与生命周期](./docs/01-concurrency/01-thread-creation-and-lifecycle.md)——已完成。
2. [01·02：共享变量、竞态条件与 synchronized](./docs/01-concurrency/02-shared-state-race-and-synchronized.md)——已完成。
3. [01·03：wait、notifyAll 与有界缓冲区](./docs/01-concurrency/03-wait-notify-and-bounded-buffer.md)——已完成。

本模块形成了最小并发基础：创建线程 → 识别竞态 → 使用对象锁 → 根据条件等待和通知。`volatile`、CAS、锁框架、线程池和异步编排会在后续“现代并发”模块中继续深化。

### 02 · 反射与运行时元编程

[模块路线](./docs/02-reflection-and-metaprogramming/README.md)已经规划，尚未开启第一章。它会从 `Class<?>` 和运行时类型信息开始，逐步进入成员访问、运行时注解、动态代理，最终组合成一个纯 Java 迷你对象容器。

## 完整高级路线

| 模块 | 主题 | 状态 | 综合应用方向 |
| --- | --- | --- | --- |
| 00 | 按需基础查询 | 持续扩充 | 为正式模块补齐最小前置知识 |
| 01 | 线程、共享状态与协作 | 前三章已完成 | 有界生产者—消费者缓冲区 |
| 02 | 反射、注解元数据与动态代理 | 下一模块 | 迷你对象容器与方法拦截链 |
| 03 | 泛型类型系统与可复用 API | 规划中 | 类型安全注册表、通配符与运行时 `Type` |
| 04 | 现代并发与异步编排 | 规划中 | JMM、`volatile`、CAS、Lock、线程池、Future |
| 05 | I/O、NIO 与网络编程 | 规划中 | 文件处理流水线、Channel/Buffer 与基础 Socket |
| 06 | JVM、类加载与诊断 | 规划中 | 类加载隔离、内存与 GC、字节码和运行诊断 |
| 07 | 扩展机制与工程集成 | 规划中 | `ServiceLoader`、SPI、JPMS、JDBC 与插件化 |

路线可以根据实际理解调整顺序，但每个正式章节必须建立在已掌握机制之上，并产生可以运行和观察的结果。

## 正式章节设计标准

- 常规章节安排约 4～6 个递进检查点，不把一两行修改包装成整章。
- 推进顺序优先采用“建立基础行为 → 暴露真实限制 → 引入机制 → 处理失败边界 → 综合应用”。
- 每章至少包含一项需要多个方法或对象协作的任务，并让自动验收随检查点逐步改善。
- 新的语言前置知识进入 `00-foundation/`；新的设计思想或模式在首次使用处单独详细解释。
- 复习题可以是理论题、编程题或混合题。编程题通常聚焦 1～3 个函数或约 10～40 行核心代码，避免过少或过量。

## 命令

在仓库根目录执行：

```bash
npm run java:compile
npm run java:run
npm run java:test
npm run java:test:chapter-01
npm run java:test:chapter-02
npm run java:test:chapter-03
```

当前脚本会自动发现 `src/main/java` 和 `src/test/java` 下的 Java 文件，因此未来模块可以继续使用同一套编译与验收入口。生成的 `.class` 文件位于 `courses/java/.build/`，不会提交到 Git。

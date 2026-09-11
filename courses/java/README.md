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
2. 三个实现检查点和 4 道复习题均已通过，测试为 `2 passed, 0 failed`。
3. [00. Java 基础补充](./docs/00-foundation/README.md) 仅在遇到相关卡点时按需进入；每个知识点独立成章，且不设置复习题。

## 命令

在仓库根目录执行：

```bash
npm run java:compile  # 只编译，起点应成功
npm run java:run      # 运行演示；完成本章实现前会抛出 TODO 异常
npm run java:test     # 运行第一章测试；起点预期 2 个失败
```

生成的 `.class` 文件位于 `courses/java/.build/`，不会提交到 Git。

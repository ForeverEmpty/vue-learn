# Java 21：并发编程

这是独立的 Java 学习区。当前仍以 Vue 为主线，Java 作为支线推进；Java 的章节状态、源码和测试不会写入 Vue README。

## 学习起点

- 基础语法只做快速复习，不重新从变量和循环开始。
- 正式第一章是“线程创建与生命周期”。
- 当前使用本机 Java 21 LTS 与原生 `javac`。
- 暂不引入 Maven、Gradle 和 JUnit，先看清编译、线程与测试本身。

## 目录

```text
courses/java/
  src/main/java/    课程源码
  src/test/java/    不依赖第三方库的学习测试
  scripts/          编译、运行和测试脚本
docs/               教学文档
review_questions/    复习题与批改
```

## 当前章节

1. 先阅读 [Java 基础快速复习](./docs/00-foundation-review.md)。
2. 再开始 [第一章：线程创建与生命周期](./docs/01-thread-creation-and-lifecycle.md)。
3. 第一章测试已提前建立，起点预期为 `0 passed, 2 failed`。

## 命令

在仓库根目录执行：

```bash
npm run java:compile  # 只编译，起点应成功
npm run java:run      # 运行演示；完成本章实现前会抛出 TODO 异常
npm run java:test     # 运行第一章测试；起点预期 2 个失败
```

生成的 `.class` 文件位于 `courses/java/.build/`，不会提交到 Git。

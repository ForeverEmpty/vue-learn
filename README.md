# Programming Study Lab

这是一个多语言学习仓库。根目录只负责提供课程入口和通用命令；每门课程的进度、路线、文档和复习题都放在自己的学习区，避免不同语言互相混杂。

## 学习入口

| 优先级 | 课程 | 入口 | 当前定位 |
| --- | --- | --- | --- |
| 主线 | TypeScript / Vue：Mini Vue | [Vue 学习区](./courses/vue/README.md) | 当前主要学习内容 |
| 支线 | Java 21：并发编程 | [Java 学习区](./courses/java/README.md) | 基础只做快速复习，从多线程开始 |
| 后端 | Spring / Spring Boot | [Spring 学习区](./courses/spring/README.md) | 独立推进 Spring Boot、Web 与后端工程知识 |

## 通用目录

```text
courses/             每门课程各自的 README、源码与工具入口
courses/vue/
  docs/              Vue / TypeScript 教学文档
  review_questions/  Vue 复习题与批改
  packages/          Mini Vue 源码和测试
courses/java/
  docs/              Java 教学文档
  review_questions/  Java 复习题与批改
  src/               Java 源码和学习测试
  scripts/           Java 编译、运行和测试脚本
courses/spring/
  docs/              Spring / Spring Boot 教学文档
  review_questions/  Spring 正式章节复习题与批改
  src/               标准 Maven / Spring Boot 课程工程
apps/learning-portal/
  src/pages/vue/     Vue 浏览器实验页
  src/pages/java/    Java 课程说明页
```

## 常用命令

```bash
# Vue 主线
npm run dev
npm run test:run
npm run typecheck
npm run vue:build

# Java 支线
npm run java:compile
npm run java:run
npm run java:test

# Spring Boot
npm run spring:compile
npm run spring:test
npm run spring:run

# 编译当前所有项目
npm run build
```

课程细节分别记录在 [Vue 学习区](./courses/vue/README.md)、[Java 学习区](./courses/java/README.md) 和 [Spring 学习区](./courses/spring/README.md)，根目录不混排各课程章节。

## 跨课程复习题约定

- 复习题优先检查理解迁移、执行过程、设计取舍、错误定位和边界分析，不重复要求背诵正文已经直接列出、并在实践中反复观察的简单事实。
- 理论问题只有在确实能检验机制理解时才使用；理论题不合适时，可以改用编程题，或采用理论与编程混合形式。
- 编程题应给出明确背景、修改范围和预期行为。通常控制在约 1～3 个聚焦函数或 10～40 行核心代码，并根据知识点调整，避免只有一两行的形式题，也避免演变成一个新的完整章节。
- 编程题优先采用变体实现、补全关键逻辑、代码审查、调试或小范围重构，不原样重复刚完成的章节代码。
- 每组题目覆盖不同能力，同一核心结论只考察一次；批改时保留原答案并在下方追加反馈。

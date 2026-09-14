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

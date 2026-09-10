# TypeScript / Vue：Mini Vue

这是当前主要学习路线：使用原生 TypeScript 从零实现 Mini Vue，通过源码、Vitest 和浏览器实验理解 Vue 核心机制。

## 当前进度

- 响应式第 1～20 章已经完成，第 20 章实现了 Map/Set 集合响应式。
- 第 21 章“watch 数据源标准化与多数据源”进行中，起点为 18 项测试中 4 项通过、14 项待实现。
- 本章之后继续处理 watcher 控制、reactive ref 自动解包和最终边界审查；不因单章通过就直接宣布整个响应式模块无缺陷。
- 完成响应式模块后，才进入 VNode、renderer 和组件运行时。
- `00. JS/TS 基础` 已增加 00·06～00·09 类型系统路线，重点讲解联合类型、泛型、`keyof`、映射类型、条件类型、`infer`、类型守卫与重载；这些内容可按需穿插，不替代 Vue 主线。

## 专属入口

- 当前：[第 21 章 watch 数据源标准化与多数据源](./docs/01-reactivity/21-watch-sources.md)。
- 上一章：[第 20 章 Map/Set 集合响应式](./docs/01-reactivity/20-collection-reactivity.md)。
- [Vue 教学目录](./docs/README.md)
- [Vue 复习题目录](./review_questions/README.md)
- 框架源码：`courses/vue/packages/`
- 浏览器实验：`apps/learning-portal/src/pages/vue/`

## 命令

```bash
npm run dev
npm run test:run
npm run typecheck
npm run vue:build
```

第 20 章完成时的稳定基线为 Vue 全量 235 项通过；第 21 章起点新增 18 项目标测试，其中 4 项通过、14 项失败：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts
npm run test:run
```

这里不记录 Java 的章节状态；Java 内容统一放在 [Java 学习区](../java/README.md)。

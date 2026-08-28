# TypeScript / Vue：Mini Vue

这是当前主要学习路线：使用原生 TypeScript 从零实现 Mini Vue，通过源码、Vitest 和浏览器实验理解 Vue 核心机制。

## 当前进度

- 响应式第 1～13 章已经完成，下一章将继续学习 shallow 响应式工具。
- 响应式模块尚未结束；后续继续 readonly、shallow、raw、ref 和 watch 能力。
- 完成响应式模块后，才进入 VNode、renderer 和组件运行时。

## 专属入口

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

这里不记录 Java 的章节状态；Java 内容统一放在 [Java 学习区](../java/README.md)。

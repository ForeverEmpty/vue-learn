# TypeScript / Vue：Mini Vue

这是当前主要学习路线：使用原生 TypeScript 从零实现 Mini Vue，通过源码、Vitest 和浏览器实验理解 Vue 核心机制。

## 当前进度

- 响应式第 1～20 章已经完成，第 20 章实现了 Map/Set 集合响应式。
- 第 20 章的 27 项分组测试和 Vue 全量 235 项测试均已通过，复习题已批改。
- 下一步审查 watch 输入等剩余缺口；不因集合篇完成就直接宣布整个响应式模块无缺陷。
- 完成响应式模块后，才进入 VNode、renderer 和组件运行时。
- `00. JS/TS 基础` 已增加 00·06～00·09 类型系统路线，重点讲解联合类型、泛型、`keyof`、映射类型、条件类型、`infer`、类型守卫与重载；这些内容可按需穿插，不替代 Vue 主线。

## 专属入口

- 已完成：[第 20 章 Map/Set 集合响应式](./docs/01-reactivity/20-collection-reactivity.md)。下一步进行响应式模块收尾审查。
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

当前验证基线为第 20 章 27 项通过、Vue 全量 235 项通过：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/collection-reactivity.test.ts
npm run test:run
```

这里不记录 Java 的章节状态；Java 内容统一放在 [Java 学习区](../java/README.md)。

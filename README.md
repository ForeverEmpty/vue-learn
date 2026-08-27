# Mini Vue Study

使用原生 TypeScript 从零学习 Vue 核心机制。仓库采用简化的 Vue 分包结构，框架源码、浏览器实验场和教学文档彼此分离。

## 开始学习

- 最近完成：[第十一章：响应式数组的索引与 length](./doc/01-reactivity/11-reactive-array-length.md)
- 已完成基础补充：[00. JS/TS 基础 - 01. Promise](./doc/00-js-ts/01-promise-basics.md)
- 已完成基础补充：[00. JS/TS 基础 - 02. 原型与属性归属](./doc/00-js-ts/02-prototype-and-property-ownership.md)
- 已完成基础补充：[00. JS/TS 基础 - 03. call、apply 与 bind](./doc/00-js-ts/03-call-apply-bind.md)
- 已完成基础补充：[00. JS/TS 基础 - 04. this 的指向](./doc/00-js-ts/04-this-binding.md)
- 完整课程目录：[doc/README.md](./doc/README.md)
- 复习题与批改记录：[review_questions/README.md](./review_questions/README.md)
- 浏览器实验：运行 `npm run dev` 后从 playground 目录进入对应章节。

## 项目结构

```text
packages/
  shared/       公共工具
  reactivity/   响应式源码与测试
  vue/          mini-vue 统一入口
playground/     浏览器实验项目
doc/            课程文档
review_questions/ 复习题、答案与批改记录
```

## 常用命令

```bash
npm run dev        # 启动 playground
npm run test:run   # 运行一次测试
npm run typecheck  # 检查 TypeScript
npm run build      # 构建 playground
```

`npm run dev` 打开的首页是 playground 学习目录。点击章节卡片可进入对应测试页，也可以通过页面顶部链接返回目录。

第 1～11 章已经完成。当前仍处于响应式模块，数组方法插桩、readonly 等能力会在后续章节继续处理。

# Mini Vue Study

使用原生 TypeScript 从零学习 Vue 核心机制。仓库采用简化的 Vue 分包结构，框架源码、浏览器实验场和教学文档彼此分离。

## 开始学习

- 最近完成：[第五章：深层 reactive 与 Proxy 缓存](./doc/01-reactivity/05-deep-reactive-cache.md)
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

第五章已经完成，当前测试全部通过。下一章开始时会在课程目录、复习题目录和 playground 中同时加入新的学习入口。

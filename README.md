# Mini Vue Study

使用原生 TypeScript 从零学习 Vue 核心机制。仓库采用简化的 Vue 分包结构，框架源码、浏览器实验场和教学文档彼此分离。

## 开始学习

课程目录位于 [doc/README.md](./doc/README.md)，当前章节是 [ref 与 effect](./doc/01-reactivity/01-ref-and-effect.md)。

## 项目结构

```text
packages/
  shared/       公共工具
  reactivity/   响应式源码与测试
  vue/          mini-vue 统一入口
playground/     浏览器实验项目
doc/            课程与复习笔记
```

## 常用命令

```bash
npm run dev        # 启动 playground
npm run test:run   # 运行一次测试
npm run typecheck  # 检查 TypeScript
npm run build      # 构建 playground
```

`npm run dev` 打开的首页是 playground 学习目录。点击章节卡片可进入对应测试页，也可以通过页面顶部链接返回目录。

当前正在学习第三章，因此测试中保留了两个关于嵌套 effect 和异常恢复的预期失败用例。它们是本章学习目标，不代表项目安装失败。

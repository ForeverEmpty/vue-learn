# Mini Vue 学习目录

这里存放所有课程、练习目标和复习材料。课程按“模块编号/章节编号”排列，建议按顺序学习。

## 当前课程

| 模块 | 章节 | 状态 | 核心问题 |
| --- | --- | --- | --- |
| 响应式 | [01. ref 与 effect](./01-reactivity/01-ref-and-effect.md) | 已完成 | 数据改变后，怎样让使用它的函数重新执行？ |
| 响应式 | [02. effect 重新执行与依赖清理](./01-reactivity/02-effect-cleanup.md) | 已完成 | effect 的依赖发生变化时，怎样删除旧关系并收集新关系？ |
| 响应式 | [03. 嵌套 effect、effect 栈与异常恢复](./01-reactivity/03-effect-stack.md) | 已完成 | 内层 effect 或异常打断执行时，怎样恢复正确的 activeEffect？ |
| 响应式 | [04. 使用 Proxy 实现浅层 reactive](./01-reactivity/04-reactive-proxy.md) | 已完成 | 怎样把依赖精确关联到某个对象的某个属性？ |
| 响应式 | [05. 深层 reactive 与 Proxy 缓存](./01-reactivity/05-deep-reactive-cache.md) | 已完成 | 怎样让嵌套对象响应式且保持 Proxy 身份稳定？ |
| 响应式 | [06. computed 的缓存与失效](./01-reactivity/06-computed.md) | 已完成 | 派生值怎样惰性计算、缓存并在依赖变化后失效？ |
| 响应式 | [07. watch 的新旧值与调度隔离](./01-reactivity/07-watch-scheduler.md) | 已完成 | 怎样只追踪 source，并在收集阶段之外安全执行 callback？ |
| 响应式 | [08. effect 生命周期与 stop](./01-reactivity/08-effect-lifecycle.md) | 已完成 | 怎样让 effect 可以手动执行、停止订阅，并保持停止后的状态一致？ |
| 响应式 | [09. scheduler 队列与 nextTick](./01-reactivity/09-scheduler-next-tick.md) | 已完成 | 怎样把同步触发合并成微任务刷新，并在刷新后读取最新状态？ |
| 响应式 | [10. reactive 对象结构操作](./01-reactivity/10-reactive-object-operations.md) | 已完成 | 怎样追踪 in、Object.keys、属性新增和删除？ |
| 响应式 | [11. 响应式数组的索引与 length](./01-reactivity/11-reactive-array-length.md) | 已完成 | 数组索引和 length 相互改变时，怎样通知所有受影响的依赖？ |
| 响应式 | [12. 数组方法的身份处理与依赖暂停](./01-reactivity/12-reactive-array-methods.md) | 已完成 | 怎样统一 raw/Proxy 搜索身份，并阻止修改方法收集内部依赖？ |
| 响应式 | [13. readonly 与代理身份工具](./01-reactivity/13-readonly-and-proxy-identity.md) | 已完成 | 怎样提供深层只读视图，并区分 raw、reactive 与 readonly？ |

对应的答题与批改记录保存在 [Vue 复习题目录](../review_questions/README.md)。

## JS/TS 基础补充

`00. JS/TS 基础` 是独立的语言基础大章节，不改变 Mini Vue 主课程的章节顺序。大章节编号 `00` 表示基础模块。

| 大章节 | 课程 | 状态 | 当前用途 |
| --- | --- | --- | --- |
| 00. JS/TS 基础 | [01. Promise 基础](./00-js-ts/01-promise-basics.md) | 已完成 | 理解第九章的微任务安排与 `currentFlushPromise`。 |
| 00. JS/TS 基础 | [02. 原型与属性归属](./00-js-ts/02-prototype-and-property-ownership.md) | 已完成 | 理解第十章判断自有属性的原型基础。 |
| 00. JS/TS 基础 | [03. call、apply 与 bind](./00-js-ts/03-call-apply-bind.md) | 已完成 | 理解 `hasOwnProperty.call` 使用的函数调用机制。 |
| 00. JS/TS 基础 | [04. this 的指向](./00-js-ts/04-this-binding.md) | 已完成 | 理解普通函数、箭头函数和显式绑定的 this 规则。 |

## 响应式模块状态

第 1～13 章已经完成。响应式模块仍未全部完成；只有模块内的 shallow、ref 工具和 watch 能力都完成后，才会进入下一个模块。

## 响应式模块后续章节

以下内容会在第十章之后继续补齐：

1. shallowReactive 与 shallowReadonly。
2. ref 工具函数与对象转换。
3. watch 的 immediate、deep、清理和停止监听。

## 后续模块

响应式模块完成后，运行时模块从 `02-runtime` 开始，文档放在 `courses/vue/docs/02-runtime`，复习题放在 `courses/vue/review_questions/02-runtime`：

1. VNode 与 `h()`。
2. DOM renderer 与更新。
3. 组件、props、slots 与生命周期。

## 推荐学习方式

需要新增源码、测试、文档或 Playground 文件时，由 Codex 提前创建路径正确且能通过类型检查的基础骨架；学习者只填写当前检查点要求的核心逻辑。

每一章按下面的顺序进行：

1. 阅读“目标”和“为什么需要它”。
2. 运行 playground，先观察当前错误行为。
3. 阅读必要的语言知识和少量示例代码。
4. 自己完成本章任务。
5. 运行测试，把失败信息当作线索。
6. 将实现交给 Codex 审查和补充测试。
7. 全部通过后，用自己的话写一段总结再进入下一章。

## 复习时重点回答

- 这个功能解决了什么问题？
- 数据结构中保存了什么信息？
- 一次调用从入口到结束经过了哪些步骤？
- 哪些边界情况会让简单实现出错？
- 测试为什么能够证明实现有效？

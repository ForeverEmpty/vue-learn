# Vue / TypeScript 复习题目录

这里存放每一章的复习题、你的答案和批改结果。目录结构与 `doc` 保持一致。

| 模块 | 章节 | 状态 |
| --- | --- | --- |
| 响应式 | [01. ref 与 effect](./01-reactivity/01-ref-and-effect.md) | 已批改 |
| 响应式 | [02. effect 重新执行与依赖清理](./01-reactivity/02-effect-cleanup.md) | 已批改 |
| 响应式 | [03. 嵌套 effect、effect 栈与异常恢复](./01-reactivity/03-effect-stack.md) | 已批改 |
| 响应式 | [04. 使用 Proxy 实现浅层 reactive](./01-reactivity/04-reactive-proxy.md) | 已批改 |
| 响应式 | [05. 深层 reactive 与 Proxy 缓存](./01-reactivity/05-deep-reactive-cache.md) | 已批改 |
| 响应式 | [06. computed 的缓存与失效](./01-reactivity/06-computed.md) | 已批改 |
| 响应式 | [07. watch 的新旧值与调度隔离](./01-reactivity/07-watch-scheduler.md) | 已批改 |
| 响应式 | [08. effect 生命周期与 stop](./01-reactivity/08-effect-lifecycle.md) | 已批改 |
| 响应式 | [09. scheduler 队列与 nextTick](./01-reactivity/09-scheduler-next-tick.md) | 已批改 |
| 响应式 | [10. reactive 对象结构操作](./01-reactivity/10-reactive-object-operations.md) | 已批改 |
| 响应式 | [11. 响应式数组的索引与 length](./01-reactivity/11-reactive-array-length.md) | 已批改 |
| 响应式 | [12. 数组方法的身份处理与依赖暂停](./01-reactivity/12-reactive-array-methods.md) | 已批改 |

## 00. JS/TS 基础补充

| 小节 | 主题 | 状态 |
| --- | --- | --- |
| 01 | [Promise 基础](./00-js-ts/01-promise-basics.md) | 已批改 |
| 02 | [原型与属性归属](./00-js-ts/02-prototype-and-property-ownership.md) | 已批改 |
| 03 | [call、apply 与 bind](./00-js-ts/03-call-apply-bind.md) | 已批改 |
| 04 | [this 的指向](./00-js-ts/04-this-binding.md) | 已批改 |

## 后续约定

- 开始新章节时，Codex 会同时提前创建对应的复习题文件。
- 你直接在每道题下面填写答案，不需要自己创建文件。
- 章节实现完成后，Codex 会在原答案下面追加批改，保留你的原始回答。
- 批改完成后，本目录的状态会同步更新。
- 题目数量根据章节复杂度灵活决定，不再固定为 6 题；简单章节通常 3～4 题，复杂章节适当增加。
- 同一核心结论只考察一次，避免仅更换说法的重复问题。
- 一组题目尽量覆盖不同能力：解释原因、追踪执行过程、发现错误、比较设计方案或分析边界情况。
- 已由自动测试充分证明的简单事实不重复提问，复习题优先检查测试不容易证明的理解与推理。

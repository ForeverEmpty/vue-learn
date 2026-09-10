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
| 响应式 | [14. shallowReactive 与 shallowReadonly](./01-reactivity/14-shallow-reactivity.md) | 已完成 | 怎样只处理根层代理，同时保留嵌套 raw 对象？ |
| 响应式 | [15. markRaw 与跳过代理](./01-reactivity/15-mark-raw.md) | 已完成 | 怎样让指定对象与不可扩展对象保持 raw 身份？ |
| 响应式 | [16. ref 对象转换、shallowRef 与 triggerRef](./01-reactivity/16-ref-object-shallow-ref.md) | 已完成 | ref 怎样区分 raw 比较值、对外 Proxy 与浅层手动触发？ |
| 响应式 | [17. ref 工具链与可写 computed](./01-reactivity/17-ref-utilities-writable-computed.md) | 已完成 | 怎样桥接对象属性、自动解包 ref，并让 computed 反向写入？ |
| 响应式 | [18. watch 的 immediate、清理与停止](./01-reactivity/18-watch-lifecycle.md) | 已完成 | 怎样管理 watch 的首次执行、失效副作用和停止生命周期？ |
| 响应式 | [19. deep watch、watchEffect 与监听调度](./01-reactivity/19-deep-watch-effect.md) | 已完成 | 怎样追踪嵌套对象、实现 watchEffect 并控制回调时机？ |
| 响应式 | [20. Map/Set 集合响应式](./01-reactivity/20-collection-reactivity.md) | 已完成 | 怎样修正 receiver、分类集合依赖并接上 deep watch？ |
| 响应式 | [21. watch 数据源标准化与多数据源](./01-reactivity/21-watch-sources.md) | 进行中 | 怎样把 getter、ref、reactive 与多个 source 统一成一个内部协议？ |

对应的答题与批改记录保存在 [Vue 复习题目录](../review_questions/README.md)。

第 20 章的 27 项章节测试和复习题均已通过。第 21 章已创建起点骨架，目前按 1、2A、2B、3A、3B、3C、4 的顺序学习。

## JS/TS 基础补充

`00. JS/TS 基础` 是独立的语言基础大章节，不改变 Mini Vue 主课程的章节顺序。大章节编号 `00` 表示基础模块。

| 大章节 | 课程 | 状态 | 当前用途 |
| --- | --- | --- | --- |
| 00. JS/TS 基础 | [01. Promise 基础](./00-js-ts/01-promise-basics.md) | 已完成 | 理解第九章的微任务安排与 `currentFlushPromise`。 |
| 00. JS/TS 基础 | [02. 原型与属性归属](./00-js-ts/02-prototype-and-property-ownership.md) | 已完成 | 理解第十章判断自有属性的原型基础。 |
| 00. JS/TS 基础 | [03. call、apply 与 bind](./00-js-ts/03-call-apply-bind.md) | 已完成 | 理解 `hasOwnProperty.call` 使用的函数调用机制。 |
| 00. JS/TS 基础 | [04. this 的指向](./00-js-ts/04-this-binding.md) | 已完成 | 理解普通函数、箭头函数和显式绑定的 this 规则。 |
| 00. JS/TS 基础 | [05. Object.defineProperty 与属性描述符](./00-js-ts/05-object-define-property.md) | 已完成 | 理解第十五章的不可枚举 SKIP 内部标记。 |
| 00. JS/TS 基础 | [06. TypeScript 类型系统、联合类型与安全收窄](./00-js-ts/06-type-system-and-narrowing.md) | 已完成 | 区分编译时类型、运行时值与安全收窄。 |
| 00. JS/TS 基础 | [07. 泛型、约束、keyof 与索引访问](./00-js-ts/07-generics-keyof-indexed-access.md) | 已完成 | 理解类型参数怎样保存对象、键和值之间的关系。 |
| 00. JS/TS 基础 | [08. 映射类型、修饰符与工具类型](./00-js-ts/08-mapped-types-and-utilities.md) | 已完成 | 理解对象类型的批量转换规则。 |
| 00. JS/TS 基础 | [09. 条件类型、infer、类型守卫与重载](./00-js-ts/09-conditional-infer-overloads.md) | 已完成 | 理解第十七章使用的高级类型组合。 |

## 响应式模块状态

第 1～20 章已经完成，第 21 章正在补齐 watch 输入类型。之后继续处理 watcher 控制、reactive 中的 ref 自动解包，以及响应式模块的最终边界审查。不能只凭现有测试通过就宣布整个响应式模块完成；必修缺口补完后才进入下一个模块。

## 响应式模块后续章节

当前预计再用四章完成响应式主线，最终章会再次核对缺口，而不是机械按编号结束：

1. 第 21 章：watch 数据源标准化、直接监听 ref/reactive 与多个 source。
2. 第 22 章：数字 deep、`once`、pause/resume 与 watcher 清理控制。
3. 第 23 章：reactive 对象属性中的 ref 自动解包与赋值联动。
4. 第 24 章：目标分类、WeakMap/WeakSet、数组迭代器与模块最终审查。

`customRef` 和完整 `effectScope` 细节先列为进阶扩展；`effectScope` 也可以在组件卸载清理阶段结合运行时学习。

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

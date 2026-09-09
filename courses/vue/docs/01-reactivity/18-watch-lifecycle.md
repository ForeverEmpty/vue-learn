# 第十八章：watch 的 immediate、回调清理与停止监听

第七章已经实现了 watch 的最小闭环：执行 source 收集依赖，依赖变化后重新计算，并把 newValue、oldValue 交给 callback。现在要补齐 watch 的生命周期控制。

```ts
const stopWatch = watch(
  () => count.value,
  (newValue, oldValue, onCleanup) => {
    // 处理变化
  },
  { immediate: true },
)

stopWatch()
```

本章只处理三个相互关联的能力：首次是否执行、两次 callback 之间如何撤销旧副作用、调用者怎样结束整个 watch。

## 本章目标

- 用 `WatchOptions` 表达 `immediate` 选项。
- 理解 immediate 首次 callback 的 oldValue 为什么是 undefined。
- 让首次执行也通过 `watcherEffect.run()` 完成依赖收集。
- 使用 `onCleanup` 注册“下一次有效 callback 前”的清理函数。
- 区分 ReactiveEffect 的依赖清理与 watch callback 的用户副作用清理。
- 返回 `WatchStopHandle`，停止订阅并清理最后一次副作用。
- 保证重复停止不会重复清理。
- 保持第七章的变化比较、条件依赖与 callback 隔离行为。

## 1. watch 现在拥有哪几段生命周期

默认 watch：

```text
创建
→ 执行 source，收集依赖
→ 保存初始 oldValue
→ 不执行 callback

依赖变化
→ 重新执行 source
→ 结果真正变化时执行 callback
→ 保存新的 oldValue

停止
→ 从所有 dep 中移除 watcherEffect
```

immediate watch：

```text
创建
→ 执行 source，收集依赖并得到 newValue
→ 立即执行 callback(newValue, undefined, onCleanup)
→ 把 newValue 保存为后续 oldValue
```

它们的区别只在创建阶段；后续依赖变化的处理应该复用同一个 job。

## 2. 新增的公开类型

起点已经增加：

```ts
export type WatchCleanup = () => void
export type OnCleanup = (cleanup: WatchCleanup) => void

export interface WatchOptions {
  immediate?: boolean
}

export type WatchStopHandle = () => void
```

callback 现在接收第三个参数：

```ts
export type WatchCallback<T> = (
  newValue: T,
  oldValue: T | undefined,
  onCleanup: OnCleanup,
) => void
```

`oldValue` 包含 undefined，是因为 immediate 首次 callback 之前并不存在“上一次结果”。这不是数字 0、空字符串或 null，而是尚无旧值。

## 3. 为什么 immediate 不能直接调用 source

下面的写法看似简单：

```ts
if (options.immediate) {
  callback(source(), undefined, onCleanup)
}
```

但直接调用 source 时，没有 `ReactiveEffect.run()` 建立的 activeEffect 上下文，source 读取到的 ref 不会把 watcherEffect 收集为订阅者。结果是首次 callback 执行了，后续变化却无法通知 watch。

正确入口始终应该是：

```ts
watcherEffect.run()
```

它同时完成：

```text
清理旧依赖
→ 设置 activeEffect
→ 执行 source
→ 收集本次依赖
→ 恢复 activeEffect
→ 返回 source 结果
```

## 4. initialized 解决首次执行判断

仅比较：

```ts
hasChanged(newValue, oldValue)
```

不足以表达 immediate 的首次执行。例如 source 首次结果本身就是 undefined，`hasChanged(undefined, undefined)` 为 false，但 immediate 仍然必须执行 callback。

推荐增加状态：

```ts
let initialized = false
let oldValue: T | undefined
```

job 的判断意图是：

```text
尚未初始化
→ immediate 的首次 job，必须执行 callback

已经初始化
→ 只有 newValue 与 oldValue 不同时才执行 callback
```

可以先计算一个便于阅读的布尔值：

```ts
const shouldRunCallback =
  !initialized || hasChanged(newValue, oldValue)
```

若不需要单独变量，也可以用提前返回表达同样规则。

## 5. 默认与 immediate 如何共用 job

创建 watcherEffect 后分两条入口：

```text
options.immediate 为 true
→ 调用 job()
→ job 内部通过 watcherEffect.run() 取得首次 newValue
→ 因 initialized 为 false，执行 callback

options.immediate 不为 true
→ 只调用 watcherEffect.run()
→ 保存 oldValue
→ initialized = true
→ 不调用 callback
```

注意默认分支不能调用 job，因为 job 负责 callback；immediate 分支也不应先执行一次 watcherEffect.run 再调用 job，否则 source 会在创建阶段执行两次。

## 6. onCleanup 解决什么问题

callback 经常创建会持续一段时间的副作用：

- 定时器。
- 网络请求。
- 事件监听器。
- 与外部库建立的订阅。

假设每次搜索词变化都创建定时器：

```ts
watch(
  () => keyword.value,
  (newKeyword, _oldKeyword, onCleanup) => {
    const timer = setTimeout(() => {
      console.log(newKeyword)
    }, 500)

    onCleanup(() => {
      clearTimeout(timer)
    })
  },
)
```

当 keyword 很快从 A 变成 B 时，B 对应的 callback 开始前要先取消 A 的 timer，防止旧任务稍后产生过期结果。

## 7. onCleanup 不是立即执行

callback 调用：

```ts
onCleanup(cleanupFunction)
```

意思是“保存这个函数，等当前 callback 失效时再执行”，不是现在执行。

内部只需要一个清理槽位：

```ts
let cleanup: WatchCleanup | undefined

const onCleanup: OnCleanup = (cleanupFunction) => {
  cleanup = cleanupFunction
}
```

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 当前保存的用户清理函数 | `cleanup` |
| callback 传入的注册函数 | `onCleanup` |
| 用户本次传入的函数 | `cleanupFunction` |
| 统一执行清理的内部函数 | `runCleanup` |

## 8. 清理必须发生在正确时间

一次有效变化的正确顺序：

```text
重新运行 source 得到 newValue
→ 比较 newValue 与 oldValue
→ 结果没有变化：直接结束，不清理、不执行 callback
→ 结果发生变化：执行上一次 cleanup
→ 执行本次 callback
→ callback 注册下一次 cleanup
→ 保存本次 newValue 为 oldValue
```

为什么先比较再清理？因为依赖触发不等于 watch 结果改变。条件 source 切换到相同结果时，callback 没有失效，也就不应撤销它创建的副作用。

为什么 cleanup 在 callback 前？因为新 callback 即将取代旧 callback，旧副作用应先退出，避免新旧任务同时有效。

## 9. runCleanup 为什么先清空槽位

推荐把执行逻辑集中起来：

```ts
const runCleanup = () => {
  const cleanupFunction = cleanup
  cleanup = undefined
  cleanupFunction?.()
}
```

先清空、再调用有两个好处：

1. 同一个清理函数最多执行一次。
2. 即使清理函数内部间接引发新的流程，也不会再次拿到旧清理函数。

若先执行再清空，发生嵌套调用或异常时，槽位可能仍保存已经执行过的函数。

## 10. 两种 cleanup 不要混淆

本项目现在有两种名字相近但职责不同的清理：

```text
ReactiveEffect 的依赖清理
→ 删除 watcherEffect 与 ref/reactive dep 的订阅关系
→ 每次 watcherEffect.run() 前执行
→ 为条件分支重新收集依赖

watch callback 的用户清理
→ 撤销上一次 callback 创建的 timer、请求或监听
→ 下一次有效 callback 前执行
→ stopWatch() 时也执行最后一次
```

前者维护响应式依赖图，后者维护业务副作用。它们不能互相替代。

## 11. stop handle 的两个责任

watch 不再返回 void，而是返回函数：

```ts
const stopWatch = watch(source, callback)
stopWatch()
```

停止时要做两件事：

```text
watcherEffect.stop()
→ 从所有 dep 中移除 watcherEffect
→ 以后源变化不会再次调度 job

runCleanup()
→ 撤销最后一次 callback 留下的业务副作用
```

只停止 effect、不执行用户 cleanup，会让定时器或事件监听继续存在；只执行 cleanup、不停止 effect，下一次源变化又会执行 callback 并建立新副作用。

## 12. 为什么重复停止不能重复清理

调用者可能在多个生命周期出口重复调用 stopWatch：

```ts
stopWatch()
stopWatch()
```

`ReactiveEffect.stop()` 已经具有幂等性。只要 `runCleanup()` 在执行前把 cleanup 槽位置为 undefined，第二次停止就不会重复调用用户清理函数。

幂等表示：同一结束操作重复执行，不会继续产生新的效果。

## 13. 起点实现刻意缺少什么

当前 `watch.ts` 已经增加公开类型，但起点仍然：

- 忽略 options。
- 把 `ignoreCleanup` 传给 callback，注册行为不会保存。
- 返回空的停止函数。

这能让第七章已有行为继续通过，同时让第十八章的新测试准确暴露三个缺口。

## 检查点一：观察起点行为

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-lifecycle.test.ts
```

预期：

```text
4 passed
6 failed
```

全部测试当前预期：

```text
177 passed
6 failed
```

先回答：为什么 immediate 不能直接执行 `callback(source(), undefined, onCleanup)`？为什么 immediate 分支也不能先初始化 oldValue 再调用 job？

## 检查点二：实现 immediate

1. 删除 `_options` 的下划线，开始读取 options。
2. 把 oldValue 改为 `T | undefined`。
3. 增加 `initialized` 布尔状态。
4. job 始终先通过 `watcherEffect.run()` 取得 newValue。
5. 未初始化时必须执行 callback；已初始化时继续使用 hasChanged。
6. callback 后保存 oldValue，并把 initialized 设为 true。
7. 创建阶段：immediate 调用 job，默认分支只运行 source 并初始化 oldValue。

本检查点仍可暂时传入 `ignoreCleanup`。

完成后预期：

```text
6 passed
4 failed
```

## 检查点三：实现 onCleanup

1. 删除 `ignoreCleanup`。
2. 增加可选的 cleanup 槽位。
3. 实现 onCleanup，只负责保存 callback 注册的函数。
4. 实现 runCleanup，先清空槽位，再执行保存的函数。
5. job 在确认 callback 确实需要执行后，先 runCleanup，再调用 callback。
6. callback 接收真实的 onCleanup。

完成后预期：

```text
8 passed
2 failed
```

## 检查点四：实现停止监听

返回真正的 `stopWatch`：

```text
调用 watcherEffect.stop()
→ 调用 runCleanup()
```

验证重复调用不会重复执行最后一次 cleanup。

完成后预期：

```text
10 passed
```

## 检查点五：边界验收

基础测试通过后，我会补充测试以下边界：

- source 初始值就是 undefined 时，immediate 仍执行。
- immediate callback 注册的清理在第一次变化前执行。
- cleanup 抛出异常时槽位不会保留旧函数。
- stop 后手动调用内部 effect 的行为不影响公开停止语义。
- 条件 source 在停止前后的依赖清理。

## 本章暂不处理

- 直接传入 reactive 对象。
- deep watch 与递归遍历。
- `watchEffect`。
- `flush: "pre" | "post" | "sync"`。
- callback Promise 的自动取消。
- 一次 callback 注册多个 cleanup 的 Vue 版本差异。

## 完成标准

- 默认 watch 创建时不执行 callback。
- immediate watch 创建时执行一次，并传入 undefined oldValue。
- 每次有效 callback 前执行上一次 cleanup。
- source 结果未变化时不提前清理。
- 停止后 getter 与 callback 都不再执行。
- 停止时执行最后一次 cleanup，且重复停止安全。
- 第 1～17 章测试继续通过。


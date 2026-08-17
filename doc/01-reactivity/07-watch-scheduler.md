# 第七章：watch 的新旧值与调度隔离

`effect` 适合“依赖变化后重新执行同一个函数”，computed 适合“缓存一个派生值”。`watch` 解决的是另一类需求：观察一个值，在它变化后拿到新旧结果并执行回调。

```ts
const count = ref(0)

watch(
  () => count.value,
  (newValue, oldValue) => {
    console.log(oldValue, newValue)
  },
)
```

本章先实现只接收 getter source 的简化 watch。重点是分离两件事：source 在内部 ReactiveEffect 中收集依赖，callback 在依赖收集结束后执行。

## 本章目标

- 理解 watch source 与 callback 的不同职责。
- 创建 watch 时收集依赖，但不立即调用 callback。
- 正确维护每次回调的 newValue 与 oldValue。
- 使用 ReactiveEffect scheduler 把 callback 移出依赖收集阶段。
- 复用 effect 的依赖清理支持条件 source。
- 让 computed 可以作为 watch source。

## effect 与 watch 的区别

effect 把读取和副作用写在同一个函数里：

```ts
effect(() => {
  console.log(count.value)
})
```

这个函数执行期间的所有响应式读取都应该被收集。

watch 则有两个函数：

```text
source getter
→ 描述要观察什么
→ 其中的响应式读取应该被收集

callback
→ 描述变化后做什么
→ 其中的响应式读取不应该被收集为 source
```

例如 callback 为了生成日志而读取 `label.value`，不代表 watch 应该观察 label。

## 第七章起点实现

起点先使用公开的 effect 实现 newValue 和 oldValue：

```ts
let oldValue!: T
let initialized = false

effect(() => {
  const newValue = source()

  if (initialized) {
    callback(newValue, oldValue)
  }

  oldValue = newValue
  initialized = true
})
```

第一次执行只保存 oldValue，后续执行才调用 callback，因此基础的新旧值行为正确。

## 起点的问题：callback 污染依赖

公开 effect 执行整个函数期间，`activeEffect` 一直指向该 effect。callback 也在这个函数内部执行：

```text
watch effect 开始
→ source 读取 count.value，收集 watch effect
→ callback 读取 label.value，也收集 watch effect
→ watch effect 结束
```

第一次 count 变化后，label 也错误地成为 source 依赖。以后只修改 label，callback 仍会再次执行。

正确关系应该只有：

```text
count.dep → watcherEffect
```

而不是：

```text
count.dep → watcherEffect
label.dep → watcherEffect（错误）
```

## 为什么创建时必须运行 source

watch 不可能只保存 source 函数然后等待。source 从未执行时，响应式系统不知道它读取了哪些 ref 或对象属性，也就没有任何 dep 能在变化时通知 watch。

创建阶段需要执行一次 source：

```text
watcherEffect.run()
→ source 读取响应式值
→ 建立依赖
→ 得到第一次结果并保存为 oldValue
→ 不调用 callback
```

这次运行既完成依赖收集，也建立下一次变化需要的旧值。

## 使用 scheduler 分离两个阶段

第六章已经让 ReactiveEffect 支持 scheduler：依赖变化时，可以不直接执行 effect 函数，而是执行指定回调。

watch 可以把 source 作为 ReactiveEffect 的 fn，把处理新旧值的逻辑放进 scheduler job：

```text
ReactiveEffect.fn → source
ReactiveEffect.scheduler → job
```

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 描述观察目标的 getter | `source` |
| 变化后的用户回调 | `callback` |
| source 上一次运行结果 | `oldValue` |
| source 本次运行结果 | `newValue` |
| 追踪 source 的内部 effect | `watcherEffect` |
| scheduler 执行的工作函数 | `job` |

## job 的完整顺序

```text
源依赖变化
→ triggerEffects 找到 watcherEffect
→ watcherEffect 有 scheduler，因此执行 job
→ job 调用 watcherEffect.run()
→ cleanup 旧依赖
→ source 重新执行并收集当前依赖
→ run() 的 finally 恢复 activeEffect
→ 得到 newValue
→ callback(newValue, oldValue)
→ oldValue = newValue
```

callback 执行时，`watcherEffect.run()` 已经结束，activeEffect 也已恢复，所以 callback 读取的其他响应式值不会进入 watcherEffect 的 deps。

## 最小实现结构

需要直接使用 `ReactiveEffect`，不再通过公开的 `effect()` 包住 callback：

```ts
let oldValue!: T

const job = () => {
  const newValue = watcherEffect.run()
  callback(newValue, oldValue)
  oldValue = newValue
}

const watcherEffect = new ReactiveEffect(source, job)
oldValue = watcherEffect.run()
```

上面的代码表达了目标结构，但 TypeScript 会提示 `watcherEffect` 在声明前被 job 引用。需要调整声明与赋值顺序，这是本章的一个动手点。

一种适合当前项目的写法是先声明变量类型，再创建 job，最后赋值：

```text
声明 watcherEffect
→ 创建闭包 job
→ 给 watcherEffect 赋值
→ 第一次 run 保存 oldValue
```

## 检查点一：观察依赖污染

运行：

```bash
npm run test:run -- packages/reactivity/__tests__/watch.test.ts
```

预期该文件 4 个通过、1 个失败；全量测试为 36 个通过、1 个失败。失败项是“callback 中读取的响应式值不会成为 watch 的源依赖”。

在 playground 中：

1. 先点击“修改 source”，让 callback 执行并读取 label。
2. 再点击“只修改 label”。
3. 起点实现中 callback 次数会错误增加，并出现 `1 → 1`。

## 检查点二：用 watcherEffect 与 job 分离执行

1. 移除 watch 内部对公开 `effect()` 的调用。
2. 创建 `ReactiveEffect<T>`，把 source 作为 fn。
3. 创建 job，并把它作为 scheduler。
4. job 通过 `watcherEffect.run()` 得到 newValue。
5. callback 执行完成后更新 oldValue。
6. 创建结束时先运行一次 watcherEffect 保存初始 oldValue。

完成后，callback 中的读取不会再污染 source 依赖。

## 检查点三：验证条件 source

source 可以根据条件读取不同分支：

```ts
() => (useFirst.value ? first.value : second.value)
```

`watcherEffect.run()` 会复用已有的 cleanup 逻辑：运行前删除旧 deps，执行 source 时重新收集当前分支。因此切换后旧分支不再触发 watch，不需要在 watch 中重复实现清理。

条件依赖触发并不一定意味着 source 的最终结果发生了变化。例如两个分支当前都返回 `1`，切换分支时依赖集合需要更新，但 callback 不需要执行。job 应使用 shared 中已有的 `hasChanged(newValue, oldValue)` 判断结果：

```text
重新执行 source 并收集新分支
→ newValue 与 oldValue 不同：执行 callback，再更新 oldValue
→ newValue 与 oldValue 相同：不执行 callback
```

注意 source 仍然必须先执行，否则无法完成条件依赖清理与新分支收集；比较发生在 `watcherEffect.run()` 之后。

## 本章暂不处理

- 直接传入 reactive 对象的深层 watch。
- `immediate` 选项。
- `flush: 'pre' | 'post' | 'sync'` 调度时机。
- `onCleanup` 异步失效清理。
- 停止监听的返回函数。

## 完成标准

- 创建 watch 时收集依赖但不调用 callback。
- 每次变化得到正确的 newValue 和 oldValue。
- callback 中的响应式读取不会成为 source 依赖。
- 条件 source 切换后旧依赖被清理。
- computed 可以作为 source。
- 前六章测试保持通过。

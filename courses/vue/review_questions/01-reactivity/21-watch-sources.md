# 第二十一章复习：watch 数据源标准化与多数据源

> 状态：已批改。5 题均已通过修正复核。
> 本章共 5 题，分别检查执行路径、身份比较、组合 getter、数组歧义和类型推导。

## 1. ref source 为什么不能原样返回？

下面的标准化有什么问题？请从“返回值”和“依赖收集”两个角度说明，并写出正确的 getter 形状。为什么 computed 不需要独立分支？

```ts
if (isRef(source)) {
  return () => source
}
```

### 你的答案

会直接返回一个Ref，且因为未读取value会导致无法收集到依赖
```ts
if (isRef(source)) {
  return () => source.value
}
```
因为computed也有IS_REF标记

### 批改

正确。返回 `source` 得到的是 Ref 对象本身，不是它保存的值；又因为没有访问 `.value`，当前 `watcherEffect` 不会加入 ref 的 Dep。正确的标准化结果中应保存 `getter: () => source.value`。computed 同样带有 `IS_REF` 标记，`isRef(computedValue)` 为 true，所以会复用这个分支。

你给出的简写表达了正确 getter；放回本项目的完整结构时，它是 `NormalizedWatchSource` 的 `getter` 字段，而不是直接作为 `normalizeWatchSource` 的返回值。

## 2. direct reactive source 为什么需要 traverse 和 forceTrigger？

```ts
const state = reactive({ user: { score: 0 } })
watch(state, callback)
state.user.score++
```

请说明：如果 getter 只返回 state，会漏掉什么？完成 traverse 后，为什么 `hasChanged(newValue, oldValue)` 仍可能阻止 callback？此时 callback 中的新旧值为什么是同一个对象？

### 你的答案

只返回state会漏掉内部属性的依赖
因为可能内部属性发生变化，但newValue和oldValue还是同一个Proxy，hasChanged返回false

callback 中的新旧值是同一个对象，是因为 watch 保存的是 Proxy 引用而不是对象快照

### 批改

主体正确，但漏答了最后一问。`traverse(state)` 负责读取内部属性并收集依赖；`forceTrigger` 负责在依赖已经通知 watcher 时跳过顶层身份比较。

请补充：callback 中的新旧值是同一个对象，是因为 watch 保存的是 Proxy 引用而不是对象快照；修改 `state.user.score` 只改变了这个 Proxy 指向的原始对象内容，没有创建或替换新的 state Proxy。因此 callback 执行时，oldValue 也已经能观察到修改后的内容。

### 修正复核

已补充 watch 保存的是 Proxy 引用而不是对象快照，回答正确。再把执行过程连起来就是：`traverse` 收集内部属性依赖，依赖变化后 `forceTrigger` 放行 callback，而新旧值继续指向同一个已经被修改的 Proxy。

## 3. 找出多 source 变化判断中的错误

```ts
const getter = () => normalizedItems.map(item => item.getter())

const newValue = watcherEffect.run()
if (hasChanged(newValue, oldValue)) {
  callback(newValue, oldValue, onCleanup)
}
```

即使所有 source 的结果都没变，这段代码为什么仍可能执行 callback？应该怎样判断？如果其中有 direct reactive source，为什么还要考虑 `forceTrigger`？

### 你的答案

因为每次运行getter都会得到一个新的数组，此时就算没有变化但hasChange还是会为true从而执行callback
因为reactive内容属性可能发生变化，直接进行hasChange无法判断

普通多source:
```ts
sourceChanged = newValues.some((value, index) =>
  hasChanged(value, oldValues[index]),
)
```
多source中存在要求forceTrigger，则收到依赖通知就执行

### 批改

原因判断正确，但没有回答“应该怎样判断”。组合 getter 每次都会创建新数组，因此比较整个数组身份会产生误判。普通多 source 应逐项比较：

```ts
sourceChanged = newValues.some((value, index) =>
  hasChanged(value, oldValues[index]),
)
```

请把这条规则补进原答案。若其中包含 direct reactive source，内部属性变化后对应元素仍是同一个 Proxy，逐项 `hasChanged` 仍为 false；因此只要任一标准化项要求 `forceTrigger`，组合结果也要保存 `forceTrigger: true`，收到其依赖通知后允许 callback 执行。

### 修正复核

已正确补上 `some()` 逐项比较和组合后的 `forceTrigger` 规则。这里的“收到依赖通知就执行”是指 forceTrigger source 已经实际触发 scheduler 后，不再被同一 Proxy 身份挡掉；并不是没有依赖变化也主动执行。

## 4. 下面三种数组分别是什么语义？

逐一说明它们是“单个 reactive source”“多个 source”还是“单个 getter source”，并说明默认是否追踪 list 内部的 push。为什么 `isReactive(source)` 必须在 `Array.isArray(source)` 之前判断？

```ts
const list = reactive([1])

watch(list, callback)
watch([() => list.length], callback)
watch(() => list, callback)
```

### 你的答案

单个 reactive source
多个 source
单个 getter source
防止数组的Reactive被判断为多个source

会触发push
因为多个source中有一个length getter，所以push会触发
默认只比较 getter 返回的 Proxy 身份，没有读取数组内部，push 默认不会触发

### 批改

三种分类和判断顺序正确，但题目还要求说明 `push` 是否触发，请补充：

1. `watch(list, callback)`：list 是单个 reactive source，默认遍历数组，`push` 会触发。
2. `watch([() => list.length], callback)`：外层普通数组表示多个 source，其中只有一个 length getter；`push` 改变 length，所以会触发，并向 callback 提供形如 `[2]`、`[1]` 的结果数组。
3. `watch(() => list, callback)`：这是单个 getter source，默认只比较 getter 返回的 Proxy 身份，没有读取数组内部，`push` 默认不会触发；需要 `{ deep: true }` 才深入监听。

`reactive()` 返回的数组同时满足 `isReactive(source)` 和 `Array.isArray(source)`，所以必须先判断 reactive，否则数组元素 `1` 会被错误地当成独立 watch source。

### 修正复核

已分别说明三种写法的分类和 `push` 行为，回答正确。第二种写法不仅会触发，还会把单项 getter 的结果包装成新旧值数组；第三种只有加 `{ deep: true }` 才会深入数组。

## 5. 手动推导一次多 source 的类型

```ts
const count = ref(1)
const state = reactive({ title: "start" })
const sources = [count, () => state.title] as const

watch(sources, (newValues, oldValues) => {
  // ...
})
```

请写出：

1. `WatchSourceValue` 处理第 0、1 项分别得到什么类型；
2. `WatchSourceValues<typeof sources>` 的最终类型；
3. callback 中 `newValues` 与 `oldValues` 的类型；
4. 映射类型里的 `-readonly` 起什么作用。

### 你的答案

1. number string
2. { "count": number, "() => state.title": string }
3. [number, string]
4. 删除只读修饰符

2. [number, string]
3.  newValues: [number, string]
    oldValues: [number, string] | undefined

### 批改

第 1、4 点正确，第 2、3 点需要修正。

`sources` 是一个元组，映射类型会保留它的数字索引和元组结构，不会使用变量名或函数源码作为对象属性名：

```text
第 0 项：Ref<number> 经过 WatchSourceValue 得到 number
第 1 项：() => string 经过 WatchSourceValue 得到 string
WatchSourceValues<typeof sources> 得到 [number, string]
```

所以 callback 中：

```ts
newValues: [number, string]
oldValues: [number, string] | undefined
```

当前 `WatchCallback<T>` 规定首次 immediate 回调的 oldValue 可以是 `undefined`。`-readonly` 则把 `as const` 产生的只读元组转换成普通可写结果元组。请按这个结果修正第 2、3 点。

### 修正复核

后补答案已正确写出 `[number, string]`、`newValues` 和带 `undefined` 的 `oldValues`。上方旧的对象形状推导保留为修改前记录；它已被后补答案覆盖。映射元组使用的是数字索引，不会从变量名或函数源码生成属性名。

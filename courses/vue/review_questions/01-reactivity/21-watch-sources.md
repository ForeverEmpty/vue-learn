# 第二十一章复习：watch 数据源标准化与多数据源

> 状态：待完成。请在本章实现和测试全部通过后作答。
> 本章共 5 题，分别检查执行路径、身份比较、组合 getter、数组歧义和类型推导。

## 1. ref source 为什么不能原样返回？

下面的标准化有什么问题？请从“返回值”和“依赖收集”两个角度说明，并写出正确的 getter 形状。为什么 computed 不需要独立分支？

```ts
if (isRef(source)) {
  return () => source
}
```

### 你的答案



## 2. direct reactive source 为什么需要 traverse 和 forceTrigger？

```ts
const state = reactive({ user: { score: 0 } })
watch(state, callback)
state.user.score++
```

请说明：如果 getter 只返回 state，会漏掉什么？完成 traverse 后，为什么 `hasChanged(newValue, oldValue)` 仍可能阻止 callback？此时 callback 中的新旧值为什么是同一个对象？

### 你的答案



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



## 4. 下面三种数组分别是什么语义？

逐一说明它们是“单个 reactive source”“多个 source”还是“单个 getter source”，并说明默认是否追踪 list 内部的 push。为什么 `isReactive(source)` 必须在 `Array.isArray(source)` 之前判断？

```ts
const list = reactive([1])

watch(list, callback)
watch([() => list.length], callback)
watch(() => list, callback)
```

### 你的答案



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



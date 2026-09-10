# 第十九章复习：deep watch、watchEffect 与监听调度

> 状态：已完成。第 3 题已补充，第 6、7 题已修正。

## 1. 为什么 getter 返回响应式对象时只追踪引用，deep watch 怎样补上深层追踪？

请说明 `() => state.user` 收集的是哪个键，以及 traverse 怎样把内部键也纳入依赖。嵌套属性变化后，为什么 callback 得到的 `newValue` 与 `oldValue` 通常是同一个 Proxy，而不是修改前后的两份快照？

### 你的答案

收集的是user，traverse通过遍历对象中的所有键将其都纳入依赖
因为仅修改内部，newValue和oldValue还是之前那份Proxy，因为其外层未变

### 批改

基本正确。再精确一点：`() => state.user` 首先订阅的是根对象的 `user` 键；`traverse` 在同一次 `ReactiveEffect.run()` 中读取嵌套 Proxy 的可枚举属性，才继续订阅 `name`、`score` 等深层键。`newValue` 与 `oldValue` 是同一个缓存 Proxy，oldValue 只是旧引用，不是修改前的数据快照。

## 2. `traverse` 里的 `seen` 集合解决什么问题？数组和普通对象分别怎样遍历？为什么普通对象不能只用 `Object.keys`？

### 你的答案

seen解决了循环引用导致的死循环问题
数组按索引遍历每个元素，对象根据键进行遍历
只用Object.keys会忽略对象内部Symbol键值属性

### 批改

正确。可以补充：普通对象使用 `Reflect.ownKeys` 取得字符串键和 Symbol 键，再用 `propertyIsEnumerable.call` 排除不可枚举属性。

## 3. watchEffect 和 watch 在结构上有哪些区别？为什么 watchEffect 不需要 `hasChanged` 和 oldValue？它同步修改自己读取的依赖时，怎样避免无限递归？

### 你的答案

watch: source + callback
watchEffect: effect

watchEffect本身即收集依赖又是执行副作用，所以无需对比新旧值

避免死循环，可以如果是自身effect触发该effect则不再执行

### 讲解与参考答案

先抓住最核心的结构差异：

```text
watch       = source（收集什么） + callback（变化后做什么）
watchEffect = effect 本身既负责收集依赖，也负责执行副作用
```

`watch` 执行时，内部 `ReactiveEffect` 运行的是 source getter。getter 返回结果后，job 得到 `newValue`，再拿它和保存的 `oldValue` 比较。只有结果真正变化时才执行 callback，所以普通 watch 需要 `hasChanged` 和 `oldValue`。callback 在依赖收集阶段之外执行，因此 callback 中额外读取的 ref 不会成为 source 的依赖。

`watchEffect` 没有单独的 source。用户传入的 effect 就运行在 `ReactiveEffect.run()` 内部，因此 effect 中读取到的所有响应式值都会自动成为依赖。依赖触发后，它只需要先执行上一次 cleanup，再重新运行 effect；它不向用户提供新旧值，也不比较某个 getter 的返回结果，所以不需要 `hasChanged` 和 `oldValue`。

`count.value++` 可以拆成“先读 count.value，再把新值写回”。读取时，当前 watchEffect 会订阅 count；如果写入时又立刻同步执行同一个 watchEffect，就会不断递归。`triggerEffects` 因此使用：

```ts
if (effect === activeEffect) return;
```

跳过当前仍在执行的 effect。这个判断只阻止本次自触发；本次运行结束后，外部代码再次修改 count，watchEffect 仍会正常重新执行。

你可以按照“结构差异 → 为什么不用比较 → 怎样阻止自触发”这三个部分，用自己的话重新填写答案。

## 4. `flush: "sync"`、`"pre"`、`"post"` 三种模式分别在什么时机执行 callback？本项目默认是哪种，为什么？

### 你的答案

sync: 发生变化后同步执行
pre: Job队列中批量执行
post: 发生在Pre之后，在Job队列中批量执行

默认sync，与前几章实现保持一致

### 批改

基本正确。需要把“队列”说得更准确：`pre` 加入普通 job 队列，在当前同步代码结束后的微任务中批量执行；`post` 加入独立的 post 队列，在同一轮所有 pre job 结束后执行。两者都不是在修改发生时同步执行。

## 5. 为什么不能把 `flushPostJobs` 当作普通 pre job 入队？当前 scheduler 怎样保证 post 不受订阅顺序影响，始终在 pre 之后执行？

### 你的答案

当做普通的pre job入对会导致如果post先订阅，则可能Post -> Pre，与预期不一致
先情况pre队列后再执行post队列

### 批改

正确。原因是 Set 按插入顺序迭代：若把 `flushPostJobs` 放进普通队列，它插入得早就会执行得早。当前实现由 `flushJobs` 明确分成两个阶段，先清空普通队列，再调用 `flushPostJobs`，所以顺序与订阅先后无关。文字中的“入对”“先情况”建议分别修正为“入队”“先清空”。

## 6. 追踪下面的事件顺序：

```text
count 从 0 变为 1
count 从 1 变为 2
await nextTick()
```

假设先创建 `post` watch、后创建 `pre` watch。前者记录 `post:n`，后者记录 `pre:n`。写出它们各自执行几次以及最终的输出顺序。

### 你的答案

pre:1 -> pre:2 -> post:1 -> post:2

pre:2 → post:2

### 批改

需要修正。同一个 watch 每次调度的都是同一个 job 函数，Set 会对它去重。两次同步修改发生在同一个 tick 中，因此 pre watch 只执行一次，post watch 也只执行一次；真正运行 getter 时读到的已经是最终值 2。

正确顺序是：

```text
pre:2 → post:2
```

## 7. 为什么 `flush: "sync"` 的 job 要在调用用户 callback 之前更新内部 oldValue？

请结合“callback 把 count 从 1 再改成 2”的重入场景说明。如果 callback 返回后才更新 oldValue，会出现什么错误？

### 你的答案

如果callback后更新oldValue，且callback中修改了source内容会导致

1 -> 2

newValue: 2 oldValue: 1 -> callback: 1 -> 2 -> newValue:2 oldValue:1
会造成死循环，要在执行callback前就更新oldValue

oldValue = 0
-> newValue = 1 oldValue = 0
-> callback value = 2
-> newValue = 2 oldValue = 0
-> oldValue = newValue = 2
-> oldValue = newValue = 1

此时oldValue错误

### 批改

需要修正。oldValue 更新太晚主要会造成“记录落后一轮”，并不必然造成死循环。假设开始时 `oldValue = 0`：

```text
外层 job：读取 newValue = 1，但还没保存 oldValue
→ callback 把 count 改成 2
→ 内层 job：读取 newValue = 2，却仍看到 oldValue = 0
→ 内层结束后保存 oldValue = 2
→ 返回外层，外层又把 oldValue 覆盖成 1
→ 下次 count 变成 3 时，错误地得到 oldValue = 1
```

正确做法是在进入 callback 前先保存状态：

```ts
const previousValue = oldValue;
oldValue = newValue;
initialized = true;
callback(newValue, previousValue, onCleanup);
```

这样外层 callback 修改 count 时，内层 job 已经能看到 `oldValue = 1`；内层随后更新为 2，外层返回后也不会再把它覆盖回 1。

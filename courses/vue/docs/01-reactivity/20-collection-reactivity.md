# 第二十章：Map/Set 集合响应式

前十九章已经建立了普通对象、数组、ref 和 watch 的响应式基础，但 `Map` 和 `Set` 不能直接套用普通对象的 Proxy 处理器。

```ts
const state = reactive(new Map<string, number>())

effect(() => {
  console.log(state.get("count"))
})

state.set("count", 1)
```

这里的读取不是 `proxy.count`，而是 `Map.prototype.get` 调用；`size`、`keys()`、`values()` 和 `entries()` 也分别代表不同的依赖关系。本章将把集合操作接入现有的依赖图，并完成响应式模块的边界验收。

## 本章目标

- 为 `Map`、`Set` 提供专用的集合代理处理器。
- 理解集合键依赖与普通对象属性依赖的区别。
- 正确处理 `get`、`has`、`size`、`set`、`add`、`delete` 和 `clear`。
- 让 `keys()`、`values()`、`entries()` 和默认迭代器能够收集迭代依赖。
- 区分“键集合发生变化”和“已有键的值发生变化”。
- 统一 raw key 与 reactive key 的身份，避免同一逻辑键被追踪两次。
- 为 `Map`、`Set`、数组和普通对象保留各自的触发边界。

## 为什么普通对象处理器不够

普通对象的响应式入口是属性访问：

```ts
proxy.count
proxy.count = 1
```

集合的方法依赖 `this` 必须是原生集合实例。直接把 `Map` 当作普通对象代理后，下面的调用可能因为内部槽位校验失败：

```ts
const map = reactive(new Map())
map.get("count")
```

因此集合代理需要返回经过包装的方法，在调用原生方法时把 `this` 指向 raw collection，同时手动完成依赖收集和触发。

## 依赖类型

本章先把集合依赖拆成三类：

```text
具体键依赖
→ map.get(key)、map.has(key)

size 依赖
→ map.size、set.size

迭代依赖
→ keys()、values()、entries()、forEach()、默认迭代器
```

键依赖回答“这个 key 的值是否变化”；迭代依赖回答“集合内容或顺序变化后，遍历结果是否需要重新计算”。两者不能只用一个普通字符串键代替，否则新增或删除集合项时无法准确通知遍历消费者。

## 推荐的检查点

### 检查点一：观察起点行为

先为集合响应式创建独立测试文件，覆盖：

- `Map.get()` 的读取与 `set()` 的更新。
- `Set.has()` 的读取与 `add()`、`delete()` 的更新。
- `size` 在新增、删除和清空时的变化。
- raw key 与 reactive key 的交叉读取。

先记录普通对象处理器为什么无法直接支持这些调用，再决定集合依赖需要哪些内部标记。

### 检查点二：实现读取包装

优先完成以下读取 API：

```ts
map.get(key)
map.has(key)
map.size
set.has(value)
```

读取时要做到：

1. 用 raw key 建立稳定的依赖键。
2. 返回值如果是对象，遵循当前 `reactive` / `readonly` 的转换规则。
3. 原生方法调用使用 raw collection，避免 `Map.prototype.get` 的 receiver 错误。

### 检查点三：实现变更触发

区分以下情况：

```text
Map.set(新 key, value)
→ 触发该 key、size 和迭代依赖

Map.set(已有 key, 新 value)
→ 触发该 key 和值迭代依赖，不重复触发 size

Set.add(新 value)
→ 触发该 value、size 和迭代依赖

delete(存在的项)
→ 触发具体项、size 和迭代依赖

delete(不存在的项)
→ 不触发任何依赖

clear(非空集合)
→ 触发集合中的相关依赖和迭代依赖

clear(空集合)
→ 不触发任何依赖
```

### 检查点四：实现迭代器

为 `keys()`、`values()`、`entries()`、`forEach()` 和默认迭代器补充测试，重点确认：

- 新增与删除会让遍历 effect 重新执行。
- `Map.keys()` 只关注键集合变化，不因已有 key 的 value 更新而重复执行。
- `Map.values()` 和 `Map.entries()` 在 value 更新时能够得到新结果。
- 迭代器返回的 key 和 value 继续遵循 raw / reactive 身份规则。

### 检查点五：边界验收

最后检查：

- 同一个 raw key 和 reactive key 是否命中同一项。
- 嵌套对象值是否保持现有的深层 reactive 行为。
- readonly collection 是否阻止 `set`、`add`、`delete`、`clear`，同时允许读取。
- 集合方法解构或借用时是否仍然保持明确的错误边界。
- 现有第 1～19 章测试是否继续通过。

## 本章暂不处理

- 完整的 `WeakMap` 与 `WeakSet` 响应式。
- 自定义迭代器协议之外的第三方集合类型。
- effectScope 和异步副作用取消。
- 与 Vue 完全一致的内部调度优化。

## 完成标准

- `Map`、`Set` 的核心读取和写入操作都能建立、触发正确依赖。
- size 和迭代依赖不会因无关操作重复触发。
- raw / reactive key 身份一致。
- readonly collection 的写入操作被拦截且不改变 raw collection。
- 第 1～20 章测试全部通过。
- 响应式模块完成后，再进入 VNode、renderer 和组件运行时。

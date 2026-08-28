# 第十章：reactive 对象结构操作

前面的 reactive 已经能处理 `state.count` 的读取和赋值，但 JavaScript 对象不只有 get 和 set。判断属性是否存在、获取所有键、添加属性和删除属性，都会改变程序看到的对象结构。

这一章只处理普通对象的结构操作。数组的 length 与索引规则、readonly、shallow 和 raw 工具会放在后续章节，避免不同问题混在一起。

## 本章目标

- 理解 `get`、`set`、`has`、`ownKeys` 和 `deleteProperty` 分别拦截什么操作。
- 让 `'key' in state` 能够收集依赖。
- 让 `Object.keys(state)` 在属性新增或删除时更新。
- 让 `delete state.key` 通知直接读取该属性的 effect。
- 区分新增属性与更新已有属性。
- 合并多个 dep 中的 effect，保证一次结构变化只执行同一个 effect 一次。

## 当前缺口

当前 `mutableHandlers` 只有两个 trap：

```ts
export const mutableHandlers: ProxyHandler<object> = {
  get() {
    // 读取
  },
  set() {
    // 赋值
  },
}
```

所以这些操作并不完整：

```ts
const state = reactive<{ name?: string }>({ name: 'Ada' })

effect(() => {
  console.log('name' in state)
})

effect(() => {
  console.log(Object.keys(state))
})

delete state.name
```

Proxy 会把 `in`、枚举键和删除操作转发给原对象，因此数据本身仍可能改变；但没有对应 trap 调用 `track` 或 `trigger`，effect 不知道结构已经变化。

## 操作与 Proxy trap 的对应关系

| JavaScript 操作 | Proxy trap | Reflect 方法 |
| --- | --- | --- |
| `state.name` | `get` | `Reflect.get` |
| `state.name = 'Ada'` | `set` | `Reflect.set` |
| `'name' in state` | `has` | `Reflect.has` |
| `Object.keys(state)` | `ownKeys` | `Reflect.ownKeys` |
| `delete state.name` | `deleteProperty` | `Reflect.deleteProperty` |

这一章继续使用 Reflect，是因为它能返回操作是否成功，并保持 JavaScript 对象操作的原有语义。

## 属性值与对象结构是两类依赖

直接读取属性关心这个属性的值：

```ts
effect(() => {
  console.log(state.name)
})
```

它应该在这些情况执行：

- `name` 的值改变。
- 新增 `name`。
- 删除 `name`。

`Object.keys` 关心的是对象包含哪些自有属性：

```ts
effect(() => {
  console.log(Object.keys(state))
})
```

它应该在这些情况执行：

- 新增一个属性。
- 删除一个已有属性。

它不应该因为已有属性只修改值而执行：

```ts
const state = reactive({ count: 0 })

state.count = 1
// 键仍然只有 count，Object.keys 的结果没有变化
```

所以“某个属性的值”和“对象有哪些键”不能使用完全相同的触发规则。

## has trap

`'name' in state` 不会进入 get，而会进入 `has`：

```text
'name' in state
→ mutableHandlers.has(target, 'name')
→ Reflect.has(target, 'name')
```

has 依赖仍然可以关联到真实 key：

```text
targetMap
└─ target
   └─ 'name'
      └─ 读取 state.name 或执行 'name' in state 的 effects
```

当 name 被新增、修改或删除时，这个 dep 都可能被触发。当前简化实现暂时让直接读取和 has 共用 key dep；更精细的操作类型依赖不是本章目标。

实现顺序：

```text
Reflect.has 得到结果
→ track(target, key)
→ 返回结果
```

## deleteProperty trap

删除操作要记录两个事实：

1. 删除前是否真的存在这个自有属性。
2. Reflect.deleteProperty 是否删除成功。

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 删除前是否有这个自有属性 | `hadKey` |
| 删除是否成功 | `didDelete` |

只有下面两个条件同时满足，才代表对象结构真的改变：

```text
hadKey === true
并且 didDelete === true
```

删除不存在的属性虽然会返回 true，但结构没有变化，不应该触发 effect。

判断自有属性时不要直接写：

```ts
target.hasOwnProperty(key)
```

对象可能覆盖 `hasOwnProperty`，也可能没有普通原型。可以使用：

```ts
Object.prototype.hasOwnProperty.call(target, key)
```

如果多处都要使用，可以在 shared 包中增加一个 `hasOwn` 工具，名称应直接表达“是否拥有自有属性”。

如果不熟悉原型链和这行 `hasOwnProperty.call` 的拆解，先学习 [00. JS/TS 基础 - 02. 原型与属性归属](../00-js-ts/02-prototype-and-property-ownership.md)，再继续本章检查点二。

## ownKeys 与 ITERATE_KEY

`Object.keys(state)` 关心的是整个键集合，无法只关联到某一个真实属性。

例如初始对象为空：

```ts
const state = reactive<Record<string, number>>({})

effect(() => {
  Object.keys(state)
})
```

执行 effect 时还不知道将来会新增 `count` 还是 `total`。因此需要一个内部使用的特殊 key，表示“对象键集合”：

```ts
export const ITERATE_KEY = Symbol('iterate')
```

Symbol 不会与用户的字符串属性冲突。它不是原对象上的真实属性，只是依赖图中的标记：

```text
targetMap
└─ target
   ├─ 'name'      → name 属性依赖
   └─ ITERATE_KEY → Object.keys 等结构依赖
```

ownKeys trap 的职责是：

```text
track(target, ITERATE_KEY)
→ Reflect.ownKeys(target)
→ 返回所有自有键
```

## 区分 add、set 与 delete

当前 set trap 只比较新旧值，但第十章还要知道赋值前是否已经存在这个自有属性。

```text
state.count = 1

原来没有 count → add
原来已有 count  → set
```

可以为 trigger 增加操作类型：

```ts
export type TriggerOpType = 'add' | 'set' | 'delete'
```

三种操作需要通知的依赖不同：

| 操作类型 | 当前 key 的 dep | ITERATE_KEY dep |
| --- | --- | --- |
| `set` 已有属性 | 触发 | 不触发 |
| `add` 新属性 | 触发 | 触发 |
| `delete` 已有属性 | 触发 | 触发 |

这样修改已有 `count` 时，依赖 `Object.keys` 的 effect 不会无意义地重新执行。

## 为什么不能连续调用两次 triggerEffects

一个 effect 可能同时依赖具体属性和对象结构：

```ts
effect(() => {
  state.name
  Object.keys(state)
})
```

新增 name 时会命中两个 dep：

```text
'name' dep
ITERATE_KEY dep
```

如果先触发 name dep，再触发 ITERATE_KEY dep，同一个 effect 会执行两次。这不是我们想要的“一次数据操作，对同一个 effect 只通知一次”。

正确思路是先收集本次操作涉及的所有 effect：

```text
创建 effects Set
→ 加入当前 key dep 中的 effects
→ add/delete 时再加入 ITERATE_KEY dep 中的 effects
→ 最后统一 triggerEffects(effects)
```

外层 Set 会再次按 `ReactiveEffect` 对象引用去重。

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 本次要执行的 effect 集合 | `effectsToRun` |
| 单个依赖集合 | `dep` |
| 操作类型 | `type` |
| 结构依赖使用的特殊键 | `ITERATE_KEY` |

## 检查点一：观察缺失的 Proxy trap

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/reactive-object-operations.test.ts
```

起点预期是 3 个通过、3 个失败；全量测试预期是 51 个通过、3 个失败。

三个失败分别说明：

- in 操作没有通过 has 收集依赖。
- Object.keys 没有通过 ownKeys 收集结构依赖。
- delete 没有通过 deleteProperty 触发依赖。

打开 playground 第十章，依次新增 age、删除 name。观察原对象已经变化，但结构 effect 没有更新。

检查点问题：为什么 `Object.keys(state)` 不会进入现有的 get trap？

## 检查点二：实现 has 与 deleteProperty

1. 在 `mutableHandlers` 增加 `has`。
2. 使用 Reflect.has 获得结果。
3. 使用真实 key 调用 track。
4. 增加 `deleteProperty`。
5. 删除前保存 `hadKey`，删除后保存 `didDelete`。
6. 只有实际删除已有属性时才 trigger。

完成后，in 与直接读取属性的 effect 应该能响应删除。此时 Object.keys 仍然没有结构依赖，属于预期状态。

## 检查点三：实现 ownKeys 与结构依赖

1. 创建 `ITERATE_KEY`。
2. ownKeys 使用它调用 track。
3. 为 trigger 增加 `add | set | delete` 操作类型。
4. set trap 使用 `hadKey` 区分 add 和 set。
5. add 与 delete 时加入 ITERATE_KEY 对应的 dep。

完成后，新增和删除属性会更新 Object.keys；修改已有属性的值不会更新 Object.keys。

## 检查点四：合并 dep 并验证只执行一次

修改 trigger：先把当前 key dep 和可能存在的 ITERATE_KEY dep 合并到一个新的 Set，再统一调用一次 triggerEffects。

重点验证：

```ts
effect(() => {
  state.name
  Object.keys(state)
})
```

新增或删除 name 时，这个 effect 每次只能重新执行一次。

## 本章暂不处理

- 数组索引、length 和数组方法。
- 原型链上的属性新增与覆盖。
- Map、Set、WeakMap 和 WeakSet。
- readonly 与 shallow 代理。
- `for...in` 与不可枚举属性之间更精细的触发差异。
- Vue 内部完整的 TrackOpTypes 与 TriggerOpTypes。

## 完成标准

- in 操作能响应属性新增和删除。
- Object.keys 能响应属性新增和删除。
- 删除直接读取的属性会触发 effect。
- 更新已有属性不触发只依赖键集合的 effect。
- 删除不存在的属性不触发 effect。
- 一个结构变化命中多个 dep 时，同一个 effect 只执行一次。
- 前九章测试保持通过。

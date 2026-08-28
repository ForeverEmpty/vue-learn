# 第十三章：readonly 与代理身份工具

前十二章主要解决“数据变化后怎样通知使用者”。这一章加入另一种代理：它允许读取数据，但拒绝通过该代理修改数据。同时公开几个身份工具，让调用者能够分辨 raw、reactive 与 readonly，并在需要时取回原对象。

## 本章目标

- 理解 readonly 是原对象的只读访问视图，不是把原对象冻结。
- 使用独立 Proxy handler 拦截 readonly 的读取、写入和删除。
- 让嵌套对象惰性转换为深层 readonly。
- 使用 Symbol 身份标记区分 reactive 和 readonly 代理。
- 实现 `isReactive`、`isReadonly` 和 `isProxy`。
- 为同一个原对象缓存 readonly Proxy。
- 让公开的 `toRaw` 同时还原 reactive 与 readonly。
- 理解为什么只读写入 trap 应警告并返回 `true`。

## readonly 解决什么问题

考虑一份共享配置：

```ts
const rawConfig = {
  theme: 'dark',
  profile: {
    name: 'Ada',
  },
}

const publicConfig = readonly(rawConfig)
```

调用者应该能够读取：

```ts
publicConfig.theme
publicConfig.profile.name
```

但不应该通过 `publicConfig` 修改：

```ts
publicConfig.theme = 'light'
delete publicConfig.theme
```

这里 readonly 的含义不是“原对象永远不能改变”。持有 `rawConfig` 的代码仍然能修改原对象；readonly 只约束经过这个 Proxy 的操作。

```text
rawConfig ───────────────→ 可以直接修改原对象
    │
    └─ readonly Proxy ───→ 允许读取，拒绝写入和删除
```

因此不要把 readonly 与 `Object.freeze()` 混为一谈：

- readonly 使用 Proxy 控制一条访问路径。
- `Object.freeze()` 修改原对象自身的属性能力。
- 本章的 readonly 是深层惰性代理；`Object.freeze()` 默认只冻结对象自身一层。

## 起点为什么是透明 Proxy

本章已经建立：

```text
courses/vue/packages/reactivity/src/readonlyHandlers.ts
```

起点内容是：

```ts
export const readonlyHandlers: ProxyHandler<object> = {}
```

空 handler 不是“什么都不能做”，而是所有操作都使用 Proxy 默认转发行为：

```text
读取 view.count
→ 转发给 raw.count
→ 能正常得到值

写入 view.count = 2
→ 转发给 raw.count = 2
→ 原对象仍被修改
```

所以起点测试中，“返回新代理并读取”会通过，而只读保护会失败。

## TypeScript 的 Readonly 与运行时 readonly

当前函数签名是：

```ts
readonly<T extends object>(target: T): Readonly<T>
```

`Readonly<T>` 属于 TypeScript 静态类型，它能在编辑器和类型检查阶段阻止直接给第一层属性赋值。但类型在 JavaScript 运行时会被删除，所以不能代替 Proxy trap。

测试使用 `Reflect.set` 和 `Reflect.deleteProperty`，就是为了真正验证运行时保护：

```ts
Reflect.set(view, 'count', 2)
Reflect.deleteProperty(view, 'count')
```

本章需要同时理解两层职责：

```text
Readonly<T>       → 编译阶段提示
readonly Proxy    → 运行时阻止修改
```

## 身份查询为什么使用 Symbol

调用者需要判断：

```ts
isReactive(value)
isReadonly(value)
isProxy(value)
```

如果使用普通字符串键，例如 `'_isReactive'`，用户自己的对象可能刚好也有同名属性。为避免冲突，本章已经创建：

```text
courses/vue/packages/reactivity/src/reactiveFlags.ts
```

其中保存两个唯一 Symbol：

```ts
ReactiveFlags.IS_REACTIVE
ReactiveFlags.IS_READONLY
```

Symbol 即使描述文字相同，也不是同一个属性键。这里只在响应式内部共享同一组 Symbol 引用。

## 身份标记必须在普通 track 之前返回

mutable getter 当前执行：

```text
Reflect.get
→ track(target, key)
→ 深层 reactive
```

身份查询不是业务数据依赖。正确顺序应该先处理内部标记：

```text
key === IS_REACTIVE
→ 直接返回 true

key === IS_READONLY
→ 直接返回 false

否则
→ 执行普通读取、track 和深层 reactive
```

如果先 `track`，执行 `isReactive(state)` 的 effect 会错误订阅内部 Symbol。测试会主动写入这个 Symbol，确认身份查询没有被当作业务依赖。

readonly getter 的身份结果正好相反：

| 代理类型 | `IS_REACTIVE` | `IS_READONLY` |
| --- | --- | --- |
| mutable reactive | `true` | `false` |
| readonly | `false` | `true` |

raw 对象没有经过 handler，读取这两个 Symbol 通常得到 `undefined`，转换成布尔值后是 `false`。

## 三个身份函数的关系

```ts
isReactive(value)
```

只判断是否为可变响应式代理。

```ts
isReadonly(value)
```

只判断是否为只读代理。

```ts
isProxy(value)
```

只要属于上述任意代理就返回 true：

```text
isProxy(value)
= isReactive(value) || isReadonly(value)
```

推荐变量名：

| 含义 | 推荐名称 |
| --- | --- |
| 未代理原对象 | `raw` 或 `rawTarget` |
| 可变代理 | `state` |
| 只读代理 | `view` 或 `readonlyProxy` |
| 已缓存的只读代理 | `existingProxy` |
| readonly 缓存表 | `readonlyMap` |

## readonly getter 为什么不调用 track

本章直接对 raw 对象创建 readonly Proxy。readonly 视图本身不会被用于写入，因此本章不为它建立响应式订阅。

```text
readonly get
→ 处理身份 Symbol
→ Reflect.get
→ 如果结果是对象，继续 readonly
→ 返回结果
```

这里没有 `track`。不要直接复用 mutable getter 后忘记关闭依赖收集。

嵌套对象仍要深层只读：

```ts
const view = readonly({ profile: { name: 'Ada' } })

isReadonly(view)         // true
isReadonly(view.profile) // 也应为 true
```

和第五章的深层 reactive 一样，嵌套转换应当发生在 getter 实际读到对象时，而不是创建根 Proxy 时递归遍历整个对象。

## 为什么 set 和 deleteProperty 返回 true

readonly 写入的目标是：

```text
给出警告
不修改原对象
告诉 Proxy 调用方这次操作已经被 handler 处理
```

因此 set trap 不调用 `Reflect.set`，deleteProperty trap 不调用 `Reflect.deleteProperty`。

两者最后返回 `true`：

```ts
set(target, key) {
  console.warn(/* 提示 */)
  return true
}
```

这里的 `true` 不表示原对象真的发生了修改，而表示 trap 接受并处理了这次操作。如果返回 `false`，ES module 的严格模式赋值可能额外抛出 `TypeError`，调用者得到的是语言层异常，而不是本章希望的“警告并忽略”。

警告信息建议包含操作和属性名，例如：

```text
Set operation on key "count" failed: target is readonly.
Delete operation on key "count" failed: target is readonly.
```

本章测试只要求调用一次 `console.warn`，不锁死具体文案。

## readonly 为什么也需要缓存

没有缓存时：

```ts
readonly(raw) !== readonly(raw)
```

这会造成身份不稳定，和第五章重复创建 reactive Proxy 的问题相同。增加：

```ts
const readonlyMap = new WeakMap<Raw, Proxy>()
```

基本流程：

```text
输入已经是 readonly
→ 直接返回自身

输入可能是其他代理
→ toRaw 取得原对象

readonlyMap 已有原对象
→ 返回 existingProxy

否则
→ new Proxy(rawTarget, readonlyHandlers)
→ 写入 readonlyMap
→ 记录 Proxy → raw
→ 返回新代理
```

缓存键必须是 raw 对象。这样 `readonly(raw)` 与从同一 raw 得到的其他入口最终都能命中同一份 readonly Proxy。

## toRaw 如何同时支持两种代理

第十二章已经有：

```text
rawMap: Proxy → raw
```

之前只有 reactive Proxy 会写入 rawMap。本章创建 readonly Proxy 后，也应记录：

```text
rawMap.set(readonlyProxy, rawTarget)
```

于是现有 `toRaw` 不需要按代理种类写两套判断：

```text
toRaw(raw)            → rawMap 没记录，返回自身
toRaw(reactiveProxy)  → 查到 raw
toRaw(readonlyProxy)  → 也查到 raw
```

本章完成后才从公共 `index.ts` 正式导出 `toRaw`。它返回原对象，因此之后通过返回值进行修改会绕开 Proxy 保护与响应式通知；它主要用于身份比较和底层工具，不应当作为日常修改入口。

## 检查点一：观察透明 Proxy

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/readonly.test.ts
```

起点预期：

```text
1 passed
9 failed
```

唯一通过的是读取转发。请先观察两个现象：

1. `view` 已经不是 raw，但为什么写入仍然修改了 raw？
2. `toRaw(reactive(raw))` 已经有效，为什么 `toRaw(readonly(raw))` 仍失败？

不要立即实现全部功能。先用自己的话回答第一个问题，再进入检查点二。

## 检查点二：先完成 reactive 身份查询

只处理 mutable reactive，不修改 readonly handler。

1. 在 `baseHandlers.ts` 导入 `ReactiveFlags`。
2. 在 getter 最前面处理两个身份 Symbol。
3. reactive 对 `IS_REACTIVE` 返回 true，对 `IS_READONLY` 返回 false。
4. 在 `reactive.ts` 实现 `isReactive`、`isReadonly`、`isProxy`。
5. 身份函数要安全处理 `null`、基本类型和 raw 对象。

判断 value 是否可以读取属性时，可以复用 `isObject`，也可以明确检查：

```text
typeof value === 'object' && value !== null
```

完成后预期本章测试为：

```text
3 passed
7 failed
```

新增通过的行为是：深层 reactive 能识别，以及身份查询不产生内部依赖。readonly 相关身份仍然失败是正常的。

## 检查点三：完成深层只读和修改拦截

修改 `readonlyHandlers.ts`：

1. get trap 先处理两个身份 Symbol。
2. 普通读取使用 `Reflect.get(target, key, receiver)`。
3. 结果是对象时调用 `readonly(result)`，实现惰性深层只读。
4. 不要调用 `track`。
5. set trap 警告、忽略修改并返回 true。
6. deleteProperty trap 警告、忽略删除并返回 true。

建议先完成 get，再运行测试；确认嵌套身份通过后再做 set/delete，降低一次排查的变量数量。

完成后预期：

```text
7 passed
3 failed
```

剩下的三个失败都与缓存或 rawMap 记录有关。

## 检查点四：readonly 缓存与 toRaw

回到 `reactive.ts`：

1. 增加 `readonlyMap`。
2. 输入已经是 readonly 时直接返回自身。
3. 使用 `toRaw(target)` 得到缓存使用的 `rawTarget`。
4. 先查询 `readonlyMap`。
5. 没有缓存才创建 Proxy。
6. 同时写入 `readonlyMap` 和现有 `rawMap`。

这里有两种相反方向，不要写反：

```text
readonlyMap: raw → readonly Proxy
rawMap:      readonly Proxy → raw
```

完成后本章起始的 10 个测试应全部通过。我会再补充 readonly 数组、嵌套缓存和交叉代理调用的边界测试；补充后共 14 个测试，再进入复习题。

## 本章暂不处理

- `shallowReactive` 与 `shallowReadonly`。
- readonly ref 与 readonly collection。
- Map、Set、WeakMap 和 WeakSet。
- TypeScript 深层 `DeepReadonly<T>` 类型。
- 开发环境与生产环境不同的警告策略。

## 完成标准

- readonly 根对象与嵌套对象都能识别。
- readonly 写入和删除被忽略并警告。
- reactive 与 readonly 都保持 Proxy 身份稳定。
- 四个身份/raw 工具行为正确。
- 身份查询不进入普通依赖收集。
- 前十二章测试继续通过。

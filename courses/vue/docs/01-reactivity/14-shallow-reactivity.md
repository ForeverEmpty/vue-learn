# 第十四章：shallowReactive 与 shallowReadonly

第十三章实现了深层 `reactive` 和深层 `readonly`。它们在 getter 读到嵌套对象时，会继续创建对应的 Proxy。本章实现两种只处理根层的新工具：`shallowReactive` 与 `shallowReadonly`。

## 本章目标

- 理解“浅层”限制的是嵌套转换，不是根层依赖追踪。
- 让 `shallowReactive` 的根层属性保持响应式，但嵌套对象保持 raw。
- 让 `shallowReadonly` 只保护根层，允许修改嵌套 raw 对象。
- 通过对象展开复用已有 handler 中不需要改变的 trap。
- 为 shallow 与 deep 代理建立互不混用的缓存。
- 让 `toRaw` 同时支持两种 shallow 代理。
- 验证 shallow 数组只代理数组自身，不代理数组元素。

## shallow 到底浅在哪里

先看同一份原对象：

```ts
const raw = {
  profile: {
    name: "Ada",
  },
}
```

深层 reactive：

```text
reactive(raw)
    │
    ├─ 根对象：reactive Proxy
    └─ profile：读取时继续变成 reactive Proxy
```

浅层 reactive：

```text
shallowReactive(raw)
    │
    ├─ 根对象：reactive Proxy
    └─ profile：直接返回 raw.profile
```

因此：

```ts
const state = shallowReactive(raw)

isReactive(state)         // true
isReactive(state.profile) // false
state.profile === raw.profile // true
```

“浅层”只表示 getter 不继续转换嵌套对象。根对象的 `get`、`set`、`deleteProperty`、`has` 和 `ownKeys` 仍然需要正常追踪与触发。

## 不要把 shallowReactive 理解成“不追踪”

下面的 effect 读取了根对象的 `profile` 属性：

```ts
const state = shallowReactive({
  profile: { name: "Ada" },
})

effect(() => {
  state.profile
})
```

依赖关系仍然存在：

```text
raw root → "profile" → effect
```

所以替换根层属性会触发 effect：

```ts
state.profile = { name: "Grace" }
```

但 getter 返回的 `profile` 是 raw。继续读取 `.name` 时没有经过另一个 Proxy：

```text
读取 state.profile
→ 根 Proxy 收集 profile
→ 返回 raw profile

读取 rawProfile.name
→ 普通对象读取
→ 没有 track
```

因此直接修改嵌套属性不会触发 effect：

```ts
state.profile.name = "Grace"
```

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 根层浅响应代理 | `shallowState` 或 `state` |
| 根层浅只读代理 | `shallowView` 或 `view` |
| 未代理的嵌套对象 | `rawProfile` 或 `nestedRaw` |
| 替换根属性的新对象 | `replacement` |
| 浅响应缓存 | `shallowReactiveMap` |
| 浅只读缓存 | `shallowReadonlyMap` |

## shallowReadonly 的边界

`shallowReadonly` 只拒绝通过根 Proxy 进行的修改：

```ts
const raw = {
  profile: {
    name: "Ada",
  },
}

const view = shallowReadonly(raw)
```

下面修改的是根层 `profile` 属性，会被拦截：

```ts
Reflect.set(view, "profile", { name: "Grace" })
```

下面先读取根层属性，得到的是 raw.profile，然后修改普通对象：

```ts
view.profile.name = "Grace"
```

执行路径：

```text
读取 view.profile
→ shallowReadonly getter
→ 直接返回 raw.profile

写入 raw.profile.name
→ 没有经过 readonly Proxy
→ 修改成功
```

这不是只读保护失效，而是 shallowReadonly 的设计边界。

## 起点为什么会表现成 deep

本章起点已经公开两个 API，但它们暂时委托给深层版本：

```ts
shallowReactive(target) → reactive(target)
shallowReadonly(target) → readonly(target)
```

新文件 `shallowHandlers.ts` 也暂时复用：

```ts
shallowReactiveHandlers = mutableHandlers
shallowReadonlyHandlers = readonlyHandlers
```

所以起点不是“没有 Proxy”，而是“拿到了错误深度的 Proxy”。这能帮助你只关注 shallow 与 deep 的差异。

## 用对象展开复用 trap

`shallowReactive` 与 `reactive` 的区别主要在 getter 的最后一步：

```text
deep get:
Reflect.get → track → 对象则 reactive(result)

shallow get:
Reflect.get → track → 直接返回 result
```

`set`、`has`、`deleteProperty` 和 `ownKeys` 的根层行为相同。可以使用对象展开复用它们：

```ts
export const shallowReactiveHandlers: ProxyHandler<object> = {
  ...mutableHandlers,
  get(target, key, receiver) {
    // shallow 专用 getter
  },
}
```

对象属性从前往后覆盖：先复制 `mutableHandlers` 的全部 trap，再用后面的 `get` 替换其中的深层 getter。

`shallowReadonlyHandlers` 同理：复用 readonly 的 `set` 与 `deleteProperty`，只覆盖 getter。

## shallowReactive getter 的执行顺序

浅响应 getter 仍需要完成：

```text
1. 处理 IS_REACTIVE / IS_READONLY
2. 处理数组方法插桩
3. Reflect.get 读取结果
4. track(target, key)
5. 直接返回 result
```

第五步不要出现：

```ts
reactive(result)
```

即使 `result` 是对象，也原样返回。

数组方法插桩仍需保留。`push` 等方法可能读取数组内部的 `length`，第十二章已经通过插桩避免错误依赖；shallow 只改变元素转换深度，不应该让旧问题重新出现。

## shallowReadonly getter 的执行顺序

```text
1. IS_REACTIVE → false
2. IS_READONLY → true
3. Reflect.get
4. 直接返回 result
```

它不调用 `track`，也不调用 `readonly(result)`。

set 和 deleteProperty 直接复用第十三章的 readonly handler，所以根层修改仍然警告、忽略并返回 true。

## 为什么 shallow 需要独立缓存

同一个 raw 可以拥有四种不同语义的 Proxy：

```text
raw
├─ reactiveMap            → deep reactive
├─ readonlyMap            → deep readonly
├─ shallowReactiveMap     → shallow reactive
└─ shallowReadonlyMap     → shallow readonly
```

如果 `shallowReactive(raw)` 直接查询 `reactiveMap`，就可能拿到 deep reactive Proxy，嵌套对象又会被转换。因此 shallow 必须使用独立缓存。

反向表仍然可以共享：

```text
rawMap: 任意一种 Proxy → raw
```

`toRaw` 只关心“这个 Proxy 对应哪个原对象”，不需要区分代理深度，所以不必建立四份反向表。

## 数组的 shallow 含义

数组也是对象。浅响应数组需要：

- 数组索引与 `length` 属于根层，继续响应式。
- 数组元素如果是对象，直接返回 raw 元素。
- 替换某个索引会触发依赖。
- 修改元素内部属性不会触发数组的依赖。

```ts
const rawItem = { count: 1 }
const list = shallowReactive([rawItem])

list[0] === rawItem // true
list[0].count++     // 不经过 Proxy
list[0] = { count: 2 } // 修改根层索引，会触发
```

浅只读数组则保护索引和 `length`，但元素内部仍可修改。

## 检查点一：观察 deep API 被复用

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/shallow-reactivity.test.ts
```

起点预期：

```text
5 passed
8 failed
```

先观察：

```ts
const raw = { profile: { name: "Ada" } }
const state = shallowReactive(raw)
```

回答：为什么根对象身份和根层 effect 已经能够工作，但 `state.profile` 仍然不是 `raw.profile`？先用自己的话说明调用路径，不要立即实现。

## 检查点二 A：实现 shallowReactive 根层行为

修改 `shallowHandlers.ts`：

1. 使用 `...mutableHandlers` 复用根层写入和结构 trap。
2. 覆盖 get trap。
3. 先返回两个身份 Symbol。
4. 保留数组方法插桩。
5. 普通属性执行 `Reflect.get` 和 `track`。
6. 无论结果是不是对象，都直接返回 result。

修改 `reactive.ts` 的 `shallowReactive`：

1. 导入 `shallowReactiveHandlers`。
2. 输入已经是 Proxy 时先返回自身，避免套娃。
3. 使用 `new Proxy(target, shallowReactiveHandlers)` 创建代理。
4. 写入 `rawMap: proxy → target`，让 `toRaw` 有效。
5. 本小步暂时不要增加 shallowReactiveMap。

完成后预期：

```text
9 passed
4 failed
```

此时重复调用 shallowReactive 仍会创建不同 Proxy，这是下一小步故意保留的问题。

## 检查点二 B：增加 shallowReactive 缓存

在 `reactive.ts` 增加：

```ts
const shallowReactiveMap = new WeakMap<Raw, Proxy>()
```

创建前查询缓存，创建后同时记录：

```text
shallowReactiveMap: raw → shallow reactive Proxy
rawMap:              Proxy → raw
```

完成后预期：

```text
10 passed
3 failed
```

剩余失败应全部属于 shallowReadonly。

## 检查点三 A：实现 shallowReadonly 根层行为

修改 `shallowHandlers.ts`：

1. 使用 `...readonlyHandlers` 复用 set 与 deleteProperty。
2. 覆盖 get trap。
3. 正确返回两个身份 Symbol。
4. 普通读取只执行 `Reflect.get`。
5. 直接返回 result，不调用 `readonly(result)`。

修改 `shallowReadonly`：

1. 已经 readonly 的输入直接返回自身。
2. 使用 `toRaw(target)` 得到 rawTarget。
3. 创建 shallowReadonlyHandlers Proxy。
4. 写入 `rawMap: proxy → rawTarget`。
5. 本小步暂时不加缓存。

完成后预期：

```text
12 passed
1 failed
```

## 检查点三 B：增加 shallowReadonly 缓存

新增 `shallowReadonlyMap`，方向为：

```text
raw → shallow readonly Proxy
```

完成后起始的 13 个测试应全部通过。

## 检查点四：边界测试

起始测试全部通过后，我会补充以下边界，而不是让你提前猜实现：

- shallow 与 deep 的交叉调用。
- shallowReactive 数组修改方法是否仍保持依赖暂停。
- shallowReadonly 的删除与数组 length 保护。
- 多次 `toRaw` 与嵌套 raw 身份。

补充后本章共有 20 个测试。边界通过后再完成复习题。

## 本章暂不处理

- `markRaw` 与跳过代理。
- ref 的对象自动转换。
- `toRef`、`toRefs`、`proxyRefs`。
- watch 的 deep 遍历。
- Map、Set 等集合类型。

## 完成标准

- shallowReactive 只转换根对象，根层依赖仍完整。
- shallowReadonly 只保护根对象，嵌套对象保持可修改。
- shallow 与 deep 使用不同缓存，身份稳定。
- toRaw 能还原两种 shallow Proxy。
- 浅层数组的索引响应和元素 raw 身份正确。
- 前十三章测试继续通过。

# 第十五章复习：markRaw 与跳过代理

> 状态：已完成并通过复核。

## 1. markRaw、toRaw 与 Object.freeze 分别解决什么问题？

请分别说明它们是否会创建或撤销 Proxy、是否会阻止对象修改。

markRaw: 阻止创建Proxy
toRaw: 将Proxy转回原对象
Object.freeze: 阻止对象修改

> **批改：方向正确，但没有完整回答题目要求。** `markRaw` 给对象留下“未来跳过代理”的标记，不创建 Proxy，也不会撤销已有 Proxy，并且不阻止对象修改。`toRaw` 只是从 Proxy 查询并返回 raw 引用，不会改变或销毁原 Proxy，也不阻止修改。`Object.freeze` 阻止对象修改并使其不可扩展，但它本身不创建或撤销 Proxy；本项目的代理工厂会因为它不可扩展而选择跳过。请按“是否创建/撤销 Proxy、是否阻止修改”补充三者。

markRaw: 不创建Proxy也不撤销已有Proxy，不会阻止对象修改
toRaw: 不创建Rroxy也不撤销已有Proxy，不会阻止对象修改
Object.freeze： 不创建Proxy也不撤销已有Proxy，会阻止对象修改

> **复批：正确，通过。** 三者的 Proxy 身份影响与可修改性已经区分清楚。`Rroxy` 只是拼写笔误，不影响理解。

## 2. 为什么 SKIP 适合使用 Symbol，并且要通过 Object.defineProperty 创建为不可枚举属性？

除了“不让用户看到”以外，也说明它对 `Object.keys` 结构依赖有什么好处。

使用Symbol是为了防止有同名的字符串属性名，通过Object.defineProperty 创建为不可枚举属性不会通过Object.keys来获取

> **批改：前半部分正确，还需补充结构依赖。** Symbol 避免与用户的普通字符串键重名；不可枚举让 SKIP 不进入 `Object.keys` 的业务键结果。请再说明：依赖 `Object.keys(state)` 的 effect 关注的是可枚举业务结构，内部标记不应被当作一次业务属性数量变化，也不应出现在它保存的键列表中。

依赖 Object.keys(state) 的 effect 关注的是可枚举业务结构，内部标记不应被当作一次业务属性数量变化，也不应出现在它保存的键列表中。

> **复批：正确，通过。** 已说明不可枚举内部标记不会污染 `Object.keys` 保存和观察的业务结构。

## 3. 请追踪下面代码中 `state.profile` 的读取路径

```ts
const rawProfile = markRaw({ name: "Ada" })
const state = reactive({ profile: rawProfile })

state.profile
```

从根 Proxy 的 get trap 开始，解释为什么最后返回 rawProfile，而不是新 Proxy。

```
state.profile
-> get
-> isObject()
-> reactive(rawProfile)
-> SKIP
-> rawProfile
```

> **复批：正确，通过。** 路径已经包含根 get trap 的实际读取与追踪，以及嵌套对象进入 `reactive` 后由 `shouldSkipReactive` 返回 raw 的过程。

> **批改：主干方向正确，但读取路径缺少两个关键步骤。** 根 Proxy 的 get trap 会先用 `Reflect.get` 得到 rawProfile，并对根 raw 的 `profile` 键执行 `track`；发现结果是对象后才调用 `reactive(rawProfile)`。`reactive` 调用 `shouldSkipReactive` 读到 SKIP，最终返回 rawProfile。请补上 `Reflect.get`、根属性 `track` 和 `shouldSkipReactive`。

```
state.profile
-> get
-> Reflect.get
-> track()
-> isObject()
-> reactive(rawProfile)
-> shouldSkipReactive(rawProfile)
-> rawProfile
```

## 4. 为什么 markRaw 应该先检查 Object.isExtensible？为什么代理工厂还要把不可扩展对象直接跳过？

请区分“不能再添加 SKIP 属性”和“JavaScript 完全不能创建 Proxy”这两种说法。

因为不可扩展对象无法再添加属性，所以无法添加SKIP属性。

> **批改：只回答了第一问。** `markRaw` 先检查是为了避免对不可扩展对象执行 `defineProperty` 而抛错。还需补充：JavaScript 技术上通常仍允许 `new Proxy(不可扩展对象, handler)`；本项目把不可扩展作为响应式资格策略，主动保留 raw，以统一特殊对象处理并避开更多 Proxy 不变量边界。请明确“工厂选择不代理”不等于“JavaScript 完全不能代理”。

JavaScript 技术上通常仍允许 new Proxy(不可扩展对象, handler)；本项目把不可扩展作为响应式资格策略，主动保留 raw，以统一特殊对象处理并避开更多 Proxy 不变量边界。

> **复批：正确，通过。** 结合原答案，已经完整说明 `markRaw` 避免定义属性时报错，以及代理工厂主动跳过不可扩展对象的设计理由。

## 5. 找出下面代码中的错误预期，并说明正确使用顺序

```ts
const raw = { count: 1 }
const state = reactive(raw)

markRaw(state)

// 预期：state 现在已经自动变回 raw
```

state不会变为raw，只是添加了SKIP标识
如果想要将state转回raw使用toRaw
如果想一开始为raw，则先markRaw(raw)再reactive

> **批改：主体正确。** `markRaw(state)` 不会改变当前 `state` 变量的 Proxy 身份；在当前 handler 下，标记会转发到对应 raw。再精确一点：`toRaw(state)` 是返回另一个 raw 引用，需要接收它的返回值，并不是在原地把 `state` 变回 raw。希望一开始就不创建 Proxy，正确顺序确实是先 `markRaw(raw)`，再调用 `reactive(raw)`。

# 第十五章：markRaw 与跳过代理

前几章一直在回答“怎样把对象变成 Proxy”。本章反过来处理另一个必要问题：**怎样明确告诉响应式系统，这个对象不要被代理**。

Vue 提供的 `markRaw()` 适合第三方类实例、带有特殊内部状态的对象，或者你明确希望保持原始身份的数据。它不是把 Proxy 还原成 raw，而是在创建 Proxy **之前**给原对象留下一个“以后跳过转换”的标记。

## 本章目标

- 区分 `markRaw`、`toRaw` 与 `Object.freeze` 的职责。
- 使用内部 `Symbol` 保存跳过代理的标记。
- 使用 `Object.defineProperty` 创建不可枚举的内部属性。
- 让四个代理工厂统一识别跳过条件。
- 理解为什么标记必须发生在响应式转换之前。
- 让不可扩展对象保持原身份。
- 验证嵌套对象与数组元素的跳过行为。

## 先看最终希望得到的行为

```ts
const rawProfile = markRaw({
  name: "Ada",
})

const state = reactive({
  profile: rawProfile,
})
```

根对象仍然需要响应式，所以 `state` 是 Proxy；但是 `profile` 已经被标记：

```ts
isReactive(state)         // true
state.profile === rawProfile // true
isReactive(state.profile) // false
```

读取路径是：

```text
读取 state.profile
→ 根 Proxy 的 get trap
→ 从 raw state 中得到 rawProfile
→ deep getter 尝试调用 reactive(rawProfile)
→ reactive 发现 SKIP 标记
→ 直接返回 rawProfile，不创建 Proxy
```

注意：根对象的 `profile` 属性仍然被追踪。替换整个 `state.profile` 会触发 effect；直接修改 `rawProfile.name` 不会触发，因为它没有经过 Proxy。

## markRaw 不是什么

### 它不是 toRaw

`toRaw(proxy)` 是一次反向查询：

```text
已有 Proxy → 找到对应 raw
```

`markRaw(raw)` 是一条未来规则：

```text
raw → 留下标记 → 以后创建代理时跳过
```

### 它不是 Object.freeze

`Object.freeze` 限制对象修改；`markRaw` 不限制修改：

```ts
const config = markRaw({ enabled: true })
config.enabled = false // 可以修改，只是修改不会自动触发响应式更新
```

### 它不会撤销已有 Proxy

```ts
const raw = { count: 1 }
const state = reactive(raw)

markRaw(state)

isReactive(state) // 仍然是 true
```

`markRaw` 返回输入本身，不能把已经存在的 Proxy 变回 raw。推荐顺序始终是：

```ts
const raw = markRaw({ count: 1 })
const result = reactive(raw)
```

## 为什么使用 Symbol 保存内部标记

本章已经在 `reactiveFlags.ts` 中增加：

```ts
SKIP: Symbol("mini-vue.skipReactive")
```

如果使用普通字符串 `_skip`，用户对象可能本来就有同名业务字段。每次创建的 `Symbol` 都有独立身份，可以避免和普通字符串键冲突。

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 等待标记的对象 | `value` |
| 未代理原对象 | `raw`、`rawProfile`、`rawItem` |
| 是否跳过转换 | `shouldSkip` |
| 工厂准备处理的原对象 | `rawTarget` |
| 属性描述符 | `descriptor` |
| 已标记的第三方实例 | `rawInstance` |

不要把布尔变量写成含义不清楚的 `flag` 或 `result2`。`shouldSkip` 能直接表达判断结果。

## 为什么不能直接赋值

如果下面的属性描述符概念还不熟，请先学习 [00 · 05 Object.defineProperty 与属性描述符](../00-js-ts/05-object-define-property.md)，完成三个基础检查点后再继续本节。

下面的写法能保存值，但内部键可能参与对象枚举：

```ts
Reflect.set(value, ReactiveFlags.SKIP, true)
```

本章希望内部标记不出现在业务结构中：

```ts
const raw = { count: 1 }
markRaw(raw)

Object.keys(raw) // 仍然只有 ["count"]
```

因此使用 `Object.defineProperty`：

```ts
Object.defineProperty(value, ReactiveFlags.SKIP, {
  value: true,
  configurable: true,
})
```

属性描述符中没有写出的布尔配置默认是 `false`，所以上面的标记：

- `enumerable: false`：不会出现在 `Object.keys` 中。
- `writable: false`：不能随意改成 false。
- `configurable: true`：测试或特殊场景仍能删除该标记。

这里的重点不是背默认值，而是理解“内部元数据不应污染用户看到的属性列表”。

## 为什么先检查 Object.isExtensible

被冻结、密封或使用 `Object.preventExtensions` 处理过的对象，不能再定义新属性：

```ts
const locked = Object.preventExtensions({ count: 1 })
Object.isExtensible(locked) // false
```

如果 `markRaw` 无条件执行 `defineProperty`，这里会抛出异常。因此写标记前先判断对象是否可扩展。

本项目也把“不可扩展”本身作为跳过代理的条件：

```text
有 SKIP 标记
       或
对象不可扩展
       ↓
直接返回 raw
```

JavaScript 技术上允许为很多不可扩展对象创建 Proxy；这里“不创建”是响应式工厂的设计策略，而不是说 `new Proxy()` 语法必然失败。它让对象资格判断保持统一，也避开特殊对象与 Proxy 不变量带来的复杂边界。

## 两个函数如何分工

本章源码文件是 `packages/reactivity/src/raw.ts`。

### markRaw：负责写入信息

```text
markRaw(value)
├─ value 不可扩展 → 不写标记，直接返回 value
├─ 已有 SKIP 标记 → 直接返回 value
└─ 否则 → defineProperty 写入不可枚举标记 → 返回 value
```

### shouldSkipReactive：负责读取信息

```text
shouldSkipReactive(target)
├─ target 有 SKIP 标记 → true
├─ target 不可扩展 → true
└─ 其他普通对象 → false
```

一个函数写，一个函数读。不要让 `reactive()` 自己重复写一遍判断规则，否则四个代理工厂容易出现不一致。

## 判断要写在代理工厂的什么位置

第十五章起点已经把 `shouldSkipReactive` 接入四个工厂，但函数暂时总是返回 false。以 `reactive` 为例，顺序是：

```text
1. 输入已经是 Proxy？返回自身
2. 应该跳过代理？返回 raw
3. 缓存中已有对应 Proxy？复用缓存
4. 创建新 Proxy
5. 写入正向与反向缓存
```

跳过判断必须发生在 `new Proxy` 之前，这很直观；它也应该发生在正常缓存创建路径之前，因为被标记对象的正确结果就是 raw，不应新增代理缓存。

`readonly` 和 `shallowReadonly` 会先通过 `toRaw(target)` 得到 `rawTarget`，然后判断 `rawTarget`。这样不同入口最终都针对真正的原对象作出决定。

## 嵌套对象为什么不需要修改 getter

deep getter 已经有：

```ts
if (isObject(result)) return reactive(result)
```

本章不需要在 getter 再读取一次 SKIP。因为它调用的 `reactive(result)` 已经统一负责资格判断：

```text
deep getter → reactive(nestedRaw) → shouldSkipReactive(nestedRaw)
```

把规则放在代理工厂入口，根对象、嵌套对象和数组元素都会自然复用它。

## 检查点一：观察“API 存在，但没有留下标记”

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/mark-raw.test.ts
```

起点应为：

```text
4 passed
6 failed
```

打开 Playground 第十五章，先比较：

- `markRaw(raw) === raw` 已经是 true。
- `reactive(markRaw(raw)) === raw` 仍然是 false。
- 标记过的嵌套对象仍会成为 reactive Proxy。
- 不可扩展对象仍会成为 Proxy。

请先回答：`markRaw` 明明返回了同一个对象，为什么随后 `reactive` 还是会创建 Proxy？回答时分别说明“返回值相同”和“对象上保存了信息”是不是同一件事。

## 检查点二：只实现 markRaw 写标记

只修改 `packages/reactivity/src/raw.ts` 中的 `markRaw`，暂时不要修改 `shouldSkipReactive`。

建议按以下顺序写：

1. 用 `Object.isExtensible(value)` 判断能否添加内部属性。
2. 用 `Reflect.get(value, ReactiveFlags.SKIP)` 判断是否已经标记。
3. 只在“可扩展且尚未标记”时调用 `Object.defineProperty`。
4. 描述符保存 `value: true`，并明确考虑是否需要 `configurable`。
5. 最后始终 `return value`。

这一小步完成后，预期：

```text
5 passed
5 failed
```

此时标记测试通过，但 `reactive` 仍然不认识标记。这一步特意把“写入元数据”和“消费元数据”拆开。

## 检查点三：让工厂识别 SKIP

继续修改同一文件中的 `shouldSkipReactive`。本检查点先只判断 `ReactiveFlags.SKIP`，暂时不要加入不可扩展判断。

返回值需要表达：

```text
读取 target 的 SKIP
→ 转成明确的 boolean
→ 返回
```

四个代理工厂已经调用这个函数，不需要再分别修改四遍。

完成后预期：

```text
9 passed
1 failed
```

最后只应剩下“不可扩展对象”测试失败。

## 检查点四：加入不可扩展对象边界

扩展 `shouldSkipReactive`：目标有 SKIP 标记，**或者**目标不可扩展时，都返回 true。

思考布尔表达式时，可以先写成中文：

```text
有标记 || 不可扩展
```

然后分别寻找对应的 JavaScript 表达式。注意 `Object.isExtensible` 返回的是“可扩展”，和你的目标条件方向相反。

完成后预期：

```text
10 passed
```

把结果交给我后，我会审查实现并补充边界测试，重点检查缓存先后顺序、继承标记与不同工厂的身份行为。

边界验收补充后，本章共有 17 个测试，最终应为：

```text
17 passed
```

新增边界包括：SKIP 描述符的写入与删除限制、继承标记、标记的浅层边界、已有代理缓存、对 Proxy 调用 `markRaw`、不可扩展数组和冻结对象。

## 本章暂不处理

- ref 中的对象自动转换。
- `shallowRef` 与 `triggerRef`。
- `toRef`、`toRefs` 与 `proxyRefs`。
- watch 的立即执行、清理、停止和深层遍历。
- Map 与 Set 的集合响应式。

## 完成标准

- `markRaw` 返回原输入，并写入不可枚举的内部标记。
- 重复标记不会报错或改变对象业务键。
- 四种代理工厂都跳过标记对象。
- deep reactive 中的标记嵌套对象保持 raw。
- 不可扩展对象不进入代理缓存与创建流程。
- 已有 Proxy 不会因为之后调用 markRaw 而自动消失。
- 前十四章测试继续通过。

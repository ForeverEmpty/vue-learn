# 第十六章：ref 对象转换、shallowRef 与 triggerRef

第一章实现的 `ref` 已经能追踪 `.value` 的读取和替换，但它只是把传入值原样保存在 `_value` 中。对于数字和字符串，这已经够用；对于对象，还缺少 Vue ref 的重要语义：普通 `ref` 应该把对象值转换成 reactive，而 `shallowRef` 应该刻意保留对象原身份。

本章还会实现 `triggerRef`：当 shallowRef 内部的 raw 对象被直接修改后，由使用者手动通知读取过 `.value` 的 effect。

## 本章目标

- 让 `ref({ ... })` 的 `.value` 成为 deep reactive Proxy。
- 理解 ref 自身依赖与对象属性依赖是两层不同关系。
- 分开保存用于比较的 raw 值和对外返回的转换值。
- 避免同一个对象的 raw/Proxy 身份导致重复触发。
- 实现只追踪 `.value` 替换的 `shallowRef`。
- 实现可以强制通知订阅者的 `triggerRef`。
- 让 `triggerRef` 继续遵守 effect scheduler。
- 验证 `markRaw` 与 ref 对象转换能够组合工作。

## 起点缺少了什么

当前 `RefImpl` 只有一个字段：

```ts
private _value: T
```

构造时直接保存：

```ts
this._value = value
```

因此：

```ts
const rawProfile = { name: "Ada" }
const profile = ref(rawProfile)

profile.value === rawProfile       // 当前是 true
isReactive(profile.value)          // 当前是 false
```

effect 读取 `profile.value.name` 时，只能收集 ref 的 `.value` 依赖。继续读取 `.name` 是普通对象访问，没有 Proxy，也就没有对象属性依赖。

## deep ref 最终应该是什么样

```ts
const rawProfile = { name: "Ada" }
const profile = ref(rawProfile)
```

正确结果：

```ts
profile.value === rawProfile           // false
profile.value === reactive(rawProfile) // true
isReactive(profile.value)              // true
```

这里不是 ref 自己重新实现一套 Proxy。ref 只需要把对象值交给已有的 `reactive()`：

```text
ref(rawObject)
→ 判断是对象
→ reactive(rawObject)
→ 保存并返回已有或新建的 Proxy
```

数字、字符串、布尔值、null 和 undefined 仍然原样保存。

## 两层依赖关系

下面的 effect 同时经过两套响应式机制：

```ts
const profile = ref({ name: "Ada" })

effect(() => {
  profile.value.name
})
```

读取过程：

```text
读取 profile.value
→ RefImpl.get value
→ effect 加入 ref.dep
→ 返回 reactive profile Proxy

读取 proxy.name
→ mutableHandlers.get
→ effect 加入 rawProfile 的 name dep
```

因此依赖结构可以理解成：

```text
profile ref
└─ value dep ──────────────→ effect

rawProfile
└─ "name" dep ────────────→ effect
```

两条关系用途不同：

- 替换 `profile.value`：ref.dep 通知 effect。
- 修改 `profile.value.name`：对象的 name dep 通知 effect。

不要在 ref setter 中专门处理 `name`。所有对象属性继续由 reactive Proxy 统一负责。

## 为什么一个 `_value` 不够

对象转换后会同时出现 raw 和 Proxy：

```ts
const rawProfile = { name: "Ada" }
const profile = ref(rawProfile)

rawProfile !== profile.value
```

如果 setter 继续比较：

```ts
hasChanged(this._value, newValue)
```

然后再次赋入最初的 raw：

```ts
profile.value = rawProfile
```

比较的其实是：

```text
Proxy !== raw
```

它会被误判为值发生变化，导致 effect 重复执行。但 raw 和这个 Proxy 实际代表同一个对象。

因此需要两个字段：

| 字段 | 保存内容 | 用途 |
| --- | --- | --- |
| `_rawValue` | 用 `toRaw` 归一化后的原始值 | setter 判断是否真的换了数据身份 |
| `_value` | 对象转换后的 Proxy，或原样基本类型 | getter 对外返回 |

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 构造函数收到的值 | `value` 或 `initialValue` |
| 用于比较的原始值 | `_rawValue` |
| getter 返回的实际值 | `_value` |
| setter 收到的新值 | `newValue` |
| 归一化后的新值 | `rawNewValue` |
| 是否使用浅层模式 | `isShallow` |
| 准备通知的依赖集合 | `dep` |
| 被手动触发的 ref | `reference` |

## toReactive 辅助函数

可以在 `ref.ts` 内部增加一个不导出的辅助函数：

```ts
function toReactive<T>(value: T): T {
  if (isObject(value)) {
    return reactive(value) as T
  }

  return value
}
```

它的职责只有一个：对象交给 `reactive`，其他值原样返回。

为什么需要 `as T`：TypeScript 知道 `reactive(value)` 返回对象，但此处函数承诺返回与输入相同的泛型形状。Proxy 不会改变对象对外的属性类型，所以在这个内部边界进行类型断言。

`reactive` 已经能处理：

- 已有 Proxy：返回自身。
- `markRaw` 对象：返回 raw。
- 不可扩展对象：返回 raw。
- 普通对象：创建或复用 Proxy。

所以 ref 不需要重复这些判断。

## deep ref 构造与 setter 的思路

构造时：

```text
_rawValue = toRaw(value)
_value    = toReactive(value)
```

注意 `_value` 转换的是原输入 `value`，这样传入已有 Proxy 时能够保留同一个 Proxy；用于比较的 `_rawValue` 才需要统一成 raw。

setter 时：

```text
1. rawNewValue = toRaw(newValue)
2. 比较 _rawValue 与 rawNewValue
3. 相同 → 直接返回
4. 不同 → 保存新的 _rawValue
5. _value = toReactive(newValue)
6. triggerEffects(dep)
```

这样下面两次赋值都不会误触发：

```ts
profile.value = rawProfile
profile.value = reactive(rawProfile)
```

因为参与比较的两边最终都是同一个 rawProfile。

## 替换对象后为什么旧对象不再触发

effect 初次执行时订阅：

```text
ref.value dep
旧 rawProfile.name dep
```

替换 `.value` 会触发 ref.dep，让 effect 重新执行。第三章和第二章已经实现 effect 清理，所以重新执行时：

```text
删除旧依赖
→ 重新读取 ref.value
→ 收集新 rawProfile.name
```

结果是：修改新对象会触发，修改旧 Proxy 不再触发。本章复用已有的 effect 清理机制，不需要在 ref 中手动清理对象属性依赖。

## shallowRef 浅在哪里

`shallowRef` 只让 `.value` 这个访问器保持响应式，不转换内部对象：

```ts
const rawProfile = { name: "Ada" }
const profile = shallowRef(rawProfile)

profile.value === rawProfile // true
isReactive(profile.value)    // false
```

effect 仍然会订阅 ref.dep：

```ts
effect(() => {
  profile.value.name
})
```

但依赖只有：

```text
shallow ref
└─ value dep → effect
```

没有 `rawProfile.name dep`，因为 `.name` 没经过 Proxy。

所以：

```ts
profile.value.name = "Grace" // 不自动触发
profile.value = { name: "Lin" } // 替换 value，会触发
```

## 用一个 RefImpl 还是两个类

可以创建两个类，但本章推荐让一个 `RefImpl` 接收模式参数：

```ts
constructor(value: T, private readonly isShallow: boolean)
```

创建入口分别传入：

```text
ref(value)        → new RefImpl(value, false)
shallowRef(value) → new RefImpl(value, true)
```

浅层模式需要注意两点：

- `_rawValue` 直接保存输入，不调用 `toRaw`。
- `_value` 直接保存输入，不调用 `toReactive`。

原因是 shallowRef 的职责就是保留传入值本身；即使传入的是一个 Proxy，它也应该保留这个 Proxy，而不是擅自换成 raw。

可以先写两个局部变量帮助阅读：

```ts
const rawValue = isShallow ? value : toRaw(value)
const storedValue = isShallow ? value : toReactive(value)
```

## triggerRef 为什么有必要

修改 shallowRef 的嵌套 raw 属性不会自动触发：

```ts
profile.value.name = "Grace"
```

有时使用者明确知道自己完成了一批内部修改，希望手动刷新消费者：

```ts
triggerRef(profile)
```

它不修改 `.value`，只通知 ref 已有的 dep：

```text
triggerRef(profile)
→ 找到 profile 的 dep
→ triggerEffects(dep)
→ effect 或 scheduler 按原规则执行
```

`triggerRef` 不应该直接遍历 effect 并调用 `run()`。第九章已经支持 scheduler，统一调用 `triggerEffects(dep)` 才能继续遵守调度规则。

## triggerRef 怎样访问内部 dep

当前 `dep` 是 `private`，只有 `RefImpl` 类内部能访问。`triggerRef` 与类在同一个模块，但 TypeScript 的 `private` 仍然不允许类外直接读取。

本章可以把它改成：

```ts
readonly dep: Dep = new Set()
```

`RefImpl` 类本身没有导出，所以外部使用者仍不能依赖这个实现类。`readonly` 表示不能把 `dep` 字段重新指向另一个 Set，不表示不能向 Set 中添加或删除 effect。

为了让公开的 `Ref` 接口仍然只暴露 `.value`，可以在模块内部定义：

```ts
type RefWithDep = Ref<unknown> & {
  readonly dep?: Dep
}
```

`triggerRef` 将参数视为内部可触发 ref，读取 dep；存在时调用 `triggerEffects`。可选的 `dep?` 能让错误类型的输入安全地不执行，而不是直接读取 undefined 后报错。

## 检查点一：观察对象 ref 仍然是 raw

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/ref-object.test.ts
```

起点应为：

```text
6 passed
7 failed
```

打开第十六章 Playground，分别修改 deep ref 与 shallowRef 的嵌套 name。当前两者都不会自动更新 effect，因为 shallowRef 暂时复用了同样不转换对象的旧 ref。

请先回答：为什么 `ref({ name: "Ada" })` 已经能够追踪 `.value`，却不能追踪 `.value.name`？回答时说明 `.value` 和 `.name` 分别经过了哪个 getter。

## 检查点二 A：实现 deep ref 对象转换

只修改 `RefImpl` 与 `ref()`，暂时保留 `shallowRef(value) → ref(value)`。

建议步骤：

1. 从 shared 导入 `isObject`。
2. 从 reactive 模块导入 `reactive` 和 `toRaw`。
3. 新增 `toReactive` 辅助函数。
4. 把一个 `_value` 拆成 `_rawValue` 与 `_value`。
5. 构造时分别保存 raw 比较值和转换后的对外值。
6. setter 先把新值 `toRaw`，再与 `_rawValue` 比较。
7. 真正变化后，同时更新两个字段，再触发 dep。

完成后预期：

```text
7 passed
6 failed
```

此时 deep ref 测试应通过，但 shallowRef 因为继续复用 deep ref，会开始出现三个浅层语义失败；`triggerRef` 也仍未实现。

## 检查点二 B：实现 shallowRef

给 `RefImpl` 增加 `isShallow` 模式，或者建立独立实现类。无论采用哪种结构，都要满足：

- shallow 模式不调用 `toRaw` 归一化输入。
- shallow 模式不调用 `toReactive` 转换对象。
- getter 仍然执行 `trackEffect(dep)`。
- 替换 `.value` 仍比较新旧值并调用 `triggerEffects(dep)`。

完成后预期：

```text
10 passed
3 failed
```

剩余三个失败应全部属于 `triggerRef`。

## 检查点三：实现 triggerRef

1. 让模块内部能够读取 RefImpl 的 dep，但不要把 dep 加入公开 Ref 接口。
2. 在模块内部定义 `RefWithDep` 类型。
3. 从参数中读取 dep。
4. dep 存在时调用 `triggerEffects(dep)`。
5. 不要手动调用 effect.run，也不要修改 `_value`。

完成后本章起始测试应为：

```text
13 passed
```

## 检查点四：边界验收

起始测试通过后，我会补充边界测试，重点验证：

- deep ref 接收已有 reactive、readonly 和 markRaw 对象。
- shallowRef 保留传入 Proxy 身份。
- shallowRef 重复赋入同一个对象不触发。
- triggerRef 没有订阅者时不报错。
- 对象替换后的旧属性依赖已被清理。

边界通过后再完成复习题。

边界测试补充后，本章共有 20 个测试，最终应为：

```text
20 passed
```

补充范围包括：已有 reactive/readonly Proxy 的身份保留、不可扩展对象、响应式数组、shallowRef 保留传入 Proxy、同一身份重复赋值、无内部 dep 的结构化 Ref，以及 effect 停止后的手动触发。

## 本章暂不处理

- `isRef`、`unref`、`toRef`、`toRefs` 与 `proxyRefs`。
- ref 在 reactive 对象属性上的自动解包。
- 可写 computed。
- `customRef`。
- watch 对 ref source 的完整重载。

这些内容会在后续章节继续补齐。

## 完成标准

- deep ref 的普通对象值会转换成 reactive Proxy。
- `_rawValue` 与 `_value` 分工明确，raw/Proxy 同一身份不会误触发。
- shallowRef 保留内部值，不追踪嵌套 raw 属性。
- 替换 shallowRef.value 仍会触发 effect。
- triggerRef 能强制通知 ref.dep，并遵守 scheduler。
- markRaw、不可扩展对象与已有 Proxy 继续遵守已有身份规则。
- 前十五章测试继续通过。

# 第十七章：ref 工具链与可写 computed

第十六章已经让 ref 正确处理对象，但实际使用时仍有很多重复动作：判断一个值是不是 ref、手动写 `.value`、把响应式对象的每个属性转换成 ref，以及在普通对象上频繁解包 ref。

本章先实现一组相互组合的 ref 工具，再把 getter-only computed 扩展成可以通过 setter 反向修改源状态的可写 computed。

## 本章目标

- 使用内部 Symbol 准确识别 ref、shallowRef 和 computed。
- 实现 `isRef` 与 `unref`。
- 理解 `toRef` 是属性桥接，不是值快照。
- 用 `toRefs` 保留响应式对象解构后的连接。
- 使用条件类型与映射类型描述 toRef/toRefs 的返回值。
- 实现 `proxyRefs` 的读取解包与写入分支。
- 保持 getter-only computed 的只读类型。
- 实现带 get/set 的可写 computed。
- 理解可写 computed 的 setter 本身不负责缓存失效。

## 为什么需要 isRef

下面两个值都有 `.value`：

```ts
const count = ref(1)
const formField = { value: 1 }
```

不能只用下面的方式判断：

```ts
"value" in candidate
```

否则普通业务对象也会被误认为 ref。和第十五章的 SKIP 类似，本章已经在 `ReactiveFlags` 中预留了内部 Symbol：

```ts
IS_REF: Symbol("mini-vue.isRef")
```

真正的 ref 实现类和 computed 实现类需要主动声明这个身份：

```ts
readonly [ReactiveFlags.IS_REF] = true
```

然后 `isRef` 统一读取：

```text
值是对象？
├─ 否 → false
└─ 是 → 读取 IS_REF → 转成 boolean
```

为什么 computed 也属于 ref：它同样通过 `.value` 暴露值、能够被 effect 订阅，也应该被 `unref` 和 `proxyRefs` 解包。

## TypeScript 的类型谓词

`isRef` 的返回类型不是普通 boolean，而是：

```ts
value is Ref<unknown>
```

这叫类型谓词。它告诉 TypeScript：当函数返回 true 时，当前分支中的 value 可以按 Ref 使用。

```ts
if (isRef(value)) {
  value.value
}
```

运行时仍然由 Symbol 判断；类型谓词只是把这个判断结果告诉类型系统。

## unref 是最小组合工具

`unref` 的规则只有一条：

```text
是 ref → 返回 value.value
不是 ref → 原样返回 value
```

它应该复用 `isRef`，不要再重复读取 Symbol：

```ts
return isRef(value) ? value.value : value
```

这样 ref、shallowRef、computed 和普通值都走同一入口。

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 等待判断或解包的值 | `value` |
| 被桥接的源对象 | `source` 或 `object` |
| 被桥接的属性名 | `key` |
| 对象属性 ref | `propertyRef` |
| toRefs 结果 | `references` |
| proxyRefs 的原对象 | `objectWithRefs` |
| set trap 读到的旧值 | `oldValue` |
| set trap 收到的新值 | `newValue` |
| computed setter | `setter` |

## toRef 不是复制值

第十七章起点暂时这样实现：

```ts
return ref(object[key])
```

这只是创建快照：

```text
创建时 object.count 是 1
→ 新 ref 保存 1
→ 以后两个位置各自变化，互不相干
```

正确的 `toRef(object, key)` 应返回一座桥：

```text
读取 propertyRef.value
→ 返回 object[key]

写入 propertyRef.value = newValue
→ 执行 object[key] = newValue
```

可以创建内部类：

```ts
class ObjectRefImpl<
  Target extends object,
  Key extends keyof Target,
> implements Ref<Target[Key]> {
  constructor(
    private readonly object: Target,
    private readonly key: Key,
  ) {}

  get value(): Target[Key] {
    return this.object[this.key]
  }

  set value(newValue: Target[Key]) {
    this.object[this.key] = newValue
  }
}
```

ObjectRefImpl 不需要自己的 dep。如果 object 是 reactive Proxy，getter 中的 `object[key]` 会进入 Proxy get trap，依赖由源对象属性负责收集；setter 也会进入 Proxy set trap并触发。

如果源对象只是普通 raw，toRef 仍能保持读写同步，但普通属性本身不会自动通知 effect。

## 已经是 ref 的属性不要再包装

```ts
const existing = ref(1)
const source = { count: existing }
```

正确行为：

```ts
toRef(source, "count") === existing
```

如果再包一层，会变成：

```text
Ref<Ref<number>>
```

使用者需要写两次 `.value`，而且内部 RefImpl 还可能被当成普通对象继续代理。因此 `toRef` 应先读取属性，使用 `isRef` 判断，已经是 ref 就直接返回。

## ToRef 条件类型

源码起点已经准备：

```ts
type ToRef<T> = T extends Ref<unknown> ? T : Ref<T>
```

它表达：

```text
T 已经是 Ref → 保留 T
否则         → 包装成 Ref<T>
```

这叫条件类型，结构与 JavaScript 三元表达式相似，但发生在类型层面。

## toRefs 为什么能解决解构断开

直接解构 reactive 对象会取出当时的值：

```ts
const state = reactive({ name: "Ada", age: 20 })
const { name } = state
```

`name` 只是字符串，不再经过 `state.name` 的 Proxy getter。

使用 toRefs：

```ts
const references = toRefs(state)
const { name } = references

name.value // 每次仍读取 state.name
```

`toRefs` 不复制值，而是为每个属性调用 `toRef`。

## ToRefs 映射类型

```ts
type ToRefs<T extends object> = {
  [Key in keyof T]: ToRef<T[Key]>
}
```

逐段读：

```text
keyof T
→ 取得 T 的所有属性名

[Key in keyof T]
→ 逐个遍历这些属性名

ToRef<T[Key]>
→ 把该属性的值类型转换成对应 ref 类型
```

例如：

```text
{ name: string; age: number }
              ↓
{ name: Ref<string>; age: Ref<number> }
```

运行时也需要保留形状：对象返回对象，数组返回数组。

```ts
const result = Array.isArray(object)
  ? new Array(object.length)
  : {}
```

然后遍历 `Object.keys(object)`，为每个键保存 `toRef(object, key)`。

## proxyRefs 解决什么问题

toRefs 保留了连接，但模板或普通消费代码到处写 `.value` 很繁琐：

```ts
const source = {
  name: ref("Ada"),
  age: 20,
}
```

希望代理后：

```ts
user.name // "Ada"
user.age  // 20
```

get trap 可以组合已有工具：

```text
Reflect.get
→ unref(result)
→ ref 自动返回 .value，普通值原样返回
```

## proxyRefs 的 set 为什么有两个分支

假设源属性原来是 ref：

```ts
const name = ref("Ada")
const source = { name }
const user = proxyRefs(source)
```

赋普通值时：

```ts
user.name = "Grace"
```

通常希望保留原 ref，只修改：

```ts
name.value = "Grace"
```

赋入新 ref 时：

```ts
Reflect.set(user, "name", ref("Lin"))
```

这次希望替换整个属性。

set trap 的判断表：

| oldValue | newValue | 操作 |
| --- | --- | --- |
| ref | 非 ref | `oldValue.value = newValue`，返回 true |
| ref | ref | `Reflect.set` 替换属性 |
| 非 ref | 任意值 | `Reflect.set` 正常写入 |

先判断 `isRef(oldValue) && !isRef(newValue)`，其余情况统一 Reflect.set。

## ShallowUnwrapRef 类型

proxyRefs 运行时只解包对象第一层，因此返回类型也是浅层映射：

```ts
type ShallowUnwrapRef<T extends object> = {
  [Key in keyof T]: T[Key] extends Ref<infer Value>
    ? Value
    : T[Key]
}
```

`infer Value` 表示：如果属性类型符合 `Ref<某个类型>`，把里面的类型临时命名为 Value，并作为结果。

## getter-only computed 与可写 computed

已有 computed 只接收 getter：

```ts
const doubled = computed(() => count.value * 2)
```

它的公开类型是：

```ts
interface ComputedRef<T> {
  readonly value: T
}
```

可写 computed 接收对象：

```ts
const plusOne = computed({
  get: () => count.value + 1,
  set: (value: number) => {
    count.value = value - 1
  },
})
```

写入 `plusOne.value = 5` 的过程：

```text
ComputedRefImpl.set value(5)
→ 调用用户 setter(5)
→ setter 修改 count.value = 4
→ count 通知 computed 内部 effect
→ computed 缓存标记 dirty，并通知消费者
→ 消费 effect 重新读取 plusOne.value
→ getter 计算得到 5
```

computed setter 不直接改 computed 的 `_value`，也不直接设置 `_dirty`。它只负责把写入意图转换成源状态修改；缓存失效仍由已有 scheduler 链路完成。

## 函数重载为什么需要

两种调用形式返回的可写性不同：

```ts
computed(getter)  → ComputedRef<T>，value readonly
computed(options) → WritableComputedRef<T>，value 可写
```

源码起点已经提供两个重载签名。实现体只需判断 source 是函数还是 options 对象：

```text
函数 → getter = source，setter 不存在
对象 → getter = source.get，setter = source.set
```

然后把 getter 和可选 setter 传给 ComputedRefImpl。

## 检查点一：观察工具仍是空骨架

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/ref-utilities-computed.test.ts
```

起点预期：

```text
2 passed
13 failed
```

先观察：

- `unref(普通值)` 已能原样返回。
- `toRef` 初次读取快照正确，但源属性变化后不会同步。
- isRef 还不能识别任何 ref。
- proxyRefs 仍直接返回原对象。
- writable computed 能读取 getter，但写入失败。

请先回答：为什么不能用“对象是否有 value 属性”来判断 ref？普通业务对象会发生什么误判？

## 检查点二：实现 isRef 与 unref

1. 在 RefImpl 中写入 `ReactiveFlags.IS_REF = true`。
2. 在 ComputedRefImpl 中写入同一个标记。
3. `isRef` 先用 `isObject` 排除基本类型，再读取 Symbol。
4. `unref` 复用 `isRef`，是 ref 时返回 `.value`。

完成后预期：

```text
6 passed
9 failed
```

## 检查点三 A：实现 toRef 与 toRefs

1. 新建不导出的 ObjectRefImpl。
2. getter 读取 `object[key]`，setter 写回 `object[key]`。
3. toRef 先复用已有 ref，否则创建 ObjectRefImpl。
4. toRefs 根据输入创建对象或数组结果。
5. 遍历可枚举自有键，为每个键调用 toRef。

完成后预期：

```text
10 passed
5 failed
```

## 检查点三 B：实现 proxyRefs

使用 `new Proxy(objectWithRefs, { get, set })`：

- get：Reflect.get 后调用 unref。
- set：旧值是 ref、新值不是 ref时，写入 oldValue.value；其他情况 Reflect.set。
- 每个 trap 都要返回符合 Proxy 约定的结果。

完成后预期：

```text
13 passed
2 failed
```

## 检查点四：实现可写 computed

1. ComputedRefImpl 保存可选 setter。
2. 增加 `set value(newValue)`，有 setter 时调用它。
3. computed 实现体从 options 中取得 set。
4. 创建 ComputedRefImpl 时同时传入 getter 与 setter。
5. 不要在 computed setter 内直接修改缓存字段。

完成后起始测试应为：

```text
15 passed
```

## 检查点五：边界验收

起始测试通过后，我会补充：

- falsy ref 值的 isRef/unref。
- Symbol 属性的 toRef 与数组空位的 toRefs。
- proxyRefs 的普通属性转 ref、setter 返回值与 effect 联动。
- getter-only computed 的运行时写入边界。
- 可写 computed 的缓存、相同源值和 scheduler 行为。

## 本章暂不处理

- reactive 对象属性上的 ref 自动解包。
- `customRef`。
- computed 的调试回调。
- watch 的 ref/source 多种重载。

## 完成标准

- isRef 不会把普通 `{ value }` 对象误判成 ref。
- unref 能统一处理 ref、computed 与普通值。
- toRef/toRefs 始终桥接源属性，不复制快照。
- proxyRefs 读取与写入分支正确，保留旧 ref 身份。
- getter-only computed 保持只读类型与缓存。
- writable computed 通过 setter 修改源状态，并由原依赖链失效与通知。
- 前十六章测试继续通过。

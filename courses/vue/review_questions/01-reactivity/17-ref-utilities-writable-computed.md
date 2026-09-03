# 第十七章复习：ref 工具链与可写 computed

> 状态：已批改。原作答 3 题的核心结论均正确，其余题目已补充详细讲解。

## 1. 为什么 isRef 使用内部 Symbol，而不能只判断对象是否拥有 value 属性？

### 你的答案

因为普通对象可能存在value属性，使用value判断可能造成误判，而Symbol可以避免同名字符串属性

### 批改

结论：正确。

普通业务对象完全可以合法地拥有 `value` 属性，所以“存在 value 属性”只能说明对象的形状相似，不能证明它是由响应式系统创建的 ref。

本项目给真正的 ref、shallowRef 和 computed 添加同一个内部标记：

```ts
readonly [ReactiveFlags.IS_REF] = true
```

`isRef` 检查的是这个 Symbol 标记，而不是公开的字符串属性名。Symbol 不会与普通的 `"value"`、`"isRef"` 等业务属性意外重名，因此更适合作为框架内部身份标记。

需要补充一点：Symbol 的优势是避免意外命名冲突，并不是绝对防伪。如果外部代码能够取得同一个 Symbol，理论上仍可以伪造该标记；在当前项目中，它主要承担可靠的内部类型识别。

## 2. toRef 为什么必须桥接 object[key]，而不能直接返回 ref(object[key])？

请说明源对象更新、propertyRef 写入和依赖收集分别怎样工作。

### 你的答案


未作答，以下为详细讲解与参考答案。

### 讲解与参考答案

`ref(object[key])` 会在创建时读取一次属性值，并把这次读取的结果存入一个新的 `RefImpl`。新 ref 与原属性是两个独立的存储位置：

```text
object.count = 1
        ↓ 创建时复制数值
newRef.value = 1

之后 object.count 和 newRef.value 各自保存自己的值
```

因此，后续执行 `object.count = 2` 时，新 ref 仍然保存 `1`；执行 `newRef.value = 3` 时，也不会把 `3` 写回 `object.count`。这只是值快照，不是属性关联。

正确的 `toRef(object, key)` 会保存源对象和属性名。它本身不保存属性值：

```ts
get value() {
  return this.object[this.key]
}

set value(newValue) {
  this.object[this.key] = newValue
}
```

所以两个方向始终连通：

```text
源对象属性更新
object.count = 2
        ↓
countRef.value 重新读取 object.count，得到 2

关联 ref 更新
countRef.value = 3
        ↓
实际执行 object.count = 3
```

如果 `object` 是 reactive Proxy，读取 `countRef.value` 最终会执行 Proxy 的 get trap，于是依赖被收集到源对象的 `count` 属性；写入 `countRef.value` 则会执行 Proxy 的 set trap，由源属性通知对应 effect。`ObjectRefImpl` 因此不需要再维护一份自己的 dep。

如果 `object` 是普通对象，双向读写仍然有效，但普通对象没有 Proxy 拦截，所以属性变化不会自动触发 effect。


## 3. ToRef 条件类型与 ToRefs 映射类型分别解决什么类型问题？

请解释为什么已经是 ref 的属性要保持原类型，以及对象各属性如何转换。

### 你的答案


未作答，以下为详细讲解与参考答案。

### 讲解与参考答案

`ToRef<T>` 是条件类型：

```ts
type ToRef<T> = T extends Ref<unknown> ? T : Ref<T>
```

它根据传入属性是否已经是 ref 来选择结果：

```text
number       → Ref<number>
string       → Ref<string>
Ref<number>  → 仍然是 Ref<number>
```

如果不保留已有 ref，而是无条件写成 `Ref<T>`，那么一个 `Ref<number>` 属性在类型上会变成 `Ref<Ref<number>>`。这意味着调用者需要写两次 `.value`，也与运行时“复用已有 ref”的行为不一致。

`ToRefs<T>` 是映射类型：

```ts
type ToRefs<T extends object> = {
  [Key in keyof T]: ToRef<T[Key]>
}
```

它的执行思路是：

1. `keyof T` 取得对象的所有属性名。
2. `[Key in keyof T]` 逐个遍历这些属性名。
3. `T[Key]` 取得当前属性的值类型。
4. `ToRef<T[Key]>` 决定该属性要创建新 ref，还是保留已有 ref。

例如：

```ts
type Source = {
  name: string
  age: number
  count: Ref<number>
}
```

经过 `ToRefs<Source>` 后，相当于：

```ts
type Result = {
  name: Ref<string>
  age: Ref<number>
  count: Ref<number>
}
```

条件类型与映射类型只负责 TypeScript 编译期间的类型描述；运行时仍要通过 `isRef`、`ObjectRefImpl` 和属性遍历真正创建结果。


## 4. proxyRefs 的 set trap 为什么要区分“旧值是 ref、新值不是 ref”和其他情况？

请分别说明写普通值与写入新 ref 后，源对象属性保存的是什么。

### 你的答案

当旧值为ref新值不是ref时，则将使用新值更新旧的ref中的值，此时源对象存储的还是源ref，但是值已经更换为新值
往旧值不为ref或新值为ref时，则直接将新值与旧值替换即可，此时源对象存储的直接就是新值

### 批改

结论：正确。

你的两个分支判断是完整的。可以进一步整理成下面的规则：

```text
旧值是 ref + 新值不是 ref
→ oldValue.value = newValue
→ 保留旧 ref 的对象身份，只更新内部值

其他情况
→ Reflect.set(target, key, newValue, receiver)
→ 直接替换源对象上的属性
```

第一种情况保留旧 ref 很重要，因为其他代码或 effect 可能仍持有这个 ref。如果直接把源属性替换为普通值，这些引用关系就会断开。

当新值本身是 ref 时，调用者表达的是“我要换一个 ref 容器”，所以必须替换整个属性，不能把新 ref 塞进旧 ref 的 `.value`，否则会形成不需要的嵌套 ref。

另外，Proxy 的 set trap 必须返回布尔值。更新 `oldValue.value` 的分支应返回 `true`，其他分支直接返回 `Reflect.set` 的结果。

## 5. 写入可写 computed.value 后，为什么 computed setter 不应该直接修改 `_value` 或 `_dirty`？

请从 setter 修改源状态开始，追踪到 computed 失效和消费 effect 更新。

### 你的答案

setter应该只用来修改源状态，随后通知computed的effect，将其标记为dirty，在下次读取时重新执行对应的getter

### 批改

结论：核心正确，但原答案少了通知消费 effect 的后半段。

完整链路如下：

```text
写入 computed.value
→ ComputedRefImpl 的 set value 调用用户 setter
→ 用户 setter 修改 count.value 等源状态
→ 源状态通知 computed 内部的 ReactiveEffect
→ computed 的 scheduler 将 _dirty 改为 true
→ computed 通过自己的 dep 通知读取过它的消费 effect
→ 消费 effect 重新执行并读取 computed.value
→ 因为 _dirty 为 true，computed getter 重新计算并缓存结果
```

setter 不应该直接修改 `_value`，因为 `_value` 是 getter 根据源状态计算出来的缓存，不是独立的源状态。直接赋值可能让缓存结果与真实源状态不一致。

setter 也不应该直接修改 `_dirty` 或主动通知消费 effect。缓存是否失效应该由“源状态是否真的变化”决定。例如 setter 最终给源 ref 写入相同值时，源 ref 不会触发；此时现有缓存仍然有效，也不应重复通知消费 effect。让原依赖链负责失效，可以避免重复触发和错误的缓存状态。

## 6. getter-only computed 与可写 computed 为什么需要不同的 TypeScript 返回类型？

请说明函数重载怎样让一种 value 为 readonly，另一种允许赋值。

### 你的答案


未作答，以下为详细讲解与参考答案。

### 讲解与参考答案

两种 computed 在运行时都可以由 `ComputedRefImpl` 实现，但它们对调用者提供的能力不同：

```ts
interface ComputedRef<T> {
  readonly value: T
}

interface WritableComputedRef<T> extends Ref<T> {}
```

getter-only computed 没有用户提供的 setter，因此公开类型应把 `value` 标记为 `readonly`，让 TypeScript 在编译阶段阻止无意义的赋值：

```ts
const doubled = computed(() => count.value * 2)
doubled.value = 10 // TypeScript 应报错
```

可写 computed 同时提供 get 和 set，因此返回类型必须允许写入：

```ts
const plusOne = computed({
  get: () => count.value + 1,
  set: value => {
    count.value = value - 1
  },
})

plusOne.value = 10 // 类型合法
```

函数重载根据参数形状为两种调用方式选择不同返回类型：

```ts
function computed<T>(getter: () => T): ComputedRef<T>

function computed<T>(
  options: WritableComputedOptions<T>,
): WritableComputedRef<T>
```

当参数是函数时，TypeScript 匹配第一个重载，返回只读的 `ComputedRef<T>`；当参数是 `{ get, set }` 对象时，匹配第二个重载，返回可写的 `WritableComputedRef<T>`。

实现体仍然可以统一返回 `ComputedRefImpl`：它接收一个可选 setter。重载负责限制调用者能做什么，内部的可选 setter 负责决定运行时写入是否有实际操作。

因此这里要区分两个层面：

```text
TypeScript 类型层面：getter-only 的 value 禁止赋值
JavaScript 运行时层面：统一实例中的可选 setter 决定是否处理写入
```

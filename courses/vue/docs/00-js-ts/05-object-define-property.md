# 05. Object.defineProperty 与属性描述符

> 所属大章节：`00. JS/TS 基础`
>
> 当前用途：理解第十五章为什么用不可枚举的内部属性保存 `markRaw` 标记。

平时给对象增加属性，我们通常直接赋值：

```ts
const user = {}
user.name = "Ada"
```

这种写法只告诉 JavaScript“属性值是什么”。`Object.defineProperty` 可以进一步规定：这个属性能不能修改、会不会被枚举、能不能被删除或重新定义。

## 本课目标

- 理解“属性值”和“属性配置”是两层信息。
- 认识属性描述符中的 `value`、`writable`、`enumerable`、`configurable`。
- 理解普通赋值与 `Object.defineProperty` 的默认配置不同。
- 使用 `Object.getOwnPropertyDescriptor` 查看属性配置。
- 区分 `Object.keys`、`Object.getOwnPropertyNames` 与 `Reflect.ownKeys`。
- 使用 `Reflect.set`、`Reflect.deleteProperty` 安全观察操作是否成功。
- 初步认识 getter/setter 访问器描述符。
- 把这些知识连接到第十五章的 `markRaw`。

## 1. 属性不只有一个值

下面的 `name` 看起来只有字符串值：

```ts
const user = {
  name: "Ada",
}
```

JavaScript 实际上还保存了这项属性的配置。可以查看：

```ts
Object.getOwnPropertyDescriptor(user, "name")
```

结果近似：

```ts
{
  value: "Ada",
  writable: true,
  enumerable: true,
  configurable: true,
}
```

可以把一项数据属性理解为：

```text
属性 name
├─ value:        当前保存的值
├─ writable:     能否修改 value
├─ enumerable:   是否参加常见枚举
└─ configurable: 能否删除或重新配置
```

这个对象就是“属性描述符”。

## 2. 四个配置分别控制什么

### value：属性保存的值

```ts
Object.defineProperty(user, "role", {
  value: "student",
})
```

此时：

```ts
user.role // "student"
```

### writable：能否修改 value

```ts
Object.defineProperty(user, "id", {
  value: 1,
  writable: false,
})
```

`writable: false` 表示不能把 `id` 从 1 改成 2。

在 ES Module 或严格模式中，直接赋值可能抛出 `TypeError`。为了在实验中明确得到成功或失败，可以使用：

```ts
const didSet = Reflect.set(user, "id", 2)

didSet  // false
user.id // 1
```

`Reflect.set` 返回布尔值，不需要靠捕获异常判断。

### enumerable：是否参与常见枚举

```ts
Object.defineProperty(user, "internalId", {
  value: "secret-1",
  enumerable: false,
})
```

属性仍然可以直接读取：

```ts
user.internalId // "secret-1"
```

但是它不出现在 `Object.keys` 中：

```ts
Object.keys(user)
```

所以“不可枚举”不等于“属性不存在”，更不等于“属性无法读取”。它只是不会参加某些列举操作。

### configurable：能否删除或重新配置

```ts
Object.defineProperty(user, "kind", {
  value: "learner",
  configurable: false,
})
```

尝试删除：

```ts
Reflect.deleteProperty(user, "kind") // false
```

尝试把它改成可枚举属性，通常会抛出 `TypeError`：

```ts
Object.defineProperty(user, "kind", {
  enumerable: true,
})
```

`configurable: false` 是非常强的限制。设置前要谨慎，因为之后大部分描述符配置不能再改变。

## 3. 最容易踩坑：defineProperty 中省略的布尔值默认是 false

普通赋值创建的属性通常是：

```ts
const target = {}
Reflect.set(target, "normal", 1)

// writable: true
// enumerable: true
// configurable: true
```

而下面只写 `value`：

```ts
Object.defineProperty(target, "hidden", {
  value: 1,
})
```

没有写出的三个布尔配置默认都是 `false`：

```ts
{
  value: 1,
  writable: false,
  enumerable: false,
  configurable: false,
}
```

对比：

| 创建方式 | writable | enumerable | configurable |
| --- | --- | --- | --- |
| 普通赋值 | true | true | true |
| defineProperty 只写 value | false | false | false |

这也是第十五章中必须认真考虑 `configurable` 的原因。不要把“省略配置”理解成“使用普通属性的默认值”。

## 4. 如何查看一个属性的描述符

推荐变量名：

```ts
const descriptor = Object.getOwnPropertyDescriptor(target, "hidden")
```

如果属性不存在，结果是 `undefined`；因此 TypeScript 会要求你考虑这种情况：

```ts
descriptor?.enumerable
```

也可以先判断：

```ts
if (descriptor) {
  console.log(descriptor.enumerable)
}
```

变量名建议：

| 含义 | 推荐名称 |
| --- | --- |
| 被定义属性的对象 | `target` |
| 属性描述符 | `descriptor` |
| 写入是否成功 | `didSet` |
| 删除是否成功 | `didDelete` |
| 内部不可枚举键 | `internalKey` |
| 访问器内部保存的值 | `currentValue` |

## 5. 不同的“列出属性”方法

假设对象有三种键：

```ts
const token = Symbol("token")
const target = { visible: 1 }

Object.defineProperty(target, "hidden", {
  value: 2,
  enumerable: false,
})

Object.defineProperty(target, token, {
  value: 3,
  enumerable: false,
})
```

结果不同：

```text
Object.keys(target)
→ 自有 + 可枚举 + 字符串键
→ ["visible"]

Object.getOwnPropertyNames(target)
→ 自有 + 所有字符串键
→ ["visible", "hidden"]

Reflect.ownKeys(target)
→ 自有 + 字符串键与 Symbol 键
→ ["visible", "hidden", Symbol(token)]
```

所以不可枚举属性并不是完全隐藏。`Reflect.ownKeys` 仍然可以看到它。

## 6. Object.keys 为什么看不到 markRaw 的内部标记

第十五章准备使用：

```ts
Object.defineProperty(value, ReactiveFlags.SKIP, {
  value: true,
  configurable: true,
})
```

这里没有写 `enumerable`，所以它默认是 false。并且键本身还是 Symbol：

```text
SKIP 标记
├─ 是自有属性
├─ 可以通过 Reflect.get 读取
├─ 不出现在 Object.keys 中
└─ 不会混进用户看到的普通业务键
```

第十章中，`Object.keys(state)` 会订阅对象结构。如果内部标记是可枚举字符串属性，用户可能看到一个不属于业务数据的键。不可枚举 Symbol 让内部元数据尽量不污染业务结构。

注意：`Reflect.ownKeys` 会列出 Symbol，即使它不可枚举。“内部”表示普通业务枚举不会看到，不表示绝对无法检查。

## 7. 为什么 markRaw 会明确写 configurable: true

如果只写：

```ts
Object.defineProperty(value, ReactiveFlags.SKIP, {
  value: true,
})
```

那么 `configurable` 默认是 false。标记一旦创建就无法正常删除或重新配置。

本项目会明确写：

```ts
configurable: true
```

这样仍保持 `enumerable: false`，同时给测试、调试或未来内部调整留出删除标记的可能。

`writable` 可以继续保持 false，因为 SKIP 的含义一旦写入，不希望普通赋值把它改回 false。

## 8. defineProperty 的返回值

`Object.defineProperty` 修改成功后返回传入的对象本身：

```ts
const result = Object.defineProperty(target, "count", {
  value: 1,
})

result === target // true
```

但为了让 `markRaw` 的意图更直接，本项目仍会在函数末尾明确：

```ts
return value
```

这样无论本次是否需要创建标记，`markRaw` 都稳定返回输入。

## 9. 数据描述符与访问器描述符

目前主要使用的是“数据描述符”：

```ts
{
  value: 1,
  writable: true,
}
```

另一类是“访问器描述符”，它不直接提供 `value`，而是提供函数：

```ts
let currentValue = 1

Object.defineProperty(target, "count", {
  get() {
    return currentValue
  },
  set(newValue: number) {
    currentValue = newValue
  },
  enumerable: true,
  configurable: true,
})
```

读取 `target.count` 会执行 getter，赋值会执行 setter。

同一个描述符不能同时混用两组定义：

```ts
// 错误：数据描述符和访问器描述符混用
{
  value: 1,
  get() {
    return 1
  },
}
```

本章只要求认识访问器描述符，`markRaw` 使用的仍是数据描述符。

## 10. 与 Proxy 的区别

`Object.defineProperty` 配置的是某个对象上的某个属性；Proxy 拦截的是对整个对象进行的多种操作：

```text
Object.defineProperty
→ 定义 count 这个属性本身怎样表现

new Proxy(target, handlers)
→ 拦截 target 上未来发生的 get、set、delete、ownKeys 等操作
```

早期 Vue 2 主要通过 getter/setter 描述符实现响应式；当前课程学习的是 Vue 3 风格的 Proxy 响应式。本章使用 `defineProperty` 只是为了保存内部元数据，不是把整个响应式系统改回 getter/setter 方案。

## 基础检查点一：预测属性配置

先不要打开实验页，预测：

```ts
const target = {}

Object.defineProperty(target, "internal", {
  value: 1,
})

console.log(target.internal)
console.log(Object.keys(target))
console.log(Reflect.set(target, "internal", 2))
console.log(Reflect.deleteProperty(target, "internal"))
console.log(target.internal)
```

请按顺序写出 5 个结果，并分别用 `value`、`writable`、`enumerable`、`configurable` 解释。

## 基础检查点二：运行 Playground

打开目录中的“Object.defineProperty”实验页：

1. 点击“定义两种属性”。
2. 比较普通赋值属性和只写 value 的描述符。
3. 点击“尝试修改与删除”，观察 `Reflect.set` 与 `Reflect.deleteProperty` 返回值。
4. 点击“创建 markRaw 风格标记”，观察该属性可读取但不进入 Object.keys。

完成后，用自己的话说明：**属性存在、属性可枚举、属性可修改是三个不同问题。**

## 基础检查点三：连接回第十五章

阅读下面的目标描述符：

```ts
{
  value: true,
  configurable: true,
}
```

回答：`writable` 和 `enumerable` 实际分别是什么？为什么这里适合省略它们，但不适合省略 `configurable`？

完成这三个检查点后再继续第十五章检查点一。

## 本课暂不深入

- 属性描述符的全部 ECMAScript 规范算法。
- 不可配置属性仍允许的极少数转换。
- Proxy 的 `defineProperty` trap 与完整不变量。
- Vue 2 响应式源码。
- 装饰器与 class 字段的描述符细节。

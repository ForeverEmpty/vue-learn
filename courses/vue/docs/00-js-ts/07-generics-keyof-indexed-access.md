# 07. 泛型、约束、keyof 与索引访问类型

> 所属大章节：`00. JS/TS 基础`
>
> 当前用途：理解 `Ref<T>`、`T extends object`、`Key extends keyof T` 和 `T[Key]`。

泛型不是“把类型写得更复杂”，而是在多个位置之间保存类型关系。只写 `unknown` 能表示“什么都可能传入”，但会丢失输入与输出的联系；泛型可以把这种联系保留下来。

## 本课目标

- 理解泛型参数是编译时的类型变量。
- 区分“接收任意类型”和“保存输入输出关系”。
- 使用 `extends` 给泛型添加约束。
- 使用 `keyof` 取得对象允许的键。
- 使用 `T[K]` 取得某个属性对应的类型。
- 使用类型位置的 `typeof` 从已有值取得类型。
- 取得数组、元组元素类型。
- 看懂第 17 章 `toRef` 的完整函数签名。

## 1. 为什么 unknown 不能代替泛型

下面的函数可以接收任何值：

```ts
function identity(value: unknown): unknown {
  return value
}
```

但调用后信息丢失了：

```ts
const result = identity("Ada")
// result 是 unknown，不再知道它是 string
```

泛型写法：

```ts
function identity<T>(value: T): T {
  return value
}
```

调用时，TypeScript 可以推断 T：

```text
identity("Ada")
→ T 推断为 string
→ 参数类型是 string
→ 返回类型也是 string
```

这里真正重要的不是“能传入任意值”，而是“返回类型与传入类型相同”。

## 2. 泛型参数如何命名

很短的局部泛型常使用：

- `T`：某个通用类型。
- `K`：键类型。
- `V`：值类型。

关系复杂时，完整名称更容易理解：

```ts
function readProperty<Target, Key>(target: Target, key: Key) {
  // ...
}
```

第 17 章使用 `Target` 和 `Key`，因为它们比多个单字母更适合学习源码。

## 3. 泛型约束 extends

没有约束的 T 可能是任何类型，所以不能假定它有属性：

```ts
function getLength<T>(value: T): number {
  return value.length // 错误：T 不一定有 length
}
```

添加约束：

```ts
function getLength<T extends { length: number }>(value: T): number {
  return value.length
}
```

`extends` 在这里不是 class 继承，而是说：T 必须满足右侧结构。

```text
T 可以比约束包含更多信息
但至少必须拥有 length: number
```

例如：

```ts
getLength("Ada")       // string 有 length
getLength([1, 2, 3])   // 数组有 length
getLength({ size: 3 }) // 错误：没有 length
```

## 4. keyof：得到对象键的联合类型

```ts
type User = {
  name: string
  age: number
}

type UserKey = keyof User
// "name" | "age"
```

`keyof User` 不是在运行时调用 `Object.keys`。它只在类型层面产生允许的键类型。

两者不能混为一谈：

```text
keyof T
→ 编译时类型运算
→ 不产生数组

Object.keys(value)
→ 运行时 JavaScript
→ 返回 string[]
```

## 5. 索引访问类型 T[K]

类型也可以像对象一样通过键“取属性”：

```ts
type UserName = User["name"] // string
type UserAge = User["age"]   // number
```

如果键是联合类型，结果也是对应属性类型的联合：

```ts
type UserValue = User[keyof User]
// string | number
```

## 6. 把 keyof 与 T[K] 组合起来

先看不安全版本：

```ts
function getProperty(target: object, key: string): unknown {
  return Reflect.get(target, key)
}
```

问题有两个：

1. key 可以是对象不存在的任意字符串。
2. 返回值退化成 unknown，无法知道不同 key 对应什么类型。

安全版本：

```ts
function getProperty<
  Target extends object,
  Key extends keyof Target,
>(target: Target, key: Key): Target[Key] {
  return target[key]
}
```

调用过程：

```ts
const user = { name: "Ada", age: 20 }

const name = getProperty(user, "name") // string
const age = getProperty(user, "age")   // number
getProperty(user, "missing")          // 编译错误
```

类型关系是：

```text
Target 从 user 推断
→ { name: string; age: number }

Key 必须属于 keyof Target
→ "name" | "age"

返回 Target[Key]
→ key 为 "name" 时得到 string
→ key 为 "age" 时得到 number
```

## 7. 看懂 toRef 的签名

```ts
function toRef<T extends object, Key extends keyof T>(
  object: T,
  key: Key,
): ToRef<T[Key]>
```

逐段翻译：

```text
T extends object
→ 第一个参数必须是对象

Key extends keyof T
→ 第二个参数必须是 T 真正拥有的键

T[Key]
→ 找到这个键对应的属性类型

ToRef<T[Key]>
→ 再决定属性类型应包装成 ref，还是复用已有 ref
```

例如：

```ts
const state = {
  count: 1,
  name: "Ada",
}

toRef(state, "count") // Ref<number>
toRef(state, "name")  // Ref<string>
```

## 8. 类型位置中的 typeof

JavaScript 中的 `typeof value` 返回运行时字符串。TypeScript 也允许在类型位置取得某个变量的静态类型：

```ts
const defaultUser = {
  name: "Ada",
  age: 20,
}

type User = typeof defaultUser
```

不要把两种用途混淆：

```text
if (typeof value === "string")
→ JavaScript 运行时检查，也帮助 TypeScript 收窄

type User = typeof defaultUser
→ TypeScript 类型查询，编译后消失
```

## 9. 数组与元组的索引访问

数组元素类型可以通过 `number` 取出：

```ts
type Names = string[]
type Name = Names[number] // string
```

结合 typeof：

```ts
const statuses = ["idle", "loading", "success"] as const
type Status = (typeof statuses)[number]
// "idle" | "loading" | "success"
```

步骤：

```text
typeof statuses
→ readonly ["idle", "loading", "success"]

(typeof statuses)[number]
→ 用任意数字索引取得元素类型
→ 三个字面量组成的联合
```

元组还能取指定位置：

```ts
type Pair = [string, number]
type First = Pair[0]  // string
type Second = Pair[1] // number
```

## 10. keyof 的数字键和字符串键

JavaScript 对象键最终是 string 或 symbol，数字属性访问通常会转成字符串。但 TypeScript 为数组和数字索引保留了更具体的规则。

不要简单认为 `keyof T` 永远只是 string。通用底层代码通常用：

```ts
type PropertyKey = string | number | symbol
```

而具体对象 API 应优先使用 `keyof Target`，让参数被真实对象结构限制。

## 11. 泛型默认值

泛型也可以提供默认类型：

```ts
interface Result<Data = unknown> {
  data: Data
  ok: boolean
}
```

```ts
const unknownResult: Result = { data: "anything", ok: true }
const userResult: Result<User> = { data: defaultUser, ok: true }
```

默认值适合“调用者经常可以省略，并且存在安全通用类型”的情况，不应为了少写类型而默认成 any。

## 12. 常见错误

### 泛型参数只出现一次

```ts
function log<T>(value: T): void {
  console.log(value)
}
```

如果 T 只出现一次且函数不使用它建立关系，直接用 unknown 往往更清楚。泛型的主要价值是连接多个类型位置。

### 约束后误以为 T 就等于约束

`T extends { length: number }` 表示 T 至少满足这个结构，T 仍会保留调用值的其他属性。

### 使用 key: string 丢失属性关系

对象属性工具通常应思考 `Key extends keyof Target`，而不是直接把 key 写成 string。

## 13. 推荐变量和类型参数名

| 含义 | 推荐名称 |
| --- | --- |
| 通用输入类型 | `T`、`Value` |
| 源对象类型 | `Target`、`Source` |
| 属性键类型 | `Key` |
| 返回数据类型 | `Result`、`Output` |
| 被读取对象 | `target`、`source` |
| 属性键 | `key` |

## 检查点一：解释 identity

说明 `identity<T>(value: T): T` 相比 `(value: unknown) => unknown` 多保存了什么信息。

## 检查点二：分析 getProperty

对下面三次调用，分别写出 Target、Key 和返回类型：

```ts
const state = { count: 1, title: "Vue" }

getProperty(state, "count")
getProperty(state, "title")
getProperty(state, "missing")
```

## 检查点三：连接第 17 章

用自己的话逐段翻译：

```ts
function toRef<T extends object, Key extends keyof T>(
  object: T,
  key: Key,
): ToRef<T[Key]>
```

## 本课暂不深入

- 泛型型变的完整理论。
- const 类型参数。
- 高阶泛型和 higher-kinded types 模拟。
- 编译器对泛型推断的全部优先级规则。


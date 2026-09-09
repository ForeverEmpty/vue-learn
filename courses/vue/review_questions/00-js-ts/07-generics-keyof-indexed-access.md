# 07. 泛型、约束、keyof 与索引访问类型：复习题

> 状态：已批改。第 2 题的补充理解已直接写入批改说明。

## 1. 泛型和 unknown 都能接收不同类型的值，但二者保存的信息有什么区别？

### 你的答案

unknown不会保存传入参数的类型，在使用前要进行约束，而泛型会保存传入参数的类型

### 批改

结论：核心正确。

更准确地说，`unknown` 会让返回值只保留“类型尚未确定”这一信息；使用前需要进行运行时检查和类型收窄，而不是“进行约束”。泛型 `T` 则由 TypeScript 在本次调用中推断，并把同一个类型关系连接到参数、返回值或其他位置。

```ts
function unknownIdentity(value: unknown): unknown {
  return value
}

function genericIdentity<T>(value: T): T {
  return value
}

const first = unknownIdentity("Ada") // unknown
const second = genericIdentity("Ada") // string
```

这里的“保存”是编译期间保留类型关系，不是在运行时额外保存一份类型数据。

## 2. `T extends { length: number }` 表达的是“T 等于这个对象类型”，还是“T 至少满足这个结构”？这一区别会怎样影响返回类型？

### 你的答案

表达的是T至少满足这个结构
T 等于这个对象类型 为 T必须为该种形式
T 至少满足这个结构 为 T中拥有该属性即可

T只是约束了拥有该属性，而非只保留该属性，返回值本身具有的属性依旧存在

### 批改

结论：前半部分正确，但还没有回答“怎样影响返回类型”。

约束只规定 T 的最低要求，不会把 T 强制替换成约束本身。因此，调用值在满足 `length: number` 之外拥有的其他属性，以及它自身更具体的类型信息，仍然能够被保留。

```ts
function preserve<T extends { length: number }>(value: T): T {
  return value
}

const result = preserve({
  length: 3,
  name: "Vue",
})
```

如果 T 只是等于 `{ length: number }`，返回结果将只知道 length；但这里的 T 是实际传入对象的完整类型，所以 `result.name` 仍然是合法的 string。

因此，`preserve` 的返回值仍保留 `name`，而不会只剩下 `length`。

## 3. 请逐段解释 `Key extends keyof Target` 与 `Target[Key]`，并说明它们为什么要一起使用。

### 你的答案

keyof Target 为 得到Target键的联合类型
Key extends keyof Target Key要满足Target键的联合类型
Target[Key] 为得到Target键对应的类型
一起使用可以得到对象类型 T 中，键 Key 对应的属性类型

### 批改

结论：正确。

补充二者各自承担的责任：`Key extends keyof Target` 先限制 key 必须真实存在，防止传入 `"missing"`；`Target[Key]` 再根据已经验证的具体键计算对应属性类型。前者保证键安全，后者保证返回类型精确。

## 4. `(typeof statuses)[number]` 怎样从一个 `as const` 数组得到字面量联合类型？

### 你的答案


未作答，以下为详细讲解与参考答案。

### 讲解与参考答案

```ts
const statuses = ["idle", "loading", "success"] as const
```

第一步，`as const` 让数组元素保留字面量类型，并把数组推断成只读元组：

```ts
readonly ["idle", "loading", "success"]
```

第二步，类型位置中的 `typeof statuses` 取得变量的静态类型：

```ts
type StatusTuple = typeof statuses
// readonly ["idle", "loading", "success"]
```

第三步，`[number]` 是索引访问类型，表示取得这个元组在任意数字下标处可能得到的元素类型：

```text
下标 0 → "idle"
下标 1 → "loading"
下标 2 → "success"
```

因此：

```ts
type Status = (typeof statuses)[number]
// "idle" | "loading" | "success"
```

这里的 `[number]` 不是运行时读取属性，而是编译时类型运算。没有 `as const` 时，数组通常会被推断为 `string[]`，最终只能得到 `string`，无法保留三个具体字面量。


## 5. 为什么第 17 章的 `toRef` 用泛型关系，而不能简单写成 `(object: object, key: string) => Ref<unknown>`？

### 你的答案

会丢失传入参数的类型，并且key不一定是object中的属性

### 批改

结论：正确。

`key: string` 允许传入对象中不存在的任意字符串，`Ref<unknown>` 又会丢失属性值的具体类型。使用泛型关系后，`Key extends keyof T` 负责限制合法属性名，`T[Key]` 负责取得该属性的具体类型，最终才能让 `toRef(state, "count")` 返回 `Ref<number>`，而不是只能得到 `Ref<unknown>`。

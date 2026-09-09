# 08. 映射类型、修饰符与工具类型

> 所属大章节：`00. JS/TS 基础`
>
> 当前用途：理解 `ToRefs<T>` 怎样逐个转换对象属性，以及常用工具类型怎样工作。

当一个新类型与旧类型拥有相同或相关的属性名，只是属性值、只读性或可选性发生变化时，逐项手写会重复且容易漏改。映射类型可以描述“遍历每个键并生成新属性”的规则。

## 本课目标

- 理解映射类型是在类型层面遍历属性键。
- 使用 `[Key in keyof T]` 保留对象结构。
- 使用 `T[Key]` 读取每个属性的值类型。
- 添加或移除 `readonly`、`?` 修饰符。
- 理解 `Partial`、`Required`、`Readonly`、`Pick`、`Omit`、`Record`。
- 使用 `as` 重新映射属性键。
- 使用模板字面量类型生成新属性名。
- 区分类型转换与运行时对象转换。

## 1. 从重复手写开始

源类型：

```ts
interface User {
  name: string
  age: number
  active: boolean
}
```

如果需要一个所有属性都可选的编辑对象，可以手写：

```ts
interface UserPatch {
  name?: string
  age?: number
  active?: boolean
}
```

问题是 User 增加字段后，UserPatch 可能忘记同步。真正想表达的规则是：

```text
遍历 User 的每个键
→ 保留原来的值类型
→ 把属性改成可选
```

## 2. 最基本的映射类型

```ts
type Optional<T> = {
  [Key in keyof T]?: T[Key]
}
```

逐段解释：

```text
keyof T
→ 得到 T 的键联合

Key in keyof T
→ 让 Key 依次代表这些键

T[Key]
→ 读取当前键对应的值类型

?:
→ 生成的属性是可选属性
```

`Optional<User>` 就会自动得到与 User 同步的可选结构。

## 3. 看懂第 17 章 ToRefs

```ts
type ToRefs<T extends object> = {
  [Key in keyof T]: ToRef<T[Key]>
}
```

假设：

```ts
type State = {
  count: number
  title: string
}
```

类型系统可以按下面的思路理解：

```text
Key = "count"
→ T[Key] = number
→ ToRef<number> = Ref<number>

Key = "title"
→ T[Key] = string
→ ToRef<string> = Ref<string>
```

最终结果：

```ts
type StateRefs = {
  count: Ref<number>
  title: Ref<string>
}
```

映射类型负责对所有键重复应用一条规则，`ToRef` 负责决定单个值怎样转换。

## 4. 属性修饰符

### 添加 readonly

```ts
type ReadonlyObject<T> = {
  readonly [Key in keyof T]: T[Key]
}
```

### 添加可选

```ts
type OptionalObject<T> = {
  [Key in keyof T]?: T[Key]
}
```

### 明确移除 readonly

```ts
type Mutable<T> = {
  -readonly [Key in keyof T]: T[Key]
}
```

### 明确移除可选

```ts
type Complete<T> = {
  [Key in keyof T]-?: T[Key]
}
```

`+readonly`、`+?` 也可以明确表示添加；加号通常省略。

## 5. 同态映射会保留已有修饰符

下面这种直接遍历 `keyof T` 的形式通常会保留 T 原有的 readonly 和可选修饰符：

```ts
type Clone<T> = {
  [Key in keyof T]: T[Key]
}
```

如果目标是强制改变修饰符，应明确写 `readonly`、`?`、`-readonly` 或 `-?`。

这也是阅读高级类型时需要检查的问题：新类型只改变值类型，还是也改变属性修饰符？

## 6. 常用工具类型的原理

### Partial

```ts
type Partial<T> = {
  [Key in keyof T]?: T[Key]
}
```

### Required

```ts
type Required<T> = {
  [Key in keyof T]-?: T[Key]
}
```

### Readonly

```ts
type Readonly<T> = {
  readonly [Key in keyof T]: T[Key]
}
```

### Pick

```ts
type Pick<T, Keys extends keyof T> = {
  [Key in Keys]: T[Key]
}
```

`Keys` 被限制为 T 的真实键，因此不能挑选不存在的属性。

### Record

概念上可以理解为：

```ts
type StringRecord<Keys extends PropertyKey, Value> = {
  [Key in Keys]: Value
}
```

例如：

```ts
type Status = "idle" | "loading" | "success"
type StatusText = Record<Status, string>
```

StatusText 必须给三个状态都提供字符串。

### Omit

Omit 可以理解为“先从 keyof T 中排除部分键，再 Pick 剩余键”：

```ts
type UserWithoutId = Omit<User, "id">
```

其中用到了下一章会学习的条件类型工具 `Exclude`。

## 7. 键重映射 as

映射类型不仅能保留旧键，还能生成新键：

```ts
type Getters<T> = {
  [Key in keyof T as `get${Capitalize<string & Key>}`]: () => T[Key]
}
```

对：

```ts
type User = {
  name: string
  age: number
}
```

会生成：

```ts
type UserGetters = {
  getName: () => string
  getAge: () => number
}
```

这里组合了：

- `Key in keyof T`：遍历键。
- `as`：把当前键改成另一个键。
- 模板字面量类型：拼接字符串。
- `Capitalize`：把首字母转换为大写。
- `string & Key`：只保留能参与字符串模板的键部分。

## 8. 通过 never 过滤键

键重映射为 never 时，该键会被删除：

```ts
type RemoveId<T> = {
  [Key in keyof T as Key extends "id" ? never : Key]: T[Key]
}
```

```text
Key 是 "id"
→ 新键为 never
→ 不生成该属性

其他 Key
→ 新键仍是 Key
→ 保留属性
```

这已经开始组合条件类型；下一章会详细解释为什么 never 能用于过滤联合成员。

## 9. 只选择某种值类型的属性

下面的高级类型先生成“符合条件的键”，再从源对象中挑选这些键：

```ts
type KeysMatching<T, Expected> = {
  [Key in keyof T]-?: T[Key] extends Expected ? Key : never
}[keyof T]
```

对于：

```ts
type Model = {
  id: number
  name: string
  enabled: boolean
}
```

`KeysMatching<Model, string>` 的计算过程：

```text
第一步映射：
{
  id: never
  name: "name"
  enabled: never
}

第二步用 [keyof T] 取所有属性值：
never | "name" | never

第三步 never 从联合中消失：
"name"
```

不要急着背这段写法。先按“逐键映射 → 取得结果联合 → 去掉 never”三步阅读。

## 10. 类型转换不会转换运行时对象

```ts
type StateRefs = ToRefs<State>
```

这行代码只生成类型，不会创建任何 ref。真正的运行时转换仍需要：

```ts
const stateRefs = toRefs(state)
```

类型与实现应描述相同规则：

```text
ToRefs<T>
→ 告诉编译器返回对象长什么样

toRefs(object)
→ 运行时遍历对象并真正创建关联 ref
```

如果二者不一致，类型断言可能暂时骗过编译器，但运行时仍会出错。

## 11. 浅层与递归映射

普通 Readonly、Partial 和本章的 ToRefs 都只直接映射当前层：

```ts
type ShallowReadonly<T> = {
  readonly [Key in keyof T]: T[Key]
}
```

递归版本需要在每个属性上再次应用自己：

```ts
type DeepReadonly<T> = {
  readonly [Key in keyof T]: DeepReadonly<T[Key]>
}
```

但真实的递归类型通常还要单独处理函数、数组、Map、Set 和基本类型。简单递归只是帮助理解，不代表生产级完整实现。

## 12. 常见错误

### 把映射类型当作循环代码

它不会在运行时执行，也不能产生对象实例。

### 无意中改变可选或 readonly

阅读映射类型时，同时检查键、值类型和修饰符三个部分。

### 过早写复杂的一行类型

复杂类型先拆成中间步骤并命名，例如先求 KeysMatching，再使用 Pick。可读性比少写几行更重要。

### 用 Record<PropertyKey, unknown> 表示任何对象

它表示对象能接受所有 string、number、symbol 键，并不是普通 `object` 的同义词。第 17 章中数组不满足如此宽的索引签名，就是这个区别的实际例子。

## 13. 推荐类型名

| 含义 | 推荐名称 |
| --- | --- |
| 转换后的对象 | `Mapped`、`Result` |
| 当前属性键 | `Key` |
| 允许选择的键 | `Keys` |
| 期望匹配的值类型 | `Expected` |
| 移除只读后的类型 | `Mutable<T>` |
| 全部必填后的类型 | `Complete<T>` |

## 检查点一：手动展开映射

手动展开：

```ts
type Source = {
  name: string
  count: Ref<number>
}

type Result = ToRefs<Source>
```

写出 Result 的最终结构，并解释 count 为什么不会变成 `Ref<Ref<number>>`。

## 检查点二：修饰符

分别写出“全部只读”“全部可选”“移除只读”“移除可选”四种映射规则，并说明 `-` 的作用。

## 检查点三：分析 KeysMatching

不要背代码。使用“逐键映射 → 索引访问得到联合 → never 消失”三步解释 `KeysMatching<Model, string>`。

## 本课暂不深入

- 编译器对递归类型实例化深度的细节。
- 生产级 DeepReadonly 对各种内置对象的完整处理。
- 模板字面量对字符串解析器的复杂模拟。
- 极端类型体操题。


# 06. TypeScript 类型系统、联合类型与安全收窄

> 所属大章节：`00. JS/TS 基础`
>
> 当前用途：建立 TypeScript 的类型思维，为泛型、映射类型和条件类型打基础。

TypeScript 最容易让初学者困惑的地方，是把“运行时的值”和“编译时的类型”混在一起。本章先建立清晰边界，再学习联合类型、`unknown`、`never` 和类型收窄。

## 本课目标

- 区分 JavaScript 运行时和值、TypeScript 编译时类型。
- 理解类型推断与显式类型标注。
- 区分字面量类型和宽泛类型。
- 使用联合类型表达“多个可能值”。
- 区分 `any`、`unknown` 与 `never`。
- 使用 `typeof`、`in`、判别字段完成安全收窄。
- 理解交叉类型适合组合能力，但不等于对象合并操作。

## 1. 类型在什么时候存在

下面的 `count: number` 只供 TypeScript 检查：

```ts
const count: number = 1
```

编译成 JavaScript 后，类型标注会被删除，运行时近似为：

```js
const count = 1
```

所以必须分清两条线：

```text
编译时
TypeScript 根据类型发现错误
        ↓ 删除类型
运行时
JavaScript 真正创建对象、调用函数、抛出异常
```

类型不能代替运行时检查。例如把网络数据断言成 `User`，不会自动验证服务器是否真的返回了 User。

## 2. 优先理解类型推断

TypeScript 经常能从初始值推断类型：

```ts
let count = 1       // number
const name = "Ada" // "Ada"
```

`let` 的值以后可能变化，所以 `count` 通常被扩大为 `number`。`const` 变量不能重新赋值，因此 `name` 可以保留更精确的字面量类型 `"Ada"`。

对象属性即使放在 const 对象中，仍可能被修改：

```ts
const user = { role: "student" }
// user.role 通常是 string，而不是 "student"
```

如果要保留整个对象的字面量信息，可以使用：

```ts
const user = {
  role: "student",
} as const
```

此时 `user.role` 的类型是 `"student"`，而且属性成为只读类型。

## 3. 联合类型：值可能属于多个类型

```ts
let identifier: string | number

identifier = "chapter-17"
identifier = 17
```

`string | number` 不表示这个值同时是字符串和数字，而表示它在某一时刻是其中一种。

因此不能直接使用只属于 string 的方法：

```ts
function format(value: string | number) {
  return value.toUpperCase() // 错误：number 没有 toUpperCase
}
```

必须先缩小可能范围。

## 4. 类型收窄

### 使用 typeof

```ts
function format(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase()
  }

  return value.toFixed(2)
}
```

进入 if 分支后，TypeScript 知道 `value` 是 string；剩余分支只能是 number。

### 使用 in

```ts
type Success = { data: string }
type Failure = { error: Error }

function readResult(result: Success | Failure): string {
  if ("data" in result) {
    return result.data
  }

  return result.error.message
}
```

### 使用判别字段

给联合中的每个成员放一个不同的字面量字段，是大型项目中非常稳定的设计：

```ts
type LoadingState = { status: "loading" }
type SuccessState = { status: "success"; data: string }
type ErrorState = { status: "error"; error: Error }

type RequestState = LoadingState | SuccessState | ErrorState
```

使用 switch 收窄：

```ts
function describeState(state: RequestState): string {
  switch (state.status) {
    case "loading":
      return "加载中"
    case "success":
      return state.data
    case "error":
      return state.error.message
  }
}
```

`status` 被称为判别字段，整个结构称为判别联合。

## 5. any、unknown 与 never

### any：关闭这一段类型检查

```ts
function unsafe(value: any) {
  value.notExists().anything
}
```

`any` 会把错误继续传播到后续代码。它适合临时迁移旧代码，但不适合作为“不知道类型”的默认答案。

### unknown：确实不知道，但使用前必须检查

```ts
function safe(value: unknown): string {
  if (typeof value === "string") {
    return value.toUpperCase()
  }

  return String(value)
}
```

`unknown` 可以接收任意值，但不能直接读取属性或调用方法。它迫使调用者先证明类型，因此更安全。

### never：不可能出现的值

```ts
function assertNever(value: never): never {
  throw new Error(`未处理的状态：${String(value)}`)
}
```

`never` 常用于检查判别联合是否遗漏分支：

```ts
function describeState(state: RequestState): string {
  switch (state.status) {
    case "loading":
      return "加载中"
    case "success":
      return state.data
    case "error":
      return state.error.message
    default:
      return assertNever(state)
  }
}
```

将来给 RequestState 新增成员但忘记处理时，`state` 不再能收窄成 never，编译器便会报错。

## 6. 交叉类型：同时具有多组能力

```ts
type Named = { name: string }
type Timestamped = { createdAt: Date }

type NamedRecord = Named & Timestamped
```

`NamedRecord` 必须同时拥有两边的属性：

```ts
const record: NamedRecord = {
  name: "chapter",
  createdAt: new Date(),
}
```

`A & B` 是类型层面的组合要求，不会在运行时自动执行 `Object.assign`，也不会创建新对象。

冲突属性可能产生 never：

```ts
type Impossible = { value: string } & { value: number }
// value 必须同时是 string 和 number，因此得到 never
```

## 7. type 与 interface 怎么选择

两者都能描述常见对象：

```ts
interface User {
  name: string
}

type UserRecord = {
  name: string
}
```

入门阶段可以采用简单规则：

- 对象的公开结构、可能被扩展的契约：优先 interface。
- 联合、交叉、元组和类型运算结果：使用 type。
- 不要为了风格把一种写法机械地全部替换成另一种。

第 17 章中的 `Ref<T>` 是稳定的对象契约，所以使用 interface；`ToRef<T>` 需要条件类型运算，所以必须使用 type。

## 8. satisfies：检查形状但保留精确推断

普通类型标注有时会让类型变宽：

```ts
type RouteMap = Record<string, `/${string}`>

const routes: RouteMap = {
  home: "/",
  profile: "/profile",
}
```

使用 `satisfies` 可以检查对象满足约束，同时尽量保留具体属性：

```ts
const routes = {
  home: "/",
  profile: "/profile",
} satisfies RouteMap
```

要记住：`satisfies` 也是编译时检查，不会在运行时验证对象。

## 9. 常见错误

### 用 as 强行跳过证明

```ts
const user = response as User
```

断言的含义是“我比编译器更确定”，不是“请把数据转换成 User”。外部数据仍应做运行时校验。

### 误以为联合类型能使用所有成员的方法

`A | B` 只能直接使用 A、B 共同拥有且签名兼容的能力。专属能力需要先收窄。

### 把 unknown 和 any 当成同义词

`any` 允许不经检查直接使用；`unknown` 要求先收窄。无法确定外部值时，优先 unknown。

## 10. 推荐变量名

| 含义 | 推荐名称 |
| --- | --- |
| 尚未确认类型的输入 | `unknownValue`、`input` |
| 收窄后的字符串 | `text` |
| 判别联合当前状态 | `state` |
| 穷尽检查参数 | `unreachableValue` |
| 类型检查是否成功 | `isValid` |

## 检查点一：区分编译时与运行时

回答：为什么 `const user = data as User` 不会给 data 自动增加 User 的属性，也不会在属性缺失时自动抛错？

## 检查点二：完成联合类型收窄

阅读：

```ts
function normalize(value: string | number | null): string {
  // 思考应按什么顺序排除 null、string 和 number
}
```

用文字说明三个分支各自应返回什么，再尝试实现。

## 检查点三：穷尽检查

给 RequestState 增加 `{ status: "cancelled" }`，观察原有 `assertNever(state)` 为什么报错，并说明这个错误怎样帮助维护代码。

## 本课暂不深入

- 类型系统的形式化理论。
- class 的访问修饰符与装饰器。
- 第三方运行时数据校验库。
- 协变、逆变和双向协变的完整规则。


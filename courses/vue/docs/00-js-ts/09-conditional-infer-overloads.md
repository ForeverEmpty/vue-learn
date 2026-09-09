# 09. 条件类型、分发、infer、类型守卫与函数重载

> 所属大章节：`00. JS/TS 基础`
>
> 当前用途：理解 `ToRef<T>`、`ShallowUnwrapRef<T>`、`isRef` 类型谓词和 computed 重载。

本章把第 17 章中最集中的高级类型知识拆开讲。阅读时不要把整条类型表达式一次看完，而要先找“输入是什么、判断条件是什么、成功和失败分别返回什么”。

## 本课目标

- 使用条件类型根据输入类型选择结果。
- 理解条件类型对联合类型的分发行为。
- 使用方括号关闭分发。
- 使用 `infer` 从已有结构中提取内部类型。
- 理解 never 在联合过滤中的作用。
- 编写返回类型谓词的类型守卫。
- 区分函数重载签名与实现签名。
- 谨慎使用类型断言和双重断言。

## 1. 条件类型的基本结构

```ts
type IsString<T> = T extends string ? true : false
```

可以按普通条件句阅读，但它发生在类型层面：

```text
如果 T 可以赋给 string
→ 结果类型为 true
否则
→ 结果类型为 false
```

示例：

```ts
type A = IsString<"Ada">  // true
type B = IsString<number> // false
```

这里的 true 和 false 是布尔字面量类型，不是运行时计算出来的变量。

## 2. 看懂 ToRef

```ts
type ToRef<T> = T extends Ref<unknown> ? T : Ref<T>
```

按三段阅读：

```text
输入：T
条件：T 是否满足 Ref<unknown>
是：保留 T
否：包装成 Ref<T>
```

```ts
type A = ToRef<number>      // Ref<number>
type B = ToRef<Ref<number>> // Ref<number>
```

成功分支返回 T 而不是统一返回 `Ref<unknown>`，是为了保留原 ref 更精确的值类型和可能存在的其他信息。

## 3. 条件类型为什么会分发联合

当条件左边是“裸类型参数”时，联合类型会逐项进入条件：

```ts
type ToArray<T> = T extends unknown ? T[] : never
type Result = ToArray<string | number>
```

计算过程：

```text
ToArray<string | number>
→ ToArray<string> | ToArray<number>
→ string[] | number[]
```

结果不是 `(string | number)[]`。前者表示数组只能是全字符串或全数字；后者允许同一个数组混合两类元素。

## 4. 如何关闭分发

用元组包住条件两侧：

```ts
type ToArrayTogether<T> = [T] extends [unknown] ? T[] : never
type Result = ToArrayTogether<string | number>
// (string | number)[]
```

方括号让检查对象不再是裸类型参数，于是整个联合一起判断。

阅读条件类型时，应先问：作者希望逐个处理联合成员，还是希望把联合当成整体？

## 5. infer：给结构中的某部分临时命名

```ts
type UnwrapRef<T> = T extends Ref<infer Value> ? Value : T
```

`infer Value` 的意思不是创建运行时变量，而是：

```text
尝试让 T 匹配 Ref<某个类型>
如果能匹配
→ 把“某个类型”命名为 Value
→ 成功分支可以使用 Value
```

```ts
type A = UnwrapRef<Ref<number>> // number
type B = UnwrapRef<string>      // string
```

第 17 章使用：

```ts
type ShallowUnwrapRef<T extends object> = {
  [Key in keyof T]: T[Key] extends Ref<infer Value>
    ? Value
    : T[Key]
}
```

它先映射每个属性，再尝试从每个 Ref 中提取 Value。

## 6. 常见 infer 示例

### 提取函数返回值

```ts
type FunctionResult<T> = T extends (...args: never[]) => infer Result
  ? Result
  : never
```

### 提取 Promise 结果

```ts
type PromiseValue<T> = T extends Promise<infer Value>
  ? Value
  : T
```

### 提取数组元素

```ts
type ArrayItem<T> = T extends readonly (infer Item)[]
  ? Item
  : never
```

这些类型的共同结构都是：先描述外壳，再用 infer 给外壳内部的未知部分命名。

实际项目应优先了解内置工具，如 `ReturnType`、`Parameters` 和 `Awaited`，不要重复实现已有且边界更完整的工具。

## 7. never 为什么能过滤联合

联合类型会自动忽略 never：

```ts
string | never // string
```

结合条件类型的分发，可以过滤联合成员：

```ts
type OnlyStrings<T> = T extends string ? T : never

type Result = OnlyStrings<"a" | 1 | "b">
// "a" | "b"
```

过程：

```text
"a" → "a"
1   → never
"b" → "b"

合并："a" | never | "b"
结果："a" | "b"
```

内置 `Exclude<Union, Excluded>` 和 `Extract<Union, Members>` 就建立在类似原理上。

## 8. 类型守卫与类型谓词

普通布尔函数只告诉运行时 true/false：

```ts
function hasValue(value: unknown): boolean {
  return typeof value === "object" && value !== null && "value" in value
}
```

返回类型谓词可以同时告诉 TypeScript 成功分支中的类型：

```ts
function isRef(value: unknown): value is Ref<unknown> {
  // 运行时检查内部标记
}
```

调用后：

```ts
if (isRef(candidate)) {
  candidate.value
  // TypeScript 在这个分支中把 candidate 收窄为 Ref<unknown>
}
```

`value is Ref<unknown>` 不负责运行时验证。函数体必须真的实现可靠检查；如果谓词撒谎，编译器会信任错误结论。

## 9. 函数重载解决什么问题

computed 有两种相关但不同的调用方式：

```ts
computed(getter)
computed({ get, set })
```

如果只写联合返回值：

```ts
function computed<T>(
  source: (() => T) | WritableComputedOptions<T>,
): ComputedRef<T> | WritableComputedRef<T>
```

调用者即使明确传入 `{ get, set }`，仍可能只得到联合返回类型，使用起来不够精确。

重载分别描述外部调用关系：

```ts
function computed<T>(getter: () => T): ComputedRef<T>

function computed<T>(
  options: WritableComputedOptions<T>,
): WritableComputedRef<T>
```

再写一个实现签名和函数体：

```ts
function computed<T>(
  source: (() => T) | WritableComputedOptions<T>,
): ComputedRef<T> | WritableComputedRef<T> {
  // 统一实现
}
```

## 10. 重载签名与实现签名

必须分清：

```text
重载签名
→ 提供给调用者查看和匹配
→ 没有函数体

实现签名
→ 必须能够兼容所有重载输入和返回
→ 后面有唯一的函数体
→ 通常不直接作为一个额外调用方式暴露
```

重载顺序通常从具体到宽泛。过于宽泛的签名放在前面，可能提前匹配并丢失精确结果。

重载适合“输入形状与返回类型之间存在不同对应关系”。如果只是多个可选参数，普通联合或可选参数可能更简单。

## 11. 类型断言不会转换值

```ts
return result as ToRefs<T>
```

它只改变 TypeScript 对结果的看法，不会遍历 result，也不会创建 ref。

断言应放在已经由运行时代码建立好事实、但编译器无法完整推导的边界。第 17 章先逐项调用 toRef 构建结果，最后才断言为 ToRefs<T>，比一开始把空对象断言成完成类型更容易审查。

## 12. 为什么有时出现 as unknown as Target

TypeScript 会阻止两个明显缺少重叠的类型直接断言：

```ts
source as Target // 可能报“转换可能是错误的”
```

双重断言：

```ts
source as unknown as Target
```

意思是先丢弃已知结构，再由开发者承担责任地指定目标类型。它不是高级技巧的荣耀徽章，而是逃生口。

使用前应确认：

1. 运行时代码是否真的建立了 Target 要求的结构。
2. 能否通过更准确的变量类型或辅助函数避免断言。
3. 断言是否集中在模块边界，而不是扩散到业务代码。

## 13. satisfies 与 as 的区别

```ts
const routes = {
  home: "/",
  profile: "/profile",
} satisfies Record<string, `/${string}`>
```

`satisfies` 检查表达式满足目标类型，并尽量保留表达式自身推断；`as` 则要求编译器把表达式视为目标类型。

```text
satisfies：请检查我是否满足规则
as：请相信我符合这个类型
```

能通过自然推断或 satisfies 解决时，不要优先使用 as。

## 14. 把第 17 章的类型组合起来

```ts
type ToRef<T> = T extends Ref<unknown> ? T : Ref<T>

type ToRefs<T extends object> = {
  [Key in keyof T]: ToRef<T[Key]>
}

type ShallowUnwrapRef<T extends object> = {
  [Key in keyof T]: T[Key] extends Ref<infer Value>
    ? Value
    : T[Key]
}
```

阅读顺序：

```text
ToRef
→ 对一个类型做条件判断

ToRefs
→ 映射对象的每个键
→ 对每个属性应用 ToRef

ShallowUnwrapRef
→ 映射对象的每个键
→ 如果属性是 Ref，就 infer 出内部 Value
→ 否则保留原属性类型
```

这些类型名称描述的是输入到输出的规则。理解规则比记忆符号排列更重要。

## 15. 常见错误

### 忘记条件类型的分发

输入为联合时，先检查条件左边是不是裸类型参数。

### 把 infer 当作任意位置可用的关键字

infer 只能出现在条件类型的 extends 分支模式中，提取能成功匹配的结构部分。

### 类型谓词与实现不一致

类型守卫一旦返回 true，TypeScript 就相信谓词。实现必须比普通 boolean 工具更谨慎。

### 用许多重载掩盖不清晰 API

先确认不同输入是否真的对应不同返回类型。若 API 本身混乱，增加重载只会把问题藏进类型声明。

## 16. 推荐名称

| 含义 | 推荐名称 |
| --- | --- |
| 条件输入 | `T`、`Value` |
| 推断出的内部值 | `Value`、`Item`、`Result` |
| 联合中需要排除的成员 | `Excluded` |
| 类型守卫输入 | `value`、`candidate` |
| 重载统一输入 | `source`、`options` |

## 检查点一：手动计算条件类型

分别计算：

```ts
ToRef<number>
ToRef<Ref<string>>
ToRef<number | Ref<string>>
```

第三项要说明是否发生分发。

## 检查点二：infer

用文字解释：

```ts
T extends Ref<infer Value> ? Value : T
```

`infer Value` 在匹配成功时保存了哪部分类型？

## 检查点三：类型守卫

说明 `isRef(value): value is Ref<unknown>` 中，运行时检查与返回类型谓词各自负责什么。为什么谓词不能代替正确实现？

## 检查点四：函数重载

说明 computed 为什么需要两个重载签名，以及实现签名为什么仍然要接受联合参数。

## 本课暂不深入

- 条件类型的编译器性能优化。
- 递归 infer 实现字符串解析器。
- 重载推断的全部边缘规则。
- 类型系统中的严格型变证明。


# 09. 条件类型、分发、infer、类型守卫与函数重载：复习题

> 状态：已批改。六道题全部通过。

## 1. 请手动计算下面三个结果，第三项需要说明条件类型是否分发：

```ts
ToRef<number>
ToRef<Ref<string>>
ToRef<number | Ref<string>>
```

### 你的答案

Ref<number>
Ref<string>
Ref<number> |  Ref<string> 会发生分发，不会统一判断

### 批改

结论：正确。

- `ToRef<number>`：`number` 不满足 `Ref<unknown>`，走失败分支 → `Ref<number>`。
- `ToRef<Ref<string>>`：已满足 `Ref<unknown>`，成功分支原样保留 → `Ref<string>`。
- `ToRef<number | Ref<string>>`：条件左侧是裸类型参数 `T`，对联合逐成员分发 → `Ref<number> | Ref<string>`，不是整体判断一次。

补充：若用 `[T] extends [Ref<unknown>]` 方括号包住两侧，会关闭分发，整体判断得到 `Ref<number | Ref<string>>`。

## 2. `infer Value` 的作用是什么？它和运行时变量有什么区别？

### 你的答案

作用给结构中的某部分临时命名，infer 是编译期命名，不产生任何运行时代码

### 批改

结论：正确。

`infer Value` 在 `T extends Ref<infer Value>` 匹配成功时，把 `Ref` 尖括号内的实际类型临时命名为 `Value`，成功分支可以使用它。例如 `UnwrapRef<Ref<number>>` 中 `Value = number`。

它与运行时变量的区别：`infer` 是编译期类型层面的命名，编译后彻底消失，不产生任何运行时代码或内存；运行时变量是程序运行中真实存在、持有值的内存位置，只能在值表达式里读写。二者只是都"起了个名字"，层面完全不同。

## 3. 为什么 `never` 能配合分布式条件类型过滤联合成员？

### 你的答案

因为联合类型会自动过滤never

分布式条件类型让联合的每个成员单独进入条件判断

### 批改

结论：只答了一半。"联合自动忽略 never"是第二步，还缺第一步"分发"。

完整机制分两步：

1. 分布式条件类型让联合的每个成员**单独**进入条件判断；
2. 不匹配的成员返回 `never`，而联合 `X | never` 自动化简为 `X`，于是该成员被过滤。

示例：

```ts
type OnlyStrings<T> = T extends string ? T : never
type Result = OnlyStrings<"a" | 1 | "b">
```

先分发：`OnlyStrings<"a"> | OnlyStrings<1> | OnlyStrings<"b">`，其中 `1` 不满足 `string` 返回 `never`，合并为 `"a" | never | "b"`，自动忽略 never 后得到 `"a" | "b"`。

没有"分发"这一步，`never` 就无从产生，过滤也不会发生；所以两步缺一不可。

## 4. `isRef(value): value is Ref<unknown>` 中，函数体和类型谓词分别承担什么责任？

### 你的答案

运行时检查时为了，程序在运行时，变量属于对应的类型或包含对应的属性
返回类型谓词是为了当函数返回true时，返回值收窄成什么类型，并不能真正代表该变量在运行时为该类型

### 批改

结论：正确，一处措辞需修正。

- 函数体（运行时检查）负责在运行时真实判断值是否具备 ref 身份，例如 `isRef` 读内部 Symbol 标记。
- 类型谓词 `value is Ref<unknown>` 负责告诉 TypeScript：当函数返回 `true` 时，把参数 `value` 收窄为 `Ref<unknown>`。

措辞修正：收窄的对象是**参数 `value`**，不是函数的"返回值"——函数返回值类型仍然是 `boolean`。

谓词不能代替实现的原因：它是单向承诺，TypeScript 不会验证；函数体撒谎时（返回 true 但值不是 ref），编译器会信任错误结论，导致运行时出错却无类型报错。

## 5. getter-only computed 与 writable computed 为什么适合使用函数重载？重载签名和实现签名分别面向谁？

### 你的答案

computed有多种不同类型的传参,不同输入对应不同返回类型
实现签名需要兼容所有重载的输入和返回
重载签名面向调用者、没有函数体

### 批改

结论：正确。

- 为什么重载：不同输入对应不同返回类型——`computed(getter)` 返回 `ComputedRef<T>`（value 只读），`computed({ get, set })` 返回 `WritableComputedRef<T>`（value 可写）。若只写联合返回 `ComputedRef<T> | WritableComputedRef<T>`，调用者即使传了 `{ get, set }` 也拿不到可写类型。
- 重载签名：面向调用者，没有函数体，外部只能通过这些签名调用并匹配类型。
- 实现签名：面向函数内部实现，必须兼容所有重载的输入和返回，有唯一函数体，通常不额外暴露为一个调用方式。

## 6. `satisfies` 与 `as` 的意图有什么不同？为什么双重断言应该谨慎使用？

### 你的答案

satisfies 检查表达式满足目标类型，并尽量保留表达式自身推断；as 则要求编译器把表达式视为目标类型。
因为双重断言的类型会丢失原本结果并由开发人员主动声明，可能会存在错误

### 批改

结论：正确，可再补一层。

- `satisfies`：检查表达式满足目标类型，同时尽量保留表达式自身更精确的推断。
- `as`：要求编译器把表达式当作目标类型看待。

双重断言 `as unknown as T` 需要谨慎的原因：它先丢弃已知类型信息，跳过编译器对"明显不相关类型"的检查，把正确性完全交给开发者；一旦目标类型与实际运行时结构不符，错误会被掩盖到很晚才暴露。所以它是逃生口而非常规手段，应集中用在模块边界。

# 08. 映射类型、修饰符与工具类型：复习题

> 状态：已批改。第 2、3、4、5 题的订正已补齐，全部通过。

## 1. `[Key in keyof T]: T[Key]` 的三个关键部分分别做什么？它与 JavaScript 的 for 循环有什么本质区别？

### 你的答案

keyof T: 得到T键的联合类型
Key in keyof T: 循环获取每个T的键
T[Key]: 获取T每个键对应的类型

JavaScript的for循环是运行时对某个变量的值进行循环，而类型是对某联合类型进行循环

### 批改

结论：正确，三个部分都答到了点上。

三点对应关系准确：`keyof T` 取键的联合；`Key in keyof T` 让 `Key` 依次代表联合中的每个键；`T[Key]` 用当前键取对应值类型。

关于"本质区别"可以再精确一步：映射类型只在编译期展开成一个新类型，编译结束后不会留下任何 JavaScript 代码，也不会产生对象实例；而 `for` 循环是运行时代码，它真的去遍历某个值（数组元素、对象键等）并执行循环体。所以更准确的说法是"类型层面遍历键联合"对"运行时遍历值"。

## 2. `readonly`、`?`、`-readonly` 和 `-?` 分别怎样改变映射后的属性？

### 你的答案

将类型增加 readonly和可选
为类型删除 readonly和可选

`readonly [Key in keyof T]` → 生成的每个属性变为只读。
`[Key in keyof T]?` → 生成的每个属性变为可选。
`-readonly` → 移除源属性上的只读修饰符。
`-?` → 移除源属性上的可选修饰符（变成必填）。

### 批改

结论：方向正确，但没有"分别"对应四个修饰符，需要补全。

题目要求四个符号各自说明，答案合并成了两句，且没有点明哪个符号对应哪个动作。逐个对应：

- `readonly [Key in keyof T]` → 生成的每个属性变为只读。
- `[Key in keyof T]?` → 生成的每个属性变为可选。
- `-readonly` → 移除源属性上的只读修饰符。
- `-?` → 移除源属性上的可选修饰符（变成必填）。

`-`（减号）是"去除"，`+`（加号）是"添加"且通常省略，所以 `readonly` / `?` 等价于 `+readonly` / `+?`。

还要注意一个容易漏的点：直接 `[Key in keyof T]` 这种同态映射会保留源类型已有的 `readonly` 和 `?`。想强制"移除只读"，必须显式写 `-readonly`，什么都不写并不会去掉它。

## 3. 请手动展开 `ToRefs<{ name: string; count: Ref<number> }>`，并解释已有 ref 为什么不应再嵌套一层。

### 你的答案

通过extend Ref来判断类型是否为Ref，如果是则返回本身，反之再Ref
`T extends Ref ? T : Ref<T>`

```
{
  name: Ref<string>; 
  count: Ref<number>;
}
```

### 批改

结论：只答了"为什么"的一半，第一问"手动展开最终结构"没有写。

题目有两问。第一问的展开结果是：

```ts
ToRefs<{ name: string; count: Ref<number> }>;
// 逐键应用 ToRef：
{
  name: ToRef<string>; // string 不是 Ref → Ref<string>
  count: ToRef<Ref<number>>; // 已经是 Ref → 直接保留本身
}
// 最终：
{
  name: Ref<string>;
  count: Ref<number>;
}
```

`count` 不变成 `Ref<Ref<number>>`，原因是 `ToRef<T> = T extends Ref<unknown> ? T : Ref<T>` 在 `T = Ref<number>` 时走 `T` 分支，原样保留。运行时 `toRef` 也先用 `isRef` 判断，已经是 ref 就返回原对象（注意关键字是 `extends`，不是 `extend`）。

第二问"为什么不应再嵌套"的完整理由：若包成 `Ref<Ref<number>>`，使用者要写两次 `.value`；而且外层 `RefImpl` 可能把内层 `RefImpl` 当作普通对象继续交给 `reactive()` 代理，多出一层语义混乱的包装。

## 4. `Pick`、`Record` 和 `Omit` 分别适合表达哪种对象转换关系？

### 你的答案

Pick适合取出某类型中某几个类型
Record适合将联合类型转为属性类型
Omit适合排除某类型中的几个类型

Pick<T, Keys>: 取出某类型中的某几个属性
Omit<T, Keys>: 排除某几个属性
Record<Keys, Value>: 用 Keys 联合中的每个键作为新对象的属性名，值统一为同一个 Value 类型

### 批改

结论：Pick 和 Omit 方向正确，Record 只答了一半，三处"类型"用词应改为"属性/键"。

- `Pick<T, Keys>`：从 T 中挑选指定的键，生成只含这些键的对象类型 → "取出某类型中的某几个属性"。
- `Omit<T, Keys>`：从 T 中排除指定的键，生成去掉这些键的对象类型 → "排除某几个属性"（内部其实是 `Pick<T, Exclude<keyof T, Keys>>`）。
- `Record<Keys, Value>`：它和前两者不是同一类——不是"从已有对象挑/删"，而是用 `Keys` 联合中的每个键作为新对象的属性名，值统一为同一个 `Value` 类型。答案只说"联合类型转为属性名"这半句，漏了"所有值统一为同一类型"这半句；且"属性类型"容易被读成"属性的类型"，实际应叫"属性名"。

用词上，三处"类型"实际指"属性/键"。例如 `Omit<User, "id">` 排除的是属性 `"id"`，不是一个"类型"。

## 5. 键重映射中的 `as` 和 `never` 怎样共同实现重命名或过滤属性？

### 你的答案

```ts
T as `get${Capitalize<string & Key>}` //重命名
T extends object ? never : T //过滤
```

```
[Key in keyof T as `get${Capitalize<string & Key>}`]: () => T[Key];
[Key in keyof T as Key extends "id" ? never : Key]: T[Key]
```
as 后面是"新键表达式"：never 分支 = 删掉这个键，另一个分支 = 保留原键

### 批改

结论：重命名方向对但变量写错了，过滤的条件表达式把对象判断错了，需要重点订正。

重命名：`as` 后面跟的应是"当前遍历的键 `Key`"，不是类型 `T`。正确写法是：

```ts
type Getters<T> = {
  [Key in keyof T as `get${Capitalize<string & Key>}`]: () => T[Key];
};
```

`as` 的作用是把映射出来的键替换成新键表达式；`string & Key` 是为了把键收窄到能参与模板拼接的字符串部分（keyof 也可能含 number/symbol）。

过滤：条件应该判断"当前键 `Key`"是不是要排除的那个键，而不是判断"整个类型 T 是不是 object"。文档里的正确写法是：

```ts
type RemoveId<T> = {
  [Key in keyof T as Key extends "id" ? never : Key]: T[Key];
};
```

答案里的 `T extends object ? never : T` 语义错误：它判断的是整个源类型，且过滤目标也不对。

机制总结：`as` 决定"新键是什么"；当新键被重映射为 `never` 时，TypeScript 会删除该属性。所以 `Key extends "id" ? never : Key` 中，`never` 分支就是"过滤掉这个键"，另一个分支"保留原键"。

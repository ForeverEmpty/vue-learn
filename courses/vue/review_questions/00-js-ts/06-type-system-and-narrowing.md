# 06. TypeScript 类型系统、联合类型与安全收窄：复习题

> 状态：已批改。

## 1. TypeScript 类型和 JavaScript 值分别在什么时候存在？为什么类型断言不能验证接口返回的数据？

### 你的答案

TS的类型是在编译时存在，JS的值在运行时存在
因为类型断言是在编译时，但接口传来值而是在运行时，无法进行约束

### 批改

结论：正确。

类型标注和类型断言服务于编译阶段，生成 JavaScript 后会被移除；接口返回的数据则是在程序运行后才真正出现。`as User` 只会让编译器暂时把一个值当作 User，不会检查字段、补充字段或转换数据。因此外部数据如果需要保证结构正确，仍然必须进行运行时校验。

## 2. `any`、`unknown` 和 `never` 分别表达什么？接收无法确定的外部数据时为什么优先选择 unknown？

### 你的答案

any：关闭这一段类型检查
unknown：确实不知道，但使用前必须检查
never：不可能出现的值

unknown 运行接受任意值，但在使用该值时必须要先进行类型判断检查进行类型收窄，unknow可以提供必要的类型保护

### 批改

结论：修正后正确。

你已经补充了关键区别：`unknown` 可以接收任意值，但使用前必须先检查并收窄，因此能够保留类型保护；结合前面的定义，`any` 则会关闭这一段检查，并允许不安全操作继续传播。

文字中 `运行接受` 应为“允许接受”，`unknow` 应为 `unknown`，不影响本题结论。

## 3. 下面的函数为什么不能直接调用 `value.toUpperCase()`？你会怎样安全地处理三个分支？

```ts
function normalize(value: string | number | null): string;
```

### 你的答案

value 存在类型为number和null的情况，而这两种类型无法使用toUpperCase()
使用前进行如下判断

```ts
if (value === null) return "";
if (typeof value === "number") return String(value).toUpperCase();
return value.toUpperCase();
```

### 批改

结论：正确。

初始类型是 `string | number | null`，不能直接调用只属于 string 的 `toUpperCase`。排除 null，再处理 number 后，最后一行中的 value 会被 TypeScript 自动收窄为 string。

`String(value).toUpperCase()` 是合法的：`String(value)` 会在运行时先把数字转换为字符串，再调用字符串方法。如果这里只要求统一返回字符串而不要求大写数字，写成 `return String(value)` 会更简洁，但你的实现没有类型错误。

## 4. 判别联合配合 never 穷尽检查解决了什么维护问题？

### 你的答案

可以防止我们在添加新分支后，忘记对应的处理代码

### 批改

结论：正确。

补充完整机制：所有联合成员都处理完后，default 分支中的值应被收窄为 never；新增成员却没有增加对应分支时，default 中会剩下这个新成员，因而无法传给 `assertNever`。编译错误会把遗漏暴露在开发阶段。

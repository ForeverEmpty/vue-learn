# 00. JS/TS 基础补充

这个目录独立于 Mini Vue 主课程，用来补充实现过程中遇到的 JavaScript 和 TypeScript 知识。主课程遇到语言基础障碍时，可以暂时来到这里；理解后再回到原检查点。

大章节编号 `00` 表示语言基础模块。这里从术语、语法和执行顺序开始，不要求已经掌握相关概念。以后需要更深入的语言专题时再增加其他大章节，不要求一次学完一个主题的全部细节。

## 课程目录

| 小节 | 主题 | 状态 | 与 Mini Vue 的联系 |
| --- | --- | --- | --- |
| 01 | [Promise 基础](./01-promise-basics.md) | 已完成 | 理解 scheduler 如何安排微任务，以及为什么要保存刷新 Promise。 |
| 02 | [原型与属性归属](./02-prototype-and-property-ownership.md) | 已完成 | 理解自有属性、原型属性，以及 `hasOwnProperty.call`。 |
| 03 | [call、apply 与 bind](./03-call-apply-bind.md) | 已完成 | 理解函数 this 的指定、参数传递和延迟调用。 |
| 04 | [this 的指向](./04-this-binding.md) | 已完成 | 理解普通函数、箭头函数和显式绑定的 this 规则。 |
| 05 | [Object.defineProperty 与属性描述符](./05-object-define-property.md) | 已完成 | 理解 `markRaw` 如何保存不可枚举的内部 SKIP 标记。 |
| 06 | [TypeScript 类型系统、联合类型与安全收窄](./06-type-system-and-narrowing.md) | 已完成 | 区分编译时类型与运行时值，安全处理 unknown 和联合类型。 |
| 07 | [泛型、约束、keyof 与索引访问类型](./07-generics-keyof-indexed-access.md) | 已完成 | 看懂 `Ref<T>`、`Key extends keyof T` 与 `T[Key]`。 |
| 08 | [映射类型、修饰符与工具类型](./08-mapped-types-and-utilities.md) | 已完成 | 理解 `ToRefs<T>` 如何逐个转换对象属性。 |
| 09 | [条件类型、分发、infer、类型守卫与函数重载](./09-conditional-infer-overloads.md) | 已完成 | 理解 `ToRef<T>`、`infer Value`、`isRef` 谓词和 computed 重载。 |

## 两条学习路线

00·01～00·05 是 JavaScript 运行时基础，适合在 Vue 主课程遇到具体问题时按需复习。

00·06～00·09 是 TypeScript 类型系统路线，建议严格按顺序学习：

```text
类型和值的边界、联合类型收窄
→ 泛型保存类型关系
→ keyof 与索引访问连接对象的键和值
→ 映射类型批量转换属性
→ 条件类型与 infer 根据结构选择或提取类型
→ 类型守卫和函数重载把类型规则用于真实 API
```

这些章节会反复连接 Mini Vue 已出现的源码，但它们是独立补充，不会改变响应式章节编号，也不要求在开始第 18 章前一次学完。

## 学习方式

1. 先阅读术语和最小示例。
2. 不运行代码，先写下自己预测的输出顺序。
3. 在 playground 运行实验，对照实际顺序。
4. 用自己的话解释结果，不要求背诵定义。
5. 完成复习题后，再回到被暂停的 Mini Vue 检查点。

TypeScript 类型章节还建议增加一步：看到类型表达式时，先用具体类型手动展开，再阅读通用写法。不要从背诵最终语法开始。

# 第三章：嵌套 effect、effect 栈与异常恢复

前两章默认任意时刻只有一个 effect 在运行。但 effect 内部可以再次调用 effect，副作用函数也可能抛出异常。当前单一的 `activeEffect` 在这两种情况下会丢失正确状态。

## 本章目标

- 理解嵌套 effect 为什么会覆盖外层 `activeEffect`。
- 使用栈保存多层 effect 的执行顺序。
- 内层 effect 结束后恢复外层 effect。
- 使用 `try...finally` 保证异常发生时也能恢复响应式状态。
- 理解状态恢复和错误捕获是两件不同的事。

## 问题一：内层 effect 覆盖外层 effect

```ts
effect(() => {
  outerBefore.value

  effect(() => {
    inner.value
  })

  outerAfter.value
})
```

当前执行过程是：

```text
activeEffect = 外层
→ 读取 outerBefore，收集外层
→ activeEffect = 内层
→ 读取 inner，收集内层
→ 内层结束，activeEffect = undefined
→ 读取 outerAfter，无法收集任何 effect
```

错误发生在内层结束时。此时不应该清空为 `undefined`，而应该恢复成外层 effect。

## 为什么使用栈

嵌套调用遵循“后进入的先退出”：

```text
外层进入  [外层]
内层进入  [外层, 内层]
内层退出  [外层]
外层退出  []
```

数组末尾始终是当前正在运行的 effect。因此可以使用：

```ts
const effectStack: ReactiveEffect[] = []
```

- effect 开始时执行 `push`。
- effect 结束时执行 `pop`。
- `effectStack.at(-1)` 是恢复后位于栈顶的 effect。
- 栈为空时，`.at(-1)` 返回 `undefined`。

## 问题二：异常让 activeEffect 永远残留

当前 `run()` 的清理代码位于原始函数之后：

```text
activeEffect = this
→ 执行 effectFn
→ activeEffect = undefined
```

如果 `effectFn` 抛出异常，最后一行不会执行。失败的 effect 会一直残留在 `activeEffect` 中。之后即使在 effect 外部读取普通 ref，也会错误订阅这个失败的 effect。

## try...finally 的作用

`finally` 无论正常结束还是抛出异常都会执行：

```ts
try {
  // 可能抛出异常的代码
} finally {
  // 一定执行的状态恢复
}
```

注意：`finally` 不会自动吞掉错误。如果没有 `catch`，错误在 finally 执行后仍会继续向外抛出。这正是我们需要的行为：

```text
错误仍然交给调用者处理
+
响应式内部状态必须恢复正常
```

## 变量名建议

| 含义 | 推荐变量名 | 说明 |
| --- | --- | --- |
| effect 执行栈 | `effectStack` | 按进入顺序保存 ReactiveEffect |
| 当前栈顶 effect | `activeEffect` | getter 只读取它 |
| 当前 effect 的父级 | `parentEffect` | 使用函数局部变量时，由 JavaScript 调用栈保存 |
| 原始副作用函数 | `effectFn` | 与包装对象区分 |
| 包装后的对象 | `reactiveEffect` | 拥有 run、deps 等状态 |
| 外层执行次数 | `outerRuns` | 用于测试嵌套行为 |
| 内层执行次数 | `innerRuns` | 用于确认没有错误触发 |

## 检查点一：复现两个错误

本章测试位于 `packages/reactivity/__tests__/effect-stack.test.ts`。先运行：

```bash
npm run test:run
```

预期前两章的 10 个测试继续通过，第三章的 2 个测试失败：

1. 内层 effect 结束后，没有恢复外层 effect。
2. effect 抛出异常后，失败的 effect 仍残留在 activeEffect。

playground 第三章页面也提供了对应实验。

## 检查点二：恢复父级 effect

可以显式创建 `ReactiveEffect[]`，也可以把进入本次 run 前的 activeEffect 保存为局部 `parentEffect`。本项目采用后者：每次 run 调用都有自己独立的局部变量，JavaScript 调用栈会自然保存多层父级。

`run()` 每次执行时：

```text
清理旧依赖
→ 保存当前 parentEffect
→ activeEffect 指向当前 effect
→ 执行 effectFn
→ activeEffect 恢复为 parentEffect
```

只保存父级后，正常的嵌套 effect 可以恢复。但异常仍会跳过恢复代码，因此还不能结束本章。

## 检查点三：使用 try...finally

最终结构如下。先理解每一行的职责，不要直接背代码：

```ts
run(): void {
  cleanupEffect(this)

  const parentEffect = activeEffect
  activeEffect = this

  try {
    this.effectFn()
  } finally {
    activeEffect = parentEffect
  }
}
```

为什么不在 finally 中写死 `activeEffect = undefined`？因为当前 effect 可能有外层调用者，应该恢复本次 run 保存的父级，而不是总是清空。

显式 `effectStack` 和局部 `parentEffect` 都能表达嵌套关系。前者自己维护数组栈；后者利用函数调用栈为每次 run 保存父级。本项目的同步 effect 模型中，两种方式都能满足当前需求。

## 本章暂不处理

- effect 主动停止与重新启用。
- effect 递归触发自身。
- effect 调度器。
- 在 effect 内反复创建新 effect 的生命周期管理。

这些行为需要额外的 API 和测试，不混入当前章节。

## 完成标准

- 内层 effect 结束后，外层后续读取仍能正确收集外层 effect。
- 三层及以上嵌套也能按顺序恢复。
- effect 抛出异常后，effect 外的普通读取不会产生错误订阅。
- 错误仍然能被调用者捕获，没有被响应式系统吞掉。
- 所有测试、类型检查和 playground 构建通过。

# 第八章：effect 生命周期与 stop

前七章的 effect 一旦创建，就会一直订阅它读取过的响应式值。本章补充 effect 的生命周期：让调用者拿到 runner，可以手动执行 effect，也可以停止它的自动订阅。

```ts
const runner = effect(() => {
  console.log(count.value)
})

stop(runner)
```

这不是“把函数删除”。停止 effect 的核心是清理它与 dep 的关系，并让后续响应式触发不再自动运行它。

## 本章目标

- 让 `effect()` 返回可手动执行的 runner。
- 理解 runner 与首次自动执行的区别。
- 使用 `stop()` 清理 effect 加入过的所有 dep。
- 规定 stop 后手动 runner 的行为。
- 让 stop 重复调用保持安全。

## 当前起点

第八章起点已经暴露 runner 和 stop API，但 `ReactiveEffect.stop()` 暂时没有清理逻辑：

```ts
export function effect(fn: EffectFn): EffectRunner {
  const reactiveEffect = new ReactiveEffect(fn)
  reactiveEffect.run()

  const runner = reactiveEffect.run.bind(reactiveEffect) as EffectRunner
  runner.effect = reactiveEffect
  return runner
}

export function stop(runner: EffectRunner): void {
  runner.effect.stop()
}
```

因此 runner 的首次创建和手动调用可以工作，但 stop 目前不会改变任何行为。

## runner 与首次自动执行

创建 effect 时需要两个不同的行为：

```text
effect(fn)
→ 立即执行一次 fn
→ 建立初始依赖
→ 返回 runner

runner()
→ 由调用者手动再次执行 fn
```

runner 不是新的 effect，也不会创建新的 ReactiveEffect。它只是绑定了已有实例的 `run()`，因此应继续复用原来的 deps、active 状态和异常恢复逻辑。

## stop 必须清理 dep

每个 ReactiveEffect 都保存自己加入过的 dep：

```ts
readonly deps: Dep[] = []
```

例如：

```ts
effect(() => {
  first.value
  second.value
})
```

关系是：

```text
first.dep  → effect
second.dep → effect
effect.deps → [first.dep, second.dep]
```

stop 时必须双向清理：

```text
effect.deps 中的每个 dep.delete(effect)
effect.deps 清空
```

只设置 `active = false` 而不从 dep 中删除 effect，会留下失效订阅：响应式值变化时仍会找到这个 effect 并尝试运行。

## active 状态

推荐给 ReactiveEffect 增加：

```ts
active = true
```

stop 的目标状态：

```text
active = true
→ cleanupEffect(this)
→ active = false
```

重复 stop 时不能再次破坏状态，也不应报错：

```ts
stop(): void {
  if (!this.active) return

  cleanupEffect(this)
  this.active = false
}
```

## stop 后 runner 的行为

本章采用与 Vue 类似的语义：stop 后可以手动执行 runner，但这次执行不重新收集依赖。

```text
stop(runner)
→ 清理旧 deps
→ active = false

runner()
→ 直接执行原函数
→ 不设置 activeEffect
→ 不重新 track

依赖再次变化
→ dep 中已经没有该 effect
→ 不会自动执行
```

因此 `run()` 需要先判断 active：

```ts
run(): T {
  if (!this.active) {
    return this.fn()
  }

  // 原来的 cleanup、parentEffect、try/finally 逻辑
}
```

不要把 stopped runner 的手动执行误认为“重新启动 effect”。如果未来需要重新订阅，应提供单独的设计，而不是让 runner 隐式改变生命周期。

## 检查点一：观察 stop 目前无效

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/effect-lifecycle.test.ts
```

起点实现预期有 1 个通过、2 个失败；全量测试预期有 39 个通过、2 个失败。失败会说明：stop 后修改 ref 仍然自动执行，以及 stop 后 runner 执行后又重新被依赖触发。

## 检查点二：实现 active 和依赖清理

1. 给 ReactiveEffect 增加 `active = true`。
2. 实现 `stop()` 的幂等判断。
3. stop 时调用已有的 `cleanupEffect(this)`。
4. cleanup 后把 active 设为 false。
5. `run()` 开头处理 inactive 分支。

完成后应满足：

```text
stop 后 source 变化不再自动触发
stop 后 runner 仍可手动执行
手动 runner 不会重新收集 deps
```

## 检查点三：多个依赖与重复 stop

一个 effect 可能同时读取多个 ref。测试不能只验证一个依赖：

```ts
effect(() => {
  left.value
  right.value
})
```

调用 stop 后，修改 left 和 right 都不应触发 effect。随后重复调用 stop 也不应抛错或改变结果。

## 本章暂不处理

- `onStop` 回调。
- effect scope。
- 递归 effect 与 `allowRecurse`。
- scheduler 任务队列和批量更新。
- 重新启动已停止 effect 的 API。

## 完成标准

- effect 返回 runner，首次仍自动执行。
- stop 清理 effect 的全部 deps。
- stop 后修改依赖不再自动执行。
- stop 后 runner 可以执行一次但不重新收集依赖。
- stop 可重复调用。
- 前七章测试保持通过。

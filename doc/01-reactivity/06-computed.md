# 第六章：computed 的缓存与失效

前五章已经可以让普通值和对象属性触发 effect。本章开始实现派生状态：不直接保存一个新值，而是根据其他响应式值计算出结果。

```ts
const count = ref(1)
const doubled = computed(() => count.value * 2)
```

`computed` 看起来只是一个带 `.value` 的对象，但它比普通 `ref` 多了三个问题：什么时候执行 getter、什么时候复用结果，以及依赖变化后怎样通知读取它的 effect。

## 本章目标

- 理解 computed 为什么必须惰性执行。
- 使用缓存避免重复执行 getter。
- 使用 `dirty` 标记描述缓存是否有效。
- 让依赖变化只使 computed 失效，而不是立即计算。
- 理解 computed 自己的 dep 与内部 ReactiveEffect。
- 为 ReactiveEffect 增加 scheduler 回调。

## computed 与普通 ref 的区别

普通 ref 自己保存一个值：

```text
读取 count.value → 返回保存的值
修改 count.value → 保存新值并通知 dep
```

computed 不直接保存用户传入的新值，而是保存一个 getter：

```text
读取 doubled.value → 必要时执行 getter → 返回计算结果
修改 count.value → 让 doubled 的缓存失效
```

因此 computed 的值来源于其他响应式依赖，不能像普通 ref 一样只比较新旧值。

## 当前起点：能读取，但每次都会计算

第六章起点的 `computed` 只完成最小接口：

```ts
interface ComputedRef<T> {
  readonly value: T
}

class ComputedRefImpl<T> {
  private readonly getter: () => T

  constructor(getter: () => T) {
    this.getter = getter
  }

  get value(): T {
    return this.getter()
  }
}
```

它可以正确返回 getter 的结果，但每次读取都会调用 getter：

```ts
const count = ref(1)
let getterRuns = 0
const doubled = computed(() => {
  getterRuns++
  return count.value * 2
})

doubled.value // getterRuns: 1
doubled.value // getterRuns: 2，当前起点会再次计算
```

## 为什么需要惰性

创建 computed 时不应该立即执行 getter：

```ts
const expensiveResult = computed(() => {
  // 可能包含昂贵计算
  return calculate()
})
```

如果应用从未读取 `expensiveResult.value`，这次计算就是浪费。惰性意味着：

```text
创建 computed → 不执行 getter
第一次读取 value → 执行 getter
```

## 为什么需要缓存

同一份依赖没有变化时，连续读取应该复用上次结果：

```text
第一次读取 → 执行 getter，保存 value
第二次读取 → 直接返回保存的 value
```

缓存不仅减少计算，也让多个消费者读取同一个 computed 时共享结果。

推荐的变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 用户传入的计算函数 | `getter` |
| 最近一次计算结果 | `_value` |
| 缓存是否失效 | `dirty` |
| computed 自己的订阅集合 | `dep` |
| 保存内部响应式副作用 | `effect` 或 `computedEffect` |
| 依赖变化时的回调 | `scheduler` |

## dirty 的含义

可以把 `dirty` 理解为“下一次读取时是否必须重新计算”：

```text
dirty = true
→ 第一次读取，执行 getter
→ 保存结果
→ dirty = false

依赖发生变化
→ dirty = true
→ 暂时不执行 getter

下一次读取
→ 发现 dirty = true
→ 重新计算并保存
→ dirty = false
```

依赖变化时不要立即执行 getter，因为这会破坏惰性：如果 computed 失效后一直没有被读取，就不应该提前计算。

## 为什么需要内部 ReactiveEffect

computed 的 getter 需要在一个独立的 effect 中运行，才能独立记录它读取过的源依赖：

```text
computedEffect
└── 读取 count.value
    └── count.dep → computedEffect
```

外层 effect 读取 computed 时，应该订阅 computed 自己的 dep：

```text
consumerEffect
└── 读取 doubled.value
    └── doubled.dep → consumerEffect
```

这两层关系不能混成一层。内部 effect 负责观察 getter 的源依赖，computed 的 dep 负责通知读取 computed 的消费者。

## scheduler 做什么

当前 `triggerEffects` 会直接对每个 effect 调用 `run()`。computed 需要一种不同的触发方式：

```text
普通 effect 的依赖变化 → 直接 run()
computed 内部 effect 的依赖变化 → 调用 scheduler()
```

computed 的 scheduler 只负责：

1. 把 `dirty` 设为 `true`。
2. 如果之前不是 dirty，触发 computed 自己的 dep。

伪代码：

```ts
const computedEffect = new ReactiveEffect(getter, () => {
  if (!dirty) {
    dirty = true
    triggerEffects(dep)
  }
})
```

`ReactiveEffect` 的构造函数需要接收可选 scheduler：

```ts
new ReactiveEffect(fn, scheduler?)
```

内部 effect 还需要把 getter 的计算结果交还给 computed，因此当前的 `run(): void` 也要调整。推荐使用泛型保存返回值类型：

```ts
export type EffectFn<T = void> = () => T

export class ReactiveEffect<T = void> {
  private readonly fn: EffectFn<T>

  run(): T {
    // cleanup 和 activeEffect 恢复逻辑保持不变
    try {
      return this.fn()
    } finally {
      // 恢复 parentEffect
    }
  }
}
```

这样传入 `() => number` 时，`computedEffect.run()` 的结果就是 number，不需要把 void 强制断言成其他类型。`Dep` 和 `activeEffect` 不关心具体返回值，可以保存 `ReactiveEffect<unknown>`。

`triggerEffects` 也要根据是否存在 scheduler 选择行为：

```text
effect.scheduler 存在 → effect.scheduler()
否则 → effect.run()
```

## computed.value 的完整读取流程

```text
读取 computed.value
→ trackEffect(computed.dep)，让当前消费者订阅 computed
→ dirty 为 true？
   是：computedEffect.run()，执行 getter 并保存 _value
   否：直接复用 _value
→ 返回 _value
```

注意：`trackEffect(computed.dep)` 要在执行内部 effect 前完成。内部 effect 运行期间会暂时把 `activeEffect` 切换为自己，执行结束后再恢复外层消费者。

## 检查点一：观察当前失败

运行：

```bash
npm run test:run -- packages/reactivity/__tests__/computed.test.ts
```

这个测试文件预期有 4 个通过、1 个失败。运行全量测试时是 30 个通过、1 个失败。失败测试会指出：重复读取 computed 时 getter 被重复执行。

## 检查点二：加入缓存与 dirty

先在 `ComputedRefImpl` 中加入：

```text
_value：保存最近一次结果
dirty：初始为 true
```

字段可以这样声明：

```ts
private _value!: T
private dirty = true
```

`!` 是“明确赋值断言”：告诉 TypeScript，虽然构造函数没有立刻给 `_value` 赋值，但在返回它之前，代码一定会先完成赋值。这里第一次读取时 `dirty` 必然为 true，因此该前提成立。

读取 value 时：

1. `dirty` 为 true 才执行 getter。
2. 把结果保存到 `_value`。
3. 把 `dirty` 设置为 false。
4. 返回 `_value`。

这一阶段先理解缓存状态，不要急着处理依赖失效。下一检查点会把源依赖变化接入 scheduler。

完成这一小步后，computed 测试预期会变成 2 个通过、3 个失败。重复读取缓存测试会通过，但依赖改变后的三个测试会暴露新问题：`dirty` 一旦变成 false，就再也没有代码把它恢复成 true，所以返回了旧缓存。这是检查点三要解决的问题。

## 检查点三：为 ReactiveEffect 增加 scheduler

修改 `ReactiveEffect`：

1. 让 `EffectFn` 和 `ReactiveEffect` 使用泛型返回值。
2. 让 `run()` 返回 `this.fn()` 的结果，同时保留 finally 恢复。
3. 增加可选 `scheduler` 属性，并让构造函数接收 scheduler。
4. `triggerEffects` 发现 scheduler 时调用它，否则继续 `run()`。
5. computed 使用内部 ReactiveEffect 运行 getter。

完成后，源 ref 改变时应该只让 computed 变 dirty，不应该立即执行 getter。

## 检查点四：连接 computed dep 与消费者

computed 还要维护自己的 dep：

```text
消费者读取 computed.value → trackEffect(computed.dep)
源依赖改变 → scheduler 标记 dirty 并 triggerEffects(computed.dep)
消费者被触发 → 再次读取 computed.value → 重新计算
```

完成后，`effect(() => observed = doubled.value)` 才能在 count 改变时更新。

同样的结构可以自然形成 computed 链：

```text
源 ref
→ computed A 的内部 effect
→ computed A 的 dep
→ computed B 的内部 effect
→ computed B 的 dep
→ 最外层消费者 effect
```

每一层 computed 都只负责订阅上一层，并通过自己的 dep 通知下一层。依赖未变化时，各层仍然复用自己的缓存。

## 本章暂不处理

- writable computed，即带 setter 的 computed。
- 异步 getter 和 Promise。
- 调度队列、批量更新和 flush timing。
- computed 的调试钩子。

## 完成标准

- computed 创建时不执行 getter。
- 重复读取且依赖未变化时复用缓存。
- 依赖变化后只标记 dirty，下一次读取才重新计算。
- computed 可以被 effect 读取，并在依赖变化后通知消费者。
- `ReactiveEffect` 的普通行为和前五章测试保持通过。

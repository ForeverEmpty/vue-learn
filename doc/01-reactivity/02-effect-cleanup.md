# 第二章：effect 重新执行与依赖清理

第一章实现了最小响应式闭环，但它只正确处理“effect 永远读取同一批 ref”的情况。本章要让 effect 在重新执行后，根据本次真正读取的数据更新订阅关系。

## 本章目标

- 理解为什么 effect 每次执行时读取的 ref 可能不同。
- 理解“新依赖没有收集”和“旧依赖没有删除”是两个独立问题。
- 使用 `ReactiveEffect` 对象同时保存函数和它的依赖。
- 建立 ref 到 effect、effect 到 ref 的双向关系。
- 在重新执行前清理旧依赖，再收集本次依赖。
- 理解为什么触发 effect 时需要复制订阅集合。

## 先看一个会出错的条件分支

```ts
const usePrimary = ref(true)
const primary = ref('主分支')
const fallback = ref('备用分支')

effect(() => {
  displayed = usePrimary.value ? primary.value : fallback.value
})
```

第一次执行时，effect 读取了：

```text
usePrimary.value
primary.value
```

它没有读取 `fallback.value`，因为条件表达式只会执行被选中的分支。因此首次订阅关系是：

```text
usePrimary.subscribers → effect
primary.subscribers    → effect
fallback.subscribers   → 空
```

当 `usePrimary.value` 改成 `false` 时，effect 会重新执行，并开始读取 `fallback.value`。正确的订阅关系应该变成：

```text
usePrimary.subscribers → effect
primary.subscribers    → 空
fallback.subscribers   → effect
```

## 当前实现为什么做不到

### 问题一：新分支没有被订阅

当前 setter 保存的是普通函数，并直接调用它。effect 重新执行时没有重新设置 `activeEffect`，所以读取 `fallback.value` 时，getter 找不到当前 effect。

结果是：切换到备用分支后，修改备用值不会更新页面。

### 问题二：旧分支仍然保留订阅

即使重新执行时能够收集 fallback，旧的 `primary.subscribers` 仍然保存着 effect。

结果是：页面已经不使用主分支，修改主分支却仍然会进行一次无意义的 effect 执行。

## 为什么普通函数不够用了

第一章的订阅者只是 `EffectFn`：

```text
ref 的 Set → effectFn
```

ref 知道“哪些 effect 依赖我”，但 effect 不知道“我依赖了哪些 ref”。清理时需要反向找到所有旧集合，因此第二章要把普通函数包装成对象：

```text
ref 的 dep ───────────────→ ReactiveEffect
    ↑                              │
    └──────── ReactiveEffect.deps ─┘
```

- ref 的 `dep` 保存订阅它的 `ReactiveEffect`。
- `ReactiveEffect.deps` 保存这个 effect 加入过的所有 dep。
- 清理时遍历 `deps`，从每个 dep 中删除当前 effect。

这就是双向关系。空间占用会多一点，但换来了准确清理的能力。

## 变量名建议

| 含义 | 推荐变量名 | 说明 |
| --- | --- | --- |
| 用户传入的原始函数 | `effectFn` | 只负责业务逻辑 |
| 包装后的 effect 对象 | `reactiveEffect` | 拥有 `run()` 和 `deps` |
| 当前正在运行的对象 | `activeEffect` | 类型将从函数改为 `ReactiveEffect` |
| 一个 ref 的订阅集合 | `dep` | dependency 的缩写，类型是 Set |
| effect 加入过的所有集合 | `deps` | 复数，类型是数组 |
| 清理函数 | `cleanupEffect` | 删除旧的双向关系 |
| 触发时使用的集合副本 | `effectsToRun` | 避免遍历期间修改原集合 |

注意区分：`dep` 是一个 ref 的一个集合；`deps` 是一个 effect 保存的多个集合。

## 检查点一：复现两个错误

本章已经添加测试文件 `packages/reactivity/__tests__/effect-cleanup.test.ts`。先运行：

```bash
npm run test:run
```

预期第一章的 7 个测试继续通过，本章的 2 个测试失败：

1. effect 重新执行时没有订阅新分支。
2. effect 重新执行后没有取消旧分支订阅。

再运行 playground：

```bash
npm run dev
```

在“分支依赖实验”中：

1. 从主分支切换到备用分支，显示内容会切换。
2. 修改备用分支，页面不会更新，这是“没有收集新依赖”。
3. 修改主分支，页面反而会执行更新，这是“没有清理旧依赖”。

先观察，不要立即改源码。能够明确说出两个错误的区别，才进入下一检查点。

## 检查点二：用对象包装 effect 函数

下一步将在 `effect.ts` 中创建下面的骨架：

```ts
export class ReactiveEffect {
  readonly deps: Dep[] = []

  constructor(readonly effectFn: EffectFn) {}

  run(): void {
    // TODO：清理旧依赖
    // TODO：设置 activeEffect
    // TODO：执行 effectFn
    // TODO：清空 activeEffect
  }
}
```

`effect(effectFn)` 不再直接执行参数，而是：

```text
创建 ReactiveEffect 对象
→ 调用对象的 run()
```

以后 setter 触发的也不再是普通函数，而是对象的 `run()`。这样每次重新执行都能设置 `activeEffect`。

这一检查点暂时不要自己开始。完成错误复现并告诉我现象后，我会带你修改类型关系。

## 检查点三：建立双向依赖

getter 收集依赖时要同时完成两件事：

```text
dep.add(activeEffect)
activeEffect.deps.push(dep)
```

加入前仍然要判断 `dep` 中是否已经存在当前 effect。否则重复读取同一个 ref 时，`deps` 数组也会出现重复项。

## 检查点四：重新执行前清理旧依赖

`cleanupEffect(reactiveEffect)` 的思路是：

```text
遍历 reactiveEffect.deps
→ 从每一个 dep 中删除 reactiveEffect
→ 清空 reactiveEffect.deps
```

清理必须发生在 effectFn 重新执行之前。执行过程中 getter 会根据本次读取情况重新建立依赖。

```text
旧依赖清理
→ 执行 effectFn
→ 收集本次依赖
→ 得到最新关系
```

## 检查点五：触发前复制集合

effect 执行前会从 dep 删除自己，执行时又可能重新加入同一个 dep。如果直接遍历原始 Set，遍历过程中删除再添加元素可能造成重复访问甚至无限循环。

因此 setter 不直接遍历原集合，而是先创建快照：

```text
effectsToRun = dep 的副本
→ 遍历 effectsToRun
→ 调用每个 reactiveEffect.run()
```

## 完成标准

- 第一章和第二章的全部测试通过。
- 切换分支后，新分支的值能够触发更新。
- 切换分支后，旧分支的值不再触发更新。
- 同一个 effect 重复读取同一个 ref 时仍然只订阅一次。
- 类型检查和 playground 构建通过。

本章暂时不处理嵌套 effect 和 `stop()`。它们会在后续章节单独学习。

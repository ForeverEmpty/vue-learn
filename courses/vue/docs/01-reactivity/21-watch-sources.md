# 第二十一章：watch 数据源标准化与多数据源

> 状态：进行中。章节骨架、18 项测试、实验页和复习题已创建。
> 起点结果：4 项通过、14 项失败。失败代表 ref、reactive 和多个 source 还没有完成，不是环境错误。

前面的 `watch` 只能接收 getter：

```ts
watch(() => state.count, callback)
```

Vue 还允许直接监听 ref、reactive 对象，以及由它们组成的 source 数组：

```ts
watch(count, callback)
watch(state, callback)
watch([count, () => state.title], callback)
```

这三种输入的外形不同，但 `ReactiveEffect` 最终只会执行函数。因此本章的核心不是在 `job` 里不断判断输入，而是先把所有合法输入转换成统一的内部结构。

官方 Vue 将 watch source 定义为 getter、ref、reactive 对象或这些类型组成的数组；直接监听 reactive 对象时会自动成为深层监听。可对照 [Vue watch API](https://vuejs.org/api/reactivity-core.html#watch)。本项目保留此前约定：`flush` 默认仍为 `"sync"`，暂不改成生产 Vue 的默认值，以免旧章节行为突然变化。

## 0. 本章目标和文件分工

本章完成以下能力：

1. `watch(refValue, callback)` 自动读取 `.value`。
2. computed 复用 ref source 分支，不需要单独写一个 computed 分支。
3. `watch(reactiveObject, callback)` 默认深入读取对象。
4. `watch([sourceA, sourceB], callback)` 向回调提供对应的新旧值数组。
5. 多 source 按元素比较，不能只比较每次新建的结果数组。
6. 分清“reactive 数组本身”和“装着多个 source 的普通数组”。
7. 新输入形式继续复用已有的 `immediate`、`flush`、cleanup 和 stop。

涉及文件：

| 文件 | 作用 | 由谁修改 |
| --- | --- | --- |
| `courses/vue/packages/reactivity/src/watch.ts` | source 类型、标准化、变化判断 | 你按检查点实现 |
| `courses/vue/packages/reactivity/src/index.ts` | 导出本章新增的公开类型 | 骨架已接好 |
| `courses/vue/packages/reactivity/__tests__/watch-sources.test.ts` | 18 项分组行为测试 | 已创建，由我维护 |
| `apps/learning-portal/src/pages/vue/watch-sources.ts` | 浏览器实验入口 | 已创建，由我维护 |
| `courses/vue/review_questions/01-reactivity/21-watch-sources.md` | 本章复习题与作答区 | 已提前创建 |

常用命令都在仓库根目录执行：

```bash
# 先验证旧 getter 行为
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 1"

# 验收当前检查点，把 2A 换成 2B、3A、3B、3C 或 4
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 2A"

# 查看本章完整目标
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts
```

## 1. 先分清“用户输入”和“effect 执行的 getter”

### 1.1 用户传 getter

```ts
watch(() => state.count, callback)
```

用户传进来的函数已经可以交给 `ReactiveEffect`：

```text
effect.run()
→ 执行 () => state.count
→ 读取 state.count
→ 收集 count 依赖
→ 返回数字
```

### 1.2 用户传 ref

```ts
const count = ref(0)
watch(count, callback)
```

`count` 是对象，不是函数，不能直接执行。内部要替用户生成：

```ts
() => count.value
```

关键不是“返回 count”，而是读取 `count.value`。只有读取 `.value` 才会进入 ref getter 并收集它的 Dep。

```text
错误：() => count
      只返回 ref 对象，没有读取 .value

正确：() => count.value
      进入 ref getter，收集依赖并返回真正的值
```

computed 也带有 `IS_REF` 标记，所以 `isRef(computedValue)` 为 true。它应该自然走 ref 分支，不要再使用 `instanceof` 或添加 computed 专属判断。

### 1.3 用户直接传 reactive 对象

```ts
const state = reactive({ user: { score: 0 } })
watch(state, callback)
```

只写 `() => state` 仍然不会触发任何属性的 Proxy `get` trap。必须在 effect 运行期间遍历它：

```ts
() => {
  traverse(state)
  return state
}
```

这与下面的 getter 形式有意不同：

```ts
watch(() => state, callback)
```

用户显式写 getter 时，默认只观察 getter 返回身份是否改变；如果想观察内部变化，仍应传 `{ deep: true }`。直接传 reactive 对象才具有“默认深入监听”的语义。

## 2. 为什么标准化结果不应只保存 getter

直接 reactive source 深层属性变化后，getter 前后返回的是同一个 Proxy：

```ts
newValue === oldValue // true
```

但 callback 仍然应该运行。因为依赖既然已经通知 watcher，就说明遍历期间读取到的某个内容发生了变化。

因此本章骨架准备了：

```ts
interface NormalizedWatchSource {
  getter: WatchGetter<unknown>
  forceTrigger: boolean
  isMultiSource: boolean
}
```

三个字段分别回答：

| 字段 | 保存的问题答案 |
| --- | --- |
| `getter` | ReactiveEffect 实际执行哪个函数？ |
| `forceTrigger` | 即使返回身份相同，收到依赖通知后是否仍执行 callback？ |
| `isMultiSource` | 新旧值是否是 source 结果数组，需要逐项比较？ |

变量名建议：

| 名称 | 含义 |
| --- | --- |
| `source` | 用户传入的原始监听目标 |
| `normalizedSource` | 标准化后的统一描述对象 |
| `sourceGetter` / `getter` | 真正交给 ReactiveEffect 执行的函数 |
| `normalizedItems` | 多 source 中逐项标准化后的结果 |
| `forceTrigger` | 是否跳过顶层身份比较而强制通知 |
| `isMultiSource` | 当前输入是否为多个 source |
| `newValues` / `oldValues` | 多 source 的本轮和上一轮结果数组 |

## 3. TypeScript 类型在表达什么

骨架中的单 source 类型是：

```ts
export type WatchSource<T> =
  | Ref<T>
  | (() => T)
  | (T extends object ? T : never)
```

含义是：当 callback 中的新值类型为 `T` 时，source 可以是：

- 装着 `T` 的 ref；
- 返回 `T` 的 getter；
- 当 `T` 自身是对象时，直接传这个对象。

多个 source 需要逐项提取返回值：

```ts
export type WatchSourceValue<Source> =
  Source extends Ref<infer Value>
    ? Value
    : Source extends WatchGetter<infer Value>
      ? Value
      : Source extends object
        ? Source
        : never
```

例如：

```ts
const sources = [ref(1), () => "ready"] as const
```

逐项推导：

```text
第 0 项 Ref<number>      → number
第 1 项 () => string     → string
最终 callback 值         → [number, string]
```

`WatchSourceValues` 使用映射类型处理整个元组：

```ts
export type WatchSourceValues<Sources extends WatchSourceList> = {
  -readonly [Index in keyof Sources]: WatchSourceValue<Sources[Index]>
}
```

`-readonly` 是删除只读修饰符。输入使用 `as const` 后是只读元组，但 callback 接收的是一次新建的普通结果数组，所以输出元组不必保持 readonly。

本章先把这些类型作为可用骨架。核心任务仍然是运行时标准化，不要求你从空白处背出整套条件类型。

## 检查点一：解释当前为什么只支持 getter

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 1"
```

应有 2 项通过。然后阅读 `watch.ts` 中的 `normalizeWatchSource` 起点实现：

```ts
const getter = typeof source === "function"
  ? source
  : () => source
```

先回答下面两个问题，不改代码：

1. 如果 source 是 `ref(1)`，`getter` 只返回 ref 对象而不读取 `.value`，为什么之后修改 `value` 不会触发 watch？
2. 如果 source 是 reactive 对象，为什么只 `return source` 不会收集对象属性？

回答后再开始 2A。

## 检查点 2A：标准化 ref 与 computed

只修改 `watch.ts`。

1. 从 `ref.ts` 导入 `isRef`，不能只导入 `type Ref`。
2. 在判断普通函数之前判断 `isRef(source)`。
3. ref 分支的 getter 返回 `source.value`。
4. 该分支暂时设置 `forceTrigger: false`、`isMultiSource: false`。
5. 普通 getter 保持原行为。

结构示意：

```ts
if (isRef(source)) {
  return {
    getter: () => source.value,
    forceTrigger: false,
    isMultiSource: false,
  }
}
```

为什么 `isRef` 要在 `typeof source === "function"` 之前？这里不是因为当前 RefImpl 是函数，而是先按明确的 source 类别组织代码，后面增加其他对象类型时更容易审查每条分支。

不要写：

```ts
getter: () => source
```

它不会触发 ref getter。也不要写 `source instanceof RefImpl`，因为 `RefImpl` 是内部类，`toRef` 和 computed 也不是它的实例。

验收：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 2A"
```

目标为 3 项通过。

## 检查点 2B：直接监听 reactive 对象

从 `reactive.ts` 导入 `isReactive`，在把普通数组判断为多 source 之前处理 reactive：

```ts
if (isReactive(source)) {
  return {
    getter: () => {
      traverse(source)
      return source
    },
    forceTrigger: true,
    isMultiSource: false,
  }
}
```

这里有两个容易漏掉的部分：

### 必须遍历

遍历会读取对象属性、数组元素或集合内容，从而借用第 19、20 章已经实现的追踪能力。不要先 `toRaw(source)` 再遍历，否则所有读取都会绕过 Proxy。

### 必须 forceTrigger

深层变化不会替换 reactive Proxy：

```text
oldValue ─┐
          ├─ 同一个 Proxy
newValue ─┘
```

所以 `hasChanged(newValue, oldValue)` 为 false。`job` 的执行条件要加入：

```ts
normalizedSource.forceTrigger
```

当前判断可以先扩展为：

```ts
if (
  initialized &&
  !deep &&
  !normalizedSource.forceTrigger &&
  !hasChanged(newValue, oldValue)
) {
  return
}
```

不要把 `forceTrigger` 理解成“每次调用 scheduler 都无条件执行”。没有依赖发生变化时，scheduler 根本不会收到通知；它只是说明收到通知后不能再用同一 Proxy 身份拦掉 callback。

本检查点暂时规定直接 reactive source 默认完整遍历。显式 `deep: false` 和数字深度会在第 22 章统一处理，不要提前把两章混在一起。

验收：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 2B"
```

目标为 3 项通过。第一个测试还会证明深层变更时 `newValue === oldValue === source`，watch 不会自动替你保存对象快照。

## 4. 多 source 为什么不是多个 watcher

```ts
watch([count, () => state.title], callback)
```

这里应该只有一个 `ReactiveEffect`、一个 scheduler、一个 job 和一份 cleanup 生命周期。

```text
一个 ReactiveEffect.run()
          ↓
执行多个标准化 getter
          ↓
[count.value, state.title]
          ↓
一个 callback(newValues, oldValues)
```

如果分别创建两个 watcher，会出现：

- 同一 tick 可能执行两次 callback；
- 无法一次得到所有 source 的一致快照；
- cleanup 和 stop 需要管理多份内部状态；
- `flush: "pre"` 的去重逻辑更难保持为一次任务。

## 检查点 3A：建立多 source 的组合 getter

建议把单项判断提取成：

```ts
function normalizeSingleWatchSource(
  source: Ref<unknown> | WatchGetter<unknown> | object,
): NormalizedWatchSource {
  // 放入 2A、2B 完成的 ref、reactive、getter 分支
}
```

然后让 `normalizeWatchSource` 负责判断“单个还是多个”。判断顺序很重要：

```text
1. isRef(source)
2. isReactive(source)
3. Array.isArray(source)
4. typeof source === "function"
```

也可以先用 `isReactive(source) || !Array.isArray(source)` 决定是否交给单项函数。核心要求是：**isReactive 必须在普通数组分支之前。**

普通 source 数组的处理思路：

```ts
const normalizedItems = source.map(item => normalizeSingleWatchSource(item))

return {
  getter: () => normalizedItems.map(item => item.getter()),
  forceTrigger: normalizedItems.some(item => item.forceTrigger),
  isMultiSource: true,
}
```

不要在创建 watch 时立刻执行每个 getter。依赖读取必须发生在 `watcherEffect.run()` 期间，否则没有 activeEffect，无法收集依赖。

一个 reactive 对象作为 source 数组中的某一项时，仍走单项 reactive 分支，因此默认深入遍历。computed 仍走 ref 分支。

验收：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 3A"
```

目标为 3 项通过。

## 检查点 3B：不要比较结果数组本身

每次运行组合 getter 都会创建新数组：

```ts
[0, "ready"] !== [0, "ready"] // true
```

因此下面的判断必然认为发生变化：

```ts
hasChanged(newValue, oldValue)
```

即使每个元素都相同，两个数组也不是同一个对象。多 source 必须逐项判断：

```ts
const changed = newValues.some((value, index) =>
  hasChanged(value, oldValues[index]),
)
```

建议把变化判断集中成一个布尔变量：

```ts
let sourceChanged: boolean

if (deep || normalizedSource.forceTrigger) {
  sourceChanged = true
} else if (normalizedSource.isMultiSource) {
  // 将 unknown 安全收窄或在这一小段转换为 unknown[] 后逐项比较
} else {
  sourceChanged = hasChanged(newValue, oldValue)
}
```

只有 `initialized && !sourceChanged` 时提前返回。首次 `immediate` 仍要执行 callback。

测试中 `() => state.count % 2` 很重要：`count` 从 0 变成 2 会触发 effect，但 getter 结果仍是 0，所以 callback 不应该执行。它能区分“依赖触发过”和“source 的对外结果真的改变了”。

验收：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 3B"
```

目标为 2 项通过。

## 检查点 3C：复用原有调度和生命周期

多 source 不需要新写 scheduler：

```text
任一 source 依赖触发
→ 同一个 scheduler
→ 同一个 job
→ watcherEffect.run() 一次取得完整 newValues
→ 与完整 oldValues 比较
→ callback 一次
```

检查下面几点即可：

1. `flush: "pre"` 仍使用同一个 `job` 引用加入 Set 队列，因此多个 source 同一 tick 变化只刷新一次。
2. `oldValue = newValue` 保存的是上一次组合 getter 创建的结果数组。
3. 更新 oldValue 仍然放在 callback 前，保持第 19 章同步重入时的正确顺序。
4. cleanup、stop 和 `stopped` 守卫不按 source 数量复制。

如果 3A、3B 结构正确，这一检查点通常不需要大量新代码；它用于确认你没有为了多 source 破坏已有生命周期。

验收：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 3C"
```

目标为 2 项通过。

## 5. 数组为什么会有两种身份

下面两种数组含义不同。

### 普通数组：多个 source 的容器

```ts
watch([count, () => state.title], callback)
```

数组中的每一项都是一个 source，callback 收到结果数组。

### reactive 数组：它自己就是一个 source

```ts
const list = reactive([1])
watch(list, callback)
```

这里要观察 list 的内部变化。它不表示“数字 1 是一个 watch source”。这就是为什么运行时判断必须先执行 `isReactive(source)`，再执行 `Array.isArray(source)`。

再比较：

```ts
watch(() => list, callback)
```

外层已经是 getter，所以默认只比较 getter 的返回身份。`list.push()` 不会替换 list 的 Proxy，因此默认不执行 callback；要深入监听，需要 `{ deep: true }`。

## 检查点四：数组歧义与本章边界验收

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts -t "21 / 4"
```

目标为 3 项通过。确认：

- direct reactive 数组走单 source 深层分支；
- getter 返回数组时默认保持浅监听；
- `[() => list.length]` 是只包含一个 getter 的多 source；
- `newValue` 和 `oldValue` 的形状始终与 source 输入语义对应。

本章不要求实现以下内容，它们属于第 22 章：

- `deep: number`；
- direct reactive source 的 `deep: false` 根层语义；
- `once`；
- watch handle 的 `pause()` / `resume()`；
- 更完整的 watcher cleanup API。

## 6. 完整验收

当各检查点都通过后运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/watch-sources.test.ts
npm run test:run
npm run typecheck
npm run vue:build
```

当前起点：

```text
第 21 章：4 passed，14 failed，共 18 项
全量：239 passed，14 failed，共 253 项
```

最终目标是在不增加其他测试的前提下达到 253 项全部通过。测试和类型检查通过后，再完成 [第 21 章复习题](../../review_questions/01-reactivity/21-watch-sources.md)，经批改后才把目录与实验页标记为已完成。

## 7. 本章最终应该形成的思维模型

```text
用户传入 source
      ↓
按 ref / reactive / source数组 / getter 分类
      ↓
NormalizedWatchSource
├─ getter
├─ forceTrigger
└─ isMultiSource
      ↓
一个 ReactiveEffect 负责依赖收集
      ↓
一个 job 负责取新值、判断变化、更新旧值、cleanup 和 callback
```

重点不是背四段 `if`，而是理解：**先把不同输入翻译成统一内部协议，后面的调度与生命周期就不必关心用户最初传了什么。**

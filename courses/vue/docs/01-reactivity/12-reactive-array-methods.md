# 第十二章：数组方法的身份处理与依赖暂停

第十一章完成了索引和 `length` 的依赖联动，但数组方法仍有两个独立问题：搜索对象时会遇到 raw 与 Proxy 身份不同，修改数组的方法在 effect 内执行时又会错误收集自己的内部读取。

本章将为数组方法建立专用插桩。Vue 源码中也会把这些行为集中在类似 `arrayInstrumentations` 的结构中，而不是把所有特殊情况继续堆进普通 getter。

## 本章目标

- 理解为什么 `includes`、`indexOf` 和 `lastIndexOf` 会受到 raw/Proxy 身份影响。
- 在使用原数组搜索时，手动保留必要的响应式追踪。
- 理解 `push` 等方法为什么会在内部读取 `length`。
- 使用可嵌套的 tracking 状态暂停内部依赖收集。
- 保证数组方法触发的其他正常 effect 仍能重新收集依赖。
- 使用 `try/finally` 保证异常后恢复 tracking 状态。
- 为数组专用行为建立独立文件，避免普通对象代理继续膨胀。

## 第一类问题：raw 与 Proxy 不是同一个对象

```ts
const rawItem = { id: 1 }
const list = reactive([rawItem])

console.log(list[0] === rawItem) // false
```

原数组中保存的是 `rawItem`。但读取 `list[0]` 时，深层 reactive getter 会返回它的 Proxy。

原生 `includes` 大致会逐项读取数组并使用严格相等比较：

```text
list.includes(rawItem)
→ 读取 list[0]
→ getter 返回 reactive(rawItem)
→ Proxy === rawItem
→ false
```

因此当前实现会出现反直觉结果：数组明明由这个原对象创建，却搜索不到它。

受影响的方法包括：

- `includes`
- `indexOf`
- `lastIndexOf`

## 为什么需要取得原对象

第五章已经有两张缓存表：

```text
reactiveMap: raw   → Proxy
rawMap:      Proxy → raw
```

可以在 `reactive.ts` 增加一个内部函数：

```ts
toRaw(value)
```

它的规则是：

```text
value 是当前 reactive 创建的 Proxy
→ 从 rawMap 返回原对象

value 不是 Proxy
→ 原样返回 value
```

本章只供数组内部使用，暂时不要从 `courses/vue/packages/reactivity/src/index.ts` 公开导出。公开的 `toRaw`、`isReactive` 等工具会在后续 raw 工具章节统一教学。

推荐签名：

```ts
export function toRaw<T>(observed: T): T
```

“传入什么静态类型，就返回什么静态类型”能让调用处更容易继续使用，但要记住运行时引用可能从 Proxy 变回 raw。

## 数组专用方法应该在哪里处理

推荐新建：

```text
courses/vue/packages/reactivity/src/arrayInstrumentations.ts
```

它保存方法名到包装函数的映射：

```text
arrayInstrumentations
├─ includes
├─ indexOf
├─ lastIndexOf
├─ push
├─ pop
├─ shift
├─ unshift
└─ splice
```

普通 getter 的执行顺序改为：

```text
target 是数组，并且 key 是专用方法
→ 返回 arrayInstrumentations 中的包装函数

否则
→ 继续普通 Reflect.get、track 和深层 reactive
```

专用方法必须在普通 `track(target, key)` 之前返回，否则 effect 还会无意义地订阅 `'push'` 或 `'includes'` 这个方法属性。

判断包装表自身是否拥有某个方法时，可以复用第十章学过的：

```ts
Object.prototype.hasOwnProperty.call(arrayInstrumentations, key)
```

## 搜索时统一身份

搜索包装函数收到的 `this` 是响应式数组 Proxy。执行顺序可以设计为：

```text
Proxy this
→ toRaw(this)，得到原数组
→ 把查询参数逐个 toRaw
→ 在原数组上调用原生搜索方法
```

例如：

```text
原数组元素：rawItem
查询参数：reactive(rawItem)
→ 参数 toRaw 后也是 rawItem
→ rawItem === rawItem
→ 找到
```

调用原生方法时需要保留正确的 `this`：

```ts
Reflect.apply(nativeMethod, rawArray, rawArgs)
```

如果不熟悉这里的 this 和参数数组，复习：

- [00-03：call、apply 与 bind](../00-js-ts/03-call-apply-bind.md)
- [00-04：this 的指向](../00-js-ts/04-this-binding.md)

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 搜索方法名 | `method` |
| 原生数组方法 | `nativeMethod` |
| 当前响应式数组的原数组 | `rawArray` |
| 转成 raw 后的查询参数 | `rawArgs` |
| 方法执行结果 | `result` |

## 为什么直接使用原数组会丢失响应式

下面虽然能解决身份比较：

```ts
rawArray.includes(rawItem)
```

但读取发生在原数组上，不经过 Proxy getter，所以不会自动调用 `track`。

这会让下面的 effect 只执行一次：

```ts
effect(() => {
  console.log(list.includes('B'))
})

list[0] = 'B'
```

因此搜索前需要手动追踪：

```text
原数组当前的每一个索引
以及 length
```

为什么需要两类依赖：

- 已有索引值改变时，对应索引 dep 会触发搜索 effect。
- push 新元素时，第十一章建立的 length 联动会触发搜索 effect。
- 填充已有长度内的空位时，该空位索引已经被手动追踪，也会触发。
- length 缩短时，length dep 和被截断索引 dep 都可能命中，最终由 Set 去重。

手动追踪必须使用原数组作为 target，因为 set trap 调用 `trigger` 时使用的也是原数组 target。依赖图两边的对象引用必须完全一致。

## 第二类问题：修改方法会读取自己的 length

考虑：

```ts
const list = reactive<number[]>([])

effect(() => {
  list.push(1)
})
```

effect 的业务代码没有显式读取 `list.length`，但原生 `push` 内部必须知道新元素应该放在哪个索引：

```text
push
→ 内部读取 length
→ 计算新索引
→ 写入新索引
→ 写入 length
```

当前 getter 不知道这是数组方法的内部读取，于是把正在运行的 effect 加入 length dep。随后 push 自己又改变 length，effect 可能调度自己，甚至递归执行。

正确规则是：修改方法内部为了实现算法而进行的读取，不应成为用户 effect 的业务依赖。

本章处理的方法：

- `push`
- `pop`
- `shift`
- `unshift`
- `splice`

## 暂停的到底是什么：只暂停 track，不暂停 trigger

这是本章最容易混淆的地方。响应式的一次更新包含两个方向相反的动作：

```text
读取数据
→ track
→ 把当前 effect 加入 dep

写入数据
→ trigger
→ 找出 dep 中已有的 effects 并通知它们
```

`pauseTracking()` 只影响第一条路线：暂停“建立新的订阅关系”。它不应阻止第二条路线，数组写入仍然必须通知以前已经订阅的其他 effects。

| 操作 | 暂停期间是否执行 | 原因 |
| --- | --- | --- |
| Proxy 的 set/delete 真正修改数组 | 是 | 数据仍然需要改变 |
| trigger 查找已有依赖 | 是 | 其他正常 effect 仍需收到更新 |
| 当前 effect 因数组方法内部读取而加入新 dep | 否 | 这不是用户写出的业务读取 |
| 被 trigger 的其他 effect 重新执行 | 是 | 它们是真正依赖数组结果的订阅者 |

所以暂停不是 `stop(runner)`：

- `stop` 针对某一个 effect，清除它已有的订阅并停止后续自动触发。
- `pauseTracking` 是一个很短暂的全局收集状态，只包围数组方法的内部执行；方法结束后必须恢复。

可以把能否收集依赖理解成两个开关同时为真：

```text
存在 activeEffect
并且 shouldTrack === true
→ 才允许把 activeEffect 加入 dep
```

只有 activeEffect 还不够。执行 `effect(() => list.push(1))` 时确实存在 activeEffect，但 push 内部读取 length 不应该成为它的依赖，因此还需要 `shouldTrack`。

推荐把判断放在 `trackEffect()` 的最前面：

```ts
export function trackEffect(dep: Dep): void {
  if (!shouldTrack) return

  if (activeEffect && !dep.has(activeEffect)) {
    // 保留原来的收集逻辑
  }
}
```

之所以放在 `trackEffect` 而不是只放在 `track`，是因为 `reactive` 会经过 `track`，而 `ref`、`computed` 等代码可能直接调用 `trackEffect`。把最终开关放在共同入口更不容易漏掉。

## tracking 开关为什么需要栈

在 `effect.ts` 增加 tracking 状态：

```ts
let shouldTrack = true
const trackStack: boolean[] = []
```

暂停时不能只写 `shouldTrack = false`，因为暂停操作可能嵌套：

```text
外层原状态 true
→ 第一次 pause，保存 true，当前 false
→ 第二次 pause，保存 false，当前 false
→ 内层 reset，恢复 false
→ 外层 reset，恢复 true
```

推荐函数：

```ts
pauseTracking()
resetTracking()
```

基本思路：

```text
pauseTracking
→ trackStack.push(shouldTrack)
→ shouldTrack = false

resetTracking
→ 弹出上一次状态
→ 恢复 shouldTrack
```

`trackEffect` 最开始检查 `shouldTrack`。为 false 时直接返回，不把 activeEffect 加入 dep。

### pauseTracking 的逐行含义

```ts
export function pauseTracking(): void {
  trackStack.push(shouldTrack)
  shouldTrack = false
}
```

第一行不是在保存固定的 true，而是在保存“进入本次暂停前的真实状态”。外层可能早已暂停，所以保存的也可能是 false。

### resetTracking 的逐行含义

```ts
export function resetTracking(): void {
  const lastShouldTrack = trackStack.pop()
  shouldTrack = lastShouldTrack ?? true
}
```

- 栈中弹出 true：恢复为允许追踪。
- 栈中弹出 false：恢复为仍然暂停，说明外层暂停还没有结束。
- 栈意外为空：使用 true 作为安全的默认状态。

不要写成：

```ts
shouldTrack = true
```

这种 reset 会在嵌套暂停的内层结束时过早打开追踪。

### 用三个时刻验证嵌套状态

```text
初始：shouldTrack = true，stack = []

外层 pause：
stack = [true]
shouldTrack = false

内层 pause：
stack = [true, false]
shouldTrack = false

内层 reset：
弹出 false
stack = [true]
shouldTrack = false

外层 reset：
弹出 true
stack = []
shouldTrack = true
```

这里的栈保存的是状态历史，不是 effect 栈。它与第三章的 `parentEffect` 解决不同问题。

## 为什么 effect.run 必须主动开启 tracking

只实现全局暂停仍然有一个隐蔽错误。

```ts
effect(() => {
  console.log(list.length)
})

list.push(1)
```

数组包装函数暂停 tracking 后，写入新索引会触发上面的正常 length effect。它重新执行时会先清理旧依赖，然后读取 length。

如果此时全局 `shouldTrack` 仍是 false：

```text
正常 length effect 重新执行
→ cleanup 删除旧 length dep
→ 读取 length 时无法重新收集
→ 第一次 push 能执行
→ 第二次 push 再也收不到通知
```

因此 `ReactiveEffect.run()` 执行业务 effect 时，需要临时保证 tracking 为 true：

```text
保存进入 run 前的 shouldTrack
→ shouldTrack = true
→ 执行 effect 函数
→ finally 恢复进入前的状态
```

这不会破坏数组方法的暂停：正常 effect 结束后恢复 false，数组包装函数最后再恢复暂停前的状态。

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 当前是否允许依赖收集 | `shouldTrack` |
| 嵌套暂停前的状态栈 | `trackStack` |
| run 进入前的状态 | `previousShouldTrack` |
| 从栈中恢复的状态 | `lastShouldTrack` |

## effect.run 如何在暂停期间保护正常 effect

只看一句“run 中临时开启 tracking”可能很抽象，下面追踪两种不同的 effect。

### 情况一：执行 push 的 effect 不应该订阅内部 length

```ts
effect(() => {
  list.push(1)
})
```

完整顺序：

```text
1. ReactiveEffect.run 开始
   activeEffect = 当前 effect
   shouldTrack = true

2. getter 发现 key 是 push
   直接返回数组包装函数
   不执行普通 track(target, 'push')

3. push 包装函数调用 pauseTracking
   保存 true
   shouldTrack = false

4. 原生 push 内部读取 list.length
   activeEffect 仍然存在
   但 shouldTrack = false
   所以不会加入 length dep

5. 原生 push 写入索引和 length
   set trap 与 trigger 仍然正常执行
   但 dep 中没有当前 effect，所以它不会通知自己

6. finally 调用 resetTracking
   shouldTrack 恢复 true

7. ReactiveEffect.run 结束
   恢复进入 run 前的 activeEffect 和 tracking 状态
```

### 情况二：push 触发的另一个 length effect 必须重新收集

```ts
effect(() => {
  console.log(list.length)
})

list.push(1)
```

完整顺序：

```text
1. push 包装函数暂停收集
   shouldTrack = false

2. push 写入新索引
   trigger 找到以前已经订阅 length 的 effect

3. length effect 的 run 开始
   先保存 previousShouldTrack = false
   再临时设置 shouldTrack = true

4. effect 清理旧依赖并重新读取 list.length
   此时 shouldTrack = true
   所以重新加入 length dep

5. length effect 的 finally
   恢复 shouldTrack = false
   返回仍在执行的 push

6. push 包装函数的 finally
   resetTracking 恢复暂停前的 true
```

如果缺少第 3 步，第一次 push 会触发 length effect，但它清理后无法重新订阅，第二次 push 就不会再触发。这正是测试“每次数组方法执行后重新收集依赖”要发现的错误。

### run 中代码应该放在哪里

当前 `run()` 已经用 `try/finally` 恢复 `activeEffect`。tracking 状态与它属于同一层上下文，也应在这里保存和恢复：

```ts
const parentEffect = activeEffect
const previousShouldTrack = shouldTrack

activeEffect = this
shouldTrack = true

try {
  return this.fn()
} finally {
  activeEffect = parentEffect
  shouldTrack = previousShouldTrack
}
```

不要在 finally 中固定写 `shouldTrack = true`。如果这个 effect 是在数组方法的暂停期间被触发，它结束后必须先恢复 false，让外层数组方法继续保持暂停。

## 修改方法包装函数必须操作 Proxy this

搜索方法为了统一身份，会在原数组上执行并手动 track；修改方法不能照搬这种做法。

如果 push 直接操作 rawArray：

```ts
Reflect.apply(Array.prototype.push, rawArray, args)
```

写入会绕过 Proxy set trap，其他 effect 根本收不到 trigger。

修改方法应该让原生方法操作调用时收到的 Proxy `this`：

```ts
Reflect.apply(nativeMethod, this, args)
```

这样内部读取会经过 Proxy，但被 `shouldTrack = false` 拦住；内部写入也经过 Proxy，并继续正常 trigger。

可以先写一个共享函数，避免五个方法重复：

```ts
type MutationMethod = 'push' | 'pop' | 'shift' | 'unshift' | 'splice'

function mutateArray(
  array: unknown[],
  method: MutationMethod,
  args: unknown[],
): unknown {
  const nativeMethod = Array.prototype[method]

  pauseTracking()

  try {
    return Reflect.apply(nativeMethod, array, args)
  } finally {
    resetTracking()
  }
}
```

这里传入的 `array` 必须是包装方法运行时的 `this`，也就是响应式数组 Proxy。

## 为什么数组方法必须使用 try/finally

错误写法：

```ts
pauseTracking()
const result = Reflect.apply(nativeMethod, this, args)
resetTracking()
return result
```

如果原生方法抛出异常，代码不会走到 `resetTracking()`，全局状态会永久停留在 false。之后完全无关的 reactive 或 ref 读取都不能正常收集依赖。

正确结构：

```ts
pauseTracking()

try {
  return Reflect.apply(nativeMethod, this, args)
} finally {
  resetTracking()
}
```

`finally` 无论正常返回还是抛出异常都会执行。

## 暂停部分的常见错误

### 错误一：暂停后不保存旧状态

```ts
shouldTrack = false
// 执行方法
shouldTrack = true
```

问题：无法正确处理嵌套暂停，也无法恢复进入方法前本来就是 false 的状态。

### 错误二：暂停 track 的同时阻止 trigger

问题：外部真正依赖 length 或索引的 effect 也无法收到数组变化。暂停只应影响 `trackEffect`。

### 错误三：run 开启 tracking 后不恢复

问题：正常 effect 在暂停期间执行完后，会提前破坏外层数组方法的暂停状态。

### 错误四：修改方法在 rawArray 上执行

问题：虽然没有内部依赖，但写入也绕过 Proxy，响应式彻底失效。

### 错误五：先走普通 getter，再返回包装函数

问题：正在运行的 effect 会额外订阅 `'push'` 这个方法属性。应在普通 `Reflect.get` 和 `track` 之前识别数组专用方法。

### 错误六：只在 track 中判断 shouldTrack

问题：ref 可能直接调用 `trackEffect`，暂停状态无法覆盖共同入口。最终判断应放在 `trackEffect`。

## 检查点一：观察两类失败

运行：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/reactive-array-methods.test.ts
```

起点预期：

```text
3 passed
7 failed
```

全量测试起点预期：

```text
70 passed
7 failed
```

失败分成两组：

- 2 个搜索身份失败：原对象无法匹配 getter 返回的 Proxy。
- 5 个修改方法失败：push、pop、shift、unshift、splice 在 effect 中收集了内部依赖。

测试为修改方法配置 scheduler，因此当前错误只表现为 scheduler 被调用，不会让测试递归爆栈。

检查点问题：这两组失败是否来自同一个原因？请分别指出搜索方法和修改方法在哪一步出现问题。

## 检查点二：实现搜索方法身份统一

分三小步完成，不要一次改完所有文件。

### 2A：先建立内部 toRaw

1. 在 `reactive.ts` 中、两张 WeakMap 附近增加 `toRaw`。
2. 输入是 raw 时原样返回，输入是当前 reactive 的 Proxy 时从 `rawMap` 返回 raw。
3. 暂时不要从公共 `index.ts` 导出。
4. 用自己的临时检查确认 `toRaw(reactive(raw)) === raw`。

### 2B：只实现三个搜索包装

1. 新建 `arrayInstrumentations.ts`。
2. 建立 `includes`、`indexOf`、`lastIndexOf` 三个包装方法。
3. 包装方法中的 `this` 是响应式数组，先使用 `toRaw(this)` 得到 `rawArray`。
4. 遍历 `0` 到 `rawArray.length - 1`，对每个字符串索引调用 `track(rawArray, String(index))`。
5. 再调用 `track(rawArray, 'length')`。
6. 使用 `args.map(toRaw)` 统一查询参数身份。
7. 使用 `Reflect.apply(nativeMethod, rawArray, rawArgs)` 执行搜索。

先画出下面的数据是否一致：

```text
track 使用的 target：rawArray
set trap trigger 使用的 target：原始 target，也就是 rawArray
```

如果 track 错用 Proxy this，依赖图会以两个不同对象作为 key，写入时找不到搜索 effect。

### 2C：让数组 getter 返回包装方法

在 `baseHandlers.ts` 的 get trap 最前面判断：

```text
target 是数组
并且 arrayInstrumentations 自己拥有 key
→ 返回包装方法
```

这段必须位于普通 `Reflect.get` 和 `track` 之前。完成后再运行本章测试。

完成后预期搜索身份测试通过，只剩 5 个修改方法失败。

## 检查点三：实现可嵌套的 tracking 暂停

这一检查点也拆成三小步。每一步先检查变量的职责，再继续下一步。

### 3A：只建立 tracking 状态

在 `effect.ts` 中完成：

1. 在 `activeEffect` 附近增加 `shouldTrack = true`。
2. 增加 `trackStack: boolean[]`。
3. 实现并导出 `pauseTracking()`。
4. 实现并导出 `resetTracking()`。
5. 在 `trackEffect()` 第一行增加暂停判断。

此时不要急着包装 push。先手动追踪状态：

```text
true → pause → false → reset → true
true → pause → false → pause → false → reset → false → reset → true
```

如果第二条不能成立，说明 reset 没有正确恢复上一层状态。

### 3B：保护被触发的正常 effect

修改 `ReactiveEffect.run()`：

1. 保存 `previousShouldTrack`。
2. 设置 activeEffect 后，把 `shouldTrack` 临时设为 true。
3. 在已有 finally 中恢复 `previousShouldTrack`。
4. 不要把恢复值固定为 true。

这里解决的不是“执行 push 的 effect”，而是“push 触发的其他正常 effect”。请重新阅读上面的两条完整时间线，确认能说出两者区别。

### 3C：最后包装五个修改方法

回到 `arrayInstrumentations.ts`：

1. 包装 push、pop、shift、unshift、splice。
2. 五个方法共用一个 `mutateArray` 辅助函数。
3. 调用原生方法之前 `pauseTracking()`。
4. 原生方法必须在响应式数组 Proxy 上执行，不能使用 rawArray。
5. 使用 `try/finally`，在 finally 中 `resetTracking()`。
6. 确保 get trap 在普通 track 前返回这些包装方法。

实现完成后，重点对照两个测试结果：

- 五个“在 effect 内执行”测试的 `schedulerCalls` 都应为 0。
- 连续执行两次 push 时，普通 length effect 应总共执行 3 次，证明第一次执行后没有丢失订阅。

完成后，本章测试应全部通过。

## 检查点四：异常与恢复边界

为 tracking 恢复补一个测试：

1. 创建一个不能继续新增元素的响应式数组。
2. 再创建一个普通响应式对象。
3. 在同一个 effect 中调用 push，并在 effect 内捕获它抛出的异常。
4. catch 结束后，让同一个 effect 继续读取普通响应式属性。
5. 修改这个普通属性，验证 effect 能再次执行，证明数组方法的 finally 在读取前已经恢复 tracking。

不要在异常之后才新建另一个 effect。`ReactiveEffect.run()` 本身会临时把 tracking 设为 true，新 effect 仍可能成功收集，从而掩盖数组包装函数忘记恢复状态的错误。必须让异常后的属性读取继续发生在当前这一次 run 中。

你先完成测试，我会检查测试是否真的经过数组包装函数的异常路径。

## 本章暂不处理

- 公开的 `toRaw`、`isReactive`、`isReadonly`。
- readonly 和 shallow 代理。
- Map、Set、WeakMap 和 WeakSet。
- 数组迭代器与 `map/filter/find` 的完整 Vue 行为。
- Vue 内部的批处理实现。

本章结束后，数组最重要的索引、length、搜索身份和修改方法依赖问题已经形成完整闭环；响应式模块仍会继续 readonly、shallow、raw、ref 与 watch 工具。

## 完成标准

- 三个身份搜索方法同时支持 raw 与 Proxy 查询参数。
- 搜索方法仍会响应索引替换、空位填充、数组增长和截断。
- 五个修改方法不会订阅自己的内部读取。
- 修改方法触发的其他 effect 可以正常重新收集依赖。
- 异常后 tracking 状态能够恢复。
- 前十一章测试保持通过。

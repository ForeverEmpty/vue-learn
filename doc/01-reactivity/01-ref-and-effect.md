# 第一章：ref 与 effect

本章从零实现最小响应式闭环。完成后，你应该能够解释：为什么读取数据时需要收集依赖，以及修改数据时如何通知使用者重新执行。

## 本章目标

- 理解普通变量为什么不会自动更新 DOM。
- 理解 `ref` 和 `effect` 分别负责什么。
- 学会使用 getter、setter 和 `Set`。
- 实现最小版本的 track（追踪）与 trigger（触发）。
- 学会通过 playground 观察行为、通过测试定位问题。

## 目录是怎样连接的

```text
playground
    ↓ 只从 mini-vue 导入公开 API
packages/vue
    ↓ 统一导出各个核心模块
packages/reactivity
    ↓ 使用公共工具
packages/shared
```

- `packages/shared`：所有模块都可能使用的小工具。
- `packages/reactivity`：你当前学习的 `ref`、`effect`，以后还会有 `reactive`、`computed`。
- `packages/vue`：对使用者暴露的统一入口。以后即使内部多出许多包，playground 的导入方式也不用变化。
- `playground`：浏览器实验场。这里不是框架源码，只负责调用你写的 mini-vue。
- `__tests__`：自动验证行为。测试描述“应该发生什么”，不会告诉实现“具体怎样写”。

## 常用命令

```bash
npm run dev
npm run test:run
npm run typecheck
npm run build
```

运行 `npm run dev` 后打开终端显示的地址。当前点击按钮后，内部的 `count.value` 会变化，但页面数字不会变化，因为依赖收集和触发更新还没有实现。

`npm run test:run` 当前应当有一个测试失败。这是有意保留的学习目标，不是项目安装失败。

## 第一课：普通变量为什么不能自动更新页面

浏览器不知道“某个变量”和“某段 DOM 更新代码”之间存在关系。下面两件事原本彼此独立：

1. `count.value` 被修改。
2. 把 `count.value` 写入页面。

响应式系统要记住这条关系：当页面更新函数读取了 `count.value`，`count` 就把这个函数登记为自己的订阅者；以后 `count` 改变时，再通知这个函数执行。

这个过程分为两个动作：

- **track（追踪）**：读取值时收集当前 effect。
- **trigger（触发）**：修改值时运行已经收集的 effect。

## 先认识三个 TypeScript/JavaScript 工具

### 1. getter 和 setter

普通属性无法让你在读取、写入时插入额外操作。访问器属性可以：

```ts
class Temperature {
  private _value = 20

  get value() {
    console.log('有人读取了 value')
    return this._value
  }

  set value(nextValue: number) {
    console.log('有人修改了 value')
    this._value = nextValue
  }
}
```

这不是响应式答案，只是在演示拦截读取与写入的方法。你需要思考：track 应该放在 getter 还是 setter？trigger 又应该放在哪里？

### 2. Set

同一个 effect 可能多次读取同一个值，但订阅列表中只需要保存一次，因此使用 `Set`：

```ts
const subscribers = new Set<() => void>()

subscribers.add(someFunction)
subscribers.forEach((subscriber) => subscriber())
```

### 3. 当前正在执行的 effect

getter 被调用时只知道“有人读了我”，却不知道是谁读取了它。因此模块需要一个变量，暂时记录当前正在执行的 effect：

```text
effect(fn) 开始
→ 把 fn 记录为 activeEffect
→ 执行 fn
→ fn 读取 ref.value
→ ref 的 getter 收集 activeEffect
→ fn 结束
→ 清空 activeEffect
```

清空动作很重要，否则在 effect 外部读取值，也会错误地登记上一次的函数。

## 不知道怎样动手时：先沿着现有代码走一遍

先打开 `playground/src/main.ts`，不要急着修改。按实际执行顺序观察：

1. `ref(0)` 返回一个保存数字 `0` 的对象。
2. `effect(...)` 收到一个负责更新页面的函数。
3. 当前的 `effect` 立即执行这个函数，所以页面第一次显示 `0`。
4. 执行函数时读取了 `count.value`，但当前的 ref 没有记住是谁读取了它。
5. 点击按钮后，`count.value++` 确实把值改成了 `1`。
6. 因为 ref 没有记住页面更新函数，所以它不知道应该再次执行谁。

第一章实际要做的事情，就是让第 4 步把函数记下来，并让第 6 步通知这个函数。

## 变量名建议

学习阶段优先使用含义完整的名字。等你完全理解后，再习惯 Vue 源码中的简写。

| 含义 | 初学者推荐 | 常见简写 | 说明 |
| --- | --- | --- | --- |
| effect 接收的函数 | `effectFn` | `fn` | 表示这是一个 effect 函数，不是任意函数 |
| 当前正在执行的 effect | `activeEffect` | `activeSub` | getter 通过它知道应该收集谁 |
| 获取当前 effect 的函数 | `getActiveEffect` | 无固定简写 | 避免 ref 模块直接修改状态 |
| ref 最初收到的值 | `initialValue` | `value` | 只在创建 ref 时使用 |
| ref 内部保存的值 | `_value` | `_value` | 下划线表示它是内部字段 |
| setter 收到的新值 | `newValue` | `newValue` | 与 `_value` 形成新旧对比 |
| effect 订阅集合 | `subscribers` | `dep` | Vue 源码常把依赖集合称为 dep |
| 遍历到的一个订阅者 | `subscriber` | `effect` | 它是一个等待被重新执行的函数 |
| ref 的实现类 | `RefImpl` | `RefImpl` | Impl 是 implementation（实现）的缩写 |

不要把所有变量都叫 `value`、`fn`、`set`。名字虽然更短，但在刚学习时很难判断它们分别代表什么。

## 检查点一：让 effect 暂存“当前函数”

先只修改 `packages/reactivity/src/effect.ts`。这一小段属于必要的脚手架，可以照着写，然后逐行解释给自己听：

```ts
export type EffectFn = () => void

let activeEffect: EffectFn | undefined

export function getActiveEffect(): EffectFn | undefined {
  return activeEffect
}

export function effect(effectFn: EffectFn): void {
  activeEffect = effectFn
  effectFn()
  activeEffect = undefined
}
```

逐行理解：

- 还没有函数执行时，`activeEffect` 是 `undefined`。
- 调用 `effect(effectFn)` 后，先把参数保存到 `activeEffect`。
- `effectFn()` 执行过程中会读取 `ref.value`。
- ref 的 getter 稍后可以调用 `getActiveEffect()` 找到这个函数。
- 执行结束后清空，避免 effect 外部的普通读取被错误收集。

写完后运行 `npm run typecheck`。这时响应式测试仍然失败是正常的，因为 ref 还没有使用 `activeEffect`。

## 检查点二：把普通 ref 改成可拦截读写的类

接着修改 `packages/reactivity/src/ref.ts`。先搭出下面的结构，TODO 部分暂时留空：

```ts
import type { EffectFn } from './effect'

export interface Ref<T> {
  value: T
}

class RefImpl<T> implements Ref<T> {
  private _value: T
  private readonly subscribers = new Set<EffectFn>()

  constructor(initialValue: T) {
    this._value = initialValue
  }

  get value(): T {
    // TODO：读取时收集当前 effect
    return this._value
  }

  set value(newValue: T) {
    // TODO：值改变时保存并通知 effect
  }
}

export function ref<T>(initialValue: T): Ref<T> {
  return new RefImpl(initialValue)
}
```

这里有四个容易陌生的点：

- `RefImpl<T>` 中的 `T` 代表值的类型。`ref(0)` 时 T 是 number，`ref('hello')` 时 T 是 string。
- `implements Ref<T>` 要求这个类必须提供符合接口的 `value`。
- `_value` 才是真正保存数据的位置。
- `subscribers` 是每个 ref 实例自己的集合。不要把它写到类外面，否则修改一个 ref 会错误触发另一个 ref 的 effect。

你可以先在 getter 和 setter 中加入日志，运行 playground，确认首次渲染发生 getter，点击按钮发生 getter 和 setter。确认后再删除日志。

## 检查点三：在 getter 中收集 effect

getter 中按这个顺序思考：

1. 从 effect 模块导入并调用 `getActiveEffect()`。
2. 把返回值保存为 `activeEffect`。
3. 它可能是 `undefined`，所以先判断。
4. 存在时调用 `subscribers.add(activeEffect)`。
5. 最后返回 `_value`。

为什么使用 `Set` 而不是数组？同一个 effect 可能读取两次 `count.value`，但重新执行时只应该运行一次。

完成这一部分后，ref 已经记住了 effect，但修改值时仍不会执行它。测试继续失败仍然符合预期。

## 检查点四：在 setter 中触发 effect

setter 中的顺序非常重要：

1. 用 `Object.is(newValue, this._value)` 判断新旧值是否相同。
2. 相同就直接 `return`，不要触发任何 effect。
3. 不相同时，先执行 `this._value = newValue`。
4. 再遍历 `subscribers`，调用其中的每一个 `subscriber`。

必须先保存新值，再执行 effect。否则 effect 重新读取 `.value` 时拿到的还是旧值。

项目的 `packages/shared/src/index.ts` 已经提供了 `hasChanged`。它内部使用 `Object.is`，所以你也可以导入它，让判断读起来更接近自然语言：只有 `hasChanged(newValue, this._value)` 为真时才继续更新。

## 每完成一步怎样确认

```bash
npm run typecheck
npm run test:run
npm run dev
```

- `typecheck` 报错：通常是类型、导入或拼写问题，先解决它。
- `test:run` 报错：看失败测试的中文标题，再看 Expected 和 Received。
- `dev`：用浏览器点击按钮，观察页面是否真的更新。

最后应该形成这条调用链：

```text
effect(effectFn)
→ activeEffect = effectFn
→ 执行 effectFn
→ 读取 ref.value
→ getter 将 activeEffect 加入 subscribers
→ 点击按钮修改 ref.value
→ setter 保存新值
→ setter 执行 subscribers 中的 effectFn
→ 页面重新读取新值并更新
```

## 常见错误自查

- 把 `subscribers` 写成全局变量，导致所有 ref 共用一个集合。
- 在 getter 内部每次都创建新的 `Set`，导致刚收集完就丢失。
- 没判断 `activeEffect` 是否为 `undefined` 就加入集合。
- setter 先触发 effect、后保存新值，导致 effect 读到旧值。
- 新旧值相同也触发，导致无意义的重复执行。
- 忘记让 `ref()` 返回 `new RefImpl(initialValue)`。

暂时不要处理嵌套 effect、依赖清理和异常恢复。先让最小闭环工作，再逐步发现为什么真实 Vue 需要那些设计。

## 完成标准

- playground 点击按钮后，数字随之更新。
- `npm run test:run` 的四个测试全部通过。
- `npm run typecheck` 没有类型错误。
- 不针对 `count` 写任何特殊逻辑；换成其他 ref 后仍然有效。

完成第一版后告诉我。我会先读你的代码，让测试结果指出问题，再解释为什么，而不是直接覆盖你的实现。

## 本章复习题

第一版验收已通过。题目、你的答案和批改记录统一保存在 [第一章复习：ref 与 effect](../../review_questions/01-reactivity/01-ref-and-effect.md)。

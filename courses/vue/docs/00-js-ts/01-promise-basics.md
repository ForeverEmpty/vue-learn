# 01. Promise 基础

> 所属大章节：`00. JS/TS 基础`

第九章需要把 `flushJobs` 安排到当前同步代码之后执行，并把这次刷新对应的 Promise 保存到 `currentFlushPromise`。如果 Promise 还不熟，直接记住一行写法会很容易混淆“现在执行”和“稍后执行”。这一课先把这些概念拆开。

## 本课目标

完成本课后，你应该能够解释：

- Promise 保存的不是立即得到的结果，而是一次异步结果的状态。
- `Promise.resolve().then(callback)` 为什么会让 callback 稍后执行。
- `.then(callback)` 为什么会返回一个新的 Promise。
- `.then(flushJobs)` 和 `.then(flushJobs())` 有什么区别。
- `currentFlushPromise = Promise.resolve().then(flushJobs)` 保存了什么。
- `await` 等待 Promise 时，代码的执行顺序怎样变化。

## 1. 先区分“现在的值”和“未来的结果”

普通变量通常直接保存现在已经存在的值：

```ts
const count = 1
```

读取 `count` 时马上得到 `1`。

有些结果不能立刻得到，例如：

- 等待网络请求返回。
- 等待文件读取完成。
- 等待计时器结束。
- 等待当前同步代码结束后再刷新任务队列。

Promise 是一个对象，用来表示“这项工作将来会成功得到结果，或者失败得到原因”。

```ts
const promise = Promise.resolve(10)
```

这里 `promise` 保存的是 Promise 对象，不是数字 `10`。数字 `10` 是这个 Promise 最终完成时携带的结果。

## 2. Promise 的三种状态

一个 Promise 只有三种状态：

| 状态 | 含义 |
| --- | --- |
| `pending` | 还在等待结果。 |
| `fulfilled` | 已经成功，拥有一个结果。 |
| `rejected` | 已经失败，拥有一个失败原因。 |

状态只能从 `pending` 变为 `fulfilled` 或 `rejected`，完成后不能再次改变。

```text
pending → fulfilled
pending → rejected
```

`Promise.resolve(10)` 会创建一个已经 fulfilled 的 Promise，它的结果是 `10`。

## 3. then 的 callback 不会立刻执行

先不要运行下面的代码，自己预测输出：

```ts
console.log('1. 开始')

Promise.resolve().then(() => {
  console.log('3. Promise callback')
})

console.log('2. 结束')
```

实际输出是：

```text
1. 开始
2. 结束
3. Promise callback
```

虽然 `Promise.resolve()` 已经完成，但传给 `then` 的 callback 仍然不会插入当前同步代码中执行。JavaScript 会把它放进微任务队列，等待当前调用栈结束。

```text
执行第一条 console.log
→ 把 then callback 放入微任务队列
→ 执行最后一条 console.log
→ 当前同步代码结束
→ 执行微任务队列中的 callback
```

所以第九章说的“安排一个微任务”并不是创建线程，也不是立刻执行函数，而是把函数登记为稍后要执行的工作。

## 4. 传入函数与调用函数

假设有一个函数：

```ts
function flushJobs(): void {
  console.log('刷新队列')
}
```

下面两种写法完全不同。

### 把函数传给 then

```ts
Promise.resolve().then(flushJobs)
```

这里写的是函数名，没有小括号。它的含义是：

```text
把 flushJobs 函数交给 then
→ 当前代码结束后
→ Promise 再调用 flushJobs
```

### 现在就调用函数

```ts
Promise.resolve().then(flushJobs())
```

`flushJobs()` 带有小括号，会在执行到这一行时立即调用。因为它返回 `void`，相当于把 `undefined` 传给 `then`，这不是我们需要的行为。

可以先记住这个判断方法：

```text
函数名       → 把函数交给别人，稍后由别人调用
函数名()     → 自己现在调用函数
```

箭头函数也是把函数传进去：

```ts
Promise.resolve().then(() => {
  flushJobs()
})
```

外层箭头函数现在不会执行。Promise 稍后调用外层箭头函数时，里面的 `flushJobs()` 才会执行。

## 5. then 会返回新的 Promise

每次调用 `.then(...)`，都会立即返回一个新的 Promise 对象：

```ts
const firstPromise = Promise.resolve(10)

const secondPromise = firstPromise.then((value) => {
  return value + 1
})
```

这两个变量保存的是两个不同的 Promise：

```text
firstPromise  完成结果是 10
secondPromise 等待 callback 执行，完成结果是 11
```

可以继续在新 Promise 后面调用 `then`：

```ts
secondPromise.then((value) => {
  console.log(value) // 11
})
```

这就是 Promise 链。前一个 callback 返回的值，会成为下一个 Promise 的成功结果。

## 6. “保存 Promise”到底保存了什么

第九章会写出类似代码：

```ts
const flushPromise = Promise.resolve().then(() => {
  flushJobs()
})

currentFlushPromise = flushPromise
```

执行第一行时发生两件事：

1. 安排 `flushJobs` 在微任务中执行。
2. 立即返回一个新的 Promise，代表“这次 flushJobs 何时执行完成”。

`flushPromise` 和 `currentFlushPromise` 保存的是同一个 Promise 对象的引用。它们没有保存 `flushJobs()` 的返回值，也没有保存队列中的 job。

可以把变量理解为本轮刷新的完成凭证：

```text
currentFlushPromise 还未完成
→ 说明 flushJobs 还没有执行完

currentFlushPromise 已完成
→ 说明 flushJobs 已执行完
```

因此 `nextTick` 才能这样等待本轮刷新：

```ts
currentFlushPromise.then(() => {
  console.log('队列刷新完成后执行')
})
```

## 7. 为什么变量类型是 Promise<void>

如果 `flushJobs` 没有返回值：

```ts
function flushJobs(): void {
  // 执行队列
}
```

那么等待它完成的 Promise 也没有业务结果值，TypeScript 类型是：

```ts
Promise<void>
```

第九章还需要用 `null` 表示当前没有等待刷新的 Promise：

```ts
let currentFlushPromise: Promise<void> | null = null
```

这个类型读作：

```text
currentFlushPromise 可以是 Promise<void>
或者可以是 null
```

## 8. await 是更像同步代码的等待写法

下面两种写法表达的核心顺序相似。

使用 `then`：

```ts
const promise = Promise.resolve(10)

promise.then((value) => {
  console.log(value)
})
```

使用 `await`：

```ts
const value = await Promise.resolve(10)
console.log(value)
```

`await` 会暂停当前 async 函数后面的部分，等 Promise 完成后再继续。它不会阻塞整个 JavaScript 程序。

任何标记为 `async` 的函数都会返回 Promise：

```ts
async function getCount(): Promise<number> {
  return 10
}
```

虽然函数内部写了 `return 10`，调用者拿到的仍然是 `Promise<number>`：

```ts
const result = getCount() // Promise<number>
const count = await result // number
```

## 9. 失败、catch 与 finally

Promise 失败时会进入 rejected 状态：

```ts
Promise.reject(new Error('加载失败'))
  .catch((error) => {
    console.log(error.message)
  })
```

`catch` 处理失败，`finally` 无论成功或失败都会执行：

```ts
somePromise
  .then(() => {
    console.log('成功')
  })
  .catch(() => {
    console.log('失败')
  })
  .finally(() => {
    console.log('结束')
  })
```

第九章的 `flushJobs` 使用 `try...finally` 清理状态，道理相似：即使 job 抛出异常，也要尽量恢复队列状态。Promise 错误处理会在后续需要时继续深入。

## 10. Promise 微任务与 setTimeout

Promise callback 属于微任务，`setTimeout` callback 属于任务。当前同步代码结束后，JavaScript 会先清空微任务，再执行后续任务。

```ts
console.log('1. 同步开始')

setTimeout(() => {
  console.log('4. setTimeout')
}, 0)

Promise.resolve().then(() => {
  console.log('3. Promise')
})

console.log('2. 同步结束')
```

输出是：

```text
1. 同步开始
2. 同步结束
3. Promise
4. setTimeout
```

现在只需要掌握这条最小规则：

```text
同步代码 → Promise 微任务 → setTimeout 等后续任务
```

## 11. 对应回第九章

第九章的队列安排可以拆成：

```ts
queue.add(job)

if (isFlushPending) {
  return
}

isFlushPending = true

currentFlushPromise = Promise.resolve().then(() => {
  flushJobs()
})
```

逐行理解：

```text
queue.add(job)
→ 记录将来要执行的函数

isFlushPending = true
→ 记录已经安排过刷新，避免创建多个微任务

Promise.resolve().then(...)
→ 把 flushJobs 安排到同步代码之后

currentFlushPromise = ...
→ 保存代表本轮刷新完成时间的 Promise
```

## 基础检查点一：预测执行顺序

先不要运行，写出下面代码的输出顺序：

```ts
console.log('A')

const promise = Promise.resolve().then(() => {
  console.log('C')
})

console.log('B')

promise.then(() => {
  console.log('D')
})
```

然后打开 playground 的“Promise 基础”页面运行实验，对照自己的答案。

完成时，请说明：

1. `A、B、C、D` 的实际顺序。
2. `promise` 保存的是 callback 的返回值，还是一个新的 Promise 对象。
3. 为什么 `D` 一定在 `C` 后面。

## 本课暂不要求

- 手写 Promise。
- 完整事件循环规范。
- `Promise.all`、`allSettled`、`race` 和 `any`。
- 复杂 Promise 链错误恢复。
- 浏览器渲染与微任务检查点的底层规范。

这些内容等实际实现遇到需要时再补充。

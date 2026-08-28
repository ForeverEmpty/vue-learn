# 01. Promise 基础复习

> 所属大章节：`00. JS/TS 基础`
>
> 状态：已批改。

## 1. 写出下面代码的输出顺序，并解释同步代码和 Promise callback 为什么是这个顺序。

```ts
console.log('start')

Promise.resolve().then(() => {
  console.log('promise')
})

console.log('end')
```
```
start end promise
```
执行顺序 同步代码 -> Promise callback -> setTimeout callback

> **批改：输出顺序正确。** 这段代码本身没有 `setTimeout`，所以实际需要说明的是：`start` 和 `end` 属于当前同步代码，按书写顺序先执行；Promise callback 被放入微任务队列，在同步代码结束后输出 `promise`。你写出的“同步代码 → Promise callback → setTimeout callback”可以作为存在这三类任务时的基础顺序规则。

## 2. `.then(flushJobs)` 与 `.then(flushJobs())` 有什么区别？哪一个能把刷新安排为微任务？

.then(flushJobs) 把flushJobs加入微队列，.then(flushJobs()) 会直接导致flushJobs执行，将flushJobs的返回值加入微队列。

> **批改：前半句正确，后半句需要修正。** `.then(flushJobs)` 把函数本身交给 `then`，Promise 稍后在微任务中调用它；`.then(flushJobs())` 会先同步调用 `flushJobs`，然后把它的返回值作为 `then` 的参数。返回值通常是 `undefined`，它不会作为一个 job 被加入微任务队列，并且在 TypeScript 中还可能因为参数不是函数而报错。

## 3. `currentFlushPromise = Promise.resolve().then(flushJobs)` 中，`currentFlushPromise` 保存的是什么？它为什么能被 nextTick 用来等待刷新完成？

保存的是等待flushJobs完成的Promise。因为nextTick会等待flushJobs完成。

> **批改：方向正确，需要把等待关系说明完整。** `currentFlushPromise` 保存的是 `.then(flushJobs)` 返回的新 Promise；它会在 `flushJobs` 返回后才完成。`nextTick` 在这个 Promise 上继续调用 `then`，因此 callback 只能在刷新完成后执行。没有待刷新队列时，`nextTick` 改用已经完成的 `resolvedPromise`，仍然让 callback 在微任务中异步执行。

## 4. 阅读下面代码。`firstPromise` 与 `secondPromise` 是否是同一个对象？`secondPromise` 最终得到什么结果？

```ts
const firstPromise = Promise.resolve(2)
const secondPromise = firstPromise.then((value) => value * 3)
```

不是同一个对象，`secondPromise` 最终得到的结果是 `6`。

> **批改：正确。** 每次调用 `then` 都返回新的 Promise。第一个 Promise 提供结果 `2`，callback 返回 `2 * 3`，因此 `secondPromise` 完成后的结果是 `6`。

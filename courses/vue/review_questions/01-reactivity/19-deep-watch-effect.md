# 第十九章复习：deep watch、watchEffect 与监听调度

> 状态：待完成。实现与边界测试通过后，请在每题下面填写答案。

## 1. 为什么 getter 返回响应式对象时只追踪引用，deep watch 怎样补上深层追踪？

请说明 `() => state.user` 收集的是哪个键，以及 traverse 怎样把内部键也纳入依赖。

### 你的答案

## 2. `traverse` 里的 `seen` 集合解决什么问题？数组和普通对象分别怎样遍历？

### 你的答案

## 3. watchEffect 和 watch 在结构上有哪些区别？为什么 watchEffect 不需要 `hasChanged` 和 oldValue？

### 你的答案

## 4. `flush: "sync"`、`"pre"`、`"post"` 三种模式分别在什么时机执行 callback？本项目默认是哪种，为什么？

### 你的答案

## 5. `queuePostFlushJob` 为什么把 `flushPostJobs` 当作普通 pre job 入队？这怎样保证 post 在 pre 之后执行？

### 你的答案

## 6. 追踪下面的事件顺序：

```text
count 从 0 变为 1
count 从 1 变为 2
await nextTick()
```

假设存在两个 watch：一个 `flush: "pre"` 记录 `pre:n`，一个 `flush: "post"` 记录 `post:n`，写出它们各自以及最终的输出顺序。

### 你的答案

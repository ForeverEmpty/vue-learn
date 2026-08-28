# 第一章复习：ref 与 effect

> 批改状态：通过。第 4、5 题有补充说明。

## 1. 为什么订阅者使用 `Set`，而不是普通数组？

一个effcet中可能存在重复的订阅者，如： `() => a.value + a.value`。如果为数组则会订阅两次，导致执行两次。

> **批改：基本正确。** 更准确地说，不是 effect 中存在多个订阅者，而是同一个 effect 两次读取同一个 ref。使用数组会把同一个 effect 函数加入两次；`Set` 会自动去重。

## 2. 为什么 setter 必须先保存新值，再执行订阅者？

如果不先保存新值，则再次执行effect还是旧值

> **批改：正确。** effect 被触发后会再次读取 `.value`，所以 setter 必须先保存新值。

## 3. 为什么 effect 执行结束后要清空 `activeEffect`？

防止在非effect运行时，对ref进行读取时，错误的订阅上次的effect

> **批改：正确。** 清空后，effect 外部的普通读取会得到 `undefined`，不会被收集。

## 4. `ref(0)` 创建的两个 ref 为什么不能共用同一个订阅集合？

防止更新Ref(1)时，对Ref(2)的订阅也执行。并且也可能存在一个effect中两个Ref都在，这样只会有一个effect被订阅

> **批改：前半正确，最后一句需要修正。** 如果一个 effect 同时读取两个 ref，这个 effect 应分别加入两个 ref 各自的订阅集合。这样任意一个 ref 改变都能通知它。不能共用集合的根本原因是：每个 ref 必须保留“谁依赖我”的独立关系。

## 5. 从 `effect` 首次执行到修改 `.value` 后页面更新，完整调用顺序是什么？

```text
effect()
-> 把 fn 记录为 activeEffect
-> 执行 fn
-> fn 读取 ref.value
-> ref 的 getter 收集 activeEffect
-> fn 结束
-> 清空 activeEffect
-> .value 修改值
-> 触发 ref 的 setter
-> 新旧值判断
-> 如果不同，更新值
-> 触发订阅者
```

> **批改：依赖收集部分正确，但结尾还差三步。** 触发订阅者之后，还会执行 effect 函数；effect 重新读取 ref 的新值；最后把新值写入 DOM，页面才真正更新。

完整结尾是：

```text
-> 遍历并执行订阅者中的 effectFn
-> effectFn 重新读取 ref.value，得到新值
-> effectFn 把新值写入 DOM
-> 页面更新完成
```

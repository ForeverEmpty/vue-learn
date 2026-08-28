# 第七章复习：watch 的新旧值与调度隔离

> 批改状态：通过。第 4 题需要纠正，第 1、2、3 题有补充说明。

## 1. watch 为什么要把 source getter 和 callback 分开？如果 callback 在 activeEffect 存在时执行，会发生什么？

为了防止callback中的响应式变量被追踪，导致callback中ref发生变化后执行callbak。

> **批改：核心正确。** source getter 只描述 watch 应观察的依赖；如果 callback 仍在 activeEffect 存在时执行，其中读取的 label 等响应式值也会被加入 watcherEffect 的 deps，之后修改这些值会错误触发 callback。

## 2. 创建 watch 时为什么必须先执行一次 source，却不能立刻调用 callback？这次执行保存了什么并建立了什么关系？

执行一次source一方面是为了获取旧值，一方面是为了追踪source中的变量

> **批改：正确，但要补上初始行为。** 第一次 source 执行会得到初始 `oldValue` 并建立 source 到 watcherEffect 的依赖关系；初始化阶段不调用 callback，因为还没有“变化前后的两次结果”可比较。

## 3. 从 source 变化开始，描述 scheduler、watcherEffect.run、newValue、callback 和 oldValue 的完整执行顺序。

```text
source
-> scheduler
-> newValue = watcherEffect.run()
-> if (oldValue != newValue)
-> callback(newValue, oldValue)
-> oldValue = newValue
```

> **批改：顺序正确。** source 变化先进入 scheduler，再由 job 调用 `watcherEffect.run()`；run 完成依赖清理和重新收集后得到 newValue，比较通过才调用 callback，最后保存 newValue 作为下一次的 oldValue。

## 4. 条件 source 切换分支后，为什么旧分支不再触发 watch？这个能力来自 watch 自己，还是复用了已有机制？

来自watch自己，通过判断值有没有变化来实现的

> **批改：这里需要纠正。** 旧分支不再触发来自已有的 `ReactiveEffect.run()` 机制：run 开始时会清理 watcherEffect 的旧 deps，执行条件 source 时只重新收集当前分支。watch 的 `hasChanged` 比较只决定 callback 是否执行，不能负责删除旧分支依赖。

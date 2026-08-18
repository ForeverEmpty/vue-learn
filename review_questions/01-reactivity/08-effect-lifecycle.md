# 第八章复习：effect 生命周期与 stop

> 批改状态：通过。第 2、4 题有补充说明。

## 1. 为什么 effect 需要返回 runner？runner 和 effect 的首次自动执行分别解决什么问题？

runner 提供一个手动触发effect的方式，effect首次自动执行是为了建立初始依赖。

> **批改：正确。** 首次自动执行让 effect 读取响应式值并建立初始 deps；runner 复用同一个 ReactiveEffect，让调用者之后可以手动执行函数。

## 2. stop 一个 effect 时应该清理哪些关系？为什么只设置一个 stopped 布尔值还不够？

应该清理依赖的所有ref的dep，和自身deps中依赖。仅设置一个stopped布尔值还不够，如果未清理依赖可能导致依赖变化还会触发effect。

> **批改：正确，补充双向关系。** stop 要遍历 `effect.deps`，从每个 dep 中删除 effect，最后清空 `effect.deps`。只设置 stopped 标记而不删除 dep 中的引用，trigger 仍然会找到这个 effect。

## 3. stop 后手动执行 runner 时，为什么可以执行函数，却不应该重新收集响应式依赖？

stop 后，runner 只是手动执行原函数，不会重新收集依赖。如果依赖再次变化，dep 中已经没有该 effect，不会自动执行。

> **批改：正确。** inactive runner 可以执行原函数，但不能设置 activeEffect；因此其中的响应式读取不会重新加入任何 dep。

## 4. stop 被重复调用时需要满足什么性质？如果 effect 当前有多个依赖，测试应该怎样证明清理完整？

effect的依赖不应该被重复清理。effect中的deps应该清空、对应dep中的effect应该删除。

> **批改：正确，补充测试要求。** stop 应该幂等：重复调用不报错，也不重复破坏状态。测试时让同一个 effect 同时读取 `left` 和 `right`，stop 后分别修改两个 ref，并断言执行次数都没有增加。

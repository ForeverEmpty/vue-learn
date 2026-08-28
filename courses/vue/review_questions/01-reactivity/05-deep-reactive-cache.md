# 第五章复习：深层 reactive 与 Proxy 缓存

> 批改状态：通过。第 1、2、3 题有补充说明。

## 1. 从读取 `state.profile.name` 开始，说明外层和内层两个 Proxy 分别在哪一步 track，targetMap 中会出现哪些原对象与属性。

外层在读取 `state.profile` 时会track，tragetMap：state.profile.name -> profile -> dep
内层在读取 `state.profile.name` 时会track，tragetMap：profile.name -> name -> dep

> **批改：两次 track 的时机正确，targetMap 结构需要更精确。** handler 收到的 target 是原对象，不是 `state.profile.name` 这样的访问路径。完整结构是：外层原对象 `rawState → "profile" → dep`，内层原对象 `rawProfile → "name" → dep`，两个 dep 中都保存本次执行的 `ReactiveEffect`。

## 2. 如果不使用 reactiveMap，重复读取 `state.profile` 会产生什么身份问题？这可能影响哪些代码？

每次读取都会创建一个新的 Proxy，导致身份问题。`state.profile === state.profile` 为 false。

> **批改：核心结论正确，影响还可以展开。** 身份不稳定除了让严格相等失败，还会导致同一逻辑对象成为 Map/Set 中的不同 key，使基于对象身份的缓存无法命中，并产生不必要的 Proxy 实例。

## 3. reactiveMap 与 rawMap 分别解决什么问题？为什么只保留其中一个不够？

reactiveMap解决了对同一对象重复代理的问题，重复代理不会创建新的 Proxy。
rawMap解决了对代理对象进行代理的问题，对代理对象代理不会创建新的 Proxy。

> **批改：两个职责都回答正确。** 只保留 `reactiveMap` 时，无法识别传入值本身已经是 Proxy，`reactive(proxy)` 仍会二次包装；只保留 `rawMap` 时，只能识别 Proxy，却无法从 raw 查回已有 Proxy，重复执行 `reactive(raw)` 仍会创建新代理。

# 第十章复习：reactive 对象结构操作

> 状态：已批改，通过。

## 1. `state.name`、`'name' in state`、`Object.keys(state)` 和 `delete state.name` 分别会进入哪个 Proxy trap？

state.name  set
'name' in state  has
Object.keys(state) ownKeys
delete state.name deleteProperty

> **批改：后三项正确，第一个需要修正。** `state.name` 是读取属性，因此进入 `get` trap；只有 `state.name = value` 才进入 `set` trap。请在原答案下面补充修正。

state.name  get

> **复批：正确，通过。** 属性读取进入 `get` trap。

## 2. 为什么 Object.keys 不能只追踪某一个真实属性？ITERATE_KEY 表示什么，哪些操作应该触发它？

Object.keys 无法预知添加或删除什么属性，所有通过追踪ITERATE_KEY来触发effect，添加和删除属性会触发

> **批改：正确。** 更准确地说，`ITERATE_KEY` 表示整个自有键集合的依赖；新增或成功删除已有属性会使键集合变化，因此触发它。修改已有属性的值不改变键集合，不触发它。

## 3. 一个 effect 同时读取 `state.name` 和 `Object.keys(state)`。新增 name 时，为什么不能分别触发两个 dep？应该怎样保证它只执行一次？

分别触发两个dep会存在重复触发的问题，通过Set将两个dep合并去重，即可保证只触发一次

> **批改：正确。** 先把具体 key dep 和 `ITERATE_KEY` dep 中的 effect 合并进 `effectsToRun`，再统一触发；同一个 `ReactiveEffect` 对象在 Set 中只能存在一份。

## 4. 删除一个不存在的属性时，为什么不应触发 effect？实现 deleteProperty 时需要检查哪两个结果？

删除不存在的属性，没有依赖，不应触发effect
在delete之前先通过Object.prototype.hasOwnProperty判断是否存在该属性。

> **批改：结论不完整，需要修正。** 不触发的原因不是“没有依赖”——对象可能已经存在 `Object.keys` 的结构依赖；真正原因是删除不存在的属性没有改变对象结构。实现时需要同时检查删除前的 `hadKey` 和 `Reflect.deleteProperty` 返回的 `didDelete`，只有 `hadKey && didDelete` 时才触发。请补充这两个条件。

删除不存在的属性没有改变对象结构
还需判断Reflect.deleteProperty

> **复批：正确，通过。** 删除前用 `hadKey` 判断是否存在自有属性，再用 `didDelete` 保存 `Reflect.deleteProperty` 是否成功；只有两者都为 true 才通知依赖。

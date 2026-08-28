# 第十三章复习：readonly 与代理身份工具

> 状态：已完成并通过复核。

## 1. 为什么 readonly Proxy 不等于原对象已经被冻结？分别通过 raw 和 readonly Proxy 修改时会发生什么？

readonly Proxy只是冻结了通过代理对象进行修改操作，通过raw修改会成功，但通过readonly Proxy会警告且修改失败

> 批改：⚠️ 结果判断正确，但“冻结了通过代理对象进行修改操作”不准确。readonly 没有冻结任何对象，而是通过 `set`/`deleteProperty` trap 拦截这一条访问路径。请改成“raw 仍可修改；通过 readonly Proxy 修改会被警告并忽略”，并补充 raw 修改后 readonly 视图仍能读到新值。

raw 仍可修改；通过 readonly Proxy 修改会被警告并忽略，修改raw readonly依然可以读到新值

> 复核：✅ 已正确区分原对象和只读访问路径。

## 2. readonly 的 set trap 为什么既不能调用 `Reflect.set`，又推荐返回 `true`？返回值表达的是什么？

本次执行成功，但没有真正的修改

> 批改：❌ `true` 不能解释为“写入执行成功”。不调用 `Reflect.set` 是为了避免修改 raw；返回 `true` 表示 handler 已接收并处理这次操作，从而避免严格模式因为 trap 返回 `false` 而抛出 `TypeError`。请按这两个层次重新回答。

不调用Reflect.set是为了防止修改raw，true表示已经处理本次操作，返回false会抛出TypeError

> 复核：✅ 已正确区分 trap 的处理结果和实际写入结果。

## 3. 身份 Symbol 为什么必须在 mutable getter 的普通 `track` 之前处理？如果放在 track 之后，依赖图中会出现什么错误关系？

如果不放在前面处理，之后get身份Symbol时，可能会将其加入依赖，导致依赖中多出身份Symbol

> 批改：⚠️ 方向正确，但还缺少错误关系和后果。请补充：当前 effect 会被错误记录到 `target → 身份 Symbol → effect`；以后对该 Symbol 的相关触发可能让只做身份判断的 effect 重新执行。

当前 effect 会被错误记录到 target → 身份 Symbol → effect，之后对该Symbol相关操作可能会触发该effect

> 复核：✅ 已补全错误依赖关系及其触发后果。

## 4. 请分别写出 `readonlyMap` 和 `rawMap` 的 key/value 方向，并说明为什么两张表都需要。

```
readonlyMap: Raw-Proxy
rawMap: Proxy-Raw
```
readonlyMap可以通过raw找到对应的代理，rawMap可以通过代理对应的raw

> 批改：✅ 方向正确。更完整地说，`readonlyMap` 用于稳定代理身份、避免重复创建；`rawMap` 用于 `toRaw`、识别已有代理并避免错误套娃。WeakMap 只能按 key 单向查询，因此需要两张方向相反的表。

> 复核：✅ 通过。

## 5. `isReactive`、`isReadonly`、`isProxy` 和 `toRaw` 各自回答什么问题？其中哪一个返回的不是布尔值？

isReactive 返回是否是响应式对象
isReadonly 返回是否是只读代理对象
isProxy 返回是否是代理对象
toRaw 将代理对象转为原对象，返回不是布尔值

> 批改：⚠️ 三个布尔函数和 `toRaw` 的基本区别正确，但 `isProxy` 不是判断所有 JavaScript `Proxy`，而是判断当前响应式系统创建的 reactive 或 readonly 代理。请修正这个范围；也可补充 `toRaw(raw)` 会原样返回 raw。

isProxy 返回是否是reactive或readonly代理
toRaw(raw)会原样返回 raw

> 复核：✅ 已明确 `isProxy` 的范围，并补充了 raw 输入的行为。

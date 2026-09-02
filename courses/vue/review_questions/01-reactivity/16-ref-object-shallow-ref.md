# 第十六章复习：ref 对象转换、shallowRef 与 triggerRef

> 状态：已完成并通过复核。

## 1. effect 读取 `profile.value.name` 时，会建立哪两层依赖？

请分别说明替换 `profile.value` 和修改 `profile.value.name` 时，由哪一层依赖负责通知。

### 你的答案

替换Profile.value是通过RefImp中的set完成的，是通过RefImp中的Dep依赖负责通知
修改Profile.value.name是通过Proxy代理中的set完成的，是通过targetMap中Object->name->dep完依赖负责通知的

> **批改：正确。** 读取 `.value` 会把 effect 加入 ref 自身的 dep，替换 `.value` 时由 RefImpl setter 通知；读取 `.name` 会通过 Proxy 把 effect 加入 raw 对象的 name dep，修改 name 时由 targetMap 中对应的属性依赖通知。

## 2. 为什么对象 ref 需要同时保存 `_rawValue` 和 `_value`？

请分析下面的错误实现为什么可能重复触发：

```ts
if (hasChanged(this._value, newValue)) {
  // 更新并触发
}
```

要求说明同一对象的 raw 与 Proxy 身份差异，以及 setter 为什么要用 `toRaw` 归一化比较。

### 你的答案

如果初始化时传入的是Object，会通过Proxy进行代理，此时，_value为Proxy，传入的newValue可能是rawObject， raw !== Proxy，但实际上值并未变化
因为_rawValue保存的rawObject，可能会存在newValue传入的是通过Proxy代理后的对象，此时可能会raw !== Proxy

> **批改：问题原因判断正确，但解决步骤没有写完整。** `_value` 可能是 Proxy，而 raw 与 Proxy 使用 `Object.is` 比较会被误判为变化。即使保存了 `_rawValue`，setter 收到的 `newValue` 也可能是 Proxy；必须先执行 `rawNewValue = toRaw(newValue)`，再比较 `_rawValue` 与 `rawNewValue`。请补上这一步和“同一个 raw 时不触发”的结论。

_value 可能是 Proxy，而 raw 与 Proxy 使用 Object.is 比较会被误判为变化。即使保存了 _rawValue，setter 收到的 newValue 也可能是 Proxy；必须先执行 rawNewValue = toRaw(newValue)，再比较 _rawValue 与 rawNewValue。

> **复批：正确，通过。** 新旧两边都归一化到 raw 身份后，同一对象的 raw/Proxy 不会被误判为变化，也就不会重复触发。

## 3. ref 和 shallowRef 保存对象时有什么不同？

请比较下面两种操作是否会自动触发 effect，并说明原因：

```ts
reference.value.name = "Grace"
reference.value = { name: "Lin" }
```

### 你的答案

如果为Ref，则两个操作都会触发effect，因为在初始化时，如果value为Object会通过Proxy进行代理，value又会在get时收集依赖
而shallowRef，则在初始化时value为rawObject，只会收集get value时的依赖

> **批改：ref 部分正确，shallowRef 部分需要明确两个操作的不同结果。** shallowRef 返回 raw，所以修改 `reference.value.name` 不经过 Proxy，不会自动触发；但是读取 `.value` 已经订阅了 ref.dep，整体执行 `reference.value = 新对象` 会进入 RefImpl setter 并触发 effect。请分别写出两种操作是否触发。

shallowRef 返回 raw，所以修改 reference.value.name 不经过 Proxy，不会自动触发；但是读取 .value 已经订阅了 ref.dep，整体执行 reference.value = 新对象 会进入 RefImpl setter 并触发 effect。

> **复批：正确，通过。** 已准确区分 shallowRef 不追踪嵌套 raw 属性与仍追踪 `.value` 替换的两层边界。

## 4. triggerRef 为什么应该调用 triggerEffects(dep)，而不是自己遍历依赖并直接调用 effect.run()？

请联系 scheduler 说明。

### 你的答案

一方面手动变量和triggerEffects(dep)实现重复，另一方面手动遍历并调用effect.run()会遗失effect.scheduler()

> **批改：正确。** `triggerEffects` 统一处理 scheduler 与直接 run 两条路径；triggerRef 复用它可以避免重复逻辑并保证调度行为不被绕过。

## 5. 对象 ref 从旧对象替换成新对象后，为什么继续修改旧 Proxy 不应触发 effect？

请说明 ref setter、effect 重新执行、依赖清理和新依赖收集之间的顺序。

### 你的答案

ref替换对象后，触发effect，effect重新执行，执行依赖清理，随后，重新收集依赖，此时，收集到的是新对象的依赖，而非旧对象的依赖，之后再修改旧Proxy则不会再触发effect

> **批改：正确。** setter 先更新 ref 的内部值再触发；effect 重新执行时先清理旧 deps，然后读取新对象并收集新属性依赖，因此旧 Proxy 的 dep 中不再保留该 effect。

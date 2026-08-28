# 第十二章复习：数组方法的身份处理与依赖暂停

> 状态：已批改，通过。

## 1. 原数组保存 rawObject，但 `reactiveArray[0]` 返回 Proxy。为什么 `reactiveArray.includes(rawObject)` 在没有方法插桩时可能返回 false？修复时需要统一比较哪一侧的身份？

因为原数组和代理数组后中的项已经不是同一个对象，代理数组中的对象也是代理对象。
需要修复代理数组的身份，转回原数组

> **批改：原因判断正确，但身份统一还需说完整。** 修复时不是修改代理数组中保存的元素，也不是只转换“代理数组”这一侧。应先用 `toRaw(this)` 取得原数组，再把查询参数也逐个 `toRaw`，最后在原数组上比较。请在原答案下补充“原数组元素和查询参数最终都统一为 raw 身份”。

原数组元素和查询参数最终都统一为 raw 身份

> **复批：正确，通过。** 在原数组上执行搜索，并把查询参数也转换为 raw，比较双方就拥有相同的对象身份。

## 2. 搜索方法直接在原数组上执行可以解决身份比较，却为什么可能失去响应式？应当手动追踪哪些依赖，才能同时响应已有元素替换和数组增长？

因为搜索方式是在原数组上进行的，没有对原数组进行响应式处理，所有会失去响应式。应手动追踪数组中的所有项和数组的length

> **批改：正确。** 更精确地说，直接读取原数组会绕过 Proxy getter，所以不会自动追踪。手动追踪每个现有索引可以响应元素替换或空位填充，追踪 `length` 可以响应数组增长与缩短。这里的 track target 必须是原数组，才能与 set trap 中 trigger 使用的 target 对应。

## 3. 为什么只在 `push` 外层调用 `pauseTracking()` 仍可能使其他正常 effect 丢失依赖？请追踪“push 触发另一个 length effect”时 `shouldTrack` 的变化，并说明 `ReactiveEffect.run()` 应承担什么职责。

不太理解
```
push
-> shouldTrack:false
-> 数组项+1
-> length++
-> shouldTrack:true
```

> **批改：需要修正。** 这条时间线只描述了 push 包装函数自身的暂停与恢复，漏掉了“数组写入触发另一个已经订阅 length 的 effect”。暂停期间 trigger 仍会执行；那个 length effect 的 `run()` 会先清理旧依赖，所以它必须保存外层的 `false`、临时把 `shouldTrack` 设为 `true` 并重新读取 length，结束后再恢复为 `false`。最后 push 的 `finally` 才把状态恢复为暂停前的 `true`。否则该 effect 第一次能被旧依赖触发，却无法重新订阅，第二次 push 就不会再触发它。请在原答案下用箭头补全这段顺序。

push
-> shouldTrack:false
-> 数组项+1
-> length++
-> 触发length
-> previousShouldTrack = shouldTrack;
-> shouldTrack:true
-> 收集依赖
-> shouldTrack:false
-> shouldTrack:true

> **复批：正确，通过。** 这里第一个恢复到 `false` 是 length effect 的 `run()` 恢复 `previousShouldTrack`；最后恢复到 `true` 是 push 包装函数执行 `resetTracking()`。这两层恢复不能合并，否则会过早结束外层暂停。

## 4. 下面的数组方法包装有什么问题？如果原生方法抛出异常，后续响应式读取会受到什么影响？应该使用什么结构修复？

```ts
pauseTracking()
const result = Reflect.apply(nativeMethod, this, args)
resetTracking()
return result
```
如果`Reflect.apply(nativeMethod, this, args)`执行失败，会导致无法执行`resetTracking()`，从而导致后续的effect都无法收集依赖
应该通过try finally来保证`resetTracking()`会执行

> **批改：正确。** `try/finally` 能保证原生数组方法无论正常返回还是抛出异常，都会执行 `resetTracking()`，避免全局 tracking 状态永久停留在暂停状态。

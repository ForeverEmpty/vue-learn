# 第十四章复习：shallowReactive 与 shallowReadonly

> 状态：已完成并通过复核。

## 1. “shallowReactive 是浅层的”为什么不等于“根对象不进行依赖追踪”？

在创建shallowReactive时，会对根对象进行代理，根对象会进行依赖跟踪

> 批改：✅ 正确。`shallow` 限制的是 getter 对嵌套对象的继续转换，根 Proxy 的 `track`、`set` 和结构操作仍然存在。

## 2. effect 中读取 `state.profile.name` 后，为什么替换 `state.profile` 会触发，而修改 `state.profile.name` 不会触发？请按读取路径说明。

因为只对根对象进行了追踪
```
state.profile
->get
->track
->trackEffect

state.profile.name
->state.profile
->raw:profile
->profile.name
```

> 批改：✅ 路径正确。读取 `state.profile` 会建立根 raw 的 `profile → effect` 关系，然后返回 raw profile；继续读取 `.name` 是普通对象读取，不会建立 name 依赖。因此替换 profile 会触发，修改 raw profile.name 不会触发。

## 3. shallowReadonly 为什么会阻止 `view.profile = newProfile`，却允许 `view.profile.name = "Grace"`？

因为只代理根对象，其他对象还是源对象

> 批改：✅ 正确。更精确地说，第一种赋值命中根 Proxy 的 readonly `set` trap；第二种读取先得到 raw profile，随后写入绕过了根 Proxy。

## 4. 为什么 deep reactive、deep readonly、shallowReactive、shallowReadonly 需要四张正向缓存表，却可以共享一张 rawMap？

四张正向缓存表是为了判断是否创建了对应的代理对象，只要一个rawMap是为了可以通过代理对象找到对应的源对象

> 批改：✅ 正确。四种代理语义和深度不同，同一 raw 需要分别缓存四个稳定身份；反向查询只回答“这个 Proxy 的 raw 是谁”，所以各种代理可以共享 `rawMap`。

## 5. 如果 shallowReactive getter 直接删除了数组方法插桩，只保留 `Reflect.get` 和 `track`，第十二章解决过的哪类问题可能重新出现？

可能会导致rawItem找不到，可能会追踪push等方法中的length依赖

> 批改：⚠️ 后半句正确：`push` 等修改方法内部读取 length，可能让执行修改的 effect 错误订阅 length，并在随后写入时触发自身。前半句需要修正：浅数组本来保存 rawItem，`includes(rawItem)` 通常仍能找到；丢失的是参数的 raw/Proxy 身份归一化，例如用 `reactive(rawItem)` 搜索时可能找不到同一个 rawItem。请按这两类问题重新回答。

浅数组保存的本来就是 rawItem，所以 includes(rawItem) 通常可以找到；但使用 reactive(rawItem) 搜索时，没有插桩执行 toRaw，可能找不到同一个元素。

> 复核：✅ 已正确区分 rawItem 直接查找与 reactive 参数归一化；结合原答案中的 length 依赖说明，本题通过。

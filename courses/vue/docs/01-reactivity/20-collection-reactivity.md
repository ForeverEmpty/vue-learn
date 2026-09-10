# 第二十章：Map/Set 集合响应式

> 状态：已完成。27 项章节测试、复习题和完整回归均已通过。
> 本章仍属于响应式模块。完成本章后要检查整个模块的缺口清单，不能仅凭章节编号宣布实现了完整 Vue。

你已经会给 `state.count`、数组索引和 `ref.value` 建立依赖。本章的问题是：`map.get(key)` 和 `set.has(value)` 的变化，怎样让 effect 得到通知？

本章保留从原生 receiver 错误到完整集合响应式的分步记录，便于按检查点复习方法包装、依赖分类、迭代器和 deep watch。

## 0. 从哪里开始，文件分别负责什么

以下路径从仓库根目录起算：

| 文件 | 责任 | 何时修改 |
| --- | --- | --- |
| `courses/vue/packages/reactivity/src/reactive.ts` | 四种代理工厂选择普通对象或集合 handler；缓存仍在这里 | 路由已接好，先阅读 |
| `courses/vue/packages/reactivity/src/collectionHandlers.ts` | 接住 size 和方法读取，调用原生集合方法，包装结果 | 2A 开始 |
| `courses/vue/packages/reactivity/src/collectionEffect.ts` | 集合自己的依赖表；复用已有 trackEffect/triggerEffects | 3A 开始 |
| `courses/vue/packages/reactivity/src/watch.ts` | 让 traverse 进入 Map 的值、Set 的元素 | 检查点 6 |
| `courses/vue/packages/reactivity/__tests__/collection-reactivity.test.ts` | 按检查点分组的行为测试 | 已创建，由我维护 |
| `apps/learning-portal/src/pages/vue/collection-reactivity.ts` | 浏览器实验，展示实际输出或捕获的错误 | 已创建，由我维护 |
| `courses/vue/review_questions/01-reactivity/20-collection-reactivity.md` | 复习题与作答区 | 本章末尾填写 |

`collectionEffect.ts` 是集合内部模块，不用从框架公共 `index.ts` 导出。对使用者仍然只暴露 `reactive(new Map())` 等已有 API。

命令都在仓库根目录运行：

```bash
# 只观察第一步：这两条测试现在就应该通过
npm run test:run -- courses/vue/packages/reactivity/__tests__/collection-reactivity.test.ts -t "20 / 1 "

# 只验收你正在实现的 2A；把 2A 换成后续分组即可
npm run test:run -- courses/vue/packages/reactivity/__tests__/collection-reactivity.test.ts -t "20 / 2A "

# 查看全章目标
npm run test:run -- courses/vue/packages/reactivity/__tests__/collection-reactivity.test.ts

# 启动学习网页，从 Vue 目录进入第 20 章
npm run dev
```

重新生成时实际验证的起点：本章 **3 通过、24 失败，共 27 项**。其中两项验证原生 JS 行为，另一项验证旧功能不受影响。失败来自待实现的集合功能，是学习起点，不代表你的环境坏了。

不要根据中间步骤的“总通过数”猜测完成情况：例如 5A 依赖 4B，因此早期运行它会失败。只先检查当前小组；最终本章目标为 27 项全部通过。

## 1. 先分清集合里的数据和对象属性

```ts
const map = new Map<string, number>()
map.set("count", 1)

console.log(map.get("count")) // 1
console.log(Object.keys(map)) // []
```

`map.set("count", 1)` 把条目写进集合存储，不等于创建 `map.count` 这个对象属性。

因此几组长得相似的名字，含义完全不同：

| 写法 | 实际发生的事 |
| --- | --- |
| `proxy.get` | 读取名为 get 的方法，进入 Proxy 的 get trap |
| `proxy.get("count")` | 调用刚取得的方法，读取集合中名为 count 的条目 |
| `proxy.set("count", 1)` | 调用集合方法；不会自动进入 Proxy 的 set trap 来通知条目 |
| `"count" in proxy` | 检查对象属性，和 `proxy.has("count")` 不同 |

Map 的键可以是字符串、数字、Symbol、对象，甚至 `undefined`。Set 没有单独的键和值，元素本身就是查找依据。

原生 Map/Set 按 SameValueZero 判断键或元素相等：`NaN` 能匹配 `NaN`，`0` 与 `-0` 是同一键；对象按引用区分。依据见 [MDN Map 的键相等性](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map#key_equality)。

## 2. 为什么空 Proxy 也会报错

```ts
const rawMap = new Map([["count", 1]])
const proxyMap = new Proxy(rawMap, {})

proxyMap.get("count") // TypeError
proxyMap.size         // TypeError
```

可以把原生集合的“内部槽位”理解成 JavaScript 引擎保存集合条目的内部存储。Proxy 包在 Map 外面，却没有把这份内部存储复制到自己身上。原生方法检查接收者时，发现 `this` 是 Proxy，就无法按要求读取存储。参见 [MDN Proxy 的内部槽位说明](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy#no_private_field_forwarding)。

调用分成两步：

```text
proxyMap.get("count")
→ 读取 proxyMap.get，得到原生 Map.prototype.get
→ 以 proxyMap 为 this 调用 get
→ 原生方法要求真正的 Map 接收者
→ 抛出 TypeError
```

之前学过的 `call` 可以修正原生方法的接收者：

```ts
Map.prototype.get.call(rawMap, "count") // 1
```

`size` 是访问器属性，取属性时就会运行 getter，不能等取完值再 bind：

```ts
Reflect.get(rawMap, "size", rawMap) // 1
```

第三个参数决定 getter 的 `this`。普通对象常用 Proxy receiver，这里应让集合的 size getter 使用 raw target。

不过仅仅让方法“不报错”还不够。全都 `bind(rawMap)` 后，写入会直接绕过我们的通知逻辑，返回的对象也没有响应式转换。因此需要“包装方法”。

## 检查点一：先解释调用过程

阅读前两节，运行 `20 / 1 ` 分组，并进入测试页点击“观察原生 Proxy”。

现在只回答一个问题：`proxyMap.get("count")` 中，Proxy 的 get trap 和 Map 的 get 方法分别做了什么？为什么要把原生方法的 this 换成 rawMap？

回答后再开始 2A。这里不需要新增任何文件。

## 检查点 2A：先让身份标记和 size 可读

修改 `collectionHandlers.ts` 中 `createCollectionHandlers` 返回的 get trap。

骨架已经导出四套 handler，并在 `reactive.ts` 的四个工厂接上；原来的缓存、toRaw、markRaw 跳过判断仍由工厂负责。

1. 引入 `ReactiveFlags`。
2. 工厂的只读选项当前叫 `_isReadonly`，开始使用它时可重命名为 `readonlyMode`。浅层选项到 5A 再使用。
3. 遇到 `IS_REACTIVE` 返回 `!readonlyMode`，遇到 `IS_READONLY` 返回 `readonlyMode`。这些内部查询不收集业务依赖。
4. 遇到字符串属性 `"size"`，使用 raw target 读取 size。
5. 其他属性先继续 `Reflect.get`。

size 分支的关键一行可以直接参考：

```ts
if (key === "size") {
  return Reflect.get(target, "size", target)
}
```

此时只解决 receiver，size 的依赖收集留到 3B。运行 `20 / 2A `，应有 2 项通过。

## 检查点 2B：包装方法，暂时不接依赖

仍修改 `collectionHandlers.ts`。在工厂内部创建 `instrumentations` 对象，用它保存包装后的 get、has、set、add、delete 方法。

建议先写一个 Map.get，再按同样的调用结构处理其他方法：

```ts
const instrumentations = {
  get(this: CollectionTarget, key: unknown) {
    const rawTarget = toRaw(this)
    if (!(rawTarget instanceof Map)) {
      throw new TypeError("get requires a Map receiver")
    }
    // 3A 在这里加 trackCollection；5A 在返回处加对象包装。
    return rawTarget.get(key)
  },
}
```

需要从 `collectionEffect.ts` 导入 `type CollectionTarget`，从 `reactive.ts` 导入 `toRaw`。TS 的 `this: CollectionTarget` 是调用者类型说明，运行时不占一个参数位置；用户仍然只传 key。

返回方法的 get trap 判断可以参考：

```ts
const hasWrapper = Object.prototype.hasOwnProperty.call(instrumentations, key)
if (hasWrapper && key in target) {
  return Reflect.get(instrumentations, key, receiver)
}
```

`key in target` 保证只暴露原来有的方法：Map 有 set、没有 add；Set 有 add、没有 get。不要让 `map.add` 莫名变成可调用方法。

这里返回的是普通函数，之后执行 `proxyMap.get("count")` 时，包装函数的 this 自然是 proxyMap；再由 `toRaw(this)` 找到 rawMap。不要写成箭头函数，它不会接收调用位置传来的 this。

此阶段方法要求：

| 方法 | 调用 raw 的方法后应该返回什么 |
| --- | --- |
| Map.get(key) | 查到的值或 undefined |
| Map/Set.has(key) | boolean |
| Map.set(key, value) | 包装函数的 this，即 Proxy，以支持链式调用 |
| Set.add(value) | Proxy |
| Map/Set.delete(key) | 原生删除结果 boolean |

如果返回 `rawTarget.set(...)`，用户下一次链式调用就跑到 raw 上去了。需要先执行原生 set，再返回 this。

本章保留原生方法对 receiver 的要求：`const get = map.get; get("a")` 不自动绑定原集合，会抛 TypeError。不要把“解构方法可调用”误当成必做功能。

运行 `20 / 2B `，应有 2 项通过。这一步仍然不会让 effect 自动更新。

## 3. 集合依赖为什么要分开存

现有普通对象依赖表是：

```ts
WeakMap<object, Map<PropertyKey, Dep>>
```

而 `PropertyKey` 是 `string | number | symbol`，不包括对象。不能把 Map 的对象键强制转换为字符串，也不能用 `as PropertyKey` 掩盖不匹配。`1` 与 `"1"` 在 Map 中同样是不同键。

这次在 `collectionEffect.ts` 单独建立集合依赖表，复用 effect 机制，不改普通对象/数组的触发规则：

```ts
const collectionTargetMap = new WeakMap<CollectionTarget, CollectionDeps>()

// 新建一个集合的依赖记录时，初始形状如下。
const deps: CollectionDeps = {
  get: new Map(),
  has: new Map(),
  size: new Set(),
  keys: new Set(),
  iterate: new Set(),
}
```

这些类型已在骨架定义。Dep 仍然是保存 ReactiveEffect 的 Set。

```text
某个 raw Map
├─ get: Map<unknown, Dep>    ← get("a") 与 get(对象键) 分开
├─ has: Map<unknown, Dep>    ← has("a") 只关心存在性
├─ size: Dep                ← 元素数量
├─ keys: Dep                ← Map 的键遍历
└─ iterate: Dep             ← 值、键值对、forEach、Set 遍历
```

这里 get 和 has 是依赖记录的字段名，不是 Map 实例的方法。`deps.get.get(key)` 的意思是“到 get 依赖表里查这个数据键的 Dep”。

为什么不使用同一个 `"size"` 数据键保存 size 依赖？因为用户完全可以 `map.set("size", 100)`，那和集合项数是两件事。五个字段从结构上隔离了业务键和内部统计。

本项目在集合中区分 get 与 has：已有键从 1 改成 2，get 结果改变，has 结果仍是 true。这个精细划分是教学设计；不宣称复刻某个 Vue 版本的全部内部实现。

## 检查点 3A：已有键更新的最小响应式闭环

修改两个新文件，先实现 get/has 依赖和 Map 的已有键 set 通知。

`trackCollection(target, type, key)` 按以下顺序写：

1. 从 collectionTargetMap 取 target 的记录；没有就新建并保存。
2. type 为 get/has 时，从对应的 `Map<unknown, Dep>` 查 key，没有就新建 Dep。
3. type 为 size/keys/iterate 时，直接取得对应字段的 Dep。
4. 把该 Dep 交给 `trackEffect(dep)`。

trackEffect 会判断是否处在有效依赖收集期间，同时把 dep 保存到 `effect.deps`。因此第 2 章分支清理、第 8 章 stop 可以继续工作。不要自己复制 activeEffect，也不要只向 Dep 添加 effect 却漏掉反向记录。

现阶段可以允许 effect 外读取时建立空记录；trackEffect 不会因此误订阅。以后可增加统一 `isTracking()` 查询来省掉空记录的分配，这不是本章功能门槛。

包装方法中的位置：

```text
map.get(key)
→ 得到 rawTarget
→ 可写模式才 trackCollection(rawTarget, "get", key)
→ rawTarget.get(key)

map.set(key, nextValue)
→ 先记录 hadKey、oldValue
→ 执行原生 set
→ 已存在且值变化时 triggerCollection(rawTarget, "set", key)
→ 返回 Proxy
```

has 也要收集自己的 Dep，即使查到 false 也要收集，以后新增时才能通知它。

此时 triggerCollection 先支持 set 分支：取 get 的对应 Dep，再复用 triggerEffects。重复写入相同值使用已有 hasChanged 判定，不通知；不要在任何写入前就通知，否则 effect 会读到旧数据。

运行 `20 / 3A `，应有 2 项通过。5B 再统一 raw/Proxy 键；目前用原始键完成闭环即可。

## 检查点 3B：新增、删除、size 与一次操作去重

在 `collectionHandlers.ts` 的 size 分支补 `trackCollection(target, "size")`，可写模式才收集。由于 get trap 中 target 的 TS 类型是 object，先用 `isCollection(target)` 收窄后再传参。

在原生写入前记录变化依据：

| 变量建议 | 含义 |
| --- | --- |
| rawTarget | 实际保存条目的原生 Map/Set |
| key / value | 用户输入 |
| hadKey | 写入前 rawTarget.has(key) 的结果 |
| oldValue | Map 写入前的旧值 |
| nextValue | 这次实际准备保存的值 |
| didDelete | 原生 delete 是否成功 |
| effectsToRun | 所有受影响 effect 的去重集合 |

不能用 `oldValue !== undefined` 判断键是否存在。空 Map 执行 `set("a", undefined)` 后，get 仍是 undefined，但 has 从 false 变成 true，size 也从 0 变成 1。

下面是本章的通知规则。4B 才接遍历读取，但现在可以先把通知分支写完整：

| 操作 | get(key) | has(key) | size | Map.keys | 内容遍历 |
| --- | --- | --- | --- | --- | --- |
| Map 新增 / Set 新增 | ✓ | ✓ | ✓ | ✓ | ✓ |
| Map 已有键换值 | ✓ | — | — | — | ✓ |
| 删除存在的项 | ✓ | ✓ | ✓ | ✓ | ✓ |
| 重复值 / 重复 add / 删除不存在的项 | — | — | — | — | — |
| 非空 clear | 全部 get Dep | 全部 has Dep | ✓ | ✓ | ✓ |
| 空 clear | — | — | — | — | — |

Set 不存在 get API，表中 get 一列对 Set 是空集合。Set 的所有迭代可以统一订阅 iterate 字段。

不要对 get、has、size 的 Dep 各调用一次 triggerEffects。同一个 effect 可能同时读取 has 和 size，分别触发会跑两遍。

先把所有应通知 Dep 的成员合并到一个 `effectsToRun: Dep = new Set()`，最后仅执行一次 `triggerEffects(effectsToRun)`。同时沿用它内部的依赖快照及 activeEffect 自触发保护。

通知表的 type 与业务键是两个参数：例如数据键本身叫 `"clear"` 或等于 undefined 都是合法的。不要用 `if (!key)` 跳过这些键。

运行 `20 / 3B `，应有 3 项通过。

## 检查点 4A：clear 不是逐项 delete

新增 clear 包装方法。先读取 `hadItems = rawTarget.size > 0`，再调用原生 clear；hadItems 为 true 才通知，返回 undefined。

clear 会影响许多键，所以 triggerCollection 的 clear 分支应遍历依赖记录内所有 get/has Dep，连同 size、keys、iterate 合并后一次通知。

这是本项目的保守失效规则：非空 clear 会通知整个集合已收集的依赖，包括曾读取过但不存在的键；不声称它只通知“输出一定改变”的订阅者。这样不用额外保存清空前所有条目，也不会漏掉依赖。

不要原生 clear 完才按原集合的 keys 查订阅者，那时集合已经空了。

运行 `20 / 4A `，Map/Set 两项应通过。

## 检查点 4B：先理解迭代器，再包装结果

迭代器每调用一次 next，给出一个 `{ value, done }` 对象：

```ts
const iterator = new Map([["a", 1]]).entries()
iterator.next() // { value: ["a", 1], done: false }
iterator.next() // { value: undefined, done: true }
```

`[...iterator]` 和 for...of 还需要可迭代协议：对象的 `[Symbol.iterator]()` 返回一个迭代器。我们返回的包装迭代器可以在这个方法中 `return this`。协议依据见 [MDN 迭代协议](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols)。

把以下对应关系写在旁边，再实现包装函数：

| 调用 | 单次 next 的 value 形状 | 收集的 Dep |
| --- | --- | --- |
| Map.keys() | 单个 key | keys |
| Map.values() | 单个 value | iterate |
| Map.entries() / Map 默认迭代 | [key, value] | iterate |
| Set.keys() / values() / 默认迭代 | 单个元素 | iterate |
| Set.entries() | [value, value] | iterate |

注意 Set.entries() 也是二元组；Map 默认迭代返回键值对，Set 默认迭代返回元素。

建议增加 `createIterableMethod(method)`，method 类型为：

```ts
type CollectionIteratorMethod =
  | "keys"
  | "values"
  | "entries"
  | typeof Symbol.iterator
```

逐步写：

1. 工厂返回一个普通函数，this 是集合 Proxy。
2. 取得 rawTarget，记录它是不是 Map，以及本次是否返回二元组。
3. 可写模式在调用方法时收集 keys 或 iterate Dep；不要等 effect 结束后才收集。
4. 以 rawTarget 为接收者创建 innerIterator，不要提前 `[...rawTarget]` 做数组快照。
5. 返回含 next 和 `[Symbol.iterator]` 的包装对象。
6. next 调用 `innerIterator.next()`；done 为 true 时直接返回结束结果。
7. 否则转换单值，或分别转换二元组的 key、value，再返回结果。

第 5 步的结构可参考下面的“结构示意”，转换分支由你补齐：

```ts
// 结构示意：innerIterator 是前一步得到的原生迭代器。
const wrappedIterator: IterableIterator<unknown> = {
  next() {
    const result = innerIterator.next()
    if (result.done) return result
    // 在这里按单值/二元组转换 result.value；5A 再增加深浅包装。
    return { value: result.value, done: false }
  },
  [Symbol.iterator]() {
    return this
  },
}
```

最后补 forEach：它没有 next，原生方法会依次调用 callback。可写模式先收集 iterate，然后原生 forEach 的每一项都调用用户 callback。

用户 callback 的三个参数是 `value, key, observedCollection`；最后一个应传 Proxy。Set 的 value 和 key 是同一个元素。用户传 thisArg 时，使用 `callback.call(thisArg, wrappedValue, wrappedKey, proxy)`，不能忽略第二个参数。

为什么 Map.keys 与 Map.values 不能合并？`set("a", 2)` 没增减键，keys 结果没变，values 结果却变了。运行 `20 / 4B ` 验证这一区别，应有 3 项通过。

## 检查点 5A：四种转换模式与只读方法

仍在 `collectionHandlers.ts` 完成。建议工厂内新增 `wrap(value)`：

```text
浅层模式 → 直接返回传入 wrap 的值
否则非对象 → 原样返回
否则只读模式 → readonly(value)
否则 → reactive(value)
```

get 的返回值、迭代器中的 key/value、Set 元素、forEach 参数都要经过同一个 wrap，避免只修 get 却漏了遍历。

浅层保留的是“集合存储里的值”。Map 的 deep 写入到 5B 会把新 value 转成 raw 再保存；shallow Map 保留用户传入的 value，包括已经存在的 Proxy。

只读保护必须放进 set/add/delete/clear 的方法包装中。Proxy 的 set trap 只能管对象属性赋值，不能代替集合方法拦截。

本项目约定只读写入给一次 console.warn，并按以下方式返回：

| 只读操作 | raw 是否变化 | 返回值 |
| --- | --- | --- |
| set / add | 否 | 当前 Proxy |
| delete | 否 | false |
| clear | 否 | undefined |

沿用第 13、14 章：readonly(raw) 不主动收集集合依赖；`readonly(reactive(raw))` 在当前工厂中也会还原到 raw，不保留可写代理那一层的订阅语义。四种模式都应有正确身份和缓存。

Map 的 `Readonly<T>` 类型并不会自动从类型中删除 set 方法，因此仍然需要运行时拦截。

本章只覆盖标准集合 API。对象式附加属性 `map.extra = 1`、集合子类自定义方法以及特殊属性描述符不属于本章集合 handler 的验收范围。

运行 `20 / 5A `，应有 3 项通过。

## 检查点 5B：统一依赖身份，同时找对实际存储的键

```ts
const rawKey = {}
const proxyKey = reactive(rawKey)
```

原生 Map 认为这两个引用不同，而本项目希望通过它们查询同一个逻辑条目。要分清三种名字：

| 名称 | 用途 |
| --- | --- |
| key | 用户传进来的键，可能是 Proxy |
| rawKey = toRaw(key) | 统一的依赖身份；新条目优先使用它 |
| storedKey | raw 集合里这项实际存着的键，历史数据可能用的是 Proxy |

对于原来为空、一直通过代理写入的集合，用 rawKey 存储和查询就足够。问题出在代理前已经存入 Proxy 键的集合：

```ts
const rawMap = new Map([[proxyKey, 1]])
const map = reactive(rawMap)
// 目标：map.get(rawKey) 也能找到 1。
```

只执行 `rawMap.get(toRaw(rawKey))` 会漏掉原先那个 Proxy 键。

建议写模块私有 `resolveCollectionKey(rawTarget, key)`，返回 `{ rawKey, storedKey, hadKey }`：

1. rawKey = toRaw(key)。
2. rawTarget.has(rawKey) 成功就选 rawKey。
3. 否则检查传入的 key 是否已经存在。
4. 如果仍未找到且 rawKey 是对象，用原生 rawTarget.keys() 扫描历史键；找到 `toRaw(candidate) === rawKey` 就选 candidate。
5. 找不到时 hadKey 为 false，storedKey 使用 rawKey，准备新增。

整个检查在 raw 上做，不要用代理 has/keys，否则写入准备工作会意外订阅集合。

统一规则：track 与 trigger 都使用 rawKey；原生 get/set/delete 使用 storedKey。不要为了统一就悄悄重建整个集合，已有键的位置与顺序应保留。

这是一种易理解的教学取舍：常见 raw 键直接命中，历史 Proxy 键兜底查找最坏 O(n)。不把这个扫描方案宣称为 Vue 的生产实现。若原集合同时存着 rawKey 与 proxyKey 两个独立条目，本章不自动合并或删除用户数据；冲突清理属于后续扩展。

Set 元素兼任键，使用相同查找规则；本章新写入的 Set 对象元素统一存 raw 身份，已有项不迁移。Map value 则按模式保存：deep 用 toRaw(value)，shallow 保留 value。比较新旧 value 前按同样模式处理旧值，避免 raw/Proxy 同源值误触发。

数字键、NaN、0/-0 交给原生 Map/Set 的 has/get 处理，不要 stringify。写入值是否改变继续使用已有 hasChanged。

运行 `20 / 5B `，应有 3 项通过。

## 检查点 6：和第十九章的 deep watch 接起来

现在 Map.get 与 Set.has 会响应了，但 `watch(() => map, callback, { deep: true })` 还不一定工作。

原因在 `watch.ts` 的 traverse：目前只遍历数组索引或对象的自有可枚举属性，Map 条目不在这些属性中。需要在普通对象分支之前增加 Map/Set 分支。

步骤：

1. 保留最前面的对象判断、seen 检查和 `seen.add(value)`。
2. 数组仍按原来处理。
3. 如果 value 是 Map 或 Set，通过 Proxy 的 forEach 递归读取每个 entryValue。
4. 普通对象继续原有可枚举字符串键与 Symbol 键遍历。

本章的 deep Map watch 遍历 value，不深入作为身份标识的对象 key；Set 则深入每个元素。不要在这里先 toRaw 再遍历，那样会绕过刚建立的集合订阅。

“原生方法调用用 raw”与“deep 遍历用 Proxy”各有位置：traverse 先调用 Proxy 包装方法收集依赖，包装方法内部才转到 raw 调用原生 API。

seen 必须在进入集合之前记录当前对象。Map 可以把自己存成 value，Set 也可以包含自己；没有 seen 就会无限递归。

最后确认 `watch(() => map.get("a"), callback, { flush: "pre" })` 沿用第十九章的去重、oldValue 和 stop。这里不需要再写一套 scheduler。

运行 `20 / 6 `，应有 3 项通过。

## 检查点 7：本章验收与模块收尾

运行 `20 / 7 ` 的 2 项边界测试，再做完整回归：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/collection-reactivity.test.ts
npm run test:run
npm run typecheck
npm run vue:build
```

起点的全量结果应是旧章节 208 项加上本章 3 项通过，合计 **211 通过、24 失败**。当本章 27 项都实现且没有增加其他测试时，目标是 **235 项全部通过**。

通过测试之后，还需要：

- 浏览器实验中的 Map、Set、迭代和 deep watch 结果正确。
- 复习题批改通过，再把目录状态改为已完成。
- 对照下面的范围表记录缺口，再决定进入运行时的时间。

### 响应式模块范围与剩余工作

第 20 章是当前规划中的集合篇，不是“所有响应式能力从此完整”的承诺。集合基础完成后，仍需复核和安排的内容包括：

| 范围 | 本章处理方式 |
| --- | --- |
| 标准 Map/Set、四种代理模式、迭代、raw 身份、deep watch 集合衔接 | 本章必须完成 |
| watch 直接接收 ref/reactive、多个 source、数字 deep、更多清理语义 | 现有 watcher 仍有缺口，收尾时单独评估并排课 |
| 原型链赋值、非标准属性描述符、复杂嵌套重入、跨队列循环更新 | 不能凭当前测试通过就声称完整支持，收尾需审查 |
| Map 中同时存在 raw 与 Proxy 两项、跨 realm、集合子类、现代迭代器辅助方法 | 本章明确不支持完整兼容 |
| WeakMap/WeakSet、customRef、effectScope、生产级优化 | 进阶扩展，后续按学习目标决定 |

任何新确认的必修缺陷都应留在 `01-reactivity` 补完。真正进入 VNode/renderer 时，教学与复习题才放入 `02-runtime`。响应式还需要几章应以收尾评估结果为准。

## 复习顺序

先回到检查点一解释 this，再看触发表；然后分别练习“缺失键的订阅”“迭代器的 next”“rawKey 与 storedKey”。最后回答 [本章复习题](../../review_questions/01-reactivity/20-collection-reactivity.md)。

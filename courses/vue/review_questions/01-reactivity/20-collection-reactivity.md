# 第二十章复习：Map/Set 集合响应式

> 状态：已批改。第 1、4 题经修正复核通过。
> 本次 5 题分别考查调用过程、依赖选择、身份处理、迭代协议和模块衔接；无需重复背诵每个 API。

## 1. 一次 get 调用究竟经过了谁？

```ts
const map = reactive(new Map([["count", 1]]));
map.get("count");
```

请按顺序说明：Proxy 的 get trap 收到的 key 是什么？包装函数里的 this 是谁？调用原生 Map.get 时接收者是谁？为什么给所有方法 bind(raw) 还不能完成响应式？

### 你的答案

收到的key为get
包装函数中this为代理后的map
调用原生Map.get接收者为rawMap
还需要追踪依赖

直接bind无法完成读取时依赖收集，写入后触发依赖，deep/readonly 结果包装和只读写入拦截
原生 `set/add` 会返回 raw，导致链式调用离开 Proxy

### 批改

方向正确，但需要补充。`proxyMap.get` 进入 Proxy 的 `get trap` 时，收到的属性键确实是字符串 `"get"`；随后包装函数以 `proxyMap` 为 `this` 执行，原生 `Map.get` 最终以 `rawMap` 为接收者。

只写“还需要追踪依赖”不够完整。把所有方法直接 `bind(rawMap)` 虽然能解决内部槽位错误，却会绕过我们对方法的包装，因此无法完成读取时的依赖收集、写入后的依赖触发、deep/readonly 结果包装和只读写入拦截；`Map.set`、`Set.add` 还会返回 raw 集合，使链式调用离开 Proxy。请把这些职责补进原答案。

### 修正复核

你已经补上了依赖收集、依赖触发、结果包装和只读拦截，主体正确。还需要把末尾的“拦”补成“拦截”，并补充：直接绑定 raw 后，原生 `set/add` 会返回 raw 集合，使后续链式调用不再经过 Proxy。

## 2. 同一条写入，哪些观察者应该重新运行？

已有 `map = reactive(new Map([["a", 1]]))`，五个 effect 分别读取：

```text
A: map.get("a")
B: map.has("a")
C: map.size
D: [...map.keys()]
E: [...map.values()]
```

依次执行下面三行，分别写出应通知哪些 effect，并解释你的判断。这里 effect 默认同步运行，没有异步合并。

```ts
map.set("a", 2);
map.set("b", undefined);
map.delete("a");
```

再说明：如果同一个 effect 同时读取 get 和 size，怎样避免一次新增让它运行两次？

### 你的答案

通知: A E
通知: C D E
通知: A B C D E

在执行前通过Set去重一次

### 批改

正确。三次操作依次通知 `A、E`，`C、D、E`，`A、B、C、D、E`。更精确地说，应先把本次操作命中的所有 Dep 中的 effect 合并进同一个 `effectsToRun: Set`，最后只调用一次 `triggerEffects(effectsToRun)`；这样同一个 effect 同时订阅 `get` 和 `size` 时也只执行一次。

## 3. rawKey 和 storedKey 为什么不是同一个概念？

```ts
const rawKey = {};
const proxyKey = reactive(rawKey);
const map = reactive(new Map([[proxyKey, 1]]));
```

希望 `map.get(rawKey)` 与 `map.get(proxyKey)` 都能读到 1。只对输入调用 toRaw 为什么不够？依赖表应该用哪个身份，原生 get 应该用哪个键？更新时为什么不应先删除旧键再重建？

### 你的答案

map中保存的是代理后key，只toRaw无法在map中找到该key，所有需要storeKey来知道map中实际保存的哪个Key
依赖表应该适应rawKey，原生get应该使用storeKey
删除重建可能会改变顺序

### 批改

正确。这里第二行的“适应 rawKey”应为“使用 rawKey”，`storeKey` 的正式变量名是 `storedKey`。补充一点：依赖收集和触发都使用 `rawKey` 才能命中同一个 Dep；原生操作使用 `storedKey` 才能找到集合中历史上真实保存的 Proxy 键。删除后重建不仅可能改变迭代顺序，也会把一次值更新错误地表现为结构删除和新增。

## 4. 找出迭代包装里缺失的部分

同学直接返回 `{ next: () => innerIterator.next() }`，认为 Map/Set 的所有迭代都完成了。

请指出：展开运算还需要哪个协议？deep 模式的对象结果缺少什么处理？Map 默认迭代与 Set.entries() 的单次 value 分别长什么样？forEach 回调的第三个参数为什么应传代理集合？

### 你的答案

展开运算还需要重写`[Symbol.iterator]()`方法
缺少对返回结果的代理，如果结果为对象，则也需要进行代理
Map 默认迭代和 `Map.entries()` 返回 `[key, value]`，`Set.entries()` 返回 `[value, value]`
传代理集合才能做到订阅依赖

Map 默认迭代和 Map.entries() 的单次 value 是 [key, value]
Set.entries()：[value, value]
包装迭代器的 [Symbol.iterator]() 返回 this
为了让回调观察到的集合保持为用户正在操作的响应式集合，如果回调继续通过第三个参数读取或写入集合，传 Proxy 还能保证这些操作继续经过响应式包装

### 批改

本题需要修正两点：

1. Map 默认迭代和 `Map.entries()` 的单次 value 是 `[key, value]`；只有 `Set.entries()` 是 `[value, value]`。不能把 Map 的键和值都写成 value。
2. `forEach` 的第三个参数传 Proxy，首先是为了让回调观察到的集合保持为用户正在操作的响应式集合，并符合 `observed === map`。依赖收集已经在包装后的 `forEach` 调用开始时完成；如果回调继续通过第三个参数读取或写入集合，传 Proxy 还能保证这些操作继续经过响应式包装，而不是绕过响应式系统。

关于展开运算和 deep 包装的前两点方向正确。请明确写出：包装迭代器需要实现 `[Symbol.iterator]()` 并返回自身；非浅层模式下，单值或二元组内的对象都要经过 `reactive` 或 `readonly` 转换。

### 修正复核

你新补充的 Map 形状和 `forEach` 原因已经正确，但原答案中“`Map.entries()`、Map 默认迭代和 `Set.entries()` 都是 `[value, value]`”仍然存在，与新答案矛盾。请直接把这句改成：Map 默认迭代和 `Map.entries()` 返回 `[key, value]`，`Set.entries()` 返回 `[value, value]`。另外明确写出包装迭代器的 `[Symbol.iterator]()` 应返回 `this`，这样它本身才满足可迭代协议。

## 5. 集合方法可用以后，deep watch 为什么还可能没有反应？

```ts
const map = reactive(new Map([["user", { score: 0 }]]));
watch(() => map, callback, { deep: true });
map.get("user")!.score++;
```

请解释为什么 Object.keys/Reflect.ownKeys 不能遍历这些条目；traverse 应从 Proxy 还是 raw 调用 forEach？如何保留循环引用保护？本章是否会递归读取 Map 对象 key 的内部属性？

### 你的答案

Map、Set的条目不是普通对象属性，无法通过Object.keys/Reflect.ownKeys进行遍历
使用Proxy调用forEach，这样才可以收集到依赖
在读取前就保存至seen中
不会读取key的内部属性，只会读取value

### 批改

正确。Map/Set 条目存储在集合内部槽位中，不属于可枚举对象属性；`traverse` 必须通过 Proxy 调用包装后的 `forEach`，才能先收集 `iterate` 依赖。进入数组、集合或普通对象之前就把当前对象加入 `seen`，可以截断集合包含自身等循环引用。本章只递归 Map 的 value，不递归作为身份标识的对象 key；Set 则递归其元素。

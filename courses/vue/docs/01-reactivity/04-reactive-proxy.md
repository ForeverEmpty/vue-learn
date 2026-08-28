# 第四章：使用 Proxy 实现浅层 reactive

`ref` 通过 `.value` 的 getter 和 setter 拦截读写。本章开始处理普通对象，让使用者可以直接写 `state.count`，不再需要 `.value`。

本章只实现浅层 reactive：追踪对象自身的第一层属性。嵌套对象转换和 Proxy 缓存会留到下一章。

## 本章目标

- 理解 Proxy 的 target、key 和 receiver。
- 使用 get 拦截属性读取并收集依赖。
- 使用 set 拦截属性修改并触发依赖。
- 为同一对象的不同属性建立独立 dep。
- 使用 WeakMap、Map、Set 组成三级依赖结构。
- 相同值赋值时不重复触发 effect。

## ref 为什么不能直接解决对象问题

`ref(0)` 只有一个固定入口 `.value`，所以一个 ref 只需要一个 dep。

对象可能拥有许多属性：

```ts
const state = {
  count: 0,
  name: 'Mini Vue',
}
```

读取 `state.count` 的 effect 不应该因为 `state.name` 改变而执行。因此不能让整个对象共用一个 dep，必须精确到“某个对象的某个属性”。

## Proxy 是什么

Proxy 在使用者和原对象之间增加一层代理：

```text
读取 proxy.count
→ Proxy 的 get 拦截器
→ 读取原对象 count

修改 proxy.count
→ Proxy 的 set 拦截器
→ 修改原对象 count
```

最小结构如下：

```ts
const proxy = new Proxy(target, {
  get(target, key, receiver) {
    return Reflect.get(target, key, receiver)
  },

  set(target, key, newValue, receiver) {
    return Reflect.set(target, key, newValue, receiver)
  },
})
```

参数含义：

- `target`：被代理的原始对象。
- `key`：正在读取或修改的属性名，类型通常是 `PropertyKey`。
- `newValue`：setter 收到的新值。
- `receiver`：本次操作实际使用的代理对象。
- `Reflect.get/set`：按照 JavaScript 标准语义完成真正的读写。

## 为什么依赖关系需要三层结构

响应式系统必须回答：哪个原对象、哪个属性、有哪些 effect？

```text
WeakMap targetMap
└── 原对象 target
    └── Map depsMap
        ├── "count" → Set dep → effect A
        └── "name"  → Set dep → effect B
```

对应类型可以理解为：

```ts
WeakMap<object, Map<PropertyKey, Dep>>
```

- WeakMap 的 key 是原对象。
- Map 的 key 是属性名。
- Dep 是前面章节已有的 `Set<ReactiveEffect>`。

## 为什么最外层使用 WeakMap

`targetMap` 不应该阻止原对象被垃圾回收。WeakMap 对 key 保持弱引用：当应用中没有其他地方再引用原对象时，垃圾回收器可以自动释放相关记录。

WeakMap 不能遍历，但依赖追踪并不需要列出全部原对象，只需要通过当前 target 查询，因此适合这里。

## 变量名建议

| 含义 | 推荐变量名 | 避免使用 |
| --- | --- | --- |
| 原始对象 | `target` 或 `raw` | `obj1` |
| 返回的代理 | `reactiveObject` | `newObj` |
| 属性名 | `key` | `name`（容易与业务属性混淆） |
| 对象对应的属性 Map | `depsMap` | `map` |
| 一个属性的依赖 Set | `dep` | `effects` |
| setter 的旧值 | `oldValue` | `old` |
| setter 的新值 | `newValue` | `value` |
| 本次要运行的副本 | `effectsToRun` | `_dep` |

## 建议的文件职责

```text
reactive.ts
→ 创建并返回 Proxy

baseHandlers.ts
→ 编写 get、set 拦截器

effect.ts
→ 保存 targetMap，并提供 track、trigger
```

这与真实 Vue“创建代理”和“代理行为”分离的思路一致，同时让依赖关系继续由 effect 模块管理。

## 检查点一：观察当前失败

当前 `reactive()` 只是直接返回原对象。运行：

```bash
npm run test:run
```

预期前三章 14 个测试通过。第四章中：

- “返回代理对象”失败。
- “属性改变后重新执行 effect”失败。
- “不同属性独立订阅”失败。
- “相同值不触发”暂时碰巧通过，因为任何属性都还不会触发。

playground 第四章页面也会显示：对象本身可以修改，但页面不会自动更新。

## 检查点二：先创建没有响应式能力的 Proxy

第一步只处理透明代理：

1. 创建 `baseHandlers.ts`。
2. 声明一个 `ProxyHandler<object>`。
3. get 使用 `Reflect.get` 返回属性值。
4. set 使用 `Reflect.set` 保存属性值并返回布尔结果。
5. `reactive(target)` 返回 `new Proxy(target, handlers)`。

完成后，代理身份测试应该通过，但 effect 相关测试仍然失败。

## 检查点三：抽取通用的 dep 操作

ref 和 reactive 都需要执行相同动作：

```text
trackEffect(dep)
→ 把 activeEffect 加入 dep
→ 把 dep 加入 activeEffect.deps

triggerEffects(dep)
→ 复制 dep
→ 对副本中的每个 effect 调用 run()
```

把这两个通用操作放在 `effect.ts`，然后让 ref 改用它们。先确保原有 14 个测试继续通过，再给 reactive 使用。

## 检查点四：实现 track(target, key)

get 拦截器读取属性时调用 track。track 按顺序查找或创建：

```text
targetMap 中 target 对应的 depsMap
→ depsMap 中 key 对应的 dep
→ trackEffect(dep)
```

没有 activeEffect 时不需要创建任何映射，普通读取不应产生依赖记录。

## 检查点五：实现 trigger(target, key)

set 拦截器应先读取 oldValue，再完成 Reflect.set。只有写入成功且新旧值确实变化时才调用 trigger。

trigger 的查找方向与 track 相同，但找不到时直接返回：

```text
targetMap 没有 target → 返回
depsMap 没有 key → 返回
找到 dep → triggerEffects(dep)
```

## 本章暂不处理

- 嵌套对象自动转换为 reactive。
- 同一原对象多次 reactive 时复用 Proxy。
- 数组、属性新增与删除。
- readonly、shallowReactive。

## 完成标准

- reactive 返回的不是原对象，但所有读写正确转发。
- effect 读取某属性后，该属性变化会重新执行 effect。
- 修改其他属性不会错误触发 effect。
- 相同值不会重复触发。
- 前三章测试保持通过。

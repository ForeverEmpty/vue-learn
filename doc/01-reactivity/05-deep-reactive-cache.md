# 第五章：深层 reactive 与 Proxy 缓存

第四章只代理对象的第一层。读取 `state.profile` 时，返回的仍是原始 profile 对象，因此继续修改 `state.profile.name` 不会经过 Proxy。本章将采用惰性转换，让嵌套对象在被读取时变成 reactive，并保证同一个原对象始终对应同一个 Proxy。

## 本章目标

- 理解浅层 reactive 为什么无法追踪嵌套属性。
- 在 getter 中惰性转换嵌套对象。
- 使用 WeakMap 缓存原对象到 Proxy 的关系。
- 保证重复读取嵌套对象时身份稳定。
- 避免对已经是 Proxy 的对象再次包装。

## 浅层 reactive 在哪里中断

```ts
const state = reactive({
  profile: {
    name: 'Ada',
  },
})

effect(() => {
  displayed = state.profile.name
})
```

第四章当前的执行过程：

```text
读取 state.profile
→ 外层 Proxy getter 被调用
→ track(外层原对象, "profile")
→ 返回原始 profile 对象

读取 profile.name
→ 普通对象读取
→ 没有 Proxy getter
→ 无法 track
```

修改 `state.profile.name` 时同样不会经过 setter，因此不能 trigger。

## 惰性深层转换

Vue 不会在创建 reactive 时立即递归遍历整个对象。getter 读取到一个对象时，才把这个结果交给 reactive：

```text
读取属性得到 result
→ result 不是对象：直接返回
→ result 是对象：返回 reactive(result)
```

这种方式称为惰性转换：没有被读取的嵌套对象不创建 Proxy。

### getter 中的执行顺序

`track` 必须在判断对象之前执行，不能在 `if (isObject(result))` 分支之后：

```text
Reflect.get 得到 result
→ track(target, key)
→ result 是对象：返回 reactive(result)
→ result 不是对象：直接返回 result
```

如果对象结果直接 `return reactive(result)`，当前属性本身就不会被追踪。例如 effect 读取
`state.profile.name` 后，替换整个 `state.profile` 时，effect 无法重新运行。

判断对象时必须排除 null：

```ts
export function isObject(value: unknown): value is object {
  return value !== null && typeof value === 'object'
}
```

建议把 `isObject` 放入 `packages/shared`，因为后续模块也会使用。

## 为什么必须缓存 Proxy

如果 getter 每次都直接执行 `new Proxy(result, handlers)`：

```ts
state.profile === state.profile // false
```

这会破坏对象身份稳定性，并不断创建新代理。依赖 Map、组件比较和用户代码都可能依赖严格相等，因此同一个原对象必须复用同一个 Proxy。

## 两个方向的缓存

本章使用两个 WeakMap：

```text
reactiveMap
原对象 raw → Proxy

rawMap
Proxy → 原对象 raw
```

它们解决不同问题：

- `reactiveMap`：`reactive(raw)` 被多次调用时复用已有 Proxy。
- `rawMap`：`reactive(proxy)` 被调用时识别输入已经是代理，直接返回自身，避免 Proxy 套 Proxy。

两者都使用 WeakMap，不应因为缓存本身延长对象生命周期。

## 变量名建议

| 含义 | 推荐变量名 |
| --- | --- |
| 原对象到代理的缓存 | `reactiveMap` |
| 代理到原对象的缓存 | `rawMap` |
| 已存在的代理 | `existingProxy` |
| 新创建的代理 | `reactiveObject` |
| getter 得到的属性值 | `result` |
| 是否为非 null 对象 | `isObject` |

## 检查点一：观察当前失败

运行：

```bash
npm run test:run
```

预期前四章 20 个测试通过，本章 4 个测试失败：

1. 嵌套属性不能触发 effect。
2. 同一原对象多次 reactive 得到不同 Proxy。
3. 嵌套对象还不是 Proxy，也没有稳定代理身份。
4. reactive(proxy) 会再次包装。

## 检查点二：实现惰性深层转换

1. 在 shared 中添加 `isObject`。
2. baseHandlers 的 getter 完成 Reflect.get 和 track。
3. result 是对象时返回 `reactive(result)`。
4. result 不是对象时直接返回。

完成后嵌套响应式测试应该通过，但身份缓存测试仍会失败。

`baseHandlers.ts` 导入 `reactive.ts`，而 `reactive.ts` 已导入 handlers。这形成模块循环，但 getter 只会在模块初始化完成后的实际属性读取阶段调用 reactive，因此当前 ESM 结构可以正常工作。理解这一点即可，暂时不需要为了消除循环过度拆分文件。

## 检查点三：缓存 raw → Proxy

在 `reactive.ts` 模块顶层创建 `reactiveMap`。`reactive(target)` 的顺序：

```text
查找 reactiveMap.get(target)
→ 找到 existingProxy：直接返回
→ 没找到：创建 reactiveObject
→ reactiveMap.set(target, reactiveObject)
→ 返回 reactiveObject
```

这会同时解决根对象重复 reactive 和嵌套 getter 重复返回新 Proxy 的问题。

### 循环引用也需要稳定身份

缓存还可以正确处理对象图中的循环引用：

```ts
const raw: { self?: object } = {}
raw.self = raw

const state = reactive(raw)

state.self === state // true
```

读取 `state.self` 时，getter 会再次执行 `reactive(raw)`。因为 `reactiveMap` 已经保存
`raw → state`，这里会返回根 Proxy，而不是创建另一个代理，也不会递归遍历对象。

## 检查点四：识别 Proxy 输入

只使用 reactiveMap 仍无法处理 `reactive(existingProxy)`，因为 reactiveMap 的 key 是原对象，不包含 Proxy。

创建 `rawMap` 并在新建代理时保存反向关系：

```text
rawMap.set(reactiveObject, target)
```

`reactive(target)` 最开始先判断 `rawMap.has(target)`。存在说明输入本身已经是代理，直接返回 target。

## 本章暂不处理

- 数组方法与 length。
- 新增、删除属性。
- readonly 和 shallowReactive。
- Map、Set 等集合类型。

## 完成标准

- 嵌套对象属性可以追踪和触发 effect。
- 同一原对象始终返回同一个 Proxy。
- 同一嵌套对象重复读取时身份稳定。
- reactive(proxy) 不会二次包装。
- 前四章测试保持通过。

# 第十一章：响应式数组的索引与 length

普通对象中，修改一个属性通常只需要考虑这个属性以及对象键集合。数组也是对象，但数组索引和 `length` 之间存在额外联动：新增较大的索引会自动增大 `length`，缩短 `length` 又会自动删除一批索引。

本章只完成数组索引、`length` 和键集合的依赖联动。数组方法在 effect 内部造成的依赖收集、`includes/indexOf` 的原对象与 Proxy 身份问题会在下一章单独处理。因此，完成本章不代表数组能力已经全部完成。

## 本章目标

- 理解数组本质上也是带有特殊规则的对象。
- 理解 Proxy trap 收到的数组索引通常是字符串 key。
- 区分已有索引更新、空位填充、超出范围的新索引和普通命名属性。
- 新增超出范围的索引时，通知 `length` 依赖。
- 缩短 `length` 时，通知被删除索引及键集合的依赖。
- 增大 `length` 时，不错误触发仍为 `undefined` 的索引依赖。
- 合并一次操作命中的多个 dep，避免同一个 effect 重复执行。

## 先理解：数组也是对象

下面的数组：

```ts
const list = ['A', 'B', 'C']
```

可以先把它理解成拥有这些属性的特殊对象：

```text
'0'     → 'A'
'1'     → 'B'
'2'     → 'C'
'length' → 3
```

但它不完全等同于普通对象，因为 JavaScript 引擎维护着索引和 `length` 的关系。

### 写入远端索引会增大 length

```ts
const list = ['A', 'B']

list[5] = 'F'

console.log(list.length) // 6
console.log(list[2])     // undefined，是一个空位
```

这次代码只显式写了索引 `5`，却同时改变了 `length`。所以响应式系统不能只通知 key `5` 的 dep。

### 缩短 length 会删除索引

```ts
const list = ['A', 'B', 'C']

list.length = 1

console.log(list[1]) // undefined
console.log(list[2]) // undefined
```

这次代码只显式写了 `length`，却同时删除了索引 `1` 和 `2`。所以响应式系统也不能只通知 `length` 的 dep。

这正是本章的核心：

```text
写索引  ──可能影响──> length
写 length ──可能影响──> 多个索引和键集合
```

## 当前实现为什么漏掉 length 更新

当前普通对象规则是：

```text
set 某个 key
→ trigger(target, key, type)
→ 查找这个 key 的 dep
```

执行：

```ts
const list = reactive(['A'])

effect(() => {
  console.log(list.length)
})

list.push('B')
```

`push` 内部大致会经历：

```text
读取 push 方法
→ 读取 length，知道新元素放在哪里
→ 写入新索引 '1'
→ 写入 length
```

容易误以为最后一次写 `length` 一定会触发 effect。但写入新索引 `'1'` 时，JavaScript 已经自动把原数组长度从 1 改成 2。之后 `push` 再写入 `length = 2`，set trap 看到的旧值和新值可能已经都是 2，于是 `hasChanged` 返回 false。

因此，不能依赖 `push` 最后那次 length 赋值补发通知。写入超出原长度的新索引时，就要把 length dep 加入本次通知集合。

## 数组索引 key 为什么是字符串

JavaScript 对象的属性键类型只有字符串和 Symbol。下面两种访问最终指向同一个属性：

```ts
list[2]
list['2']
```

因此 Proxy 的 `get` 或 `set` trap 收到索引时，key 通常是 `'2'`，不是数字 `2`。

下面这些虽然包含数字字符，却不是合法数组索引：

```ts
list['02'] = 'leading zero'
list['-1'] = 'negative'
list['1.5'] = 'decimal'
```

它们只是普通命名属性，不会改变 `length`。

建议在 shared 包中增加一个名称清楚的判断函数，例如：

```ts
isArrayIndex(key)
```

思路可以分成四步：

1. key 必须是字符串。
2. 转成数字后必须是非负整数。
3. 数字重新转成字符串后必须仍等于原 key，用来排除 `'02'` 和 `'1.0'`。
4. 必须小于 JavaScript 最大数组索引 `2 ** 32 - 1`。

你不必背住最大值。重要的是理解“能转成数字”不等于“是数组索引”。

推荐变量名：

| 含义 | 推荐变量名 |
| --- | --- |
| 当前 target 是否为数组 | `isArrayTarget` |
| key 是否为数组索引 | `isIndexKey` |
| 写入前的数组长度 | `oldLength` |
| 新的数组长度 | `newLength` |
| 本次要执行的 effect 集合 | `effectsToRun` |
| 依赖图中的某个 key | `depKey` |

## 四类数组属性写入

先假设：

```ts
const list = ['A', 'B'] // length 是 2
```

| 操作 | 属性结构变化 | length 变化 | 应通知 length effect |
| --- | --- | --- | --- |
| `list[0] = 'Z'` | 否，更新已有索引 | 否 | 否 |
| `list[1] = 'Y'` | 否，更新已有索引 | 否 | 否 |
| `list[5] = 'F'` | 是，新增索引 | 2 → 6 | 是 |
| `list.label = 'x'` | 是，新增普通属性 | 否 | 否 |

还有一个容易遗漏的情况：数组可能有空位。

```ts
const list = new Array(3) // length 是 3，但没有自有索引键
list[1] = 'B'
```

`'1'` 是新增加的自有属性，所以键集合变化；但索引 1 小于旧 length 3，因此 length 不变。

所以不能使用“只要 type 是 add 并且 key 是数组索引，就通知 length”这种过宽规则。还要比较：

```text
数字索引 >= 写入前的 oldLength
```

## 为什么 set trap 要先保存 oldLength

`Reflect.set` 写入远端索引后，原数组的 length 已经自动变化。此时再读取 target.length，得到的是新长度，已经丢失了写入前的信息。

正确的时间顺序是：

```text
进入 set trap
→ 在 Reflect.set 之前保存 oldLength
→ 保存 hadKey 和 oldValue
→ Reflect.set 真正写入
→ 判断操作类型和变化范围
→ trigger
```

当前 `trigger` 只接收 target、key 和 type。为了让它知道数组变化范围，需要额外传入写入前保存的 `oldLength`。`trigger` 在 `Reflect.set` 成功之后执行，所以需要新长度时可以直接读取此时的 `target.length`。

本课程使用下面的函数形状，改动较小：

```ts
trigger(target, key, type, oldLength)
```

注意：这是建议的函数形状，不要求照抄变量名之外的全部实现。先画清楚“谁在 Reflect.set 前知道旧长度”，再写代码。

## 新增远端索引时通知 length

写入一个数组索引时，length 只有在下面条件同时成立时才变化：

```text
target 是数组
并且 key 是合法数组索引
并且 type 是 add
并且 Number(key) >= oldLength
```

满足时，把 `depsMap.get('length')` 中的 effects 加入 `effectsToRun`。

不要立即单独调用一次 `triggerEffects(lengthDep)`。一个 effect 可能同时读取新索引和 length：

```ts
effect(() => {
  list[0]
  list.length
})
```

在空数组上新增 `list[0]` 会同时命中两个 dep。它们应该先合并到同一个 `effectsToRun` Set，最后只触发一次。

## 缩短 length 时通知被截断索引

假设依赖图中已经存在：

```text
'length' → length effect
'0'      → list[0] effect
'1'      → list[1] effect
'2'      → list[2] effect
ITERATE_KEY → Object.keys(list) effect
```

执行：

```ts
list.length = 1
```

应该通知：

- `length` dep，因为 length 从 3 变成 1。
- 索引 `'1'` 和 `'2'` 的 dep，因为这些元素被删除。
- `ITERATE_KEY` dep，因为数组的自有键集合减少。

不应通知索引 `'0'`，因为它仍然存在且值没变。

你可以遍历 `depsMap`：

```text
for each (dep, depKey) in depsMap
→ depKey 是数组索引吗？
→ Number(depKey) >= newLength 吗？
→ 是：把 dep 中的 effects 加入 effectsToRun
```

只有 `newLength < oldLength` 时才需要通知被截断索引和 `ITERATE_KEY`。增大 length 只制造空位，不会让某个原本为 `undefined` 的索引值发生变化，也不会让 `Object.keys` 多出索引键。

## 检查点一：观察普通对象规则的缺口

运行本章测试：

```bash
npm run test:run -- courses/vue/packages/reactivity/__tests__/reactive-array-length.test.ts
```

起点预期：

```text
5 passed
4 failed
```

全量测试起点预期：

```text
60 passed
4 failed
```

四个失败分别表示：

- push 新元素没有通知 length effect。
- 写入远端索引没有通知 length effect。
- 缩短 length 没有通知被截断索引的 effect。
- 缩短 length 没有通知键集合 effect。

打开 Playground 第十一章，先点击 `push 新元素`，再点击 `length 缩短为 2`。观察“数组真实变化”和“effect 页面结果”在哪里不一致。

检查点问题：为什么 `push` 明明包含一次 length 赋值，当前 length effect 仍可能不执行？

先用自己的话回答这个问题，不需要立刻改代码。

## 检查点二：识别数组索引并保存 oldLength

1. 在 shared 包创建 `isArrayIndex`，不要只用 `!Number.isNaN(Number(key))`。
2. 在 set trap 最开始判断 target 是否为数组。
3. 在 `Reflect.set` 之前保存 `oldLength`。
4. 临时用日志或断点观察 `list[3]` 收到的 key 类型和值。
5. 验证 `'3'` 是索引，而 `'03'`、`'-1'` 和普通属性名不是索引。

完成这一检查点时，可以先不触发 length；目标是正确准备后面判断需要的信息。

## 检查点三：让新增远端索引通知 length

1. 让 trigger 能得到 `oldLength`。
2. 保留当前 key dep 和结构 dep 的收集逻辑。
3. 当新增数组索引且该索引不小于 oldLength 时，加入 length dep。
4. 继续统一使用 `effectsToRun` 去重后触发。
5. 运行测试，确认 push 和远端索引两个失败消失。

特别检查：

- 更新已有索引不能触发 length effect。
- 填充旧 length 范围内的空位不能触发 length effect。
- 添加 `list.label` 不能触发 length effect。

## 检查点四：处理 length 截断

1. trigger 收到 key 为 `'length'` 时，从已经写入的 target 读取 `newLength`，并使用参数中的 `oldLength`。
2. length 自己的 dep 仍然需要触发。
3. 只有缩短时才遍历 depsMap。
4. 把大于或等于新 length 的索引 dep 加入 effectsToRun。
5. 把 `ITERATE_KEY` dep 加入 effectsToRun，因为部分自有索引键被删除。
6. 确保增大 length 不触发索引 dep 和键集合 dep。

## 检查点五：补充边界测试与整理

本检查点不要先看答案，自己补一个测试，覆盖以下二选一边界：

- 填充数组旧长度范围内的空位会更新 `Object.keys`，但不会更新 length effect；或
- 删除数组索引会更新该索引与 `Object.keys`，但不会改变 length。

写完后告诉我选择了哪一个。我会检查测试是否真的区分了“键集合变化”和“length 变化”，再补充另一项边界。

最后运行：

```bash
npm run test:run
npm run typecheck
npm run build
```

## 本章暂不处理

- effect 内调用 `push/pop/shift/unshift/splice` 时的依赖暂停和递归保护。
- `includes/indexOf/lastIndexOf` 同时兼容原对象与响应式 Proxy。
- 数组迭代器更精细的专用依赖键。
- readonly、shallow 和 raw 工具。
- Map、Set、WeakMap 和 WeakSet。

这些内容不会被忽略：数组方法与身份问题会组成下一章；之后才进入 readonly、shallow 和 raw 工具。

## 完成标准

- 新增超出范围的数组索引会通知 length effect。
- 更新已有索引、填充范围内空位和新增普通属性不会错误通知 length effect。
- 缩短 length 会通知被截断索引和键集合 effect。
- 增大 length 不会错误通知索引和键集合 effect。
- 一个数组操作命中多个 dep 时，同一个 effect 只执行一次。
- 前十章测试保持通过。
- 明确知道本章结束后，数组方法插桩仍未完成。

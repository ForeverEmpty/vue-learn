# 02. 原型与属性归属

> 所属大章节：`00. JS/TS 基础`

第十章需要判断一个属性是否是对象自己的属性：

```ts
const hadKey = Object.prototype.hasOwnProperty.call(target, key)
```

如果还没有理解原型链，这行代码会显得很奇怪。本课从最基础的对象查找规则开始，最后逐段拆解它。

## 本课目标

- 理解对象自己的属性和原型上的属性有什么区别。
- 理解 `in` 为什么会查找原型链，而 `Object.keys` 默认只列出自有可枚举属性。
- 逐段理解 `Object.prototype.hasOwnProperty.call(target, key)`。
- 说明为什么不总是直接写 `target.hasOwnProperty(key)`。
- 理解 `Object.create(null)` 为什么没有 `hasOwnProperty` 方法。
- 连接回 reactive：为什么 set trap 要用“自有属性”判断 add 还是 set。

## 1. 对象不只有一层属性

先看一个对象和它的原型：

```ts
const parent = {
  inherited: '来自原型',
}

const child = Object.create(parent)
child.own = '来自对象自己'
```

可以把它画成：

```text
child
├─ own: '来自对象自己'
└─ [[Prototype]] ──→ parent
                     └─ inherited: '来自原型'
```

`child` 自己只有 `own`。当 JavaScript 在 child 上找不到某个属性时，才会沿着 `[[Prototype]]` 继续查找 parent。

```ts
child.own       // 找到 child 自己的属性
child.inherited // child 没有，沿原型找到 parent 的属性
```

这就是原型链：

```text
当前对象没有这个属性
→ 查看 [[Prototype]]
→ 原型也没有就继续向上
→ 找到属性或到达 null
```

## 2. in 会查找原型链

`in` 判断的是“从这个对象出发能不能找到这个属性”，不是“属性是否直接存在于对象自己”：

```ts
'own' in child       // true
'inherited' in child // true
'missing' in child   // false
```

`inherited` 只存在于 parent，但从 child 读取它是成功的，所以 `in` 返回 true。

这也是 Proxy 的 `has` trap 对应的操作：

```ts
'name' in state
```

会进入：

```ts
has(target, key) {
  return Reflect.has(target, key)
}
```

`Reflect.has` 与 `in` 一样，会检查原型链。

## 3. 自有属性是什么

自有属性（own property）就是直接存储在当前对象上的属性，不是从原型查到的属性：

```ts
Object.prototype.hasOwnProperty.call(child, 'own')
// true

Object.prototype.hasOwnProperty.call(child, 'inherited')
// false
```

对比三种判断：

| 判断 | own | inherited | 说明 |
| --- | --- | --- | --- |
| `'key' in child` | true | true | 查找对象和原型链 |
| `hasOwnProperty.call(child, key)` | true | false | 只判断对象自己 |
| `Object.keys(child)` | 出现在结果中 | 不出现 | 只列出自有、可枚举键 |

`Object.keys` 默认不列出原型属性，也不列出不可枚举属性。第十章的 `hadKey` 要判断“赋值前是否已有自有属性”，因此不能使用 `in`：

```ts
const parent = { count: 0 }
const child = Object.create(parent)

'count' in child // true
// 但 child 自己并没有 count
```

如果这时执行：

```ts
child.count = 1
```

通常会在 child 自己创建一个新的 `count`，这属于新增自有属性，不是更新 child 原来已有的属性。

## 4. 拆解 hasOwnProperty.call

把表达式拆成三个部分：

```ts
Object.prototype.hasOwnProperty.call(target, key)
```

### 第一部分：Object.prototype

普通对象通常继承自 `Object.prototype`。很多常见方法都定义在那里：

```ts
Object.prototype.hasOwnProperty
Object.prototype.toString
Object.prototype.valueOf
```

所以 `Object.prototype.hasOwnProperty` 是一个稳定的原始方法引用。

### 第二部分：hasOwnProperty

它是一个函数，作用是判断调用它的对象是否拥有某个自有属性：

```ts
const hasOwn = Object.prototype.hasOwnProperty
```

此时只是取出函数，还没有指定它要检查哪个对象。

### 第三部分：call(target, key)

JavaScript 函数可以通过 `call` 指定函数内部的 `this`：

```ts
hasOwn.call(target, key)
```

等价于：

```text
调用 hasOwnProperty 函数
让函数内部的 this 指向 target
把 key 作为要检查的属性名
```

完整翻译就是：

```text
使用 Object.prototype 上可靠的 hasOwnProperty 方法
让它检查 target
检查的属性名是 key
```

## 5. 为什么不直接写 target.hasOwnProperty(key)

多数普通对象可以这样写：

```ts
child.hasOwnProperty('own')
```

但这不是最稳妥的通用写法。

### 情况一：对象覆盖了同名属性

```ts
const target = {
  hasOwnProperty: '这不是函数',
  count: 0,
}

target.hasOwnProperty('count')
// TypeError：target.hasOwnProperty 不是函数
```

此时对象自己的 `hasOwnProperty` 覆盖了原型上的方法。

稳定写法不依赖 target 上的同名属性：

```ts
Object.prototype.hasOwnProperty.call(target, 'count')
// true
```

### 情况二：对象没有 Object.prototype

```ts
const target = Object.create(null)
target.count = 0
```

这个对象的原型是 null：

```text
target → null
```

它没有继承 `hasOwnProperty`：

```ts
target.hasOwnProperty
// undefined
```

但稳定写法仍然有效：

```ts
Object.prototype.hasOwnProperty.call(target, 'count')
// true
```

### 情况三：target 不是普通对象

响应式系统的 handler 可能接收来自不同来源的对象。使用固定来源的原始方法，可以避免把判断逻辑交给 target 自己提供的方法。

## 6. call 与 bind 的区别

这一课只需要理解 `call`，但可以顺便对比：

```ts
hasOwn.call(target, key)
```

立即调用函数，并临时把 `this` 设置为 target。

```ts
const checkTarget = hasOwn.bind(target)
checkTarget(key)
```

创建一个新函数，永久预设 this 为 target，之后再调用。

第十章只需要一次判断，所以 `call` 更直接。

## 7. Object.hasOwn

现代 JavaScript 还提供了更短的写法：

```ts
Object.hasOwn(target, key)
```

它表达的就是“target 是否拥有 key 这个自有属性”。当前课程使用 `Object.prototype.hasOwnProperty.call`，是为了拆解原型、方法和 `this` 的关系，也兼容更早的 JavaScript 环境。

实际项目可以根据目标运行环境选择 `Object.hasOwn`。

## 8. 连接回 reactive 的 add 与 set

第十章的 set trap 需要区分：

```text
赋值前 target 自己没有 key → add
赋值前 target 自己已有 key   → set
```

正确判断应该类似：

```ts
const hadKey = Object.prototype.hasOwnProperty.call(target, key)
```

不能写成：

```ts
const hadKey = key in target
```

因为 `in` 会把原型上的属性也算进去，可能把一次新增误判成更新。

## 基础检查点一：预测结果

先不要运行，写出下面代码的结果：

```ts
const parent = { inherited: 1 }
const child = Object.create(parent) as Record<string, number>
child.own = 2

console.log('inherited' in child)
console.log(Object.prototype.hasOwnProperty.call(child, 'inherited'))
console.log(Object.prototype.hasOwnProperty.call(child, 'own'))
console.log(Object.keys(child))
```

然后打开 playground 的“原型与属性归属”页面验证。

## 基础检查点二：解释一行表达式

用自己的话解释下面四个部分：

```ts
Object.prototype.hasOwnProperty.call(target, key)
```

至少说明：

- `Object.prototype` 从哪里来。
- `hasOwnProperty` 是什么。
- `call` 修改了什么。
- `target` 和 `key` 分别扮演什么角色。

## 本课暂不处理

- 原型链的完整规范算法。
- class、继承语法和 super。
- Proxy 对原型链所有边界的完整兼容。
- `Object.getPrototypeOf` 与 `Object.setPrototypeOf` 的响应式设计。
- 复杂的不可枚举属性描述符。

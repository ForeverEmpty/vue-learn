# 03. call、apply 与 bind

> 所属大章节：`00. JS/TS 基础`

第 02 课中出现了：

```ts
Object.prototype.hasOwnProperty.call(target, key)
```

这里的 `call` 不是普通的属性调用，而是 Function 对象提供的方法。它和 `apply`、`bind` 都可以改变函数调用时的 `this`，但调用时间和参数写法不同。

## 本课目标

- 理解普通函数调用时 `this` 的来源。
- 区分 `call`、`apply` 和 `bind` 的执行时间。
- 区分三个函数的参数写法。
- 理解 `bind` 返回的是新函数，而不是执行结果。
- 理解箭头函数为什么不能通过 call、apply、bind 改变 this。
- 回看 `hasOwnProperty.call` 为什么能借用别的对象上的方法。

## 1. 函数也是对象

函数可以被调用，也可以拥有属性：

```ts
function greet() {
  return 'hello'
}

greet()
greet.call(...)
greet.apply(...)
greet.bind(...)
```

`call`、`apply` 和 `bind` 都是 Function.prototype 上的方法，所以普通函数通常都能访问它们。

```text
greet
└─ [[Prototype]] ──→ Function.prototype
                      ├─ call
                      ├─ apply
                      └─ bind
```

## 2. this 从哪里来

先看一个普通函数：

```ts
function showName(this: { name: string }) {
  return this.name
}
```

TypeScript 里的 `this: { name: string }` 是 this 参数声明，只用于类型检查，不会成为实际参数。调用时需要决定 this 指向谁。

对象方法调用：

```ts
const person = { name: 'Ada', showName }

person.showName()
// this 是 person，结果是 Ada
```

拆出函数再调用：

```ts
const detached = person.showName
detached()
```

这时已经没有 `person.` 这个调用对象，this 不再自动指向 person。在严格模式下通常是 `undefined`，访问 `this.name` 会出错。

call、apply、bind 解决的就是“明确指定 this 指向谁”。

## 3. call：现在调用，参数逐个传入

语法：

```ts
functionName.call(thisArg, arg1, arg2, arg3)
```

`call` 做两件事：

1. 立即调用函数。
2. 把 this 设置为第一个参数，后面的参数逐个传给函数。

示例：

```ts
function introduce(this: { name: string }, greeting: string, punctuation: string) {
  return `${greeting}, ${this.name}${punctuation}`
}

const person = { name: 'Ada' }

const result = introduce.call(person, 'Hello', '!')
// 立即执行
// result 是 'Hello, Ada!'
```

参数关系：

```text
call(
  this 指向的对象,
  第一个普通参数,
  第二个普通参数,
)
```

## 4. apply：现在调用，参数放在数组中

语法：

```ts
functionName.apply(thisArg, [arg1, arg2, arg3])
```

`apply` 和 `call` 一样会立即调用函数，区别只有参数形式：

```ts
const callResult = introduce.call(person, 'Hello', '!')
const applyResult = introduce.apply(person, ['Hello', '!'])
```

两个结果相同：

```text
Hello, Ada!
```

记忆方法：

```text
call  → arguments 一个一个写
apply → arguments 放进 array
```

当参数本来就在数组中时，apply 写法直观：

```ts
const args: [string, string] = ['Hello', '!']
introduce.apply(person, args)
```

现代 TypeScript/JavaScript 中也常用展开语法替代 apply：

```ts
introduce.call(person, ...args)
```

但理解 apply 仍然重要，因为很多旧代码和底层 API 会使用它。

## 5. bind：不立即调用，返回新函数

语法：

```ts
const boundFunction = functionName.bind(thisArg, arg1, arg2)
```

`bind` 不会立即执行原函数。它会创建一个新函数，把 this 和部分参数预先保存下来。

```ts
const greetAda = introduce.bind(person, 'Hello')

// 上一行没有执行 introduce

const result = greetAda('!')
// 调用 greetAda 时才执行 introduce
// result 是 'Hello, Ada!'
```

执行过程：

```text
introduce.bind(person, 'Hello')
→ 返回新函数 greetAda
→ 保存 this = person
→ 保存第一个参数 'Hello'

greetAda('!')
→ 真正调用 introduce
→ 最后的参数 '!' 补上
```

所以 bind 的返回值是函数：

```ts
const bound = introduce.bind(person, 'Hello')
typeof bound // 'function'
```

不要混淆：

```ts
introduce.call(person, 'Hello', '!') // 结果字符串
introduce.apply(person, ['Hello', '!']) // 结果字符串
introduce.bind(person, 'Hello') // 新函数
```

## 6. 三者对比

| 方法 | 是否立即调用 | this | 参数形式 | 返回值 |
| --- | --- | --- | --- | --- |
| `call` | 是 | 指定 | 逐个传入 | 原函数执行结果 |
| `apply` | 是 | 指定 | 数组传入 | 原函数执行结果 |
| `bind` | 否 | 预先保存 | 可预先传一部分 | 新函数 |

最重要的区别可以缩成一句话：

```text
call / apply 是现在调用
bind 是准备一个以后调用的函数
```

## 7. 回看 hasOwnProperty.call

第 02 课中的代码：

```ts
Object.prototype.hasOwnProperty.call(target, key)
```

可以分三步读：

```ts
const hasOwn = Object.prototype.hasOwnProperty
const result = hasOwn.call(target, key)
```

这里使用 call 的原因是：

```text
hasOwnProperty 原本属于 Object.prototype
→ 借用这个函数
→ 让它的 this 临时指向 target
→ 让 key 作为函数参数
→ 立即得到 true 或 false
```

这不是把 `hasOwnProperty` 复制到 target 上，也不是修改 target 的原型，只是借用函数并指定本次调用的 this。

如果写成 bind：

```ts
const checkTarget = Object.prototype.hasOwnProperty.bind(target)
const result = checkTarget(key)
```

也能得到结果，但为了只调用一次而创建新函数没有必要，所以这里 call 更合适。

## 8. 箭头函数的 this

箭头函数没有自己的 this，它会从外层作用域捕获 this：

```ts
const arrow = () => this

arrow.call(person)
arrow.apply(person)
arrow.bind(person)()
```

这三个操作都不能改变箭头函数已经捕获的 this。call、apply、bind 主要用于普通函数。

对比：

```ts
function normal(this: { name: string }) {
  return this.name
}

const arrow = () => this

normal.call(person) // 可以指定 this
arrow.call(person)  // 不能改变箭头函数的词法 this
```

不要为了“方便使用 call”把需要动态 this 的函数写成箭头函数。

## 基础检查点一：预测结果

先不要运行，写出下面代码的结果：

```ts
function getName(this: { name: string }, prefix: string) {
  return `${prefix}${this.name}`
}

const person = { name: 'Ada' }

console.log(getName.call(person, 'A:'))
console.log(getName.apply(person, ['B:']))

const getNameC = getName.bind(person, 'C:')
console.log(typeof getNameC)
console.log(getNameC())
```

## 基础检查点二：选择方法

为下面三个需求分别选择 call、apply 或 bind，并说明原因：

1. 现在调用函数，参数已经一个个写好了。
2. 现在调用函数，参数已经保存在数组里。
3. 先准备一个带固定 this 的回调，稍后由其他代码调用。

## 本课暂不处理

- new 与 bind 的特殊交互。
- class 方法自动绑定。
- 浏览器事件回调中的 this。
- 函数柯里化和高级函数组合。

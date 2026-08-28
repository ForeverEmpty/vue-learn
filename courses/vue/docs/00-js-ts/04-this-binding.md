7bab4032d22ab15f840fa742b887d494# 04. this 的指向

> 所属大章节：`00. JS/TS 基础`

`this` 最容易产生的误解是：“this 指向定义这个函数的对象”。对普通函数来说，更准确的规则是：

```text
this 通常由函数的调用方式决定，而不是由函数写在哪里决定。
```

## 本课目标

- 理解普通函数的 this 由调用位置决定。
- 区分默认调用、对象方法调用和函数提取调用。
- 理解 call、apply、bind 如何显式指定 this。
- 初步理解 new 调用的 this。
- 理解箭头函数为什么没有自己的 this。
- 用 TypeScript 的 this 参数约束普通函数。

## 1. 普通函数没有固定的 this

```ts
function showThis() {
  return this
}
```

只看函数定义，无法确定 this。需要看调用形式：

```ts
showThis()
```

这是默认调用。当前项目使用 TypeScript 模块，模块代码默认是严格模式，普通函数默认调用时 this 通常是 `undefined`。

## 2. 对象方法调用

```ts
const user = {
  name: 'Ada',
  getName() {
    return this.name
  },
}

user.getName()
// this 是 user
// 结果是 Ada
```

关键不是函数被放在对象里面，而是调用表达式左侧有 `user.`：

```text
user.getName()
└─ 调用者对象是 user
   → this = user
```

## 3. 函数提取后 this 丢失

```ts
const getName = user.getName
getName()
```

这时调用表达式已经没有 `user.`：

```text
getName()
└─ 没有对象调用者
   → 默认调用
   → this 不再是 user
```

因此不要根据函数最初存放的位置猜 this，要观察真正执行时的调用形式。

对比：

```ts
user.getName() // this = user
const fn = user.getName
fn()           // this 不再由 user 提供
```

## 4. TypeScript 的 this 参数

TypeScript 允许在普通函数的参数列表最前面声明 this 类型：

```ts
function getName(this: { name: string }) {
  return this.name
}
```

这个 `this` 参数只用于类型检查，不会出现在 JavaScript 的实际参数中：

```ts
getName.call({ name: 'Ada' })
```

如果显式传入不符合类型的对象，TypeScript 可以提前报错。它不能改变运行时的 this，只是帮助我们发现调用错误。

## 5. call 和 apply：显式指定 this

普通函数可以通过 call 或 apply 立即调用，并明确指定 this：

```ts
function introduce(this: { name: string }, prefix: string) {
  return `${prefix}${this.name}`
}

const person = { name: 'Ada' }

introduce.call(person, 'Hello ')
introduce.apply(person, ['Hello '])
```

两次调用的 this 都是 person。

区别只在参数形式：

```text
call(thisArg, arg1, arg2)
apply(thisArg, [arg1, arg2])
```

## 6. bind：以后调用时使用指定的 this

```ts
const introduceAda = introduce.bind(person, 'Hello ')
```

这一行不会立即执行 `introduce`，而是返回一个新函数：

```ts
introduceAda()
// 现在才执行 introduce
// this = person
```

bind 保存了两类信息：

```text
this = person
prefix = 'Hello '
```

之后调用新函数时，只需要补剩余参数。

## 7. new 调用的 this

使用 `new` 调用普通函数时，JavaScript 会创建一个新对象，并把这个新对象作为 this：

```ts
function Person(this: { name: string }, name: string) {
  this.name = name
}

const person = new (Person as new (name: string) => { name: string })('Ada')
```

本课只记住结果：

```text
new 函数(...args)
→ 创建新对象
→ this 指向新对象
→ 函数执行
→ 返回新对象
```

class 构造函数也遵循类似的“创建实例并让 this 指向实例”的规则。构造函数类型写法比较复杂，先把调用规则记住即可。

## 8. 箭头函数没有自己的 this

箭头函数不会根据调用方式重新获得 this，它会捕获定义位置外层的 this：

```ts
const user = {
  name: 'Ada',
  getName: () => this.name,
}
```

这个箭头函数的 this 不是 user。对象字面量不会为箭头函数提供新的 this。

普通方法则不同：

```ts
const user = {
  name: 'Ada',
  getName() {
    return this.name
  },
}
```

普通方法在 `user.getName()` 调用时可以使用 user 作为 this。

## 9. 方法中的箭头函数

箭头函数在普通方法内部很有用，因为它会捕获外层方法的 this：

```ts
const counter = {
  count: 0,
  start() {
    const increase = () => {
      this.count++
    }

    increase()
  },
}
```

这里的外层 `start()` 是对象方法调用，所以外层 this 是 counter；箭头函数捕获这个 this。

如果改成普通内层函数：

```ts
const counter = {
  count: 0,
  start() {
    function increase() {
      this.count++
    }

    increase()
  },
}
```

`increase()` 是默认调用，this 不会自动继承外层 start 的 this。需要显式使用 call、bind，或者改用箭头函数。

## 10. call、apply、bind 对箭头函数无效

箭头函数没有自己的 this，因此下面的 call、apply、bind 不能改变它已经捕获的 this：

```ts
const arrow = () => this

arrow.call(person)
arrow.apply(person)
arrow.bind(person)()
```

这不是说 call 等方法不存在，而是它们没有可重新设置的箭头函数 this。

记忆方式：

```text
普通函数：this 看调用方式
箭头函数：this 看定义位置的外层环境
```

## 11. this 指向优先级

遇到复杂调用时，可以按下面的优先级理解普通函数：

```text
new 调用
→ call / apply / bind 等显式调用
→ 对象方法调用 obj.fn()
→ 默认调用 fn()
```

箭头函数是例外：它不接受这些调用方式重新设置 this。

## 12. 与 hasOwnProperty.call 的关系

现在重新看：

```ts
Object.prototype.hasOwnProperty.call(target, key)
```

它不是在调用 target 的方法，而是：

```text
取出 Object.prototype 上的普通函数 hasOwnProperty
→ 使用 call 指定 this = target
→ 把 key 作为普通参数传入
→ 立即执行并得到布尔结果
```

这也是为什么 `call` 比 `bind` 更合适：这里马上就要判断一次，不需要保存一个以后再调用的新函数。

## 基础检查点一：预测调用结果

先不要运行，写出下面代码中三个结果：

```ts
const first = {
  name: 'Ada',
  getName(this: { name: string }) {
    return this.name
  },
}

const second = { name: 'Grace' }
const method = first.getName

first.getName()
method.call(second)
method.bind(second)()
```

## 基础检查点二：判断箭头函数

解释为什么下面的箭头函数不能通过 call 改成使用 person：

```ts
const person = { name: 'Ada' }
const readName = () => this

readName.call(person)
```

## 本课暂不处理

- class 中的 super 与继承细节。
- `new` 与 bind 组合时的完整优先级规范。
- 浏览器事件回调的 this 特殊规则。
- TypeScript noImplicitThis 的所有配置细节。

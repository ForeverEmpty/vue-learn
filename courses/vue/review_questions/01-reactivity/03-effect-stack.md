# 第三章复习：嵌套 effect、effect 栈与异常恢复

> 批改状态：通过。第 2、6 题有补充说明。

## 1. 为什么内层 effect 结束后不能直接把 `activeEffect` 设置为 undefined？

内层effect结束后，直接将activeEffect设为undefined会导致丢失外层的信息，导致无法收集内层后的外层依赖

> **批改：正确。** 内层结束时执行权仍在外层函数中，后续 getter 应继续收集外层 effect。

## 2. 局部 `parentEffect` 为什么能支持三层及以上嵌套？它利用了什么执行机制？

```text
effect(() => {
    1
    effect(() => {
        2
        effect(() => {
            3
        })
    })
})

1 parentEffect = undefined
2 parentEffect = 1
3 parentEffect = 2
->
2 activeEffect = 2
1 activeEffect = 1
finally activeEffect = undefined
```
利用了JavaScript的调用栈，可以恢复每个effect的父effect

> **批改：正确。** 更精确的恢复过程是：第 3 层 finally 恢复第 2 层，第 2 层 finally 恢复第 1 层，第 1 层 finally 恢复 undefined。每次 run 的 `parentEffect` 都是不同的局部变量。

## 3. 为什么普通的“函数执行后清理”不能保证异常情况下恢复状态？

异常的情况下，函数被中断，无法执行最后的activeEffective清除

> **批改：正确。** 普通顺序代码会被异常跳过；恢复状态必须放进 finally。

## 4. `try...finally` 是否会吞掉 effectFn 抛出的错误？本章希望错误怎样传播？

不会吞掉，会正常抛出。错误会继续向外抛出

> **批改：正确。** 响应式系统负责恢复内部状态，调用者仍然可以在外部使用 catch 处理错误。

## 5. 为什么 finally 中应该恢复 `parentEffect`，而不是固定设置 undefined？

将activeEffect设为undefined会导致丢失外层的信息，导致无法收集内层后的外层依赖

> **批改：正确。** 顶层的 parentEffect 才是 undefined；嵌套时它指向外层 effect。

## 6. 外层 effect、内层 effect、外层后续读取的完整 activeEffect 变化过程是什么？

activeEffect = undefined
-> activeEffect = 外层effect
-> activeEffect = 内层effect
-> activeEffect = 外层effect
-> activeEffect = undefined

> **批改：正确。** 在恢复为外层 effect 后，外层函数继续读取后续 ref，其 getter 会把外层 effect 收集进去；外层最终结束后才恢复 undefined。

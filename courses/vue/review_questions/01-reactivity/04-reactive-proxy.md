# 第四章复习：使用 Proxy 实现浅层 reactive

> 批改状态：通过。第 1、2、4 题有补充说明。

## 1. 为什么对象的不同属性不能共用一个 dep？请举一个会错误触发的例子。

对象的不同属性并非都在某个effect中被依赖

```ts
const state = reactive({
  count: 0,
  name: "张三",
});

effect(() => {
  console.log(state.count);
});

//此时会触发更新
state.name = "李四";
```

> **批改：思路正确，示例注释需要限定条件。** 在正确实现中，修改 name 不会触发只读取 count 的 effect；只有当 count 与 name 错误共用一个 dep 时，才会出现注释描述的错误触发。按 key 分开 dep 正是为了解决这个问题。

## 2. 根据一次 `state.count` 读取，写出 targetMap、depsMap、dep 三层结构分别使用什么作为 key 或保存什么。

```text
targetMap-> state: depsMap
depsMap-> count: dep
dep-> activeEffect
```

> **批改：结构正确，两个名词需要更精确。** targetMap 的 key 是 Proxy handler 收到的原对象 `target`，不是代理对象 `state`；dep 中保存的是一个或多个 `ReactiveEffect` 对象。完整关系是 `raw target → count → Set<ReactiveEffect>`。

## 3. 如果 `state.name` 从未在 effect 中读取，修改它时 trigger 应该经过哪些判断并在哪里结束？

如果effect中读取过state其他属性，则在depsMap中查找name属性时中断，反之则在targetMap查找state时中断。

> **批改：正确。** targetMap 没有原对象时直接返回；存在 depsMap 但没有 name 对应的 dep 时也直接返回，不会创建新依赖或执行 effect。

## 4. WeakMap 为什么适合作为 targetMap？如果改成普通 Map，生命周期上有什么区别？

换成普通Map，当state不再被引用时，不会被垃圾回收。

> **批改：正确。** 更精确地说，WeakMap 对原对象 key 保持弱引用；当外部不再引用该原对象时，相关记录可被自动回收。普通 Map 会强引用 key，除非主动删除，否则可能延长对象和依赖记录的生命周期并造成内存泄漏。

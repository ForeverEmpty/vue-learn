# 第二章复习：effect 重新执行与依赖清理

> 批改状态：通过。第 1、3、4 题有补充说明。

## 1. 为什么 effect 重新执行时需要再次设置 `activeEffect`？

需要重新收集本次effect的依赖

> **批改：正确，但可以更具体。** effect 重新执行时，getter 必须通过 `activeEffect` 知道当前应该收集哪个 `ReactiveEffect`。如果不重新设置，新读取的分支虽然执行了 getter，也无法建立订阅。

## 2. 为什么只保存“ref 到 effect”的关系，无法清理旧依赖？

因为在effect执行时，不知道自己依赖了哪些ref

> **批改：正确。** 清理动作从 effect 出发；没有反向记录，就无法找到它曾加入过的所有 dep。

## 3. `dep` 和 `deps` 分别保存什么？为什么需要同时存在？

dep存放的ref所依赖的effect，deps存放的effect依赖了哪些ref。同时存在是为了形成双向连接，这样effect可以知道自身依赖呢哪些ref，可以清除不需要的依赖

> **批改：思路正确，类型表述需要修正。** `dep` 是某个 ref 保存的 `Set<ReactiveEffect>`；`deps` 保存的是该 effect 加入过的多个 dep 集合，而不是 ref 对象本身。双向关系使 getter 能收集、effect 能反向清理。

## 4. 为什么必须在 effectFn 执行前清理旧依赖，而不是执行后？

执行后没有办法再重新收集新的依赖

> **批改：方向正确。** 更准确地说，执行过程中已经收集了本次新依赖；如果执行后再清理，旧 dep 和刚加入的新 dep 都会被删除，最终反而没有任何有效订阅。正确顺序是先清旧关系，再执行并建立新关系。

## 5. 为什么触发 effect 时要复制 dep，而不能直接遍历原始 Set？

原始Set此时会发生增删，直接遍历可能会删除后又添加，造成死循环

> **批改：正确。** Set 遍历期间重新加入被删除的元素，可能让它再次成为待遍历元素；快照能隔离本次触发过程。

## 6. 条件从主分支切换到备用分支时，依赖关系发生了什么变化？

```text
effect(()=> A ? B : C)
开始
A dep: effect
B dep: effect
C dep: []

effect deps: [A, B]

A改变，effect重新执行
effect 清除依赖
A dep: []
B dep: []
C dep: []

effect deps: []

重新收集依赖
A dep: effect
B dep: []
C dep: effect

effect deps: [A, C]
```

> **批改：正确且完整。** 你准确描述了清理后的空状态，以及重新执行后依赖从 `[A, B]` 变为 `[A, C]` 的过程。

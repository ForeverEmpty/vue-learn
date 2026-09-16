# Java 基础 00·14：`Map`、`ConcurrentHashMap` 与 `putIfAbsent`

Spring Boot 01·03 需要按唯一 `slug` 保存并查找主题。列表擅长表达有顺序的一组元素，但按唯一键查找和拒绝重复时，`Map` 更直接。

本基础章不安排复习题。理解当前用法后返回 Spring Boot 01·03 检查点二。

## 1. `Map<K, V>` 表达什么

`Map` 保存“键到值”的映射：

```java
Map<String, StudyTopic> topics;
```

这里：

- `String` 是键类型，保存唯一的 slug；
- `StudyTopic` 是值类型，保存完整主题；
- 一个键最多对应一个当前值。

查找不再需要扫描全部元素：

```java
StudyTopic topic = topics.get(slug);
```

当键不存在时，`get` 返回 `null`。课程的公开查询方法仍使用 `Optional` 隔离这个内部细节：

```java
return Optional.ofNullable(topics.get(slug));
```

## 2. 为什么列表不适合当前写入规则

使用 `List<StudyTopic>` 查找时，需要逐项比较：

```java
topics.stream()
        .filter(topic -> topic.slug().equals(slug))
        .findFirst();
```

新增主题前还要再扫描一次，确认 slug 不存在。`Map` 直接让 slug 成为数据结构的键，结构本身就表达了“按 slug 定位”的意图。

这不代表 Map 永远优于 List：

| 需求 | 更自然的结构 |
| --- | --- |
| 保留重复元素和明确顺序 | `List` |
| 从两端加入和移除 | `Deque` |
| 按唯一键查找 | `Map` |
| 只关心元素是否存在且不重复 | `Set` |

## 3. `Map.of` 与可修改 Map

`Map.of` 可以方便地创建少量固定条目：

```java
Map.of(
        "spring-boot", new StudyTopic("spring-boot", "Spring Boot", 45),
        "dependency-injection", new StudyTopic("dependency-injection", "Dependency Injection", 35)
)
```

它返回不可修改 Map，直接调用 `put` 会抛出 `UnsupportedOperationException`。本章需要新增主题，因此必须选择可修改实现。

可以把初始 Map 复制到 `ConcurrentHashMap`：

```java
new ConcurrentHashMap<>(Map.of(/* initial entries */));
```

`Map` 是接口，`ConcurrentHashMap` 是其中一个实现。字段通常声明为接口类型，创建对象时选择实现：

```java
private final Map<String, StudyTopic> topics = new ConcurrentHashMap<>();
```

## 4. 为什么不用 `containsKey` 再 `put`

下面的代码在单线程中看似正确：

```java
if (topics.containsKey(slug)) {
    throw new TopicAlreadyExistsException(slug);
}
topics.put(slug, topic);
```

但 Web 服务可能同时处理两个创建请求。两个线程可能都在 `containsKey` 时看到不存在，然后都执行 `put`。这与并发课程中“先读取、再修改、再写回”的竞态结构相同。

需要把“仅当键不存在时写入”表达为一个原子 Map 操作：

```java
StudyTopic existing = topics.putIfAbsent(slug, candidate);
```

返回规则：

| 返回值 | 含义 |
| --- | --- |
| `null` | 原来不存在，candidate 已经放入 |
| 非 `null` | 原来已有该键，Map 保留旧值 |

因此可以写成：

```java
StudyTopic existing = topics.putIfAbsent(slug, candidate);

if (existing != null) {
    throw new TopicAlreadyExistsException(slug);
}

return candidate;
```

这里选择 `ConcurrentHashMap`，是因为它为并发调用提供线程安全的 `get` 和原子 `putIfAbsent`。普通 `HashMap` 不适合在没有额外同步的情况下被多个请求线程同时读写。

## 5. `null` 的边界

`ConcurrentHashMap` 不允许 `null` 键或 `null` 值。当前 slug 已经在 Web 请求边界通过校验，主题对象也由代码明确创建，因此这个限制能帮助暴露非法状态。

`get` 返回 `null` 只表示键不存在，而不是某个键被映射到 `null`。这使 `Optional.ofNullable(topics.get(slug))` 的含义保持清晰。

## 6. 当前内存存储的限制

`ConcurrentHashMap` 只让本章能够观察写入行为，它不是数据库：

- 应用重启后新增主题会消失；
- 多个应用实例之间不会共享数据；
- 没有事务、查询语言或持久化迁移；
- 内存容量受单个进程限制。

后续数据库章节会用真正的数据访问边界替换这份内存实现。Controller 的 HTTP 契约不应因此重新设计，这正是分层的价值。

## 7. 常见误区

- `Map` 的键唯一，不代表值对象中的所有字段都唯一。
- `put` 会直接覆盖旧值，不适合表达“重复应报错”。
- `putIfAbsent` 的 `null` 返回值表示写入成功，不是写入失败。
- `ConcurrentHashMap` 使单次 Map 操作线程安全，不会自动让任意多步骤业务流程都具有事务性。
- 不要为了避免 `null`，在 Map 中存放 `Optional<StudyTopic>`；Optional 更适合作为查询结果边界。

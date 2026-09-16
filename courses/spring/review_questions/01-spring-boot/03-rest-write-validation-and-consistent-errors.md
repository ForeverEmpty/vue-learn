# Spring Boot 01·03 复习：REST 写操作、请求校验与一致错误响应

> 批改状态：已通过。第 1、3 题直接通过；第 2、4 题已完成修正复核；第 5 题存在重复记忆问题，由 Codex 补充讲解且不要求重新作答。

本章复习题只检查生产代码、HTTP 契约和设计边界，不涉及测试框架、测试注解或断言 API。

## 1. `CreateTopicRequest` 与 `StudyTopic` 当前字段相同，为什么仍然使用两个类型？未来哪些变化能体现这种分离的价值？

CreateTopicRequest随输入契约变换，后续可能增加条件约束等
StudyTopic在后续可能需要增加服务器生成的字段，如createdAt，而Http侧不需要，未来创建请求可能只允许提交领域对象的一部分字段

> **批改：正确。** 你已经抓住两个类型会独立演进这一核心：请求 DTO 表达客户端允许提交的输入契约，领域结果可以包含 `createdAt`、数据库 id、创建者等服务端生成字段。分离后还可以避免客户端借由 JSON 修改本应由服务端控制的字段，也不会因为内部领域对象增加字段就被迫改变创建接口。

## 2. record 组件上的 `@NotBlank`、`@Pattern`、`@Positive` 与 Controller 参数上的 `@Valid` 分别负责什么？如果只写前者而不写 `@Valid`，HTTP 请求会怎样？

@NotBlank：参数不为空
@Pattern：根据正则匹配参数
@Positive：参数为正整数
@Valid：使参数经过约束
如果不写，则传入的参数不会经过约束，在后续调用参数时可能就会出现格式上的错误

缺少 @Valid 时，能够正常反序列化的无效对象会继续进入 Controller 和 Service

> **批改：基本正确，需要两点精确化。** `@NotBlank` 不只是“不为 null”，还拒绝空串和纯空白；`@Positive` 表示数值严格大于 0。record 上的注解负责声明约束，Controller 参数上的 `@Valid` 负责让 Spring 在反序列化后执行它们。缺少 `@Valid` 时，能够正常反序列化的无效对象会继续进入 Controller 和 Service，本章甚至可能把非法主题保存下来，而不只是“以后可能出现格式错误”。

### 修正复核

已补充“缺少 `@Valid` 时，无效对象仍会继续进入 Controller 和 Service”这一关键行为，本题通过。仍需保留术语精度：`@NotBlank` 还会拒绝纯空白，`@Positive` 要求严格大于 0。

## 3. 为什么创建主题时选择 `ConcurrentHashMap.putIfAbsent`，而不是先 `containsKey` 再 `put`？它避免了什么并发问题？

使得检查存在和放入map成为一个原子行为，避免并发插入导致多方检查存在时都检查为不存在，随后插入相同内容

> **批改：正确。** `containsKey` 与 `put` 是两个独立动作，两个线程可能都在检查阶段看到“不存在”，随后都写入并发生静默覆盖。`putIfAbsent` 把判断和写入合成一次原子操作，只允许一个线程成功，另一个线程能从返回的旧值发现冲突。

## 4. 创建成功为什么使用 `201 Created` 并返回 `Location`，而不只是返回 `200 OK` 和响应体？

201 Created 更精确地说明请求已经创建新资源

Location 提供新资源的规范查询地址

> **批改：只回答了一半。** `201 Created` 确实比通用的 `200 OK` 更准确地表达“产生了新资源”；`Location` 则给出新资源的规范查询地址，例如 `/api/topics/http-caching`，客户端无需自己猜 URL，可以随后直接 GET。响应体用于立即取得创建结果，`Location` 用于标识资源位置，两者并不重复。

### 修正复核

已补充 `Location` 提供新资源规范查询地址这一独立职责，与 `201 Created` 的创建语义共同构成完整回答，本题通过。

## 5. 损坏 JSON、字段约束失败和重复 slug 分别应返回什么状态与错误 code？为什么这些翻译集中在 `@RestControllerAdvice`，而不是分散在 Controller 中？

Controller 不为每种失败手写 try/catch 和 JSON，且使成功与失败分为两种路径

> **批改：设计部分正确，状态与 code 部分漏答。** 映射分别是：损坏 JSON → `400 / MALFORMED_REQUEST`；字段约束失败 → `400 / VALIDATION_FAILED`；重复 slug → `409 / TOPIC_ALREADY_EXISTS`。集中在 `@RestControllerAdvice` 能让 Controller 保持清晰的成功路径，并让多个接口复用一致的状态码和 `ApiError` 结构。
>
> **出题复盘：本题前半确实不理想。** 这些状态与 code 已在正文、实现和真实 HTTP 实践中多次直接出现，再要求逐项背诵主要是在重复记忆，而没有检验新的迁移能力。因此本题不要求补答，缺失部分由上面的批改说明补齐。后续复习将优先采用场景分析、代码审查、调试、重构或适量实现题。

## 本章批改结论

本章复习已通过。你已经理解 DTO 与领域对象的边界、声明约束与触发校验的区别、`putIfAbsent` 解决的并发竞态，以及 `201 Created` 与 `Location` 的不同职责。请求失败类型到 HTTP 契约的映射由第 5 题批改说明补齐；由于该题存在重复记忆问题，不再要求复述。

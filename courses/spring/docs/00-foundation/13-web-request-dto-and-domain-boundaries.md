# Spring 基础 00·13：Web 请求 DTO 与领域边界

读取接口可以直接返回 `StudyTopic`，但创建接口不应该直接把客户端 JSON 当成已经可信的领域对象。本章引入 `CreateTopicRequest`，让外部输入和内部结果承担不同职责。

## 1. DTO 是什么

DTO（Data Transfer Object）是为边界传输数据而设计的对象。当前请求 DTO：

```java
public record CreateTopicRequest(
        String slug,
        String title,
        int estimatedMinutes
) {
}
```

它描述客户端创建主题时允许提交的字段。`StudyTopic` 则描述应用已经接受并创建的主题。

```text
JSON 请求
  ↓ 反序列化
CreateTopicRequest  外部输入候选值
  ↓ 校验并执行创建用例
StudyTopic          已创建的内部结果
  ↓ 序列化
JSON 响应
```

## 2. 为什么不直接接收 `StudyTopic`

当前两个 record 字段相同，仍然值得分开，因为它们的变化原因不同：

- 请求 DTO 随 HTTP 输入契约变化；
- 领域对象随业务状态变化；
- 请求字段可能需要边界校验和输入说明；
- 未来领域对象可能增加服务器生成字段；
- 未来创建请求可能只允许提交领域对象的一部分字段。

例如以后 `StudyTopic` 增加 `createdAt`，该时间应由服务器生成，不应要求客户端提交。独立 DTO 能避免把内部全部字段意外暴露为可写输入。

## 3. DTO 不是业务状态

通过结构校验只表示请求格式可以继续处理：

```text
slug 格式合法      是 DTO 约束
title 不为空       是 DTO 约束
estimatedMinutes>0 是 DTO 约束
slug 尚未存在      是业务规则
```

“slug 尚未存在”必须查询当前目录状态，不能只看一个请求对象，所以它属于 Service，而不是注解约束。

## 4. Controller 的映射职责

Controller 把边界对象拆成业务调用参数：

```java
StudyTopic topic = topicCatalogService.create(
        request.slug(),
        request.title(),
        request.estimatedMinutes()
);
```

当前 Service 参数较少，直接传值足够。业务字段继续增加时，可以再引入应用层 command，但不需要在只有三个字段时提前增加抽象。

## 5. DTO 是否应该包含行为

请求 DTO 可以拥有与自身数据完整性直接相关的简单方法，但不应：

- 查询数据库或目录；
- 调用外部服务；
- 返回 `ResponseEntity`；
- 根据当前 Profile 执行业务分支；
- 承担创建主题的完整流程。

它的主要价值是明确边界结构和输入约束。

## 6. DTO 与领域模型不是固定的一对一

一个领域对象可以对应多个输入 DTO：

```text
CreateTopicRequest  创建时允许的字段
UpdateTopicRequest  修改时允许的字段
StudyTopicResponse  对外展示的字段
```

也可能多个内部对象组合成一个响应 DTO。DTO 的划分以外部用例和契约为依据，不以数据库表或 Java 类数量机械对应。

## 7. 常见误区

- DTO 不只是“为了少写 JSON 的类”，它隔离外部契约与内部模型。
- 字段暂时相同不等于两个类型职责相同。
- 注解校验通过不等于业务操作必然成功。
- 不要让 Controller 把未校验 DTO 直接保存为全局状态。
- 不需要为每个方法参数都创建 DTO；它应该服务于清晰的边界契约。

## 官方查询

- [Spring Framework HTTP Message Conversion](https://docs.spring.io/spring-framework/reference/web/webmvc/message-converters.html)

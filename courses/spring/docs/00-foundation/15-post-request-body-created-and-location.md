# Spring 基础 00·15：`POST`、`@RequestBody`、`201 Created` 与 `Location`

查询接口只从 URL 读取 slug。创建接口需要接收 JSON、改变服务端状态，并告诉客户端新资源在哪里。

## 1. `@PostMapping`

类级路径已经是：

```java
@RequestMapping("/api/topics")
```

方法使用无子路径的 `@PostMapping`：

```java
@PostMapping
public ResponseEntity<StudyTopic> create(
        @Valid @RequestBody CreateTopicRequest request
) {
}
```

最终映射为：

```http
POST /api/topics
```

`@PostMapping` 是 `@RequestMapping(method = RequestMethod.POST)` 的组合注解。它放在方法上，只接受 POST。

`create` 是普通 Java 方法名，便于表达这个方法的职责；Spring 不会根据它决定 URL。即使换成其他合法名称，只要映射注解不变，HTTP 入口也不变。本课程统一使用 `create`。

## 2. `@RequestBody`

```java
@RequestBody CreateTopicRequest request
```

Spring MVC 根据 `Content-Type: application/json` 选择 HTTP 消息转换器，把请求体 JSON 反序列化成 Java record。

这一步可能失败：

- JSON 语法损坏；
- 字段类型无法转换；
- 请求体缺失。

这些属于“无法形成请求对象”，与“对象已经形成但字段违反约束”不同。

## 3. 为什么创建成功使用 201

`200 OK` 表示请求一般性成功；`201 Created` 更精确地说明请求已经创建新资源。

本章创建成功响应：

```http
HTTP/1.1 201 Created
Location: /api/topics/http-caching
Content-Type: application/json
```

响应体返回创建后的 `StudyTopic`。状态码说明发生了创建，`Location` 告诉客户端新资源的查询地址，响应体提供即时结果。

## 4. 使用 `ResponseEntity.created`

```java
URI location = URI.create("/api/topics/" + topic.slug());

return ResponseEntity.created(location)
        .body(topic);
```

`created(location)` 同时设置：

- 状态码 `201 Created`；
- `Location` 响应头。

`.body(topic)` 再设置响应体。

## 5. `Location` 为什么是资源 URL

集合端点负责创建：

```text
POST /api/topics
```

单资源端点负责读取：

```text
GET /api/topics/{slug}
```

创建 `http-caching` 后，Location 自然指向：

```text
/api/topics/http-caching
```

客户端可以随后对该地址执行 GET。真实公网 API 也可以返回绝对 URI；当前本地课程使用路径已经足够观察契约。

## 6. 请求方法与安全性

GET 应是只读操作，不应因为访问查询 URL 就创建数据。POST 用于提交创建意图，会改变服务端状态。

重复提交同一个 slug：

```text
第一次 POST → 201 Created
第二次 POST → 409 Conflict
```

本章没有把第二次请求当成更新，也没有静默覆盖已有主题。

## 7. 常见误区

- 添加 `@PostMapping` 但忘记类级路径也参与最终 URL。
- 使用 `@RequestParam` 接收整个 JSON 对象；JSON 请求体应使用 `@RequestBody`。
- 创建成功仍返回 200，却没有表达资源已创建。
- Location 指向集合 `/api/topics`，而不是新资源地址。
- Controller 收到 DTO 后直接保存，绕过 Service 的重复规则。

## 官方查询

- [`@PostMapping` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/PostMapping.html)
- [`@RequestBody` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/RequestBody.html)
- [RFC 9110: 201 Created](https://www.rfc-editor.org/rfc/rfc9110.html#name-201-created)

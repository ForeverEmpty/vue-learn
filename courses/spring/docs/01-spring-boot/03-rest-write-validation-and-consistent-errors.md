# Spring Boot 01·03：REST 写操作、请求校验与一致错误响应

> 完成状态：六个检查点、第三章 10 项自动验收、Spring 全量 26 项验收、真实 HTTP 写入闭环和复习题批改均已完成。

前两章已经完成只读查询和配置驱动的计划生成。现在进入第一次真正改变服务端状态的 HTTP 操作：客户端提交一个新主题，应用校验请求、拒绝重复 slug、保存主题，并返回可继续查询的资源地址。

这一章不是只加一个 `@PostMapping`。完整写入链路包含五个连续边界：

```text
HTTP JSON
  ↓ 消息转换
CreateTopicRequest
  ↓ Bean Validation
结构有效的请求
  ↓ TopicCatalogService
唯一性检查与状态写入
  ↓ TopicController
201 Created + Location
  ↓ TopicExceptionHandler
400 / 409 的统一错误契约
```

## 本章目标

- 区分 Web 请求 DTO 与已经创建的领域结果。
- 使用 Bean Validation 声明字符串、格式和正数约束。
- 理解约束注解与 `@Valid` 的职责差异。
- 把只读列表演进为按唯一 slug 查找和写入的 Map。
- 使用线程安全的原子操作拒绝并发重复写入。
- 使用 `@PostMapping` 与 `@RequestBody` 接收 JSON。
- 返回 `201 Created`、`Location` 响应头和创建后的 JSON。
- 区分 JSON 损坏、字段无效和资源冲突。
- 把 400、404、409 都收束到同一个稳定错误结构。
- 继续保持 Controller、Service 与 Web 异常边界的职责分离。

自动验收仍然只用于反馈程序行为。本章复习题不考测试框架、测试注解或断言 API。

## 开始前的基础查询

本章使用两个新的 Java 基础知识：

1. [Java 00·14：`Map`、`ConcurrentHashMap` 与 `putIfAbsent`](../../../java/docs/00-foundation/14-map-concurrent-hash-map-and-put-if-absent.md)
2. [Java 00·15：正则表达式](../../../java/docs/00-foundation/15-regular-expressions.md)

Spring 与设计知识拆分为四篇：

1. [Spring 00·13：Web 请求 DTO 与领域边界](../00-foundation/13-web-request-dto-and-domain-boundaries.md)
2. [Spring 00·14：Bean Validation 约束与 `@Valid`](../00-foundation/14-bean-validation-constraints-and-valid.md)
3. [Spring 00·15：`POST`、`@RequestBody`、`201 Created` 与 `Location`](../00-foundation/15-post-request-body-created-and-location.md)
4. [Spring 00·16：校验错误与稳定错误契约](../00-foundation/16-validation-errors-and-stable-error-contracts.md)

忘记第一章异常翻译思想时，可回看 [Spring 00·07](../00-foundation/07-exception-translation-and-error-boundaries.md)。

## 1. API 契约先于代码

创建请求：

```http
POST /api/topics
Content-Type: application/json
```

```json
{
  "slug": "http-caching",
  "title": "HTTP Caching",
  "estimatedMinutes": 50
}
```

成功响应：

```http
HTTP/1.1 201 Created
Location: /api/topics/http-caching
Content-Type: application/json
```

```json
{
  "slug": "http-caching",
  "title": "HTTP Caching",
  "estimatedMinutes": 50
}
```

随后已有查询接口应该能找到新资源：

```http
GET /api/topics/http-caching
```

这条“POST 创建 → Location 指向 → GET 可读取”的链路，比只返回一个 Java 对象更完整地证明写入已经成立。

## 2. 三种失败不能混为一谈

### 2.1 请求体无法读取

```text
{not-json}
```

JSON 语法本身损坏，Spring 无法创建 `CreateTopicRequest`：

```http
400 Bad Request
```

```json
{
  "code": "MALFORMED_REQUEST",
  "message": "Request body is not valid JSON",
  "violations": []
}
```

### 2.2 字段违反结构约束

```json
{
  "slug": "Not Valid",
  "title": " ",
  "estimatedMinutes": 0
}
```

JSON 可以转成对象，但三个字段不符合契约：

```http
400 Bad Request
```

```json
{
  "code": "VALIDATION_FAILED",
  "message": "Request validation failed",
  "violations": [
    {
      "field": "estimatedMinutes",
      "message": "estimatedMinutes must be greater than zero"
    },
    {
      "field": "slug",
      "message": "slug must use lowercase letters, numbers, and single hyphens"
    },
    {
      "field": "title",
      "message": "title is required"
    }
  ]
}
```

### 2.3 与已有状态冲突

请求格式完全有效，但 `spring-boot` 已存在：

```http
409 Conflict
```

```json
{
  "code": "TOPIC_ALREADY_EXISTS",
  "message": "Study topic already exists: spring-boot",
  "violations": []
}
```

400 表示输入无法按契约使用，409 表示输入本身有效但与当前服务器状态冲突。

## 3. DTO 与领域结果为什么分开

本章新增：

```java
public record CreateTopicRequest(
        String slug,
        String title,
        int estimatedMinutes
) {
}
```

它与 `StudyTopic` 暂时字段相同，但职责不同：

| 类型 | 表达 |
| --- | --- |
| `CreateTopicRequest` | 客户端希望创建什么，数据仍需验证 |
| `StudyTopic` | 应用已经接受并创建的主题 |

未来如果 `StudyTopic` 增加服务器生成的创建时间或内部状态，不应要求客户端提交这些字段。独立 DTO 让外部输入契约不会机械等于内部模型。

## 4. 校验分为对象内规则与状态规则

只看请求对象即可判断：

```text
slug 非空且格式正确
title 非空且最长 80
estimatedMinutes > 0
```

这些规则使用 Bean Validation。

必须查询当前目录才能判断：

```text
slug 是否已存在
```

这是 Service 的业务状态规则。不要试图用一个普通字段注解完成它。

## 5. 从 List 演进为 Map

旧实现使用 `List<StudyTopic>`，适合少量固定查询。现在 slug 同时承担唯一键和资源地址的一部分，Map 能直接表达：

```text
slug → StudyTopic
```

使用 `ConcurrentHashMap` 不是因为 Map 自动等于数据库，而是因为 Web 服务器可能并发处理请求。下面的两步检查存在竞态：

```text
containsKey(slug)
put(slug, topic)
```

两个线程可能都在检查时看到“不存在”。`putIfAbsent` 把“仅当不存在时写入”变成一次原子操作。

当前内存实现仍有明确限制：应用重启后新增数据消失，多实例之间也不共享。后续数据库章节会替换存储边界。

## 6. 成功路径与失败路径分开

Controller 的成功路径应保持短而清晰：

```text
请求 DTO
→ 调用 Service
→ 构造资源 URI
→ 返回 201
```

重复 slug、字段错误和损坏 JSON 则进入 `TopicExceptionHandler`。这延续了第一章的异常翻译设计：Controller 不为每种失败手写 `try/catch` 和 JSON。

## 7. 起始文件

本章已经提供可编译骨架：

```text
src/main/java/study/spring/topic/
├─ CreateTopicRequest.java          请求 DTO，约束待添加
├─ TopicAlreadyExistsException.java 重复 slug 的业务异常
├─ ApiFieldViolation.java           字段错误条目
├─ ApiError.java                    扩展后的统一错误结构
├─ TopicCatalogService.java         create 尚未真正保存
├─ TopicController.java             POST 映射尚未建立
└─ TopicExceptionHandler.java       新异常尚未翻译
```

`pom.xml` 已经加入 validation starter。你不需要安装系统 Maven，也不需要编写测试。

执行：

```bash
npm run spring:compile
npm run spring:test:chapter-03
```

起始预期：编译成功，10 项中 1 项通过。其余失败是课程入口，不是要求你阅读测试实现。

## 检查点一：声明请求约束（已完成）

先阅读 [Java 00·15：正则表达式](../../../java/docs/00-foundation/15-regular-expressions.md)、[Spring 00·13](../00-foundation/13-web-request-dto-and-domain-boundaries.md) 和 [Spring 00·14](../00-foundation/14-bean-validation-constraints-and-valid.md)。

在 `CreateTopicRequest` 的 record 组件上添加：

1. `slug`：`@NotBlank`。
2. `slug`：`@Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*", ...)`。
3. `title`：`@NotBlank`。
4. `title`：`@Size(max = 80, ...)`。
5. `estimatedMinutes`：`@Positive`。

建议使用下列 message，便于真实接口直接观察：

```text
slug is required
slug must use lowercase letters, numbers, and single hyphens
title is required
title must not exceed 80 characters
estimatedMinutes must be greater than zero
```

注解包来自：

```java
jakarta.validation.constraints
```

不要在 record 构造器里手写一套重复 `if`；本检查点的目标是理解外部请求约束如何被标准校验器描述。

运行：

```bash
npm run spring:test:chapter-03
```

预期 **4 / 10**。目前只证明 DTO 约束本身成立，还没有 HTTP POST。

## 检查点二：保存主题并原子拒绝重复 slug（已完成）

先阅读 [Java 00·14](../../../java/docs/00-foundation/14-map-concurrent-hash-map-and-put-if-absent.md)。

在 `TopicCatalogService` 中完成：

1. 把 `List<StudyTopic>` 改为 `Map<String, StudyTopic>`。
2. 使用 `ConcurrentHashMap` 创建可修改且可并发访问的实现。
3. 保留原有 `spring-boot` 与 `dependency-injection` 两个主题，以 slug 为键。
4. `findBySlug` 使用 `topics.get(slug)`，再以 `Optional.ofNullable` 返回。
5. `create` 先创建候选 `StudyTopic`。
6. 使用 `putIfAbsent` 写入；返回旧值时抛出已有的 `TopicAlreadyExistsException`。
7. 写入成功时返回候选对象。

不要使用普通 `put` 静默覆盖旧主题，也不要写成 `containsKey` 后再 `put` 的非原子两步操作。

运行后预期 **6 / 10**。此时纯 Java 写入规则成立，但外部还无法发起 POST。

## 检查点三：建立 POST 创建接口（已完成）

阅读 [Spring 00·15](../00-foundation/15-post-request-body-created-and-location.md)，然后在现有 `TopicController` 中新增方法：

1. 方法名使用 `create`，返回类型是 `ResponseEntity<StudyTopic>`。
2. 使用 `@PostMapping`，复用类级 `/api/topics` 路径。
3. 参数使用 `@Valid @RequestBody CreateTopicRequest request`。
4. 调用 `topicCatalogService.create`，不要直接操作 Map。
5. 根据创建后的 slug 构造 `/api/topics/{slug}` URI。
6. 使用 `ResponseEntity.created(location).body(topic)` 返回。

完整方法签名如下：

```java
@PostMapping
public ResponseEntity<StudyTopic> create(
        @Valid @RequestBody CreateTopicRequest request
) {
    // 在这里调用 Service、构造 Location 并返回 201。
}
```

需要新增的导入：

```java
import java.net.URI;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
```

这里的方法名 `create` 只是清晰的 Java 命名约定；真正决定 HTTP 路径和方法的是类上的 `@RequestMapping("/api/topics")` 与方法上的 `@PostMapping`。

这一方法同时涉及两条注解链：

```text
@RequestBody  负责 JSON → record
@Valid        负责对 record 执行约束
```

完成后预期 **7 / 10**。创建成功和随后 GET 应该成立；三类错误仍未全部进入统一契约。

## 检查点四：把重复 slug 翻译为 409（已完成）

`TopicCatalogService` 已经用 `TopicAlreadyExistsException` 表达业务冲突。现在在 `TopicExceptionHandler` 中新增一个针对该异常的处理方法：

1. 方法名使用 `handleTopicAlreadyExists`，返回类型是 `ResponseEntity<ApiError>`。
2. 参数是 `TopicAlreadyExistsException exception`。
3. 使用 `@ExceptionHandler(TopicAlreadyExistsException.class)`。
4. 创建 code 为 `TOPIC_ALREADY_EXISTS` 的 `ApiError`。
5. message 继续使用异常已有信息。
6. 返回 `HttpStatus.CONFLICT`，即 409。
7. 不提供字段错误，因此使用两参数 `ApiError` 构造器，让 violations 保持空列表。

完整方法签名如下：

```java
@ExceptionHandler(TopicAlreadyExistsException.class)
public ResponseEntity<ApiError> handleTopicAlreadyExists(
        TopicAlreadyExistsException exception
) {
    // 构造 ApiError，并以 409 Conflict 返回。
}
```

不要在 Controller 中捕获重复异常，也不要把它翻译成 400。完成后预期 **8 / 10**。

## 检查点五：统一字段错误与损坏 JSON（已完成）

阅读 [Spring 00·16](../00-foundation/16-validation-errors-and-stable-error-contracts.md)。在 `TopicExceptionHandler` 中再处理两种异常。

### 5.1 字段校验失败

处理 `MethodArgumentNotValidException`：

1. 方法继续使用重载名 `handle`，返回类型是 `ResponseEntity<ApiError>`。
2. 从 `exception.getBindingResult().getFieldErrors()` 取得字段错误。
3. 把每项转换为 `ApiFieldViolation(field, defaultMessage)`。
4. 按 `field` 排序，让响应顺序稳定。
5. 构造 code 为 `VALIDATION_FAILED`、message 为 `Request validation failed` 的 `ApiError`。
6. 返回 400。

方法签名：

```java
@ExceptionHandler(MethodArgumentNotValidException.class)
public ResponseEntity<ApiError> handle(
        MethodArgumentNotValidException exception
) {
    // 提取、转换并排序 violations，然后返回 400。
}
```

### 5.2 JSON 无法读取

处理 `HttpMessageNotReadableException`：

1. 方法同样使用重载名 `handle`，返回类型是 `ResponseEntity<ApiError>`。
2. code 使用 `MALFORMED_REQUEST`。
3. message 使用 `Request body is not valid JSON`。
4. violations 保持空列表。
5. 返回 400。

方法签名：

```java
@ExceptionHandler(HttpMessageNotReadableException.class)
public ResponseEntity<ApiError> handle(
        HttpMessageNotReadableException exception
) {
    // 构造不带字段 violations 的 ApiError，然后返回 400。
}
```

需要新增的导入：

```java
import java.util.Comparator;
import java.util.List;

import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
```

不要添加捕获全部 `Exception` 的 400 处理器。未知程序缺陷仍应保持 500 语义。

完成后运行：

```bash
npm run spring:test:chapter-03
npm run spring:test
```

预期本章 **10 / 10**，Spring 全量 **26 / 26**。

## 检查点六：真实 HTTP 写入闭环（已完成）

启动应用：

```bash
npm run spring:run
```

另开 PowerShell，先准备请求并创建主题：

```powershell
$body = @{
    slug = "http-caching"
    title = "HTTP Caching"
    estimatedMinutes = 50
} | ConvertTo-Json

$request = @{
    Method = "Post"
    Uri = "http://localhost:8080/api/topics"
    ContentType = "application/json"
    Body = $body
}

$created = Invoke-WebRequest @request
$created.StatusCode
$created.Headers.Location
$created.Content | ConvertFrom-Json
```

应依次看到 `201`、`/api/topics/http-caching` 和创建后的主题数据。

再查询新资源：

```powershell
Invoke-RestMethod http://localhost:8080/api/topics/http-caching
```

重新发送同一个请求，观察 409 和稳定错误体：

```powershell
try {
    Invoke-RestMethod @request
} catch {
    $_.Exception.Response.StatusCode
    $_.ErrorDetails.Message
}
```

再发送字段无效请求：

```powershell
$invalidBody = @{
    slug = "Not Valid"
    title = " "
    estimatedMinutes = 0
} | ConvertTo-Json

try {
    $invalidRequest = $request.Clone()
    $invalidRequest.Body = $invalidBody
    Invoke-RestMethod @invalidRequest
} catch {
    $_.Exception.Response.StatusCode
    $_.ErrorDetails.Message
}
```

应观察 `400`、`VALIDATION_FAILED` 和三个字段错误。完成后回到运行应用的终端按 `Ctrl+C` 停止应用。

## 本章完成标准

- 请求 DTO 与领域结果职责明确。
- slug、标题和分钟数具有声明式结构约束。
- 唯一 slug 由 Service 根据当前状态保证。
- 并发重复写入不会静默覆盖已有值。
- `POST /api/topics` 返回 201、Location 和创建结果。
- 创建后可通过已有 GET 查询资源。
- 损坏 JSON 与字段无效返回不同稳定 code。
- 重复 slug 返回 409，而不是 400 或 500。
- 所有错误继续使用 `ApiError` 顶层结构。
- 本章 10 项与全量 26 项自动验收通过。
- 真实 HTTP 已观察创建、查询、重复和字段错误四条路径。
- 完成 [本章复习题](../../review_questions/01-spring-boot/03-rest-write-validation-and-consistent-errors.md)。

## 官方资料

- [Spring MVC Annotated Controllers](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-methods.html)
- [Spring MVC Validation](https://docs.spring.io/spring-framework/reference/web/webmvc/mvc-controller/ann-validation.html)
- [Jakarta Bean Validation](https://jakarta.ee/specifications/bean-validation/)
- [RFC 9110 HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

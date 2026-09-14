# Spring Boot 01·01：应用启动、IoC/依赖注入与第一个 HTTP API

这一章不会把所有代码塞进启动类。我们会实现一个“学习主题查询 API”，并沿着一条完整请求链逐层推进：

```text
HTTP GET /api/topics/spring-boot
        ↓
Spring MVC 根据路径找到 TopicController
        ↓
Controller 调用由容器注入的 TopicCatalogService
        ↓
Service 查询纯 Java 数据并返回 Optional<StudyTopic>
        ↓
Controller 返回 StudyTopic，或抛出 TopicNotFoundException
        ↓
Spring MVC 序列化 JSON，或由统一异常处理器生成 404 JSON
```

> 完成状态：已完成。检查点一至六、7 项测试、真实 HTTP 调用、可执行 jar 启动和复习题均已通过。

## 本章目标

- 分清 Spring Framework、Spring Boot 与 Spring MVC 的职责。
- 看懂 Maven `pom.xml`、starter、传递依赖与依赖管理。
- 理解 `SpringApplication.run`、`ApplicationContext`、Bean、组件扫描和自动配置之间的关系。
- 用 IoC 与构造器注入组织 Controller 和 Service，而不是在 Controller 中自行创建依赖。
- 理解 HTTP 方法、路径、状态码、响应头与 JSON 响应体。
- 用 `Optional` 在业务层表达缺失，并在 Web 边界转换为统一的 404 响应。
- 区分纯 Java 单元测试、Spring 容器测试和 MockMvc Web 测试。
- 最终启动真实服务器、发出 HTTP 请求，并打包可执行 jar。

## 必要的 Java 基础补充

首章会直接使用三项 Java 语言能力。它们不属于 Spring，因此各自放在 Java 的 `00-foundation`，且不设置复习题：

1. [Java 00·09：注解与元注解](../../../java/docs/00-foundation/09-annotations-and-meta-annotations.md)
2. [Java 00·10：record 数据载体](../../../java/docs/00-foundation/10-record-data-carriers.md)
3. [Java 00·11：Optional](../../../java/docs/00-foundation/11-optional.md)
4. [Java 00·12：Stream、filter 与 findFirst](../../../java/docs/00-foundation/12-stream-filter-and-find-first.md)——由检查点二的实际实现触发。

## Spring 00 基础查询入口

本章已经出现的 Spring 注解与核心类型分别记录在 Spring 自己的 00 基础模块，后续忘记含义时可直接从使用位置跳转：

1. [Spring 00·01：`@SpringBootApplication` 与启动入口](../00-foundation/01-spring-boot-application-and-startup.md)
2. [Spring 00·02：组件角色注解与 Bean](../00-foundation/02-stereotype-annotations-and-beans.md)
3. [Spring 00·03：MVC 请求映射注解](../00-foundation/03-mvc-request-mapping-annotations.md)
4. [Spring 00·04：`@RestControllerAdvice` 与 `@ExceptionHandler`](../00-foundation/04-rest-controller-advice-and-exception-handler.md)
5. [Spring 00·05：`ResponseEntity` 与 `HttpStatus`](../00-foundation/05-response-entity-and-http-status.md)
6. [Spring 00·06：依赖倒置、IoC 与依赖注入](../00-foundation/06-dependency-inversion-ioc-and-dependency-injection.md)
7. [Spring 00·07：异常翻译与统一错误边界](../00-foundation/07-exception-translation-and-error-boundaries.md)

不需要先背下全部 API。第一次遇到对应代码时能回答“这是 Java 语法还是 Spring 语义”即可。

## 1. Spring、Spring Boot 与 Spring MVC

这三个名字处在不同层次：

| 名称 | 本章中的职责 |
| --- | --- |
| Spring Framework | 提供 IoC 容器、依赖注入、组件模型等基础能力 |
| Spring MVC | 在 Servlet 技术栈上完成 HTTP 请求映射、参数绑定和响应处理 |
| Spring Boot | 提供依赖版本管理、自动配置、应用启动方式和嵌入式服务器等工程化能力 |

Spring Boot 不是另一个替代 Spring 的框架。当前应用仍使用 Spring 容器与 Spring MVC；Boot 让它们能够根据依赖和配置以较少手工装配启动。

## 2. Maven、starter 与 classpath

`pom.xml` 是 Maven 构建描述。当前工程的核心片段是：

```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>4.1.1</version>
</parent>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-webmvc</artifactId>
</dependency>
```

要区分三个概念：

- `spring-boot-starter-parent` 提供构建默认值和受支持的依赖版本管理，并不等于自动引入所有功能。
- `spring-boot-starter-webmvc` 是面向 Servlet Web 应用的一组常用依赖入口，它会传递引入 Spring MVC、JSON 支持和嵌入式 Tomcat 等依赖。
- 自动配置读取当前 classpath、已有 Bean 和配置属性，再有条件地创建合适的框架对象。

因此 starter 与自动配置经常协作，但不是同一件事：一个主要解决“依赖集合”，另一个主要解决“根据条件装配对象”。

可以运行：

```bash
cd courses/spring
mvnw.cmd dependency:tree
```

观察直接依赖下面出现的传递依赖。不要手动给每个 Spring 子依赖重复指定版本，版本由 Spring Boot 的依赖管理统一约束。

## 3. 启动类到底启动了什么

```java
@SpringBootApplication
public class SpringCourseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpringCourseApplication.class, args);
    }
}
```

`@SpringBootApplication` 是组合注解，核心包含：

- Spring Boot 配置类标识；
- 启用自动配置；
- 从启动类所在包向下进行组件扫描。

`SpringApplication.run(...)` 的关键结果不是“调用了 Controller”，而是创建并刷新 `ApplicationContext`。可以把 `ApplicationContext` 暂时理解为保存并组织应用对象的容器：

```text
读取配置与 classpath
    ↓
扫描 study.spring 及其子包中的组件
    ↓
创建 Bean 并解析它们的依赖
    ↓
应用自动配置，建立 MVC 与嵌入式 Tomcat
    ↓
服务器开始接收请求
```

启动类放在 `study.spring` 根包不是偶然的。如果把业务类移到扫描范围之外，又没有显式导入，它不会自动成为 Bean。

## 4. IoC、Bean 与依赖注入

本节只保留完成当前代码所需的主线。三者的严格区别、代码依赖方向、组合根、适用边界和可运行示例，见 [Spring 基础 00·06：依赖倒置、IoC 与依赖注入](../00-foundation/06-dependency-inversion-ioc-and-dependency-injection.md)。

普通 Java 写法可以由 Controller 自己创建服务：

```java
private final TopicCatalogService service = new TopicCatalogService();
```

这会让 Controller 同时承担“使用服务”和“决定怎样创建服务”两项职责。换成构造器注入：

```java
public TopicController(TopicCatalogService service) {
    this.service = service;
}
```

对象仍需要被创建，只是创建和连接依赖的控制权转移给容器，这就是控制反转（IoC）在本章中的具体体现。容器把已经创建好的 `TopicCatalogService` 传入构造器，这个动作就是依赖注入（DI）。

Spring 管理的对象通常称为 Bean。`@Service` 与 `@RestController` 都能让组件扫描发现类并注册 Bean，同时表达不同角色。

本章使用构造器注入，因为它让依赖：

- 在对象创建时就必须满足；
- 可以声明为 `final`；
- 在纯 Java 测试中可直接手工传入；
- 不需要字段反射注入。

当一个类只有一个构造器时，不需要额外写 `@Autowired`。

## 5. 从 Java 方法到 HTTP API

一个 Java 方法返回 `StudyTopic`，并不自动成为 HTTP 接口。Spring MVC 需要请求映射元数据：

```text
@RestController
@RequestMapping("/api/topics")
        ↓
@GetMapping("/{slug}")
        ↓
@PathVariable String slug
```

这组元数据表达：

- 只处理 `GET` 方法；
- 路径模式为 `/api/topics/{slug}`；
- 把路径中的动态片段绑定到 Java 参数 `slug`；
- 把方法返回值写入响应体。

HTTP 响应不只有正文。一个成功结果至少包含：

```http
HTTP/1.1 200 OK
Content-Type: application/json

{"slug":"spring-boot","title":"Spring Boot","estimatedMinutes":45}
```

`200` 是状态码，`Content-Type` 是响应头，最后一行才是响应体。`StudyTopic` record 本身不是 JSON；Spring MVC 选择消息转换器，把 Java 对象序列化为 JSON。

如果使用 `POST` 访问一个只允许 `GET` 的已知路径，合理结果是 `405 Method Not Allowed`。这和完全不存在的资源路径所表达的 `404 Not Found` 不同。

## 6. 把“查不到”放在正确边界

本节对应一种边界设计思想。详细的异常分类、翻译位置、错误契约和常见反例见 [Spring 基础 00·07：异常翻译与统一错误边界](../00-foundation/07-exception-translation-and-error-boundaries.md)。

`TopicCatalogService` 是业务查询对象，它返回：

```java
Optional<StudyTopic>
```

空 Optional 只表示“目录中没有这个主题”，不携带 HTTP 概念。Controller 位于 Web 边界，可以把缺失转换为 `TopicNotFoundException`。统一异常处理器再把异常转换成：

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "code": "TOPIC_NOT_FOUND",
  "message": "Unknown study topic: missing"
}
```

这样 Service 仍可被命令行程序、定时任务或其他服务复用，而不必依赖 HTTP 响应类型。

`@RestControllerAdvice` 表示跨 Controller 的 Web 异常处理组件，`@ExceptionHandler(TopicNotFoundException.class)` 则声明某类异常的映射方法。先让异常保留业务含义，再集中决定协议层响应，比在每个 Controller 中复制错误 JSON 更稳定。

## 7. 本章的三层测试

```text
TopicCatalogServiceTest
  纯 Java，直接 new，验证查询规则

SpringCourseApplicationTests
  启动 ApplicationContext，验证组件能否被扫描和装配

TopicControllerWebTest
  通过 MockMvc 进入 DispatcherServlet，验证路由、状态、响应头和 JSON
```

MockMvc 不启动真实网络端口，但会经过 Spring MVC 的核心请求处理链。它比直接调用 Controller 方法更能发现路径、HTTP 方法、参数绑定和序列化错误；它仍不等同于连接真实服务器的端到端测试，因此最后还有一次实际运行检查。

## 源码起点

```text
courses/spring/src/main/java/study/spring/
├─ SpringCourseApplication.java
└─ topic/
   ├─ ApiError.java
   ├─ StudyTopic.java
   ├─ TopicCatalogService.java
   ├─ TopicController.java
   ├─ TopicExceptionHandler.java
   └─ TopicNotFoundException.java

courses/spring/src/test/java/study/spring/
├─ SpringCourseApplicationTests.java
└─ topic/
   ├─ TopicCatalogServiceTest.java
   └─ TopicControllerWebTest.java
```

起点保留了 `TODO(01·01)`，但所有类型都能编译。未实现行为通过测试失败体现，不通过故意制造语法错误体现。

## 检查点一：建立并观察可运行起点

先阅读前面的课程模型和三个 Java 基础小章，然后在仓库根目录运行：

```bash
npm run spring:compile
npm run spring:test:chapter-01
```

第一次运行 Wrapper 会下载 Maven 和依赖。预期：

- 编译成功；
- `SpringCourseApplicationTests.contextLoads` 通过；
- 其余 6 项测试失败或报错；
- 失败原因分别指向尚未实现的 Service、尚未注册的 Bean、尚未建立的 HTTP 映射。

这一步不要修改源码。请先观察 Maven 的 `Tests run` 汇总，并在失败输出中找到第一个属于课程源码的类名，而不是只看最后的 `BUILD FAILURE`。

## 检查点二：先完成纯 Java 查询行为

只修改 `TopicCatalogService.findBySlug`，不要添加 Spring 注解，也不要修改 Controller。

要求：

1. 遍历已有的 `topics`。
2. 找到 `topic.slug()` 与参数相同的主题时返回 `Optional.of(topic)`。
3. 遍历结束仍未找到时返回 `Optional.empty()`。
4. 不返回 `null`，也不在 Service 中创建 HTTP 响应。

完成后，两个 `TopicCatalogServiceTest` 应通过，总体达到 3 项通过。这里先证明业务行为不依赖 Spring 容器。

## 检查点三：把 Service 与 Controller 交给容器

完成组件注册与构造器注入：

1. 用角色恰当的 Spring 注解注册 `TopicCatalogService`。
2. 用角色恰当的 Spring 注解注册 `TopicController`。
3. 保留 Controller 的单构造器和 `final` 字段。
4. 不在 Controller 中 `new TopicCatalogService()`，也不使用字段注入。

完成后，`serviceAndControllerAreManagedBeans` 应通过，总体达到 4 项通过。

这里要能说明：构造器本身是 Java 代码；容器发现两个 Bean、选择构造器并传入依赖，才是 Spring 的装配行为。

## 检查点四：建立成功请求与方法边界

在 `TopicController` 上完成 MVC 映射，并实现已存在主题的查询：

1. Controller 统一使用 `/api/topics` 前缀。
2. 查询方法只接受 `GET /{slug}`。
3. 从路径变量取得 `slug`。
4. 调用 Service；找到时返回 `StudyTopic`。
5. 找不到时抛出已有的 `TopicNotFoundException`，先不要在方法中拼装错误 JSON。

完成后：

- 成功查询应得到 `200`、JSON 内容类型和完整主题字段；
- 对同一路径发送 `POST` 应得到 `405`；
- 未知主题的统一错误 JSON 仍失败。

总体应达到 6 项通过。此时观察测试输出，区分“路径没有映射”和“路径存在但 HTTP 方法不允许”。

## 检查点五：统一映射 404 错误

实现前依次阅读 [Spring 基础 00·04：`@RestControllerAdvice` 与 `@ExceptionHandler`](../00-foundation/04-rest-controller-advice-and-exception-handler.md)、[00·05：`ResponseEntity` 与 `HttpStatus`](../00-foundation/05-response-entity-and-http-status.md) 和 [00·07：异常翻译与统一错误边界](../00-foundation/07-exception-translation-and-error-boundaries.md)。前两篇解释代码元素，最后一篇解释这样划分职责的原因。

实现 `TopicExceptionHandler`：

1. 把它注册为面向 REST Controller 的全局建议组件。
2. 让 `handle` 只处理 `TopicNotFoundException`。
3. 返回 `404 Not Found`。
4. 响应体使用已有 `ApiError` record。
5. `code` 固定为 `TOPIC_NOT_FOUND`，`message` 保留异常中的具体 slug。

不要把未知主题返回成 `200` 加一段错误文字，也不要捕获所有 `Exception` 后全部改成 404。不同失败必须保留不同语义。

完成后运行：

```bash
npm run spring:test:chapter-01
npm run spring:test
```

预期 7 项全部通过。

## 检查点六：通过真实服务器完成闭环

启动应用：

```bash
npm run spring:run
```

在另一个终端依次执行：

```powershell
Invoke-RestMethod http://localhost:8080/api/topics/spring-boot

try {
    Invoke-RestMethod http://localhost:8080/api/topics/missing
} catch {
    $_.Exception.Response.StatusCode
}
```

再观察应用启动日志，找出：

- Spring Boot 版本；
- 嵌入式 Tomcat 端口；
- 应用完成启动的日志行。

最后停止应用并打包：

```bash
cd courses/spring
mvnw.cmd package
java -jar target/spring-course-0.0.1-SNAPSHOT.jar
```

可执行 jar 不只是当前类文件，它还用 Spring Boot 的方式组织运行所需依赖，使 `java -jar` 能启动完整应用。

## 本章完成标准

- 能说明 Spring、Spring MVC 与 Spring Boot 的层次关系。
- 能解释 starter、传递依赖、依赖管理和自动配置的差异。
- 能追踪 `SpringApplication.run` 到容器、Bean 装配和服务器启动的主线。
- Service 可脱离 Spring 通过纯 Java 测试。
- Controller 使用构造器注入，不自行创建 Service。
- 成功查询返回 200 JSON，错误方法返回 405，未知主题返回统一 404 JSON。
- 7 项测试全部通过，并完成真实 HTTP 调用和可执行 jar 验证。
- 完成 [本章复习题](../../review_questions/01-spring-boot/01-bootstrap-ioc-di-and-http-api.md)。

## 官方资料

- [Spring Boot 4.1.1 系统要求](https://docs.spring.io/spring-boot/system-requirements.html)
- [Spring Boot 第一个应用教程](https://docs.spring.io/spring-boot/tutorial/first-application/index.html)
- [Spring Boot 应用测试](https://docs.spring.io/spring-boot/reference/testing/spring-boot-applications.html)
- [Apache Maven Wrapper](https://maven.apache.org/tools/wrapper/)

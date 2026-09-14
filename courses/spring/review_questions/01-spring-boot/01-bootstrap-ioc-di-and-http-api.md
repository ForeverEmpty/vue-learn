# Spring Boot 01·01 复习：应用启动、IoC/依赖注入与第一个 HTTP API

> 批改状态：已完成。第 1、4、5 题有补充；第 6 题不计入本章掌握要求，由 Codex 直接解答。

## 1. Spring Framework 与 Spring Boot 分别解决什么问题？为什么“starter”和“自动配置”不是同一个概念？

Spring Framework:提供 IoC 容器、依赖注入、组件模型等基础能力
Spring Boot:提供依赖版本管理、自动配置、应用启动方式和嵌入式服务器等工程化能力

starter 主要解决“项目需要引入哪些相关依赖”
自动配置解决“这些依赖出现在 classpath 后，Spring Boot 怎样根据条件创建和配置 Bean”

> **批改：前两部分正确，但漏答了 starter 与自动配置的区别。** starter 主要解决“项目需要引入哪些相关依赖”，例如 Web starter 会集中带入 MVC、JSON 和服务器等依赖；自动配置解决“这些依赖出现在 classpath 后，Spring Boot 怎样根据条件创建和配置 Bean”。前者偏构建时的依赖集合，后者偏应用启动时的配置行为。

## 2. `SpringApplication.run` 启动后，`ApplicationContext`、Bean 和组件扫描之间是什么关系？

启动后，会创建应用上下文ApplicationContext，随后加载配置，扫描组件并创建Bean

> **批改：正确，关系可以再展开一步。** `ApplicationContext` 是管理 Bean 的容器；组件扫描寻找带组件注解的候选类并登记 Bean 定义；容器再根据这些定义创建对象、注入依赖并管理生命周期。Bean 是被容器管理的对象，不是组件扫描本身。

## 3. 什么是控制反转（IoC）与依赖注入（DI）？为什么 `TopicController` 使用构造器接收 `TopicCatalogService`，而不是在方法内部直接 `new`？

控制反转是将业务依赖的创建交给其他部分，并创建后注入给需要改依赖的业务
依赖注入是将需要依赖的一方，在创建时，将依赖传给该类
在方法内部直接new会增加代码的耦合度，在后续业务代码需要切换依赖或有多个依赖时，需要对该方法甚至该类进行修改

> **批改：方向正确。** 更准确地说，IoC 是把对象创建、装配和生命周期的控制权从业务代码交给容器；DI 是容器实现 IoC 的一种方式，即在创建对象时把它所需的依赖传入。构造器注入还会让依赖关系显式、对象创建后依赖保持稳定，并便于在不启动 Spring 时传入替代实现。

## 4. 一次 `GET /api/topics/spring-boot` 请求，从 Tomcat 收到请求到客户端得到 JSON，依次经过了哪些主要组件？

```text
GET /api/topics/spring-boot
-> controller
-> service
```

Tomcat 接收请求
→ DispatcherServlet 接管
→ 根据映射找到 Controller 方法
→ 把路径中的 spring-boot 绑定为 slug
→ Controller 调用 Service
→ Service 返回主题
→ Controller 返回 StudyTopic
→ HTTP 消息转换器把对象序列化成 JSON
→ Tomcat 把响应交给客户端

> **批改：起点正确，但请求链不完整。** 主要过程是：Tomcat 接收请求 → `DispatcherServlet` 接管 → 根据映射找到 Controller 方法 → 把路径中的 `spring-boot` 绑定为 `slug` → Controller 调用 Service → Service 返回主题 → Controller 返回 `StudyTopic` → HTTP 消息转换器把对象序列化成 JSON → Tomcat 把响应交给客户端。Controller 和 Service 只覆盖了中间的业务调用部分。

## 5. `Optional.empty()`、`TopicNotFoundException` 和 HTTP 404 分别属于哪一层的语义？为什么 Service 不直接返回 HTTP 响应？

Optional.empty():查询层
TopicNotFoundException:应用调用层
HTTP 404:HTTP边界
因为Service是承载业务逻辑或服务，负责HTTP响应应该是Controller

HTTP 响应由整个 Web 边界负责，包括 Controller 和 @RestControllerAdvice，不应交给 Service

> **批改：核心方向正确，最后一句需要扩展为整个 Web 边界。** `Optional.empty()` 是 Service 查询“没有结果”的表达；`TopicNotFoundException` 是应用对“主题不存在”这一失败的命名；404 是 HTTP 协议对该失败的外部表达。当前代码由 Controller 把空结果转换为异常，再由 `@RestControllerAdvice` 转换成 HTTP 响应，因此负责 HTTP 的不只是 Controller，也包括异常处理 advice。Service 不返回 `ResponseEntity`，才能继续被命令行、定时任务或其他非 HTTP 入口复用。

## 6. 本章三类测试各自证明了什么，又没有证明什么：纯 Java Service 测试、`@SpringBootTest` 容器测试、MockMvc Web 测试？

> **本题由 Codex 直接解答，不计入掌握要求。** 可以把三类测试理解为从内到外检查三个范围：
>
> - 纯 Java Service 测试只创建 Service，证明查询规则本身正确；它不知道 Spring 注解是否生效，也不知道 HTTP 路由是否存在。
> - `@SpringBootTest` 尝试启动 Spring 容器，证明配置能够加载、Bean 能够创建并完成依赖装配；只启动容器并不能自动证明每个 HTTP 接口的响应都正确。
> - MockMvc 模拟请求进入 Spring MVC，证明路径映射、参数绑定、状态码和 JSON 等 Web 行为；它没有打开真实网络端口，所以不能替代最后一次真实服务器和可执行 jar 验证。
>
> 对当前学习阶段，只需要知道“测试成功表示自动检查没有发现这些行为出错”。不需要记忆三类测试的注解、API 或实现方式。

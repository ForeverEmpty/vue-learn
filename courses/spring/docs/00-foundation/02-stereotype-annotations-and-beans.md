# Spring 基础 00·02：组件角色注解与 Bean

检查点三使用了：

```java
@Service
public final class TopicCatalogService {
}

@RestController
public final class TopicController {
}
```

这两个注解既让类成为组件扫描候选者，又表达类在应用中的角色。

## Bean 是什么

在当前课程中，可以把 Bean 理解为“由 Spring `ApplicationContext` 创建、保存并参与装配的对象”。普通 `new TopicCatalogService()` 创建的也是 Java 对象，但除非显式交给容器注册，否则它不是该容器中的 Bean。

```text
类上的组件注解
→ 组件扫描发现候选类
→ 容器调用构造器创建对象
→ 容器解析并注入其他 Bean
→ 对象以 Bean 身份参与应用生命周期
```

## `@Component`

`@Component` 是通用组件角色。没有更准确的领域角色时可以使用它。许多更具体的 stereotype 注解都建立在它之上。

```java
@Component
public final class ClockProvider {
}
```

`value` 属性可建议 Bean 名称：

```java
@Component("clockProvider")
```

正常情况下让 Spring 使用默认命名即可；仅在确有按名称区分的需求时指定。

## `@Service`

`@Service` 是面向服务层的 stereotype 注解，本质上也是组件扫描候选者。它告诉读代码的人：这个类承载应用或业务服务，而不是 HTTP 路由或存储细节。

```java
@Service
public final class TopicCatalogService {
}
```

只从“是否注册 Bean”看，当前场景用 `@Component` 也能工作；但 `@Service` 的角色表达更准确，也为工具和未来框架扩展保留语义。

## `@Controller` 与 `@RestController`

`@Controller` 表示 Spring MVC Controller，返回值可以参与视图名称和模板渲染。

`@RestController` 是组合注解，可以理解为：

```text
@Controller
+
@ResponseBody
```

它既注册 MVC Controller Bean，又让请求处理方法的返回值默认写入 HTTP 响应体。返回 `StudyTopic` 时，消息转换器会把对象序列化为 JSON，而不是把它解释成模板名称。

## 构造器注入

```java
public TopicController(TopicCatalogService topicCatalogService) {
    this.topicCatalogService = topicCatalogService;
}
```

当 Bean 只有一个构造器时，Spring 可以直接选择它，不需要额外写 `@Autowired`。容器先找到 `TopicCatalogService` Bean，再把它传入 Controller 构造器。

如果没有对应 Bean，通常会在应用上下文启动阶段失败，而不是等第一次 HTTP 请求时才出现空指针。

## 默认作用域与线程安全

普通组件默认是 singleton 作用域：每个应用上下文通常只有一个 Bean 实例。singleton 只说明容器实例数量，不保证线程安全。

无状态 Service 更容易被多个请求线程安全共享。不要把每次请求的 slug 临时保存在 Service 或 Controller 的可变字段中。

## 常见误区

- 注解不会改变 `new` 出来的其他对象；容器只管理已注册的 Bean。
- `@Service` 不是“方法自动异步”或“自动开启事务”的含义。
- `@RestController` 不负责声明具体 URL，URL 仍由请求映射注解提供。
- 构造器注入不要求字段注入；只有一个构造器时也不要求 `@Autowired`。
- 不要只为了形式统一把所有类都标记成 Spring Bean，纯数据 record 和普通工具类可以保持普通 Java 类型。

## 官方查询

- [Spring Framework stereotype annotations](https://docs.spring.io/spring-framework/reference/core/beans/classpath-scanning.html)
- [`@RestController` API](https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/web/bind/annotation/RestController.html)

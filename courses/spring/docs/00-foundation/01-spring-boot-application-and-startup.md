# Spring 基础 00·01：`@SpringBootApplication` 与启动入口

`SpringCourseApplication` 同时出现一个 Spring Boot 注解和一个普通 Java `main` 方法：

```java
@SpringBootApplication
public class SpringCourseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SpringCourseApplication.class, args);
    }
}
```

## 放置位置

`@SpringBootApplication` 修饰应用的主配置类，目标位置是“类型”，不能放在普通字段或局部变量上。一个应用通常只保留一个清晰的主入口类。

入口类通常放在应用包结构的根部：

```text
study.spring.SpringCourseApplication
study.spring.topic.TopicController
study.spring.topic.TopicCatalogService
```

默认组件扫描从入口类所在包向下搜索，因此 `study.spring.topic` 在扫描范围内。

## 它是组合注解

`@SpringBootApplication` 组合了三项主要能力：

```text
@SpringBootConfiguration
    标记 Spring Boot 的主配置类

@EnableAutoConfiguration
    根据 classpath、配置和已有 Bean 启用条件化自动配置

@ComponentScan
    扫描当前包及子包中的候选组件
```

因此它不是“启动服务器”这一件事的别名。是否创建 Web 服务器，还取决于 Web 依赖、应用类型和自动配置条件。

## `SpringApplication.run` 做什么

`SpringApplication.run(...)` 是普通静态 Java 方法，不是注解。它负责引导应用启动并返回应用上下文，主线可以概括为：

```text
准备 Environment 和配置
→ 创建合适的 ApplicationContext
→ 加载主配置与自动配置
→ 扫描、创建并装配 Bean
→ 刷新上下文
→ Web 应用启动嵌入式服务器
```

传入 `SpringCourseApplication.class` 是告诉 Spring Boot 主要配置源在哪里；传入 `args` 是把命令行参数交给应用环境处理。

## 当前常用属性

```java
@SpringBootApplication(
    scanBasePackages = "study.spring"
)
```

`scanBasePackages` 可以显式修改组件扫描包，但正常项目更推荐把入口类放在合理根包，而不是到处扩大扫描范围。

另有 `exclude`、`excludeName` 可排除某些自动配置。它们属于处理明确自动配置冲突的工具，不应在尚未理解条件报告前随意添加。

## 常见误区

- 组件没有被扫描时，先检查包结构，不要立刻手写大量扫描包。
- `@SpringBootApplication` 不会扫描整个磁盘或所有依赖包，只从配置的范围寻找组件。
- starter 负责提供依赖入口，自动配置根据条件创建框架对象；二者不是同一个概念。
- `main` 方法仍是普通 Java 入口，Spring Boot 从这里接管后续生命周期。

## 当前代码中的作用

首章的 `contextLoads` 能通过，证明 Spring Boot 可以从主类建立应用上下文。给 Service 和 Controller 添加角色注解后，它们之所以会被发现，是因为位于主类默认扫描范围内。

## 官方查询

- [Spring Boot 4.1.1 `SpringBootApplication` API](https://docs.spring.io/spring-boot/api/java/org/springframework/boot/autoconfigure/SpringBootApplication.html)
- [Spring Boot 第一个应用教程](https://docs.spring.io/spring-boot/tutorial/first-application/index.html)

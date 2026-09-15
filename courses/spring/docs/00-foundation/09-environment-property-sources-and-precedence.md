# Spring 基础 00·09：`Environment`、`PropertySource` 与覆盖优先级

Spring Boot 应用不会只读取一个配置文件。它先把多个来源组织成一个 `Environment`，再按照固定优先级解析每个属性的最终值。

## 三个概念

```text
PropertySource
  一个属性来源，例如 application.properties 或操作系统环境变量

Environment
  当前应用对全部属性来源和激活 Profile 的统一视图

绑定后的配置 Bean
  从 Environment 读取一组最终值并转换成 Java 类型的对象
```

`Environment` 不是 `.env` 文件的别名。它是 Spring 对运行环境的抽象，其中可以同时包含配置文件、系统属性、环境变量和命令行参数。

## 为什么需要多个来源

同一个 jar 可以在不同环境运行：

```text
代码和 jar             保持不变
application.properties 提供安全的基础值
Profile 文件            提供一类环境的差异
环境变量                由部署环境注入
命令行参数              为本次启动临时覆盖
```

这样无需为了修改每日学习时间而重新编译 Java 代码。

## 本章需要掌握的优先级

Spring Boot 的完整属性来源列表很长。当前场景只需要记住以下相对关系，越靠下优先级越高：

```text
jar 内 application.properties
        ↓ 可覆盖
激活的 application-{profile}.properties
        ↓ 可覆盖
操作系统环境变量
        ↓ 可覆盖
命令行参数 --key=value
```

例如基础文件是：

```properties
study.plan.daily-minutes=30
```

`local` Profile 写成 `60`，环境变量写成 `20`，启动命令又传入 `15`，最终绑定值是 `15`。

优先级不是“把配置文件内容永久改掉”。它只决定这次应用启动时，哪个来源提供最终值。

## 配置键的规范形式

配置文件推荐使用：

```properties
study.plan.daily-minutes=30
```

命令行保持同一规范键：

```text
--study.plan.daily-minutes=15
```

环境变量受到操作系统命名限制，需要转换为：

```text
STUDY_PLAN_DAILYMINUTES=20
```

Spring Boot 再通过宽松绑定把这些不同形式匹配到 Java 的 `dailyMinutes`。

## 外部文件与 jar 内文件

Spring Boot 也能加载 jar 外部的 `application.properties`。外部配置可以覆盖打包在 jar 内的同名配置，这使部署人员可以调整运行参数而不修改归档文件。

本章不修改 `spring.config.location`。这个属性会改变默认配置搜索位置，而且必须在启动早期提供；没有真实目录布局需求时，不应提前增加路径复杂度。

## 配置值何时确定

当前配置对象在应用启动时完成绑定。之后的请求只是读取已经创建的 Bean：

```text
启动：解析来源 → 决定最终值 → 创建 StudyPlanProperties
请求：StudyPlanService 读取 StudyPlanProperties
```

修改磁盘上的 properties 文件不会自动刷新已经运行的 Bean。是否支持动态配置刷新是另一套明确的运行时设计，本章不隐含提供。

## 安全边界

配置外置不代表所有配置都可以提交到 Git：

- 非敏感默认值可以保存在 `application.properties`；
- 密码、令牌和私钥不应写入课程仓库；
- 环境变量能避免把秘密写入源码，但仍需要部署平台提供访问控制；
- 不要把完整 `Environment` 直接暴露成公共 HTTP 响应。

本章接口只返回用于学习的非敏感计划配置。

## 常见误区

- 认为后加载的配置一定更高；准确规则取决于 `PropertySource` 顺序。
- 看到环境变量存在就认为它一定生效；变量名必须能够映射到规范属性键。
- 把命令行覆盖误认为修改了原配置文件。
- 在多个来源重复写值，却不记录为什么需要覆盖，最终难以判断值来自哪里。
- 在业务代码中到处调用 `Environment.getProperty`，让字符串键扩散到各层。

## 官方查询

- [Spring Boot Externalized Configuration](https://docs.spring.io/spring-boot/reference/features/external-config.html)
- [Properties and Configuration How-to](https://docs.spring.io/spring-boot/how-to/properties-and-configuration.html)

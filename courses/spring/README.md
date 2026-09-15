# Spring / Spring Boot

这是与 Java、Vue 同级的独立学习区。课程从 Spring Boot 切入，但不会把框架注解当作需要死记的魔法：每章都会把必要的 Spring、Web、构建与测试理论放在产生实际行为的代码旁边。

## 课程边界

- Spring Framework、Spring Boot、IoC、依赖注入、Bean、自动配置、HTTP、MVC、数据库与后端工程知识写在本课程。
- Java 注解、`record`、`Optional` 等语言基础写入 `courses/java/docs/00-foundation/`，每个知识点保持独立小章。
- Java 基础小章不生成复习题；Spring 正式章节有独立复习题。
- 测试代码用于自动验收实现；后续复习题不考测试框架、测试分类或断言 API，除非学习者主动要求学习测试。
- Spring 与 Java 不共用正式章节编号、完成状态和源码目录。

## 当前技术基线

- Java 21 LTS。
- Spring Boot 4.1.1。
- Maven Wrapper 3.3.4，固定下载 Maven 3.9.16；不要求系统预先安装 Maven。
- Servlet Web / Spring MVC。
- JUnit 5、Spring Boot Test 与 MockMvc。

## 目录

```text
courses/spring/
  docs/
    00-foundation/    Spring 注解、核心类型和设计专题索引
    01-spring-boot/   Spring Boot 主课程
  review_questions/  正式章节复习题与批改
  src/main/java/     Spring Boot 应用源码
  src/test/java/     单元测试与 Spring 集成测试
  pom.xml             Maven 项目描述
  mvnw.cmd            Windows Maven Wrapper
```

## 当前章节

1. [00：Spring 基础查询手册](./docs/00-foundation/README.md)——按首次出现顺序记录注解、核心类型和设计思想；每个主题独立成章。
2. [01·01：应用启动、IoC/依赖注入与第一个 HTTP API](./docs/01-spring-boot/01-bootstrap-ioc-di-and-http-api.md)——已完成：实现、7 项测试、真实 HTTP 调用、可执行 jar 与复习题均已验证。
3. [01·02：外部化配置、类型安全绑定与 Profile](./docs/01-spring-boot/02-externalized-configuration-binding-and-profiles.md)——已完成：6 个检查点、自动验收 9/9、全量 16/16、配置优先级实践与复习均已完成。

## 命令

在仓库根目录执行：

```bash
npm run spring:compile
npm run spring:test:chapter-01
npm run spring:test:chapter-02
npm run spring:test
npm run spring:run
npm run spring:example:di
```

第一次执行 Maven Wrapper 会联网下载固定版本的 Maven，之后会复用用户目录中的缓存。应用启动后使用 `Ctrl+C` 结束。

# Spring 复习题目录

本目录只保存 Spring 正式章节的复习题、答案与批改，不混入 Java 或 Vue 课程。

| 章节 | 主题 | 状态 |
| --- | --- | --- |
| 01·01 | [应用启动、IoC/依赖注入与第一个 HTTP API](./01-spring-boot/01-bootstrap-ioc-di-and-http-api.md) | 已批改 |
| 01·02 | [外部化配置、类型安全绑定与 Profile](./01-spring-boot/02-externalized-configuration-binding-and-profiles.md) | 已批改；第 4 题由 Codex 讲解 |
| 01·03 | [REST 写操作、请求校验与一致错误响应](./01-spring-boot/03-rest-write-validation-and-consistent-errors.md) | 已通过；第 2、4 题完成修正复核，第 5 题完成出题复盘 |

Spring 学习过程中补到 `courses/java/docs/00-foundation/` 的 Java 基础小章不创建复习题。

## 出题约定

- 测试代码继续作为自动验收工具，用来确认练习行为是否正确。
- 后续复习题不考 JUnit、MockMvc、测试分类、测试注解或断言 API。
- 不要求学习者编写测试，除非之后主动提出要学习测试。
- 如果某个测试概念直接影响生产代码理解，只在正文中用通俗语言说明，不把它设为复习题。
- 不重复要求背诵正文和真实 HTTP 实践中已经直接展示的状态码、错误 code 或其他简单事实。
- 理论题不足以检验迁移能力时，使用编程题或理论与编程混合题；编程题通常聚焦 1～3 个函数或约 10～40 行核心代码。
- 编程题优先采用新场景、代码审查、调试或小范围重构，不原样重复刚完成的章节实现。

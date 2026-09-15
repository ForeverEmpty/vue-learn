# Spring 基础 00·11：类型化配置边界与快速失败

本篇讲的是设计思想，不是新的 Spring 注解，也不是 GoF 设计模式。核心目标是把外部世界的字符串配置，转换成业务代码可以安全依赖的类型化对象。

## 配置也是输入

HTTP 参数是输入，配置文件和环境变量同样是输入。它们都可能：

- 缺失；
- 拼写错误；
- 类型无法转换；
- 单个值合法，但组合后没有意义。

如果业务代码直接读取字符串键：

```java
String value = environment.getProperty("study.plan.daily-minutes");
int dailyMinutes = Integer.parseInt(value);
```

那么读取、转换、默认值和校验会散落在请求路径中，错误可能直到用户发起请求才出现。

## 建立一个明确边界

本章采用：

```text
配置文件 / Profile / 环境变量 / 命令行
                    ↓
            Spring Environment
                    ↓ 绑定与转换
          StudyPlanProperties record
                    ↓ 构造器注入
             StudyPlanService
```

边界上发生三件事：

1. 选择优先级最高的原始值；
2. 把字符串转换为 Java 类型；
3. 检查对象不变量。

边界之后，Service 不再关心值来自哪种配置源。

## 快速失败

如果 `dailyMinutes` 是零，计划天数计算会出现除零错误。两种发现时机：

```text
延迟失败：应用启动成功 → 收到特定请求 → 执行计算 → 运行时失败

快速失败：应用启动 → 创建配置对象 → 发现 dailyMinutes <= 0 → 启动失败
```

对于启动后应保持稳定的必需配置，快速失败通常更安全：故障靠近错误来源，部署系统也能明确知道实例没有就绪。

本章通过 record 紧凑构造器固定不变量：

```java
public StudyPlanProperties {
    if (displayName == null || displayName.isBlank()) {
        throw new IllegalArgumentException("displayName must not be blank");
    }
    if (dailyMinutes <= 0) {
        throw new IllegalArgumentException("dailyMinutes must be positive");
    }
}
```

后续出现大量字段、嵌套对象和标准约束时，会再学习 Bean Validation；当前先看清“在边界拒绝无效状态”这一设计目的。

## 配置对象的职责

`StudyPlanProperties` 负责：

- 表达有哪些配置字段；
- 承载已经转换的值；
- 保证最基本的不变量。

它不负责：

- 查询主题；
- 计算学习天数；
- 返回 HTTP 响应；
- 根据当前 Profile 写 `if/else` 业务分支。

`StudyPlanService` 只依赖配置对象，不依赖 `Environment`：

```java
public StudyPlanService(
        TopicCatalogService topicCatalogService,
        StudyPlanProperties properties
) {
    this.topicCatalogService = topicCatalogService;
    this.properties = properties;
}
```

构造器把“计算计划需要主题目录和计划配置”直接写进类的依赖关系。

## 单一事实来源

如果 Controller、Service 和定时任务分别硬编码每日分钟数，就会出现多个事实来源。配置对象成为本次进程中的统一值：

```text
StudyPlanProperties.dailyMinutes()
        ├─ StudyPlanService 使用
        ├─ 未来提醒任务使用
        └─ 未来管理接口只读展示
```

单一来源不代表所有模块都必须共享一个巨大配置类。应按功能前缀拆分小而内聚的配置对象，避免出现包含整个系统全部配置的“万能 Settings”。

## 不要泄漏配置来源

Service 应提出“我需要 `StudyPlanProperties`”，而不是提出“我需要知道环境变量叫什么”。因此：

```text
推荐：Service → 类型化配置接口
避免：Service → 字符串键、文件路径、操作系统环境变量
```

这与依赖倒置的方向一致：业务计算依赖稳定的数据结构，配置读取细节留在应用边界。

## 当前方案的边界

- 配置在启动时绑定，不支持运行中自动刷新。
- 紧凑构造器只做局部不变量检查，不替代所有业务规则。
- `StudyPlanProperties` 是应用级配置，不是每个用户的个性化设置。
- Profile 用于环境差异，不应演变成业务条件组合系统。

## 回到正式章节前应能确认

- 外部配置与 HTTP 参数一样，都应被视为需要转换和校验的输入。
- 类型化配置对象隔离了字符串键和业务计算。
- 快速失败让错误在启动阶段暴露，而不是延迟到请求阶段。
- 配置对象承载数据，Service 承载计算，Controller 承载 HTTP 边界。

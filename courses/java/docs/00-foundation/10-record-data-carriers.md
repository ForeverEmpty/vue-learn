# Java 基础 00·10：`record` 数据载体

> 本章是 Spring 课程按需触发的 Java 基础补充，不设置复习题。

HTTP API 经常需要返回“只有数据、没有可变生命周期”的对象。Java 的 `record` 可以简洁声明这种数据载体。

## 从普通类到 record

下面的普通类需要字段、构造器和访问方法：

```java
public final class StudyTopic {
    private final String slug;
    private final String title;

    public StudyTopic(String slug, String title) {
        this.slug = slug;
        this.title = title;
    }

    public String slug() {
        return slug;
    }

    public String title() {
        return title;
    }
}
```

对应的 record 是：

```java
public record StudyTopic(String slug, String title) {
}
```

编译器会生成：

- 两个 `private final` 状态组件；
- 规范构造器；
- `slug()` 和 `title()` 访问方法；
- 基于全部组件的 `equals`、`hashCode` 和 `toString`。

## record 不等于“任何对象都不可变”

record 的组件引用创建后不能重新指向其他对象，但如果组件本身是可变集合，集合内容仍可能改变：

```java
public record Result(List<String> items) {
}
```

调用者仍可能修改传入的 `items`。需要真正隔离时，可以在构造阶段使用 `List.copyOf(items)`。

## 为什么适合 HTTP 响应

Spring MVC 配合 JSON 序列化器，可以读取 record 的组件并生成 JSON。例如：

```java
new StudyTopic("spring-boot", "Spring Boot")
```

可以被序列化成类似：

```json
{
  "slug": "spring-boot",
  "title": "Spring Boot"
}
```

record 只负责 Java 数据模型；把它转换为 JSON 是 Web 框架与序列化组件的职责。

## 适用边界

适合使用 record：

- API 请求或响应 DTO；
- 查询结果；
- 值对象；
- 创建后不需要改变身份状态的数据组合。

不应仅为减少代码就把所有类都改为 record。需要复杂可变生命周期、继承某个普通类或由框架代理的对象，通常仍使用普通类。

## 回到 Spring 首章前应能确认

- record 声明的是一组固定组件。
- 组件访问方法是 `slug()`，不是 JavaBean 风格的 `getSlug()`。
- record 生成常用值语义方法，但不会深度冻结可变组件。
- record 与 JSON 没有直接绑定，JSON 转换由 Spring MVC 的序列化设施完成。

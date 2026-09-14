# Java 基础 00·09：注解与元注解

> 本章是 Spring 课程按需触发的 Java 基础补充，不设置复习题。

Spring 代码中会频繁看到 `@SpringBootApplication`、`@Service`、`@RestController`。它们首先都是 Java 的注解语法，然后才具有 Spring 赋予的框架含义。

## 注解是什么

注解是附着在类、方法、字段、参数等程序元素上的结构化元数据。它可以被编译器、构建工具或运行中的框架读取，但单独写下一个注解并不会自动产生业务行为。

例如：

```java
@Deprecated
public void oldMethod() {
}
```

`@Deprecated` 告诉编译器和工具这个方法已经不推荐使用。Spring 注解则主要由 Spring 在启动或请求处理期间读取。

## 注解类型怎样声明

```java
public @interface LearningComponent {
    String value() default "";
}
```

使用时：

```java
@LearningComponent("catalog")
public final class TopicCatalog {
}
```

这里的 `value` 看起来像无参数方法，实际声明的是注解属性。只有属性名为 `value` 时，使用方才可以省略 `value =`。

## 元注解

“修饰注解类型的注解”称为元注解。常见的四个是：

| 元注解 | 决定什么 |
| --- | --- |
| `@Target` | 注解可以放在类、方法、字段还是参数等位置 |
| `@Retention` | 注解保留到源码、class 文件还是运行时 |
| `@Documented` | 生成文档时是否包含它 |
| `@Inherited` | 类上的注解是否允许被子类继承 |

Spring 需要在运行时读取许多注解，因此这些注解通常具有：

```java
@Retention(RetentionPolicy.RUNTIME)
```

## 组合注解

一个注解类型也可以被其他注解修饰。Spring 大量使用这种组合方式。例如 `@SpringBootApplication` 不是一个只做单件事的开关，而是组合了配置类、自动配置和组件扫描等能力。

可以把它理解为：

```text
Java 注解语法
    ↓ 提供可读取的元数据
Spring 启动时扫描与解析
    ↓ 注册组件或建立请求映射
最终产生框架行为
```

因此看到 Spring 注解时要分别回答两个问题：

1. 它被放在哪个程序元素上，携带了哪些参数？
2. Spring 的哪个阶段读取它，并因此做了什么？

## 与 `@FunctionalInterface` 的区别

`@FunctionalInterface` 主要由 Java 编译器检查：被修饰的接口必须保持一个抽象方法。`@Service`、`@RestController` 等 Spring 注解主要由框架在运行时读取。两者语法相同，但消费这些元数据的主体不同。

## 回到 Spring 首章前应能确认

- 注解是元数据，不是普通方法调用。
- 元注解用来描述另一个注解的适用范围与保留阶段。
- Java 负责保存运行时注解，Spring 负责解释其中一部分注解的框架含义。
- 组合注解可以把多项框架语义集中在一个注解中。

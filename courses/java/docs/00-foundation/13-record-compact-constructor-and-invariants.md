# Java 基础 00·13：record 紧凑构造器与对象不变量

> 本章由 Spring Boot 01·02 的配置对象触发，不设置复习题。

record 会自动生成规范构造器，但这不代表所有传入数据都必须无条件接受。紧凑构造器允许在保持 record 简洁形式的同时，拒绝无法构成有效对象的数据。

## 普通 record 的构造过程

```java
public record StudyPlanProperties(
        String displayName,
        int dailyMinutes
) {
}
```

调用：

```java
new StudyPlanProperties("Spring Plan", 30);
```

等价地为两个组件提供值，并在构造完成后通过 `displayName()`、`dailyMinutes()` 读取。

但下面的对象在语法上同样能够创建：

```java
new StudyPlanProperties(" ", 0);
```

如果业务要求名称不能为空、每日时间必须大于零，那么这个对象虽然“构造成功”，却无法被后续计算安全使用。

## 紧凑构造器

紧凑构造器不重复书写参数列表：

```java
public record StudyPlanProperties(
        String displayName,
        int dailyMinutes
) {
    public StudyPlanProperties {
        if (displayName == null || displayName.isBlank()) {
            throw new IllegalArgumentException("displayName must not be blank");
        }

        if (dailyMinutes <= 0) {
            throw new IllegalArgumentException("dailyMinutes must be positive");
        }
    }
}
```

`public StudyPlanProperties { ... }` 对应 record 的规范构造器。Java 会在紧凑构造器正常结束后，把同名参数赋给对应组件，不需要再写：

```java
this.displayName = displayName;
this.dailyMinutes = dailyMinutes;
```

## 什么是不变量

不变量是“只要对象存在，就应该始终成立”的条件。本例的不变量是：

```text
displayName 不是 null 且不是空白字符串
dailyMinutes > 0
```

把这些检查放在构造边界后，其他代码可以直接进行：

```java
int days = (totalMinutes + dailyMinutes - 1) / dailyMinutes;
```

而不必在每次计算前重复防御 `dailyMinutes == 0`。

## `isEmpty` 与 `isBlank`

```java
"".isEmpty()    // true
"   ".isEmpty() // false

"".isBlank()    // true
"   ".isBlank() // true
```

名称字段通常应该拒绝只包含空格的值，因此本章使用 `isBlank()`。由于对 `null` 调用实例方法会抛出 `NullPointerException`，条件必须先检查 `displayName == null`；`||` 的短路行为会阻止右侧在左侧已经为真时继续执行。

## 与 Spring 配置绑定的关系

Spring Boot 把外部属性绑定到这个 record 时，也会调用它的规范构造器。因此：

```text
配置文件中的原始值
→ 类型转换
→ 调用 record 构造器
→ 检查不变量
→ 成功创建配置对象，或立即终止启动
```

紧凑构造器仍然是 Java 语言能力；Spring 只是成为了调用构造器的一方。

## 回到正式章节前应能确认

- 紧凑构造器用于约束 record 的创建边界。
- 它不重复参数列表，也不需要手写组件赋值。
- 构造失败比让无效对象流入计算过程更容易定位问题。
- `isBlank()` 能识别空字符串和只含空白字符的字符串。

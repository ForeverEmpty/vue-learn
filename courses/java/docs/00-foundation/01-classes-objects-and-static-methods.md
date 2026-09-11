# Java 00·01：类、对象与静态方法

本节用于看懂第一章中的 `ThreadBasics` 工具类，不要求提前学完 Java 面向对象体系。

## 类与对象

`class` 定义一种类型，`new` 根据这种类型创建对象：

```java
Thread worker = new Thread();
```

左边的 `Thread` 是变量类型，`worker` 是变量名，右边的 `new Thread()` 创建对象。

## 静态方法

```java
public final class ThreadBasics {
    public static Thread createWorker(String workerName, Runnable task) {
        // 方法体
    }
}
```

- `final class` 表示这个类不允许被继承。
- `static` 方法属于类本身，不需要先创建 `ThreadBasics` 对象。
- 调用时写 `ThreadBasics.createWorker(...)`。
- 参数列表中左边是类型，右边是参数名。
- 方法名前的 `Thread` 是返回类型，表示方法必须返回一个 `Thread` 对象。

只存放静态方法的工具类通常使用私有构造函数，阻止没有意义的实例化：

```java
private ThreadBasics() {
}
```

看到这种结构时，可以把它理解为“把一组相关操作收在一个类名下面”。

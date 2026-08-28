# Java 00：进入多线程前的基础快速复习

这里不是完整 Java 入门课，只复习第一章源码中马上会遇到的语法。遇到不熟悉的点可以回来查，但不需要先背完所有规则。

## 1. 类、对象和静态方法

```java
public final class ThreadBasics {
    public static Thread createWorker(String workerName, Runnable task) {
        // 方法体
    }
}
```

- `class` 定义一种类型。
- `final class` 表示这个类不准备被继承；这里把它当作只存放工具方法的类。
- `static` 方法属于类本身，调用时写 `ThreadBasics.createWorker(...)`，不需要先 `new ThreadBasics()`。
- `String workerName` 和 `Runnable task` 是参数；左边是类型，右边是变量名。
- `Thread` 写在方法名前，表示该方法必须返回一个 `Thread` 对象。

工具类常用私有构造函数阻止无意义的实例化：

```java
private ThreadBasics() {
}
```

## 2. main 方法

```java
public static void main(String[] args) throws InterruptedException {
}
```

JVM 从 `main` 方法开始运行普通 Java 程序。

- `void`：方法没有返回值。
- `String[] args`：命令行参数数组，本章暂时不用。
- `throws InterruptedException`：调用的方法可能产生这个受检异常，当前 main 选择把它继续向外声明。

main 方法本身已经运行在一个线程中，通常线程名为 `main`：

```java
Thread currentThread = Thread.currentThread();
String threadName = currentThread.getName();
```

## 3. Runnable：描述“要执行的任务”

`Runnable` 是只有一个抽象方法的函数式接口：

```java
public interface Runnable {
    void run();
}
```

它描述一段工作，但不决定由哪个线程执行。

完整写法：

```java
Runnable task = new Runnable() {
    @Override
    public void run() {
        System.out.println("执行任务");
    }
};
```

lambda 简写：

```java
Runnable task = () -> {
    System.out.println("执行任务");
};
```

先记住职责区别：

```text
Runnable = 做什么
Thread   = 由哪一个线程执行，并保存线程状态
```

## 4. 方法引用

测试中会看到：

```java
AtomicInteger taskRuns = new AtomicInteger();
Runnable task = taskRuns::incrementAndGet;
```

`taskRuns::incrementAndGet` 可以理解为“任务执行时，调用这个对象的 `incrementAndGet()`”。在这里它等价于：

```java
Runnable task = () -> taskRuns.incrementAndGet();
```

## 5. throws 与 InterruptedException

`Thread.join()` 在等待期间可能被中断，因此声明了 `InterruptedException`。Java 要求调用者明确选择：

- 使用 `try/catch` 在当前方法处理；或
- 在当前方法签名继续写 `throws InterruptedException`。

第一章的 `startAndWait` 已经提前给出了 `throws`，你暂时不需要设计异常处理策略。

## 6. 为什么测试使用 AtomicInteger

普通 `int` 的自增不是为多线程协作设计的。测试需要由工作线程修改计数，再由另一个线程读取，因此使用：

```java
AtomicInteger taskRuns = new AtomicInteger();
taskRuns.incrementAndGet();
int currentRuns = taskRuns.get();
```

原子类的完整原理会在后面的共享状态章节学习。当前只把它当作测试中安全的计数器。

## 进入第一章前的快速自检

你只需要能说出下面四点：

1. `static` 方法不需要先创建工具类对象。
2. `Runnable` 描述任务，`Thread` 表示线程。
3. lambda 可以实现只有一个抽象方法的函数式接口。
4. `throws InterruptedException` 表示当前方法暂不捕获，而是继续声明异常。

不熟练也可以继续；第一章会在真实代码中重复使用这些概念。

# Java 00·08：AtomicReference 与跨线程结果槽

本基础小章用于理解并发 01·03 中的 `AtomicReference<Throwable>`。它只讲当前场景需要的引用保存、可见性和比较并更新，不设置复习题。

## AtomicReference 是什么

普通引用变量保存“某个对象在哪里”。`AtomicReference<T>` 是一个能够在线程之间安全读写这种引用的容器：

```java
AtomicReference<Throwable> workerFailure = new AtomicReference<>();
```

- `AtomicReference` 表示原子引用容器。
- `<Throwable>` 限定容器中只能保存 `Throwable` 或其子类的引用。
- 无参数构造时，内部初始值是 `null`。
- 生产者、消费者和 main 共享同一个 `workerFailure` 对象。

可以把它看作一个线程安全的单格结果槽：

```text
开始：workerFailure → null
失败：workerFailure → 某个 Throwable 对象
```

“原子”表示相关操作不会只完成一半，也不会与另一个线程的同类操作交错成无法解释的中间状态。

## 为什么不直接修改局部变量

看似可以这样保存失败：

```java
Throwable workerFailure = null;

Thread worker = new Thread(() -> {
    workerFailure = new IllegalStateException();
});
```

但这段代码无法编译。Java lambda 捕获的局部变量必须是 `final` 或“事实上的 final”，也就是初始化后不能再次赋值。

使用容器后，lambda 捕获的引用本身没有改变：

```java
AtomicReference<Throwable> workerFailure = new AtomicReference<>();

Thread worker = new Thread(() -> {
    workerFailure.set(new IllegalStateException());
});
```

这里没有让局部变量 `workerFailure` 指向新对象，而是修改它所指向的 `AtomicReference` 内部值。

一元素数组也能绕过 lambda 的语法限制，但不能自动提供适合多个线程竞争写入的原子更新规则。当前场景使用专门的原子类更明确。

## get 与 set

最基本的两个操作是：

```java
workerFailure.set(error);
Throwable failure = workerFailure.get();
```

- `set(error)` 发布一个新引用。
- `get()` 读取当前引用。
- 原子类还提供跨线程的可见性保证，使其他线程能够按照它的内存语义观察到已发布的引用。

如果只有一个写线程，`set` 与 `get` 往往已经够用。本章同时存在生产者和消费者两个可能失败的线程，还需要决定它们同时失败时保留谁。

## compareAndSet：比较成功才更新

综合场景使用：

```java
workerFailure.compareAndSet(null, error);
```

它会原子地完成：

```text
如果当前引用仍然是 null
    把它改为 error，并返回 true
否则
    保持原值，并返回 false
```

假设生产者和消费者几乎同时失败：

```text
初始值：null
生产者 CAS(null, producerError) → 成功
消费者 CAS(null, consumerError) → 失败，因为当前值已不再是 null
最终保留：producerError
```

因此 `compareAndSet(null, error)` 表达的是“只记录第一个失败”。检查与写入是一个原子操作，不会出现两个线程都先看到 `null`、再相互覆盖的普通竞态。

这里比较的是引用身份；预期值为 `null` 时，含义尤其直接。

## 在本章代码中的完整路线

```text
main 创建 AtomicReference，初始为 null
→ 同一个引用传给生产者和消费者
→ 任一 worker 捕获 Throwable
→ compareAndSet(null, error)，第一个失败获胜
→ main 对两个 worker 执行 join
→ main 调用 workerFailure.get()
→ 非 null 时抛出带 cause 的 IllegalStateException
```

对应代码：

```java
Throwable failure = workerFailure.get();
if (failure != null) {
    throw new IllegalStateException("生产者—消费者执行失败", failure);
}
```

外层异常说明“整个场景失败”，`cause` 则保留工作线程中的原始错误，调用者可以继续检查真实原因和堆栈。

## join 与 AtomicReference 各自负责什么

`join()` 保证 main 等待 worker 结束，并为 worker 完成前的操作建立到 join 返回后的可见性关系。因此在这个具体场景里，main 最终读取失败时也受益于 `join()`。

`AtomicReference` 仍然有独立职责：

- 提供 lambda 可以共同使用的可变结果槽。
- 让生产者和消费者并发写入时使用原子竞争规则。
- 用 `compareAndSet` 明确保证“第一个失败不被覆盖”。

所以它不是 `join()` 的替代品：一个负责跨线程保存结果，一个负责等待线程生命周期结束。

## AtomicReference 不会让对象内部自动安全

`AtomicReference<T>` 原子保护的是“槽里保存哪个引用”，不是该对象内部的所有操作。例如：

```java
AtomicReference<SharedCounter> reference = new AtomicReference<>(new SharedCounter());
reference.get().increment();
```

这里 `get()` 是安全的引用读取，但 `SharedCounter` 内部是否线程安全仍由 `SharedCounter` 自己决定。

本章的队列需要同时维护容量、大小、FIFO 和两个等待条件，这些属于组合状态，仍然使用 `synchronized`、`wait()` 和 `notifyAll()` 协调。一个原子引用不能自动替代整套监视器协议。

## 当前需要记住的最小模型

```text
AtomicReference<T> = 线程安全的单个引用槽
get()              = 读取当前引用
set(value)         = 直接发布新引用
compareAndSet(a,b) = 当前仍为 a 时才原子地改成 b
本章 CAS(null,error) = 只保留第一个工作线程失败
```

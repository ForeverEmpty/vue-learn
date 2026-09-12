# Java 00·07：泛型与 Deque、List

本基础小章为并发 01·03 的有界缓冲区补充最少量的泛型与集合知识，不设置复习题。理解这里出现的类型关系和四个队列操作后，就可以返回正式章节。

## 为什么缓冲区使用泛型

如果缓冲区只能保存 `String`，类会被固定成一种用途。类型参数 `T` 可以暂时代表“这个缓冲区保存的元素类型”：

```java
public final class BoundedBuffer<T> {
}
```

创建对象时再确定 `T`：

```java
BoundedBuffer<String> messages = new BoundedBuffer<>(2);
BoundedBuffer<Integer> numbers = new BoundedBuffer<>(10);
```

对于 `messages`，编译器会把相关位置的 `T` 当作 `String`；对于 `numbers`，则当作 `Integer`。因此下面两个方法保持同一条类型关系：

```java
public void put(T element)
public T take()
```

放入什么类型，取出时就得到什么类型，不需要把结果当作 `Object` 再强制转换。

## 接口类型与实现类型

正式章节使用：

```java
private final Deque<T> elements = new ArrayDeque<>();
```

- `Deque<T>` 是接口类型，描述队列能够进行哪些操作。
- `ArrayDeque<T>` 是具体实现，负责真正保存元素。
- 变量使用接口类型，可以让代码依赖行为约定，而不是绑定到更多实现细节。
- 右侧的 `<>` 会根据左侧推断元素类型仍然是 `T`，称为菱形语法。

## 本章只需要四个队列操作

```java
elements.addLast(element);  // 添加到队尾
T element = elements.removeFirst(); // 从队头移除并返回
boolean empty = elements.isEmpty(); // 是否为空
int size = elements.size();          // 当前元素数量
```

从队尾放入、从队头取出，会形成 FIFO（先进先出）顺序：

```text
put("A") → put("B") → put("C")
take() 得到 A → take() 得到 B → take() 得到 C
```

`removeFirst()` 在空队列上会抛出异常。正式章节不会让消费者直接撞上这个异常，而是让消费者在队列为空时等待生产者。

## final 限制的是引用

字段声明中的 `final`：

```java
private final Deque<T> elements = new ArrayDeque<>();
```

表示 `elements` 以后不能改为指向另一只队列，并不表示队列内容不可变化。仍然可以调用 `addLast()` 和 `removeFirst()` 修改其中的元素。

## 综合场景中的 List

正式章节最后会接收一组输入，并返回一组输出：

```java
public static <T> List<T> transfer(List<T> input, int capacity)
```

`List<T>` 表示有顺序的一组 `T`。本章会遇到三种写法：

```java
List<String> input = List.of("A", "B"); // 创建固定内容的输入
List<T> output = new ArrayList<>();       // 创建可追加元素的结果
List<T> snapshot = List.copyOf(output);   // 返回内容固定的结果副本
```

只有消费者线程修改 `output`；main 线程会在 `join()` 确认消费者结束后再读取，因此这个场景不需要让 `ArrayList` 自己承担多线程并发写入。

完成本节后，正式章节中需要保留的关系只有：

```text
T 保持放入与取出类型一致
Deque 保存队列行为
addLast + removeFirst 形成 FIFO
List 表示有顺序的一组输入或输出
final 固定队列引用，不冻结队列内容
```

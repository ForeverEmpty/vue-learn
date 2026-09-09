import {
  renderTypeLessonPage,
  type TypeLesson,
} from "./type-lesson";

const lesson: TypeLesson = {
  lessonNumber: "07",
  title: "泛型、约束、keyof 与索引访问",
  lead:
    "泛型的价值是保存多个类型位置之间的关系；keyof 和索引访问进一步连接对象、属性键与属性值。",
  concepts: [
    "泛型不是 any：它会保留调用时推断出的具体类型关系。",
    "extends 表示泛型至少满足某种结构，不表示它只能拥有这些属性。",
    "Key extends keyof Target 限制合法键，Target[Key] 得到对应值类型。",
  ],
  examples: [
    {
      label: "泛型关系",
      title: "输入类型决定输出类型",
      code: `function identity<T>(value: T): T {
  return value
}

const name = identity("Ada") // string
const count = identity(1)    // number`,
      explanation:
        "T 同时出现在参数和返回值位置，因此 TypeScript 能保留“返回类型与输入类型相同”的关系。",
    },
    {
      label: "对象键",
      title: "安全地读取对象属性",
      code: `function getProperty<
  Target extends object,
  Key extends keyof Target,
>(target: Target, key: Key): Target[Key] {
  return target[key]
}`,
      explanation:
        "Key 只能是 Target 的真实键，返回值则随具体 key 变化。这正是 toRef 函数签名的核心结构。",
    },
    {
      label: "数组成员",
      title: "从 as const 数组取得字面量联合",
      code: `const statuses = [
  "idle",
  "loading",
  "success",
] as const

type Status = (typeof statuses)[number]`,
      explanation:
        "typeof 先取得只读元组类型，再用 [number] 取得所有可能的元素，结果是三个字符串字面量组成的联合。",
    },
  ],
  documentPath: "courses/vue/docs/00-js-ts/07-generics-keyof-indexed-access.md",
};

export function renderGenericsPage(container: HTMLElement): void {
  renderTypeLessonPage(container, lesson);
}


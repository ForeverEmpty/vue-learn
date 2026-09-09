import {
  renderTypeLessonPage,
  type TypeLesson,
} from "./type-lesson";

const lesson: TypeLesson = {
  lessonNumber: "06",
  title: "TypeScript 类型系统与安全收窄",
  lead:
    "先分清编译时类型和运行时值，再用联合类型、unknown、判别字段与 never 写出可证明安全的分支。",
  concepts: [
    "类型标注会在编译后消失，不能代替运行时数据校验。",
    "unknown 表示尚未确认的值，使用前必须通过条件收窄。",
    "判别联合让每一种状态拥有明确分支，never 可检查是否遗漏。",
  ],
  examples: [
    {
      label: "类型和值",
      title: "类型断言不会转换运行时数据",
      code: `interface User { name: string }

const input: unknown = {}
const user = input as User

// 编译器暂时把 user 当作 User
// 运行时的对象仍然没有 name`,
      explanation:
        "as 只改变 TypeScript 的判断，不会创建 name 属性，也不会执行验证。外部数据需要单独的运行时检查。",
    },
    {
      label: "unknown 收窄",
      title: "证明类型后才能使用专属方法",
      code: `function normalize(value: unknown): string {
  if (typeof value === "string") {
    return value.toUpperCase()
  }

  return String(value)
}`,
      explanation:
        "if 分支中的 typeof 检查既在运行时执行，也让 TypeScript 把 value 从 unknown 收窄为 string。",
    },
    {
      label: "穷尽检查",
      title: "never 暴露遗漏的联合成员",
      code: `type State =
  | { status: "loading" }
  | { status: "success"; data: string }

function assertNever(value: never): never {
  throw new Error(String(value))
}`,
      explanation:
        "所有联合成员都处理完后，剩余值应为 never。将来增加状态却忘记增加分支时，编译器会在 assertNever 调用处报错。",
    },
  ],
  documentPath: "courses/vue/docs/00-js-ts/06-type-system-and-narrowing.md",
};

export function renderTypeSystemPage(container: HTMLElement): void {
  renderTypeLessonPage(container, lesson);
}


export interface TypeLessonExample {
  label: string;
  title: string;
  code: string;
  explanation: string;
}

export interface TypeLesson {
  lessonNumber: string;
  title: string;
  lead: string;
  concepts: string[];
  examples: TypeLessonExample[];
  documentPath: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function renderTypeLessonPage(
  container: HTMLElement,
  lesson: TypeLesson,
): void {
  const conceptItems = lesson.concepts
    .map((concept) => `<li>${escapeHtml(concept)}</li>`)
    .join("");
  const exampleButtons = lesson.examples
    .map(
      (example, index) => `
        <button class="secondary" type="button" data-type-example="${String(index)}">
          ${escapeHtml(example.label)}
        </button>
      `,
    )
    .join("");

  container.innerHTML = `
    <main class="shell">
      <a class="back-link" href="#/">← 返回学习目录</a>

      <section class="test-card">
        <p class="eyebrow">MODULE 00 · LESSON ${escapeHtml(lesson.lessonNumber)}</p>
        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="lead">${escapeHtml(lesson.lead)}</p>

        <ol class="steps">${conceptItems}</ol>

        <div class="experiment">
          <h2>类型推导观察</h2>
          <p>先选择例子并预测结果，再阅读代码下方的解释。这里展示的是编译时关系，不是运行时输出。</p>
          <div class="actions">${exampleButtons}</div>
          <h2 id="type-example-title"></h2>
          <pre class="command-block"><code id="type-example-code"></code></pre>
          <p id="type-example-explanation" class="status-panel success-status"></p>
        </div>

        <p class="hint warning-hint">完整讲解与检查点：${escapeHtml(lesson.documentPath)}</p>
      </section>
    </main>
  `;

  const titleElement = container.querySelector<HTMLElement>("#type-example-title")!;
  const codeElement = container.querySelector<HTMLElement>("#type-example-code")!;
  const explanationElement = container.querySelector<HTMLElement>(
    "#type-example-explanation",
  )!;
  const buttons = Array.from(
    container.querySelectorAll<HTMLButtonElement>("[data-type-example]"),
  );

  function showExample(index: number): void {
    const example = lesson.examples[index];
    if (!example) return;

    titleElement.textContent = example.title;
    codeElement.textContent = example.code;
    explanationElement.textContent = example.explanation;

    buttons.forEach((button) => {
      const isSelected = Number(button.dataset.typeExample) === index;
      button.classList.toggle("secondary", !isSelected);
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      showExample(Number(button.dataset.typeExample));
    });
  });

  showExample(0);
}


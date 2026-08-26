import { cn } from "@/lib/utils";

/**
 * 원고 미리보기 — 편집기의 마크다운을 블로그에 붙였을 때와 비슷하게 보여준다.
 *
 * 외부 마크다운 라이브러리를 새로 넣지 않고, 이 화면에서 쓰는 문법
 * (## 블록 / ### 소제목 / 목록 / 체크리스트 / 표 / Q·A / 인용)만 처리한다.
 */

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "list"; items: string[]; checklist: boolean }
  | { kind: "table"; rows: string[][] }
  | { kind: "quote"; text: string }
  | { kind: "qa"; question: string; answer: string }
  | { kind: "tags"; items: string[] }
  | { kind: "paragraph"; text: string };

const LIST_RE = /^\s*(?:[-*]|\d+\.)\s+/;
const CHECK_RE = /^\[[ xX]\]\s*/;

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];

  let listBuffer: string[] = [];
  let listChecklist = false;
  let tableBuffer: string[][] = [];

  function flushList() {
    if (listBuffer.length > 0) {
      blocks.push({ kind: "list", items: listBuffer, checklist: listChecklist });
      listBuffer = [];
      listChecklist = false;
    }
  }

  function flushTable() {
    if (tableBuffer.length > 0) {
      blocks.push({ kind: "table", rows: tableBuffer });
      tableBuffer = [];
    }
  }

  function flush() {
    flushList();
    flushTable();
  }

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flush();
      continue;
    }

    if (/^\|/.test(trimmed)) {
      flushList();
      if (/^\|\s*-{2,}/.test(trimmed)) continue;
      tableBuffer.push(
        trimmed
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((cell) => cell.trim()),
      );
      continue;
    }
    flushTable();

    if (LIST_RE.test(line)) {
      const item = line.replace(LIST_RE, "");
      if (CHECK_RE.test(item)) listChecklist = true;
      listBuffer.push(item.replace(CHECK_RE, "").trim());
      continue;
    }
    flushList();

    const heading = trimmed.match(/^(#{2,3})\s+(.+)$/);
    if (heading) {
      blocks.push({
        kind: "heading",
        level: heading[1].length === 2 ? 2 : 3,
        text: heading[2].trim(),
      });
      continue;
    }

    if (trimmed.startsWith(">")) {
      blocks.push({ kind: "quote", text: trimmed.replace(/^>\s*/, "") });
      continue;
    }

    const question = trimmed.match(/^(?:\*\*)?Q[.):]\s*(.+?)(?:\*\*)?$/);
    if (question) {
      const next = (lines[i + 1] ?? "").trim();
      const answer = next.match(/^(?:\*\*)?A[.):]\s*(.+?)(?:\*\*)?$/);
      blocks.push({
        kind: "qa",
        question: question[1].replace(/\*\*/g, ""),
        answer: answer ? answer[1].replace(/\*\*/g, "") : "",
      });
      if (answer) i += 1;
      continue;
    }

    if (/^#[^\s#]/.test(trimmed)) {
      blocks.push({ kind: "tags", items: trimmed.split(/\s+/).filter((t) => t.startsWith("#")) });
      continue;
    }

    blocks.push({ kind: "paragraph", text: trimmed.replace(/\*\*/g, "") });
  }

  flush();
  return blocks;
}

export function ArticleBody({ markdown, className }: { markdown: string; className?: string }) {
  const blocks = parseBlocks(markdown);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {blocks.map((block, i) => {
        const key = `${block.kind}-${i}`;

        if (block.kind === "heading") {
          return block.level === 2 ? (
            <h3
              key={key}
              className="mt-2 border-l-3 border-primary pl-2.5 text-[15px] font-bold tracking-tight"
            >
              {block.text}
            </h3>
          ) : (
            <h4 key={key} className="mt-2 text-[15px] font-bold tracking-tight">
              {block.text}
            </h4>
          );
        }

        if (block.kind === "list") {
          return (
            <ul key={key} className="flex flex-col gap-1.5">
              {block.items.map((item, n) => (
                <li key={`${item}-${n}`} className="flex gap-2 text-[14px] leading-relaxed">
                  <span
                    className={cn(
                      "mt-1.5 shrink-0",
                      block.checklist
                        ? "size-3.5 rounded-[4px] border border-primary/50"
                        : "size-1.5 rounded-full bg-primary/60",
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">{item}</span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.kind === "table") {
          const [head, ...body] = block.rows;
          return (
            <div key={key} className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-muted/60">
                  <tr>
                    {head?.map((cell, n) => (
                      <th key={`${cell}-${n}`} className="px-3 py-2 font-semibold">
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, n) => (
                    <tr key={`row-${n}`} className="border-t border-border">
                      {row.map((cell, m) => (
                        <td key={`${cell}-${m}`} className="px-3 py-2 align-top">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }

        if (block.kind === "quote") {
          return (
            <p
              key={key}
              className="rounded-xl bg-muted/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground"
            >
              {block.text}
            </p>
          );
        }

        if (block.kind === "qa") {
          return (
            <div key={key} className="rounded-xl bg-muted/40 px-4 py-3">
              <p className="text-[14px] font-semibold">Q. {block.question}</p>
              {block.answer && (
                <p className="mt-1 text-[14px] leading-relaxed text-muted-foreground">
                  A. {block.answer}
                </p>
              )}
            </div>
          );
        }

        if (block.kind === "tags") {
          return (
            <p key={key} className="flex flex-wrap gap-1.5">
              {block.items.map((tag) => (
                <span key={tag} className="rounded-md bg-accent px-2 py-0.5 text-[12px] text-accent-foreground">
                  {tag}
                </span>
              ))}
            </p>
          );
        }

        return (
          <p key={key} className="text-[14px] leading-[1.85]">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}

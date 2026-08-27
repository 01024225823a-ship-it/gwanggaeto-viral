import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod";
import { parseConstraints } from "@/lib/ai-blog/constraints";
import type { AiBlogConstraints } from "@/lib/ai-blog/constraints";
import { generateImagesFromDesigns } from "@/lib/ai-blog/image-provider";
import {
  buildArticlePrompt,
  buildRevisePrompt,
  buildReviseSystemPrompt,
  buildSystemPrompt,
} from "@/lib/ai-blog/prompts";
import { getReferenceResolver } from "@/lib/ai-blog/references";
import type { AiBlogService } from "@/lib/ai-blog/service";
import type { AiBlogServerConfig } from "@/lib/ai-blog/server/config";
import { AiBlogGenerationError } from "@/lib/ai-blog/server/errors";
import { designVisualsWithClaude } from "@/lib/ai-blog/server/visual-designer";
import { planVisualsWithClaude } from "@/lib/ai-blog/server/visual-planner";
import {
  planInfoVisualsWithClaude,
  reviseInfoVisualWithClaude,
} from "@/lib/ai-blog/server/info-visual-planner";
import type {
  AiBlogArticle,
  AiBlogArticleType,
  AiBlogDraft,
  AiBlogInput,
  AiBlogTable,
  RelevanceReport,
} from "@/lib/ai-blog/types";
import { getRelevanceValidator } from "@/lib/ai-blog/validate";
import { articleToDraft } from "@/lib/ai-blog/article";

/**
 * Anthropic Claude 기반 원고 생성·수정 구현 (서버 전용).
 *
 * 흐름: 라우트 핸들러 → 이 서비스 → Anthropic API
 * 브라우저에서 직접 Anthropic 을 호출하지 않는다. API Key 는 이 계층에서만 쓴다.
 *
 * 결과는 문자열이 아니라 구조화 JSON 으로 받는다(structured outputs).
 * 그래서 기존 AiBlogArticle 타입으로 그대로 옮겨 담을 수 있고,
 * 편집·미리보기·이미지 제작 단계가 손대지 않아도 동작한다.
 */

/* ------------------------------------------------------------------ */
/* 응답 스키마                                                          */
/* ------------------------------------------------------------------ */

const ArticleSchema = z.object({
  title: z.string().describe("블로그 제목. 주제가 드러나야 하며 40자 이내."),
  intro: z
    .string()
    .describe("도입부. 2~3개 문단을 빈 줄 두 개로 구분한 하나의 문자열. 마크다운 기호는 쓰지 않는다."),
  summary: z.array(z.string()).describe("핵심 요약 3~5개. 각 항목은 한 문장."),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("소제목. 번호는 붙이지 않는다."),
        paragraphs: z
          .array(z.string())
          .describe("문단 배열. 각 문단은 3~4줄 분량의 평문. 마크다운 기호는 쓰지 않는다."),
      }),
    )
    .describe("본문 소제목 3~6개."),
  table: z
    .object({
      caption: z.string().describe("표 위에 붙일 한 줄 설명."),
      columns: z.array(z.string()).describe("열 제목 2개."),
      rows: z.array(z.array(z.string())).describe("행 배열. 각 행은 열 개수와 같은 길이."),
    })
    .nullable()
    .describe("정리 표. 주제에 표가 어울리지 않으면 null."),
  checklist: z.array(z.string()).describe("독자가 확인할 체크리스트. 필요 없으면 빈 배열."),
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("자주 묻는 질문 3개 내외. 필요 없으면 빈 배열."),
  outro: z.string().describe("마무리 문단."),
  disclaimer: z
    .string()
    .describe("분야 특성상 필요한 안내 문구. 필요 없으면 빈 문자열."),
});

/**
 * 1인칭 독백형 전용 스키마.
 *
 * 필드 구성은 같지만 설명(describe)이 다르다.
 * 구조화 출력에서는 필드 설명이 곧 지시문이라, 같은 스키마를 쓰면
 * "핵심 요약 3~5개" 같은 설명 때문에 독백형에도 요약·FAQ 가 붙는다.
 */
const MonologueArticleSchema = z.object({
  title: z.string().describe("블로그 제목. 40자 이내. 광고 문구가 아니라 담백한 1인칭 제목."),
  intro: z
    .string()
    .describe(
      "도입부. 이 주제를 알아보게 된 계기와 처음 느낀 고민을 1인칭으로. 2~3개 문단을 빈 줄 두 개로 구분한 하나의 문자열.",
    ),
  summary: z.array(z.string()).describe("독백형에서는 쓰지 않는다. 반드시 빈 배열."),
  sections: z
    .array(
      z.object({
        heading: z
          .string()
          .describe("그 대목의 생각을 담은 짧은 소제목. 번호를 붙이지 않는다. 목차 제목처럼 쓰지 않는다."),
        paragraphs: z
          .array(z.string())
          .describe(
            "문단 배열. 1인칭 생각 흐름으로 쓴 평문. 짧은 문장과 중간 길이 문장을 섞는다. 마크다운 기호는 쓰지 않는다.",
          ),
      }),
    )
    .describe("본문 소제목 3~5개."),
  table: z
    .object({
      caption: z.string(),
      columns: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .nullable()
    .describe("독백형에서는 쓰지 않는다. 반드시 null."),
  checklist: z.array(z.string()).describe("독백형에서는 쓰지 않는다. 반드시 빈 배열."),
  faqs: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .describe("독백형에서는 쓰지 않는다. 반드시 빈 배열."),
  outro: z.string().describe("최종적으로 관심을 갖게 된 이유를 1인칭으로 정리한 마무리 문단."),
  disclaimer: z
    .string()
    .describe("분야 특성상 필요한 안내 문구. 필요 없으면 빈 문자열."),
});

const DraftSchema = z.object({
  title: z.string().describe("수정된 제목. 제목 변경 요청이 아니면 원문 그대로."),
  body: z.string().describe("수정된 본문 전체. 지정된 마크다운 형식을 그대로 유지한다."),
});

type ParsedArticle = z.infer<typeof ArticleSchema>;

/* ------------------------------------------------------------------ */
/* 클라이언트                                                           */
/* ------------------------------------------------------------------ */

/** 라우트 제한시간(60초) 안에 끝나도록 SDK 쪽 상한을 더 짧게 잡는다 */
const REQUEST_TIMEOUT_MS = 45_000;

/** 검증 실패 후 재생성을 시도할지 판단하는 기준 (경과 시간) */
const RETRY_DEADLINE_MS = 25_000;

let cached: { key: string; client: Anthropic } | null = null;

function getClient(apiKey: string): Anthropic {
  if (cached?.key === apiKey) return cached.client;
  const client = new Anthropic({
    apiKey,
    timeout: REQUEST_TIMEOUT_MS,
    // 일시적인 429·5xx 만 1회 재시도한다. 라우트 제한시간을 넘기지 않기 위한 값.
    maxRetries: 1,
  });
  cached = { key: apiKey, client };
  return client;
}

/* ------------------------------------------------------------------ */
/* 변환                                                                 */
/* ------------------------------------------------------------------ */

function toTable(parsed: ParsedArticle["table"]): AiBlogTable | undefined {
  if (!parsed || parsed.rows.length === 0) return undefined;
  return {
    caption: parsed.caption,
    columns: [parsed.columns[0] ?? "확인 항목", parsed.columns[1] ?? "확인 내용"],
    rows: parsed.rows.map((row) => [row[0] ?? "", row[1] ?? ""] as [string, string]),
  };
}

function toArticle(
  parsed: ParsedArticle,
  input: AiBlogInput,
  constraints: AiBlogConstraints,
): AiBlogArticle {
  const outro = [parsed.outro.trim(), parsed.disclaimer.trim()].filter(Boolean).join("\n\n");

  /**
   * 1인칭 독백형은 요약·표·체크리스트·FAQ 를 쓰지 않는다.
   * 프롬프트로 이미 막지만, 모델이 습관적으로 채워 보내는 경우가 있어
   * 여기서 한 번 더 걸러낸다. 사용자가 명시적으로 요청한 것만 남긴다.
   */
  const monologue = input.articleType === "monologue";
  const keep = {
    summary: !monologue,
    table: !monologue || constraints.includeTable,
    checklist: !monologue || constraints.includeChecklist,
    faqs: !monologue || constraints.includeFaq,
  };

  return {
    title: parsed.title.trim(),
    intro: parsed.intro.trim(),
    summary: keep.summary ? parsed.summary.filter(Boolean) : [],
    sections: parsed.sections.map((section) => ({
      heading: section.heading.replace(/^\d+\.\s*/, "").trim(),
      paragraphs: section.paragraphs.filter(Boolean),
    })),
    table: keep.table ? toTable(parsed.table) : undefined,
    checklist: keep.checklist ? parsed.checklist.filter(Boolean) : [],
    faqs: keep.faqs ? parsed.faqs.filter((faq) => faq.question && faq.answer) : [],
    outro,
    // 참고자료는 Claude 가 본문에 녹여 쓰므로 별도 블록을 만들지 않는다
    articleType: input.articleType,
    generatedAt: new Date().toISOString(),
    source: "AI",
  };
}

/** 응답이 실제로 쓸 수 있는 원고인지 (빈 응답·구조 붕괴 방지) */
function isUsable(parsed: ParsedArticle | null | undefined): parsed is ParsedArticle {
  return (
    !!parsed &&
    parsed.title.trim().length > 0 &&
    parsed.intro.trim().length > 0 &&
    parsed.sections.length > 0 &&
    parsed.sections.some((s) => s.paragraphs.some((p) => p.trim().length > 0))
  );
}

/** stop_reason 을 확인해 사용자에게 설명 가능한 오류로 바꾼다 */
function assertCompleted(stopReason: string | null): void {
  if (stopReason === "refusal") {
    throw new AiBlogGenerationError(
      "입력하신 내용으로는 원고를 만들 수 없습니다. 주제나 요청사항을 조정해 다시 시도해 주세요.",
    );
  }
  if (stopReason === "max_tokens") {
    throw new AiBlogGenerationError(
      "원고가 너무 길어 중간에서 끊겼습니다. 글 분량을 줄여서 다시 시도해 주세요.",
    );
  }
}

/* ------------------------------------------------------------------ */
/* 서비스                                                               */
/* ------------------------------------------------------------------ */

export function createClaudeAiBlogService(config: AiBlogServerConfig): AiBlogService {
  const client = getClient(config.apiKey ?? "");
  const effort = config.effort ? { effort: config.effort } : {};

  /**
   * 원고 요청.
   *
   * 원고 유형에 따라 시스템 프롬프트와 응답 스키마가 함께 바뀐다.
   * 독백형은 "보고서 형식"을 요구하는 기본 스키마를 쓰면 안 되기 때문이다.
   */
  async function requestArticle(
    userPrompt: string,
    articleType: AiBlogArticleType,
  ): Promise<ParsedArticle | null> {
    const schema = articleType === "monologue" ? MonologueArticleSchema : ArticleSchema;

    const stream = client.messages.stream({
      model: config.model,
      max_tokens: 32_000,
      thinking: { type: "adaptive" },
      system: buildSystemPrompt(articleType),
      output_config: { format: zodOutputFormat(schema), ...effort },
      messages: [{ role: "user", content: userPrompt }],
    });

    const message = await stream.finalMessage();
    assertCompleted(message.stop_reason);
    return message.parsed_output ?? null;
  }

  return {
    mode: "AI",

    async generateBlogArticle(input: AiBlogInput): Promise<AiBlogArticle> {
      const startedAt = Date.now();

      const constraints = parseConstraints(input.requestNotes);
      const resolved = await getReferenceResolver().resolve(input.references);
      const basePrompt = buildArticlePrompt(input, { resolved, constraints });

      let parsed = await requestArticle(basePrompt, input.articleType);

      // 구조화 파싱 실패 — 깨진 결과를 보여주지 않고 형식을 다시 못박아 1회만 재시도
      if (!isUsable(parsed)) {
        parsed = await requestArticle(
          `${basePrompt}\n\n[재요청] 앞선 응답이 형식에 맞지 않았습니다. 지정된 JSON 구조를 정확히 지켜 다시 작성해 주세요. 모든 필드를 빠짐없이 채웁니다.`,
          input.articleType,
        );
      }
      if (!isUsable(parsed)) {
        throw new AiBlogGenerationError(
          "원고 형식을 만드는 데 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      let article = toArticle(parsed, input, constraints);

      // 기존 주제 관련성 검증을 그대로 적용한다
      const validator = getRelevanceValidator();
      let report: RelevanceReport = await validator.validate(articleToDraft(article), input);

      // 주제에서 벗어났으면 무엇이 문제인지 알려주고 딱 1회만 다시 생성한다 (무한 재시도 금지)
      if (!report.ok && Date.now() - startedAt < RETRY_DEADLINE_MS) {
        const issues = report.issues.map((issue) => `- ${issue.message}`).join("\n");
        const retry = await requestArticle(
          [
            basePrompt,
            "",
            "[재작성 요청] 직전 결과가 아래 문제로 반려되었습니다. 같은 문제가 반복되지 않도록 다시 작성해 주세요.",
            issues,
            `특히 "${input.topic}" 라는 주제를 제목·도입·소제목·마무리 전체에서 일관되게 다뤄야 합니다.`,
          ].join("\n"),
          input.articleType,
        );

        if (isUsable(retry)) {
          const retryArticle = toArticle(retry, input, constraints);
          const retryReport = await validator.validate(articleToDraft(retryArticle), input);
          // 더 나아졌을 때만 교체한다
          if (retryReport.score > report.score) {
            article = retryArticle;
            report = retryReport;
          }
        }
      }

      // 검증에 계속 실패해도 결과는 돌려준다. 화면이 경고와 "다시 생성" 버튼을 띄운다.
      return { ...article, relevance: report };
    },

    async reviseBlogArticle(draft, instruction, input): Promise<AiBlogDraft> {
      const stream = client.messages.stream({
        model: config.model,
        max_tokens: 32_000,
        thinking: { type: "adaptive" },
        system: buildReviseSystemPrompt(input.articleType),
        output_config: { format: zodOutputFormat(DraftSchema), ...effort },
        messages: [{ role: "user", content: buildRevisePrompt(draft, instruction, input) }],
      });

      const message = await stream.finalMessage();
      assertCompleted(message.stop_reason);

      const parsed = message.parsed_output;
      if (!parsed || !parsed.body.trim()) {
        throw new AiBlogGenerationError(
          "원고 수정 결과를 받지 못했습니다. 잠시 후 다시 시도해 주세요.",
        );
      }

      return {
        title: parsed.title.trim() || draft.title,
        body: parsed.body.trim(),
      };
    },

    // 최종 원고에서 시각화할 정보를 뽑아 정보 이미지 기획을 만든다 (현재 기본 경로)
    planInfoVisuals(request) {
      return planInfoVisualsWithClaude(client, config, request);
    },

    // 이미지 한 장의 기획만 다시 만든다
    reviseInfoVisual(request) {
      return reviseInfoVisualWithClaude(client, config, request);
    },

    // [LEGACY] 원고를 분석해 실사·일러스트 비주얼 기획안을 만든다
    planVisualContent(request) {
      return planVisualsWithClaude(client, config, request);
    },

    // [LEGACY] 콘텐츠 기획을 어떻게 보여줄지 디자인한다 (레이아웃·시각 요소 결정)
    designVisualContent(request) {
      return designVisualsWithClaude(client, config, request);
    },

    // [LEGACY] 이미지 생성 Provider 로 비주얼을 만든다
    generateImages(request) {
      return generateImagesFromDesigns(request);
    },
  };
}

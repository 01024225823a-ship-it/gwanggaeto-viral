import Anthropic from "@anthropic-ai/sdk";
import * as z from "zod";
import { AiBlogConfigError } from "@/lib/ai-blog/server/config";
import { AiBlogAuthError, AiBlogRateLimitError } from "@/lib/ai-blog/server/guard";

/**
 * 오류를 사용자에게 보여줄 수 있는 형태로 바꾼다.
 *
 * 원본 오류 메시지(모델명·요청 본문·키 일부가 섞일 수 있다)는 절대 그대로 내보내지 않고,
 * 서버 로그에만 남긴다. 클라이언트에는 무엇을 해야 하는지 알 수 있는 한국어 문구만 준다.
 */

export class AiBlogGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiBlogGenerationError";
  }
}

export interface AiBlogErrorBody {
  error: { code: string; message: string };
}

export interface MappedError {
  status: number;
  body: AiBlogErrorBody;
}

export function mapError(error: unknown): MappedError {
  // 서버 로그에는 원본을 남긴다 (배포 환경 로그에서 원인 추적)
  console.error("[ai-blog] request failed:", error);

  if (error instanceof z.ZodError) {
    return {
      status: 400,
      body: {
        error: {
          code: "invalid_input",
          message: "입력값을 확인해 주세요. 주제·키워드·분량이 올바른지 다시 확인해 주세요.",
        },
      },
    };
  }

  if (error instanceof AiBlogAuthError) {
    return { status: 401, body: { error: { code: "unauthorized", message: error.message } } };
  }

  if (error instanceof AiBlogRateLimitError) {
    return { status: 429, body: { error: { code: "rate_limited", message: error.message } } };
  }

  if (error instanceof AiBlogConfigError) {
    return {
      status: 503,
      body: {
        error: {
          code: "not_configured",
          message: "AI 원고 생성이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.",
        },
      },
    };
  }

  if (error instanceof Anthropic.AuthenticationError) {
    return {
      status: 503,
      body: {
        error: {
          code: "ai_auth",
          message: "AI 서비스 인증에 실패했습니다. 관리자에게 문의해 주세요.",
        },
      },
    };
  }

  if (error instanceof Anthropic.RateLimitError) {
    return {
      status: 429,
      body: {
        error: {
          code: "ai_rate_limited",
          message: "AI 서비스 요청이 몰리고 있습니다. 잠시 후 다시 시도해 주세요.",
        },
      },
    };
  }

  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return {
      status: 504,
      body: {
        error: {
          code: "ai_timeout",
          message:
            "AI 응답이 지연되고 있습니다. 잠시 후 다시 시도하거나 글 분량을 줄여서 생성해 주세요.",
        },
      },
    };
  }

  if (error instanceof Anthropic.APIConnectionError) {
    return {
      status: 502,
      body: {
        error: {
          code: "ai_unreachable",
          message: "AI 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        },
      },
    };
  }

  if (error instanceof Anthropic.BadRequestError) {
    return {
      status: 400,
      body: {
        error: {
          code: "ai_bad_request",
          message: "입력 내용을 처리할 수 없습니다. 주제와 요청사항을 조금 줄여서 다시 시도해 주세요.",
        },
      },
    };
  }

  if (error instanceof Anthropic.APIError) {
    return {
      status: 502,
      body: {
        error: {
          code: "ai_error",
          message: "AI 서비스에서 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
      },
    };
  }

  if (error instanceof AiBlogGenerationError) {
    return { status: 502, body: { error: { code: "generation_failed", message: error.message } } };
  }

  return {
    status: 500,
    body: {
      error: { code: "unknown", message: "원고 생성에 실패했습니다. 잠시 후 다시 시도해 주세요." },
    },
  };
}

/**
 * 카페 게시글 원고 유형.
 *
 * 카페 게시글 배포 주문 시 고객이 원고를 어떤 방식으로 쓸지 고르고,
 * 실행사는 작업 상세에서 같은 기준을 그대로 확인한다.
 * 값(review/question/information)은 주문에 저장되므로 바꾸지 말 것.
 */

export type ContentType = "review" | "question" | "information";

export interface ContentTypeInfo {
  id: ContentType;
  /** 화면 표시명 */
  label: string;
  /** 카드에 한 줄로 보여주는 요약 */
  short: string;
  /** 간단 설명 */
  description: string;
  /** 원고 흐름 */
  flow: string[];
  /** 예시 원고 */
  sample: string;
  /** 작성 시 주의사항 */
  note?: string;
}

export const CONTENT_TYPES: ContentTypeInfo[] = [
  {
    id: "review",
    label: "후기형",
    short: "직접 경험한 것처럼 자연스럽게 후기 전달",
    description: "직접 경험한 것처럼 자연스럽게 후기를 전달하는 방식",
    flow: [
      "사용 전 상황/고민",
      "제품·서비스를 알게 된 계기",
      "실제 이용/경험 내용",
      "좋았던 점이나 변화",
      "자연스러운 마무리",
    ],
    sample: `요즘 ○○ 때문에 고민이 많았는데,
찾아보다가 ○○를 알게 됐어요.

처음에는 큰 기대 없이 이용해봤는데
생각보다 ○○ 부분이 괜찮더라고요.

특히 ○○한 점이 마음에 들었고
비슷한 고민 있으신 분들은 참고해보셔도 좋을 것 같아요.`,
    note: "체험 사실을 임의로 단정하지 않고, 광고주가 제공한 사실과 자료를 기준으로 작성합니다.",
  },
  {
    id: "question",
    label: "질문형",
    short: "고민·질문을 통해 자연스럽게 의견 유도",
    description: "고민이나 궁금한 점을 질문하며 자연스럽게 의견을 유도하는 방식",
    flow: ["현재 상황/고민", "알아본 내용", "제품·서비스 언급", "궁금한 점", "회원들의 의견 요청"],
    sample: `요즘 ○○ 때문에 알아보고 있는데
생각보다 선택지가 많아서 고민되네요.

찾아보니 ○○도 많이 보이던데
혹시 이용해보신 분 계실까요?

○○ 부분이 가장 궁금한데
경험 있으신 분들 의견 부탁드려요.`,
  },
  {
    id: "information",
    label: "정보형",
    short: "정보 제공 중심으로 자연스럽게 내용 전달",
    description: "유용한 정보를 전달하면서 관련 제품·서비스를 자연스럽게 소개하는 방식",
    flow: [
      "주제/문제 제시",
      "관련 정보 정리",
      "알아두면 좋은 내용",
      "제품·서비스 관련 정보",
      "참고용 마무리",
    ],
    sample: `○○ 알아보시는 분들이 많아서
확인할 때 보면 좋은 내용을 정리해봤어요.

우선 ○○를 선택할 때는
가격뿐 아니라 ○○와 ○○도 같이 확인하는 게 좋다고 합니다.

관련해서 찾아보니 ○○ 같은 서비스도 있어서
비교하실 때 같이 참고해보시면 좋을 것 같아요.`,
  },
];

const BY_ID = new Map(CONTENT_TYPES.map((t) => [t.id, t]));

export function findContentType(id?: string): ContentTypeInfo | undefined {
  return id ? BY_ID.get(id as ContentType) : undefined;
}

/** 화면 표시명 — 알 수 없는 값은 그대로 돌려준다 */
export function contentTypeLabel(id?: string): string {
  if (!id) return "";
  return BY_ID.get(id as ContentType)?.label ?? id;
}

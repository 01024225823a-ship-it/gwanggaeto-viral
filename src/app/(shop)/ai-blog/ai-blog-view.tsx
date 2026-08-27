"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiBlogSteps } from "@/components/ai-blog/ai-blog-steps";
import { AiDemoBadge } from "@/components/ai-blog/ai-notice";
import { ArticleEditor } from "@/components/ai-blog/article-editor";
import { ArticleGenerating, ArticleResult } from "@/components/ai-blog/article-result";
import { AiBlogInputForm } from "@/components/ai-blog/input-form";
import { InfoResultView } from "@/components/ai-blog/info-result-view";
import { InfoVisualOptions, InfoVisualPlanning } from "@/components/ai-blog/info-visual-options";
import type { InfoVisualOptionValue } from "@/components/ai-blog/info-visual-options";
import { RecentProjects } from "@/components/ai-blog/recent-projects";
import { articleToDraft, countChars, outlineFromDraft } from "@/lib/ai-blog/article";
import { parseConstraints } from "@/lib/ai-blog/constraints";
import {
  DEFAULT_INFO_RATIO,
  DEFAULT_INFO_STYLE,
  DEFAULT_INFO_THUMBNAIL_RATIO,
  nextInfoStyle,
  recommendInfoCount,
  toInfoImages,
  withInfoPlanIds,
} from "@/lib/ai-blog/info-visual";
import { getReferenceResolver } from "@/lib/ai-blog/references";
import { getAiBlogService } from "@/lib/ai-blog/service";
import {
  createAiBlogProject,
  findAiBlogProject,
  removeAiBlogProject,
  saveAiBlogProject,
  useAiBlogProjects,
} from "@/lib/ai-blog/storage";
import type {
  AiBlogDraft,
  AiBlogInput,
  AiBlogProject,
  AiBlogReviseInstruction,
  AiBlogSource,
  InfoVisualImage,
  InfoVisualPlan,
  InfoVisualStyle,
} from "@/lib/ai-blog/types";
import { checkTopicRelevance } from "@/lib/ai-blog/validate";
import { AI_BLOG_TOOL } from "@/lib/domain/service-tools";
import { useSession } from "@/lib/store/session";

const DEFAULT_INPUT: AiBlogInput = {
  topic: "",
  keywords: [],
  category: "etc",
  purpose: "info",
  target: "",
  articleType: "expert",
  articleLength: 2_000,
  references: [],
  requestNotes: "",
};

const DEFAULT_IMAGE_OPTIONS: InfoVisualOptionValue = {
  style: DEFAULT_INFO_STYLE,
  infoCount: 4,
  withThumbnail: true,
  ratio: DEFAULT_INFO_RATIO,
  thumbnailRatio: DEFAULT_INFO_THUMBNAIL_RATIO,
};

const GENERATING_STEPS = [
  "주제와 키워드를 확인하고 있어요",
  "글 구조를 잡고 있어요",
  "본문 · 표 · FAQ를 작성하고 있어요",
];

/**
 * AI 블로그 콘텐츠 제작 — 단계형 제작 화면.
 *
 * 주문 상품이 아니라 도구형 서비스이므로 주문/검수 흐름을 타지 않는다.
 * 비로그인 사용자도 입력 화면을 볼 수 있고, 실제 생성 시점에만 로그인을 요구한다.
 * AI 호출은 전부 lib/ai-blog/service.ts를 통해서만 한다.
 *
 * 이미지 경로는 "정보 이미지" 하나뿐이다.
 *   최종 원고 → Claude(정보 추출·재구성) → InfoVisualPlan → SVG/Canvas → PNG
 * 이미지 생성 API 를 호출하지 않으므로, 기획을 받으면 그 자리에서 바로 결과가 나온다.
 */
export function AiBlogView() {
  const { account } = useSession();
  const customerId = account?.role === "CUSTOMER" ? account.customerId : undefined;
  const canUse = !!customerId;
  const projects = useAiBlogProjects(customerId);

  const [step, setStep] = useState(1);
  const [reached, setReached] = useState(1);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [input, setInput] = useState<AiBlogInput>(DEFAULT_INPUT);
  const [draft, setDraft] = useState<AiBlogDraft | null>(null);
  // 원고를 실제 AI 가 만들었는지 템플릿 Mock 이 만들었는지 (배지 표시용)
  const [articleSource, setArticleSource] = useState<AiBlogSource>("AI");
  const [generating, setGenerating] = useState(false);
  const [revisingLabel, setRevisingLabel] = useState<string | null>(null);

  // STEP 4·5 — 정보 이미지
  const [imageOptions, setImageOptions] = useState<InfoVisualOptionValue>(DEFAULT_IMAGE_OPTIONS);
  const [infoPlans, setInfoPlans] = useState<InfoVisualPlan[] | null>(null);
  const [planning, setPlanning] = useState(false);
  const [busyImageId, setBusyImageId] = useState<string | null>(null);
  /** 카드별 "다른 디자인" — 전체 스타일을 건드리지 않고 그 장만 바꾼다 */
  const [styleOverrides, setStyleOverrides] = useState<Record<string, InfoVisualStyle>>({});

  const outline = draft ? outlineFromDraft(draft) : null;
  // 추가 요청사항 해석 결과와 주제 반영도는 현재 원고 기준으로 매번 다시 계산한다
  const constraints = parseConstraints(input.requestNotes);
  const relevance = draft ? checkTopicRelevance(draft, input) : null;
  const unreadUrlCount = getReferenceResolver().canFetchUrl
    ? 0
    : input.references.filter((r) => r.kind === "url").length;

  const images: InfoVisualImage[] = infoPlans
    ? toInfoImages(
        infoPlans,
        imageOptions.style,
        imageOptions.ratio,
        imageOptions.thumbnailRatio,
        styleOverrides,
      )
    : [];

  function goStep(next: number) {
    setStep(next);
    setReached((prev) => Math.max(prev, next));
  }

  /** 현재 상태를 작업물로 저장한다 (로그인 사용자만) */
  function persist(patch: Partial<AiBlogProject>) {
    if (!customerId) return;
    const base =
      (projectId ? findAiBlogProject(projectId) : undefined) ??
      createAiBlogProject(input, customerId);
    const next: AiBlogProject = {
      ...base,
      ...input,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    saveAiBlogProject(next);
    if (next.id !== projectId) setProjectId(next.id);
  }

  /** 이미지 기획 결과를 저장한다 (스타일·비율까지 함께 남긴다) */
  function persistImages(plans: InfoVisualPlan[]) {
    persist({
      infoVisuals: plans,
      infoVisualStyle: imageOptions.style,
      infoRatio: imageOptions.ratio,
      infoThumbnailRatio: imageOptions.thumbnailRatio,
    });
  }

  async function generate() {
    if (!canUse) return;
    setGenerating(true);
    goStep(2);
    try {
      const article = await getAiBlogService().generateBlogArticle(input);
      const nextDraft = articleToDraft(article);
      setDraft(nextDraft);
      setArticleSource(article.source);
      setInfoPlans(null);
      setStyleOverrides({});
      persist({
        generatedArticle: article,
        editedArticle: nextDraft,
        infoVisuals: [],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "원고 생성에 실패했습니다.");
      goStep(1);
    } finally {
      setGenerating(false);
    }
  }

  async function revise(instruction: AiBlogReviseInstruction) {
    if (!draft) return;
    setRevisingLabel(instruction.label);
    try {
      const next = await getAiBlogService().reviseBlogArticle(draft, instruction, input);
      setDraft(next);
      persist({ editedArticle: next });
      toast.success(`${instruction.label} 반영했습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "원고 수정에 실패했습니다.");
    } finally {
      setRevisingLabel(null);
    }
  }

  /** 원고를 확정하고 이미지 단계로 넘어간다 — 분량에 맞는 장수를 미리 채워둔다 */
  function confirmArticle() {
    if (!draft) return;
    persist({ editedArticle: draft });
    if (!infoPlans) {
      const recommended = recommendInfoCount(outlineFromDraft(draft), input.articleLength);
      setImageOptions((prev) => ({ ...prev, infoCount: recommended }));
    }
    goStep(4);
  }

  /* ---------------- STEP 4 — 이미지 기획 ---------------- */

  /** 이미 만든 기획이 현재 구성(장수·대표 이미지 포함 여부)과 같은지 */
  function planMatchesOptions(): boolean {
    if (!infoPlans || infoPlans.length === 0) return false;
    const thumbnails = infoPlans.filter((plan) => plan.type === "thumbnail").length;
    return (
      infoPlans.length - thumbnails === imageOptions.infoCount &&
      thumbnails === (imageOptions.withThumbnail ? 1 : 0)
    );
  }

  /**
   * 최종 원고를 분석해 정보 이미지 기획을 받는다.
   *
   * 스타일·비율만 바뀐 경우에는 AI 를 다시 부르지 않는다.
   * 렌더링은 브라우저에서 하므로 같은 기획을 다른 스타일로 바로 다시 그릴 수 있다.
   */
  async function planImages() {
    if (!draft) return;

    if (planMatchesOptions()) {
      goStep(5);
      toast.success("선택한 스타일로 다시 그렸습니다.");
      return;
    }

    setPlanning(true);
    try {
      const result = await getAiBlogService().planInfoVisuals({
        draft,
        input,
        infoCount: imageOptions.infoCount,
        withThumbnail: imageOptions.withThumbnail,
        // 이미 본 기획이 있으면 다른 각도를 요청한다
        exclude: (infoPlans ?? []).map((plan) => plan.title),
      });

      setInfoPlans(result.plans);
      setStyleOverrides({});
      persistImages(result.plans);
      goStep(5);

      if (!result.overlap.ok) {
        toast.warning("원고와 표현이 겹치는 문구가 남아 있습니다. 수정 요청으로 다듬어 보세요.");
      }
      toast.success(`이미지 ${result.plans.length}장을 만들었습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 기획에 실패했습니다.");
    } finally {
      setPlanning(false);
    }
  }

  /* ---------------- STEP 5 — 이미지 한 장만 수정 ---------------- */

  /** 같은 정보를 다른 스타일로 다시 그린다 (AI 호출 없음) */
  function restyleImage(image: InfoVisualImage) {
    setStyleOverrides((prev) => ({ ...prev, [image.id]: nextInfoStyle(image.style) }));
  }

  /** 이미지 한 장의 기획만 교체한다 — 다른 이미지에는 영향이 없다 */
  async function replacePlan(image: InfoVisualImage, instruction?: string) {
    if (!draft || !infoPlans) return;

    setBusyImageId(image.id);
    try {
      const result = await getAiBlogService().reviseInfoVisual({
        draft,
        input,
        plan: image.plan,
        instruction,
        siblingTitles: infoPlans
          .filter((plan) => plan.id !== image.plan.id)
          .map((plan) => plan.title),
      });

      const next = withInfoPlanIds(
        infoPlans.map((plan) => (plan.id === image.plan.id ? result.plan : plan)),
      );
      setInfoPlans(next);
      persistImages(next);
      toast.success(instruction ? "수정 요청을 반영했습니다." : "이미지를 다시 만들었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지를 다시 만들지 못했습니다.");
    } finally {
      setBusyImageId(null);
    }
  }

  /* ---------------- 작업물 ---------------- */

  function openProject(project: AiBlogProject) {
    setProjectId(project.id);
    setInput({
      topic: project.topic,
      keywords: project.keywords,
      category: project.category,
      purpose: project.purpose,
      target: project.target,
      articleType: project.articleType,
      articleLength: project.articleLength,
      references: project.references,
      requestNotes: project.requestNotes,
    });
    const restored =
      project.editedArticle ??
      (project.generatedArticle ? articleToDraft(project.generatedArticle) : null);
    setDraft(restored);
    setArticleSource(project.generatedArticle?.source ?? "AI");

    // 정보 이미지 기획이 없는 예전 작업물은 원고만 복원하고 이미지는 다시 만든다
    const plans = project.infoVisuals ?? [];
    setInfoPlans(plans.length > 0 ? plans : null);
    setStyleOverrides({});

    const thumbnails = plans.filter((plan) => plan.type === "thumbnail").length;
    setImageOptions({
      style: project.infoVisualStyle ?? DEFAULT_INFO_STYLE,
      infoCount:
        plans.length > 0
          ? Math.max(1, plans.length - thumbnails)
          : DEFAULT_IMAGE_OPTIONS.infoCount,
      withThumbnail: plans.length > 0 ? thumbnails > 0 : DEFAULT_IMAGE_OPTIONS.withThumbnail,
      ratio: project.infoRatio ?? DEFAULT_INFO_RATIO,
      thumbnailRatio: project.infoThumbnailRatio ?? DEFAULT_INFO_THUMBNAIL_RATIO,
    });

    const next = plans.length > 0 ? 5 : restored ? 3 : 1;
    setStep(next);
    setReached(next);
  }

  function restart() {
    setProjectId(null);
    setInput(DEFAULT_INPUT);
    setDraft(null);
    setArticleSource("AI");
    setImageOptions(DEFAULT_IMAGE_OPTIONS);
    setInfoPlans(null);
    setStyleOverrides({});
    setStep(1);
    setReached(1);
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{AI_BLOG_TOOL.name}</h1>
          <AiDemoBadge />
        </div>
        <p className="text-[13px] text-muted-foreground sm:text-[15px]">
          {AI_BLOG_TOOL.description}
        </p>
      </header>

      <AiBlogSteps current={step} reached={reached} onSelect={goStep} />

      {step === 1 && (
        <>
          {canUse && (
            <RecentProjects
              projects={projects}
              onOpen={openProject}
              onRemove={(id) => {
                removeAiBlogProject(id);
                if (id === projectId) restart();
                toast.success("삭제했습니다.");
              }}
            />
          )}
          <AiBlogInputForm
            value={input}
            onChange={(patch) => setInput((prev) => ({ ...prev, ...patch }))}
            onSubmit={generate}
            canUse={canUse}
            submitting={generating}
          />
        </>
      )}

      {step === 2 &&
        (generating || !draft ? (
          <ArticleGenerating steps={GENERATING_STEPS} />
        ) : (
          <ArticleResult
            draft={draft}
            input={input}
            charCount={countChars(draft.body)}
            demo={articleSource === "MOCK"}
            relevance={relevance ?? checkTopicRelevance(draft, input)}
            constraintLabels={constraints.labels}
            unreadUrlCount={unreadUrlCount}
            regenerating={generating}
            onRegenerate={generate}
            onBack={() => setStep(1)}
            onEdit={() => goStep(3)}
          />
        ))}

      {step === 3 &&
        (draft ? (
          <ArticleEditor
            draft={draft}
            input={input}
            relevance={relevance ?? checkTopicRelevance(draft, input)}
            demo={articleSource === "MOCK"}
            onDraftChange={setDraft}
            onRevise={revise}
            revisingLabel={revisingLabel}
            onRegenerate={generate}
            regenerating={generating}
            onConfirm={confirmArticle}
          />
        ) : (
          <ArticleGenerating steps={GENERATING_STEPS} />
        ))}

      {step === 4 &&
        (planning || !outline ? (
          <InfoVisualPlanning />
        ) : (
          <InfoVisualOptions
            outline={outline}
            articleLength={input.articleLength}
            value={imageOptions}
            onChange={(patch) => setImageOptions((prev) => ({ ...prev, ...patch }))}
            onPlan={planImages}
            planning={planning}
            onBack={() => setStep(3)}
          />
        ))}

      {step === 5 && draft && (
        <InfoResultView
          draft={draft}
          input={input}
          images={images}
          busyImageId={busyImageId}
          onEditArticle={() => setStep(3)}
          onRemakeImages={() => goStep(4)}
          onRestart={restart}
          onRestyle={restyleImage}
          onRegenerate={(image) => replacePlan(image)}
          onRevise={(image, instruction) => replacePlan(image, instruction)}
        />
      )}
    </div>
  );
}

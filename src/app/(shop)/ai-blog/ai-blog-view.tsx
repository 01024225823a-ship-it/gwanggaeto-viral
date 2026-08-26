"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { AiBlogSteps } from "@/components/ai-blog/ai-blog-steps";
import { AiDemoBadge } from "@/components/ai-blog/ai-notice";
import { ArticleEditor } from "@/components/ai-blog/article-editor";
import { ArticleGenerating, ArticleResult } from "@/components/ai-blog/article-result";
import { AiBlogInputForm } from "@/components/ai-blog/input-form";
import { ImageOptions, ImagesGenerating } from "@/components/ai-blog/image-options";
import type { ImageOptionValue } from "@/components/ai-blog/image-options";
import { RecentProjects } from "@/components/ai-blog/recent-projects";
import { VisualPlanPicker, VisualPlanning } from "@/components/ai-blog/visual-plan-picker";
import { AiBlogResultView } from "@/components/ai-blog/result-view";
import { articleToDraft, countChars, outlineFromDraft } from "@/lib/ai-blog/article";
import { parseConstraints } from "@/lib/ai-blog/constraints";
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
  AiBlogImageAsset,
  AiBlogInput,
  AiBlogProject,
  AiBlogImageType,
  AiBlogReviseInstruction,
  AiBlogSource,
  VisualOverlapReport,
  VisualPlan,
  VisualPlanSet,
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

const DEFAULT_IMAGE_OPTIONS: ImageOptionValue = {
  types: ["thumbnail", "infographic", "cardnews"],
  style: "clean",
  cardCount: 6,
  thumbnailRatio: "1:1",
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
  const [imageOptions, setImageOptions] = useState<ImageOptionValue>(DEFAULT_IMAGE_OPTIONS);
  const [assets, setAssets] = useState<AiBlogImageAsset[]>([]);
  const [imaging, setImaging] = useState(false);

  // STEP 4-1 이미지 콘텐츠 기획
  const [planSet, setPlanSet] = useState<VisualPlanSet | null>(null);
  const [planOverlap, setPlanOverlap] = useState<VisualOverlapReport | null>(null);
  const [planSource, setPlanSource] = useState<AiBlogSource>("AI");
  const [selectedPlanIds, setSelectedPlanIds] = useState<Partial<Record<AiBlogImageType, string>>>({});
  const [seenConcepts, setSeenConcepts] = useState<string[]>([]);
  const [planning, setPlanning] = useState(false);

  const outline = draft ? outlineFromDraft(draft) : null;
  // 추가 요청사항 해석 결과와 주제 반영도는 현재 원고 기준으로 매번 다시 계산한다
  const constraints = parseConstraints(input.requestNotes);
  const relevance = draft ? checkTopicRelevance(draft, input) : null;
  const unreadUrlCount = getReferenceResolver().canFetchUrl
    ? 0
    : input.references.filter((r) => r.kind === "url").length;

  function goStep(next: number) {
    setStep(next);
    setReached((prev) => Math.max(prev, next));
  }

  /** 현재 상태를 작업물로 저장한다 (로그인 사용자만) */
  function persist(patch: Partial<AiBlogProject>) {
    if (!customerId) return;
    const base = (projectId ? findAiBlogProject(projectId) : undefined) ?? createAiBlogProject(input, customerId);
    const next: AiBlogProject = {
      ...base,
      ...input,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    saveAiBlogProject(next);
    if (next.id !== projectId) setProjectId(next.id);
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
      setAssets([]);
      persist({
        generatedArticle: article,
        editedArticle: nextDraft,
        imagePrompts: [],
        images: [],
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

  function confirmArticle() {
    if (!draft) return;
    persist({ editedArticle: draft });
    goStep(4);
  }

  /** 이미지 구성이 바뀌면 기존 기획안은 버린다 */
  function changeImageOptions(patch: Partial<ImageOptionValue>) {
    setImageOptions((prev) => ({ ...prev, ...patch }));
    if (patch.types || patch.cardCount) {
      setPlanSet(null);
      setSelectedPlanIds({});
      setSeenConcepts([]);
    }
  }

  /** 선택된 기획안 목록 */
  function selectedPlans(): VisualPlan[] {
    if (!planSet) return [];
    return imageOptions.types
      .map((type) => (planSet[type] ?? []).find((plan) => plan.id === selectedPlanIds[type]))
      .filter((plan): plan is VisualPlan => !!plan);
  }

  /**
   * STEP 4-1 — 최종 원고를 분석해 이미지 기획안을 받는다.
   * more=true 면 이미 본 기획안을 제외하고 다른 각도를 요청한다.
   */
  async function planVisuals(more = false) {
    if (!draft) return;
    setPlanning(true);
    try {
      const result = await getAiBlogService().planVisualContent({
        draft,
        input,
        types: imageOptions.types,
        cardCount: imageOptions.cardCount,
        exclude: more ? seenConcepts : [],
      });

      const concepts = Object.values(result.plans)
        .flat()
        .map((plan) => plan.concept);

      const nextSelection: Partial<Record<AiBlogImageType, string>> = {};
      for (const type of imageOptions.types) {
        const first = (result.plans[type] ?? [])[0];
        if (first) nextSelection[type] = first.id;
      }

      setPlanSet(result.plans);
      setPlanOverlap(result.overlap);
      setPlanSource(result.source);
      setSelectedPlanIds(nextSelection);
      setSeenConcepts((prev) => (more ? [...prev, ...concepts] : concepts));
      toast.success(more ? "다른 기획안을 가져왔습니다." : "이미지 기획안을 만들었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 기획에 실패했습니다.");
    } finally {
      setPlanning(false);
    }
  }

  /** STEP 4-2 — 선택된 기획안으로 이미지를 만든다 */
  async function generateImages() {
    if (!draft) return;
    const plans = selectedPlans();
    if (plans.length === 0) return;

    setImaging(true);
    try {
      // 이미지 내용은 원고가 아니라 선택된 기획안에서만 나온다
      const result = await getAiBlogService().generateImages({
        plans,
        input,
        style: imageOptions.style,
        thumbnailRatio: imageOptions.thumbnailRatio,
      });
      setAssets(result.assets);
      persist({
        editedArticle: draft,
        imageTypes: imageOptions.types,
        imageStyle: imageOptions.style,
        cardCount: imageOptions.cardCount,
        thumbnailRatio: imageOptions.thumbnailRatio,
        visualPlans: plans,
        imagePrompts: result.prompts,
        images: result.assets,
      });
      goStep(5);
      toast.success(`이미지 ${result.assets.length}장을 만들었습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이미지 제작에 실패했습니다.");
    } finally {
      setImaging(false);
    }
  }

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
    setAssets(project.images);
    setImageOptions({
      types: project.imageTypes.length > 0 ? project.imageTypes : DEFAULT_IMAGE_OPTIONS.types,
      style: project.imageStyle,
      cardCount: project.cardCount,
      thumbnailRatio: project.thumbnailRatio,
    });

    setPlanSet(null);
    setSelectedPlanIds({});
    setSeenConcepts([]);

    const next = project.images.length > 0 ? 5 : restored ? 3 : 1;
    setStep(next);
    setReached(next);
  }

  function restart() {
    setProjectId(null);
    setInput(DEFAULT_INPUT);
    setDraft(null);
    setArticleSource("AI");
    setAssets([]);
    setImageOptions(DEFAULT_IMAGE_OPTIONS);
    setPlanSet(null);
    setPlanOverlap(null);
    setSelectedPlanIds({});
    setSeenConcepts([]);
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
        (imaging ? (
          <ImagesGenerating />
        ) : planning ? (
          <VisualPlanning />
        ) : planSet ? (
          <VisualPlanPicker
            plans={planSet}
            selected={selectedPlanIds}
            onSelect={(type, planId) =>
              setSelectedPlanIds((prev) => ({ ...prev, [type]: planId }))
            }
            onMoreIdeas={() => planVisuals(true)}
            planning={planning}
            overlap={planOverlap}
            demo={planSource === "MOCK"}
            onGenerate={generateImages}
            generating={imaging}
            onBack={() => setPlanSet(null)}
          />
        ) : outline ? (
          <ImageOptions
            outline={outline}
            value={imageOptions}
            onChange={changeImageOptions}
            onPlan={() => planVisuals(false)}
            planning={planning}
            onBack={() => setStep(3)}
          />
        ) : (
          <VisualPlanning />
        ))}

      {step === 5 && draft && (
        <AiBlogResultView
          draft={draft}
          input={input}
          assets={assets}
          onEditArticle={() => setStep(3)}
          onRemakeImages={() => setStep(4)}
          onRestart={restart}
        />
      )}
    </div>
  );
}

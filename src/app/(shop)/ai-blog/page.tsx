import { AiBlogView } from "./ai-blog-view";

export const metadata = {
  title: "AI 블로그 콘텐츠 제작",
  description:
    "전문적인 블로그 원고부터 인포그래픽·카드뉴스까지 AI로 한 번에 제작합니다. 주제와 키워드만 입력하면 바로 발행할 수 있는 원고와 포스팅 이미지를 만들어 드립니다.",
};

export default function Page() {
  return <AiBlogView />;
}

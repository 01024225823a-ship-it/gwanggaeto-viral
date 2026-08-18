import { PartnerJobDetailView } from "./job-detail-view";

export const metadata = { title: "작업 상세" };

export default async function Page({ params }: { params: Promise<{ orderNo: string }> }) {
  const { orderNo } = await params;
  return <PartnerJobDetailView orderNo={decodeURIComponent(orderNo)} />;
}

import { ORDER_STATUS_META } from "@/lib/domain/status";
import { nextOrderNo } from "@/lib/domain/order-no";
import type {
  AppData,
  AttachedFile,
  Category,
  Customer,
  Inquiry,
  Order,
  OrderHistoryEntry,
  OrderStatus,
  Partner,
  PointTx,
  Product,
  Settlement,
} from "@/lib/domain/types";

/* ------------------------------------------------------------------ */
/* 날짜 유틸 — 데모 데이터는 "오늘" 기준 상대 날짜로 생성한다.          */
/* 언제 초기화해도 진행중 주문의 D-day가 자연스럽게 보이도록 하기 위함.  */
/* ------------------------------------------------------------------ */

function at(daysFromNow: number, hour = 10, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function shift(iso: string, days: number, hours = 0): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/* 카테고리                                                             */
/* 슬러그는 config/category-icons.ts 의 아이콘 매핑 키와 같아야 한다.    */
/* ------------------------------------------------------------------ */

const categories: Category[] = [
  {
    id: "cat-youtube",
    name: "유튜브",
    slug: "youtube",
    description: "쇼츠·영상을 실사용자에게 노출시켜 조회수와 반응을 만듭니다.",
    sortOrder: 1,
    active: true,
  },
  {
    id: "cat-blog",
    name: "블로그",
    slug: "blog",
    description: "네이버 블로그에 후기·정보성 글을 발행해 검색 노출을 늘립니다.",
    sortOrder: 2,
    active: true,
  },
  {
    id: "cat-cafe-viral",
    name: "카페 바이럴",
    slug: "cafe-viral",
    description: "타겟 고객이 모인 카페에 자연스러운 추천 글을 올립니다.",
    sortOrder: 3,
    active: true,
  },
  {
    id: "cat-cafe-comment",
    name: "카페 댓글",
    slug: "cafe-comment",
    description: "게시글에 실사용자 톤의 댓글을 남겨 신뢰도를 높입니다.",
    sortOrder: 4,
    active: true,
  },
  {
    id: "cat-hotdeal",
    name: "핫딜·커뮤니티",
    slug: "hotdeal",
    description: "인기 커뮤니티와 핫딜 게시판에 상품을 소개합니다.",
    sortOrder: 5,
    active: true,
  },
  {
    id: "cat-news",
    name: "언론보도",
    slug: "news",
    description: "기사 형태로 브랜드 신뢰도를 확보합니다.",
    sortOrder: 6,
    active: true,
  },
  {
    id: "cat-review",
    name: "리뷰",
    slug: "review",
    description: "플레이스·쇼핑몰 리뷰와 체험단으로 실사용 후기를 모읍니다.",
    sortOrder: 7,
    active: true,
  },
  {
    id: "cat-instagram",
    name: "인스타그램",
    slug: "instagram",
    description: "피드·릴스 콘텐츠를 배포하고 인플루언서와 협업합니다.",
    sortOrder: 8,
    active: true,
  },
  {
    id: "cat-sns-event",
    name: "SNS 이벤트",
    slug: "sns-event",
    description: "오픈·공유 이벤트를 기획하고 참여자를 모읍니다.",
    sortOrder: 9,
    active: true,
  },
  {
    id: "cat-package",
    name: "패키지",
    slug: "package",
    description: "여러 채널을 한 번에 진행하는 통합 상품입니다.",
    sortOrder: 10,
    active: true,
  },
  {
    id: "cat-etc",
    name: "기타",
    slug: "etc",
    description: "콘텐츠 제작과 맞춤 마케팅 상담을 진행합니다.",
    sortOrder: 11,
    active: true,
  },
];

/* ------------------------------------------------------------------ */
/* 상품 — 일반 소비자가 바로 이해할 수 있는 "건 단위" 상품으로 구성      */
/* ------------------------------------------------------------------ */

const products: Product[] = [
  /* 유튜브 */
  {
    id: "prd-yt-shorts",
    categoryId: "cat-youtube",
    name: "유튜브 쇼츠 콘텐츠 배포",
    description: "쇼츠 영상을 관심사가 맞는 시청자에게 노출시켜 조회수를 만듭니다.",
    price: 20_000,
    cost: 12_000,
    minQty: 1,
    maxQty: 300,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 5,
    visible: true,
    recommended: true,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "https://www.youtube.com/shorts/...",
    guide: [
      "영상이 공개 상태여야 작업이 진행됩니다.",
      "작업 시작 후 24시간 안에 노출이 시작됩니다.",
      "진행 중 영상을 비공개로 바꾸면 재작업이 어렵습니다.",
    ],
    createdAt: at(-120),
  },
  {
    id: "prd-yt-shorts-bulk",
    categoryId: "cat-youtube",
    name: "유튜브 쇼츠 대량 배포",
    description: "10건 이상 대량으로 진행할 때 더 저렴한 단가로 배포합니다.",
    price: 15_000,
    cost: 9_000,
    minQty: 10,
    maxQty: 1_000,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "https://www.youtube.com/shorts/...",
    guide: ["10건 이상부터 주문할 수 있습니다.", "물량이 여러 날에 나누어 진행됩니다."],
    createdAt: at(-120),
  },
  {
    id: "prd-yt-package",
    categoryId: "cat-youtube",
    name: "유튜브 바이럴 패키지",
    description: "쇼츠 배포와 댓글·반응 작업을 묶어 한 번에 진행합니다.",
    price: 350_000,
    cost: 230_000,
    minQty: 1,
    maxQty: 20,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 14,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: true,
    urlPlaceholder: "https://www.youtube.com/@채널ID",
    createdAt: at(-118),
  },

  /* 블로그 */
  {
    id: "prd-blog-basic",
    categoryId: "cat-blog",
    name: "네이버 블로그 일반 배포",
    description: "브랜드 정보를 담은 글을 일반 블로그에 발행합니다.",
    price: 5_000,
    cost: 3_000,
    minQty: 5,
    maxQty: 1_000,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 5,
    visible: true,
    recommended: true,
    requiresUrl: false,
    allowsFile: true,
    guide: [
      "강조하고 싶은 키워드를 요청사항에 적어주세요.",
      "제품 사진이 있으면 첨부해 주시면 글에 함께 사용합니다.",
      "발행 후 3개월간 글이 유지됩니다.",
    ],
    createdAt: at(-115),
  },
  {
    id: "prd-blog-power",
    categoryId: "cat-blog",
    name: "네이버 블로그 파워 배포",
    description: "방문자가 많은 블로그에 발행해 노출 효과를 높입니다.",
    price: 33_000,
    cost: 21_000,
    minQty: 1,
    maxQty: 200,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    createdAt: at(-115),
  },
  {
    id: "prd-blog-top",
    categoryId: "cat-blog",
    name: "블로그 상위노출 관리",
    description: "원하는 키워드로 블로그 검색 상위 노출을 관리합니다.",
    price: 250_000,
    cost: 165_000,
    minQty: 1,
    maxQty: 20,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 14,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: false,
    guide: ["희망 키워드를 요청사항에 3개까지 적어주세요.", "키워드 경쟁도에 따라 기간이 달라집니다."],
    createdAt: at(-112),
  },

  /* 카페 바이럴 */
  {
    id: "prd-cafe-post",
    categoryId: "cat-cafe-viral",
    name: "네이버 카페 게시글 배포",
    description: "타겟 고객이 모인 카페에 자연스러운 후기 글을 올립니다.",
    price: 22_000,
    cost: 14_000,
    minQty: 1,
    maxQty: 300,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 5,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["원하는 카페가 있다면 요청사항에 적어주세요.", "카페 정책으로 글이 삭제되면 1회 재작업해 드립니다."],
    createdAt: at(-110),
  },
  {
    id: "prd-cafe-region",
    categoryId: "cat-cafe-viral",
    name: "지역 맘카페 배포",
    description: "매장 주변 지역 맘카페에 소개 글을 올립니다.",
    price: 28_000,
    cost: 18_000,
    minQty: 1,
    maxQty: 200,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["매장 주소와 지역을 요청사항에 적어주세요."],
    createdAt: at(-110),
  },

  /* 카페 댓글 */
  {
    id: "prd-cafe-comment",
    categoryId: "cat-cafe-comment",
    name: "카페 댓글 작업",
    description: "지정한 게시글에 실사용자 톤의 댓글을 남깁니다.",
    price: 3_500,
    cost: 2_200,
    minQty: 5,
    maxQty: 500,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 3,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "https://cafe.naver.com/...",
    createdAt: at(-108),
  },
  {
    id: "prd-cafe-comment-keyword",
    categoryId: "cat-cafe-comment",
    name: "카페 댓글 (키워드 지정)",
    description: "원하는 브랜드명·키워드를 자연스럽게 넣어 댓글을 작성합니다.",
    price: 5_000,
    cost: 3_200,
    minQty: 5,
    maxQty: 300,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 3,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "https://cafe.naver.com/...",
    guide: ["넣고 싶은 키워드를 요청사항에 적어주세요."],
    createdAt: at(-108),
  },

  /* 핫딜·커뮤니티 */
  {
    id: "prd-hotdeal",
    categoryId: "cat-hotdeal",
    name: "핫딜 커뮤니티 배포",
    description: "가격 정보에 반응이 빠른 핫딜 게시판에 상품을 소개합니다.",
    price: 30_000,
    cost: 19_000,
    minQty: 1,
    maxQty: 200,
    unitLabel: "건",
    defaultPartnerId: "ptn-03",
    leadDays: 5,
    visible: true,
    recommended: true,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "상품 판매 페이지 주소",
    guide: [
      "할인가·쿠폰 등 혜택 정보를 요청사항에 적어주시면 반응이 좋습니다.",
      "재고가 소진되면 게시글이 내려갈 수 있습니다.",
    ],
    createdAt: at(-105),
  },
  {
    id: "prd-community",
    categoryId: "cat-hotdeal",
    name: "커뮤니티 바이럴 배포",
    description: "관심사 기반 인기 커뮤니티에 자연스러운 소개 글을 올립니다.",
    price: 25_000,
    cost: 16_000,
    minQty: 1,
    maxQty: 200,
    unitLabel: "건",
    defaultPartnerId: "ptn-03",
    leadDays: 5,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: true,
    urlPlaceholder: "소개할 페이지 주소",
    createdAt: at(-105),
  },

  /* 언론보도 */
  {
    id: "prd-news-online",
    categoryId: "cat-news",
    name: "온라인 언론보도",
    description: "인터넷 뉴스 매체에 보도자료를 기사로 실어드립니다.",
    price: 50_000,
    cost: 32_000,
    minQty: 1,
    maxQty: 100,
    unitLabel: "건",
    defaultPartnerId: "ptn-03",
    leadDays: 5,
    visible: true,
    recommended: true,
    requiresUrl: false,
    allowsFile: true,
    guide: [
      "보도자료 원고가 있으면 첨부해 주세요. 없으면 대신 작성해 드립니다.",
      "매체 사정에 따라 송출 일정이 1~2일 조정될 수 있습니다.",
    ],
    createdAt: at(-100),
  },
  {
    id: "prd-news-major",
    categoryId: "cat-news",
    name: "주요 일간지 보도",
    description: "이름이 알려진 주요 매체에 기사를 게재합니다.",
    price: 350_000,
    cost: 240_000,
    minQty: 1,
    maxQty: 30,
    unitLabel: "건",
    defaultPartnerId: "ptn-03",
    leadDays: 10,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["매체 심사가 있어 소재에 따라 게재가 어려울 수 있습니다."],
    createdAt: at(-100),
  },

  /* 리뷰 */
  {
    id: "prd-review-place",
    categoryId: "cat-review",
    name: "플레이스 리뷰",
    description: "네이버 지도(플레이스)에 방문 리뷰를 등록합니다.",
    price: 5_000,
    cost: 3_200,
    minQty: 5,
    maxQty: 500,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 7,
    visible: true,
    recommended: true,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "네이버 지도 매장 주소",
    guide: [
      "리뷰에 넣고 싶은 메뉴나 키워드를 요청사항에 적어주세요.",
      "방문이 가능한 지역인지 먼저 확인이 필요합니다.",
    ],
    createdAt: at(-95),
  },
  {
    id: "prd-review-shop",
    categoryId: "cat-review",
    name: "쇼핑몰 상품 리뷰",
    description: "판매 중인 상품 페이지에 구매 후기를 등록합니다.",
    price: 6_000,
    cost: 3_800,
    minQty: 5,
    maxQty: 500,
    unitLabel: "건",
    defaultPartnerId: "ptn-02",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "상품 페이지 주소",
    createdAt: at(-95),
  },
  {
    id: "prd-review-experience",
    categoryId: "cat-review",
    name: "블로그 체험단 모집",
    description: "제품·매장을 직접 체험한 후기를 블로그에 남길 체험단을 모집합니다.",
    price: 45_000,
    cost: 28_000,
    minQty: 5,
    maxQty: 200,
    unitLabel: "명",
    defaultPartnerId: "ptn-02",
    leadDays: 14,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["제공하실 내역(제품·식사권 등)을 요청사항에 적어주세요.", "모집부터 후기 등록까지 약 2주 걸립니다."],
    createdAt: at(-92),
  },

  /* 인스타그램 */
  {
    id: "prd-ig-feed",
    categoryId: "cat-instagram",
    name: "인스타 피드 배포",
    description: "관심사가 맞는 계정에 피드 게시물을 배포합니다.",
    price: 18_000,
    cost: 11_000,
    minQty: 1,
    maxQty: 300,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 5,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: true,
    urlPlaceholder: "https://www.instagram.com/p/...",
    createdAt: at(-90),
  },
  {
    id: "prd-ig-reels",
    categoryId: "cat-instagram",
    name: "인스타 릴스 배포",
    description: "릴스 영상을 노출시켜 초기 조회수와 반응을 확보합니다.",
    price: 25_000,
    cost: 16_000,
    minQty: 1,
    maxQty: 200,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 5,
    visible: true,
    recommended: true,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "https://www.instagram.com/reel/...",
    guide: ["비공개 계정은 작업이 불가합니다."],
    createdAt: at(-90),
  },
  {
    id: "prd-ig-influencer",
    categoryId: "cat-instagram",
    name: "인플루언서 협찬 배포",
    description: "팔로워를 보유한 인플루언서가 직접 콘텐츠를 올립니다.",
    price: 120_000,
    cost: 78_000,
    minQty: 1,
    maxQty: 50,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 14,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    createdAt: at(-88),
  },

  /* SNS 이벤트 */
  {
    id: "prd-event-open",
    categoryId: "cat-sns-event",
    name: "SNS 오픈이벤트 운영",
    description: "오픈·리뉴얼 이벤트를 기획하고 진행까지 대행합니다.",
    price: 300_000,
    cost: 190_000,
    minQty: 1,
    maxQty: 10,
    unitLabel: "건",
    defaultPartnerId: "ptn-01",
    leadDays: 14,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["경품과 이벤트 기간을 요청사항에 적어주세요."],
    createdAt: at(-85),
  },
  {
    id: "prd-event-share",
    categoryId: "cat-sns-event",
    name: "공유 이벤트 참여자 모집",
    description: "게시물 공유·댓글 이벤트에 참여할 실사용자를 모읍니다.",
    price: 3_000,
    cost: 1_900,
    minQty: 50,
    maxQty: 5_000,
    unitLabel: "명",
    defaultPartnerId: "ptn-01",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: true,
    allowsFile: false,
    urlPlaceholder: "이벤트 게시물 주소",
    createdAt: at(-85),
  },

  /* 패키지 */
  {
    id: "prd-pkg-open",
    categoryId: "cat-package",
    name: "신규 오픈 패키지",
    description: "블로그·카페·플레이스 리뷰를 한 번에 진행하는 오픈 필수 구성입니다.",
    price: 550_000,
    cost: 370_000,
    minQty: 1,
    maxQty: 20,
    unitLabel: "건",
    defaultPartnerId: "ptn-04",
    leadDays: 14,
    visible: true,
    recommended: true,
    requiresUrl: false,
    allowsFile: true,
    guide: [
      "블로그 20건 + 카페 10건 + 플레이스 리뷰 20건으로 구성됩니다.",
      "매장 정보와 사진을 첨부해 주세요.",
    ],
    createdAt: at(-80),
  },
  {
    id: "prd-pkg-brand",
    categoryId: "cat-package",
    name: "브랜드 인지도 패키지",
    description: "언론보도·유튜브·인스타를 함께 진행해 브랜드를 알립니다.",
    price: 990_000,
    cost: 680_000,
    minQty: 1,
    maxQty: 10,
    unitLabel: "건",
    defaultPartnerId: "ptn-04",
    leadDays: 21,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    createdAt: at(-80),
  },

  /* 기타 */
  {
    id: "prd-shorts-edit",
    categoryId: "cat-etc",
    name: "숏폼 영상 편집",
    description: "보내주신 원본 영상을 릴스·쇼츠용으로 편집해 드립니다.",
    price: 150_000,
    cost: 95_000,
    minQty: 1,
    maxQty: 50,
    unitLabel: "편",
    defaultPartnerId: "ptn-04",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["원본 영상과 로고·폰트 등을 첨부해 주세요.", "1회 무료 수정이 포함됩니다."],
    createdAt: at(-75),
  },
  {
    id: "prd-consulting",
    categoryId: "cat-etc",
    name: "맞춤 마케팅 상담",
    description: "어떤 서비스가 맞을지 모르겠다면 담당자가 직접 제안해 드립니다.",
    price: 100_000,
    cost: 60_000,
    minQty: 1,
    maxQty: 10,
    unitLabel: "건",
    defaultPartnerId: "ptn-04",
    leadDays: 7,
    visible: true,
    recommended: false,
    requiresUrl: false,
    allowsFile: true,
    guide: ["업종과 현재 고민을 요청사항에 적어주시면 맞춤 제안서를 보내드립니다."],
    createdAt: at(-75),
  },
];

/* ------------------------------------------------------------------ */
/* 광고주                                                               */
/* ------------------------------------------------------------------ */

const customers: Customer[] = [
  {
    id: "cust-01",
    company: "(주)그린푸드컴퍼니",
    manager: "김지훈",
    phone: "010-0000-0001",
    email: "customer@demo.gwanggaeto.io",
    bizNo: "000-00-00001",
    point: 0, // 포인트 내역 생성 후 계산해서 채운다
    grade: "PRO",
    active: true,
    createdAt: at(-60),
  },
  {
    id: "cust-02",
    company: "(주)메디컬라운지",
    manager: "이수현",
    phone: "010-0000-0002",
    email: "sh.lee@medicallounge.example.com",
    bizNo: "000-00-00002",
    point: 0,
    grade: "VIP",
    active: true,
    createdAt: at(-45),
  },
  {
    id: "cust-03",
    company: "오늘의공방",
    manager: "박태호",
    phone: "010-0000-0003",
    email: "th.park@todaycraft.example.com",
    bizNo: "000-00-00003",
    point: 0,
    grade: "BASIC",
    active: true,
    createdAt: at(-30),
  },
  {
    id: "cust-04",
    company: "(주)스테이인서울",
    manager: "정하늘",
    phone: "010-0000-0004",
    email: "hn.jung@stayinseoul.example.com",
    bizNo: "000-00-00004",
    point: 0,
    grade: "PRO",
    active: true,
    createdAt: at(-22),
  },
  {
    id: "cust-05",
    company: "뷰티랩코리아",
    manager: "윤서진",
    phone: "010-0000-0005",
    email: "sj.yoon@beautylab.example.com",
    bizNo: "000-00-00005",
    point: 0,
    grade: "BASIC",
    active: false,
    createdAt: at(-15),
  },
];

/* ------------------------------------------------------------------ */
/* 실행사                                                               */
/* ------------------------------------------------------------------ */

const partners: Partner[] = [
  {
    id: "ptn-01",
    name: "A미디어웍스",
    manager: "박서연",
    phone: "010-0000-1001",
    email: "partner@demo.gwanggaeto.io",
    categoryIds: ["cat-youtube", "cat-instagram", "cat-sns-event"],
    unitCosts: [
      { productId: "prd-yt-shorts", cost: 11_500 },
      { productId: "prd-yt-shorts-bulk", cost: 8_600 },
      { productId: "prd-ig-reels", cost: 15_000 },
    ],
    specialty: "유튜브·인스타 콘텐츠 배포 전문. 대량 물량 대응 가능.",
    active: true,
    createdAt: at(-100),
  },
  {
    id: "ptn-02",
    name: "블루라인랩",
    manager: "정민호",
    phone: "010-0000-1002",
    email: "mh.jung@bluelinelab.example.com",
    categoryIds: ["cat-blog", "cat-cafe-viral", "cat-cafe-comment", "cat-review"],
    unitCosts: [
      { productId: "prd-blog-basic", cost: 2_800 },
      { productId: "prd-cafe-post", cost: 13_000 },
      { productId: "prd-review-place", cost: 3_000 },
    ],
    specialty: "네이버 채널(블로그·카페·플레이스) 통합 운영.",
    active: true,
    createdAt: at(-95),
  },
  {
    id: "ptn-03",
    name: "프레스온",
    manager: "최윤아",
    phone: "010-0000-1003",
    email: "ya.choi@presson.example.com",
    categoryIds: ["cat-news", "cat-hotdeal"],
    unitCosts: [
      { productId: "prd-news-online", cost: 30_000 },
      { productId: "prd-hotdeal", cost: 18_000 },
    ],
    specialty: "보도자료 작성 및 매체 송출, 커뮤니티 배포.",
    active: true,
    createdAt: at(-90),
  },
  {
    id: "ptn-04",
    name: "크리에이티브펄스",
    manager: "한도영",
    phone: "010-0000-1004",
    email: "dy.han@cpulse.example.com",
    categoryIds: ["cat-package", "cat-etc"],
    unitCosts: [{ productId: "prd-shorts-edit", cost: 88_000 }],
    specialty: "패키지 운영 및 숏폼 콘텐츠 제작.",
    active: true,
    createdAt: at(-70),
    memo: "촬영 일정은 최소 1주 전 협의 필요.",
  },
];

/* ------------------------------------------------------------------ */
/* 주문                                                                 */
/* ------------------------------------------------------------------ */

interface OrderSeed {
  customerId: string;
  productId: string;
  qty: number;
  targetUrl?: string;
  requestNote?: string;
  status: OrderStatus;
  /** 며칠 전에 주문했는지 */
  daysAgo: number;
  partnerId?: string;
  files?: string[];
  resultUrls?: string[];
  resultMemo?: string;
}

const ORDER_SEEDS: OrderSeed[] = [
  /* --- 데모 광고주(cust-01) — 전체 상태를 한 번에 볼 수 있도록 구성 --- */
  {
    customerId: "cust-01",
    productId: "prd-yt-shorts",
    qty: 30,
    targetUrl: "https://www.youtube.com/shorts/GK9viral01",
    requestNote: "신제품 런칭 영상입니다. 자연스러운 속도로 부탁드립니다.",
    status: "RECEIVED",
    daysAgo: 0,
  },
  {
    customerId: "cust-01",
    productId: "prd-review-place",
    qty: 30,
    targetUrl: "https://map.naver.com/p/greenfood-seongsu",
    requestNote: "성수점 신규 오픈 매장입니다. 시그니처 메뉴 언급 부탁드립니다.",
    status: "RECEIVED",
    daysAgo: 1,
  },
  {
    customerId: "cust-01",
    productId: "prd-ig-reels",
    qty: 10,
    targetUrl: "https://www.instagram.com/reel/greenfood-0818",
    requestNote: "식품·다이어트 관심사 위주로 부탁드립니다.",
    status: "ASSIGNED",
    daysAgo: 2,
    partnerId: "ptn-01",
  },
  {
    customerId: "cust-01",
    productId: "prd-blog-basic",
    qty: 50,
    requestNote: "키워드: 성수동 샐러드, 다이어트 도시락. 제품컷 첨부했습니다.",
    status: "IN_PROGRESS",
    daysAgo: 5,
    partnerId: "ptn-02",
    files: ["제품컷_2026.zip", "브랜드가이드.pdf"],
  },
  {
    customerId: "cust-01",
    productId: "prd-cafe-comment",
    qty: 100,
    targetUrl: "https://cafe.naver.com/dietcafe/882910",
    status: "IN_PROGRESS",
    daysAgo: 6,
    partnerId: "ptn-02",
  },
  {
    customerId: "cust-01",
    productId: "prd-cafe-post",
    qty: 15,
    requestNote: "지역 맘카페 위주로 진행 부탁드립니다.",
    status: "IN_REVIEW",
    daysAgo: 8,
    partnerId: "ptn-02",
    resultUrls: [
      "https://cafe.naver.com/seongsumom/1204871",
      "https://cafe.naver.com/dietcafe/882910",
      "https://cafe.naver.com/foodlover/553120",
    ],
    resultMemo: "요청하신 맘카페 3곳 포함해 총 15건 게시 완료했습니다.",
  },
  {
    customerId: "cust-01",
    productId: "prd-news-online",
    qty: 5,
    requestNote: "친환경 포장재 도입 관련 보도자료입니다.",
    status: "COMPLETED",
    daysAgo: 14,
    partnerId: "ptn-03",
    files: ["보도자료_친환경포장재.docx"],
    resultUrls: [
      "https://news.example.co.kr/article/2026081201",
      "https://press.example.kr/read/998231",
    ],
    resultMemo: "5개 매체 송출 완료했습니다. 기사 링크 첨부드립니다.",
  },
  {
    customerId: "cust-01",
    productId: "prd-hotdeal",
    qty: 3,
    targetUrl: "https://smartstore.naver.com/greenfood/products/8812",
    requestNote: "1+1 행사 진행 중입니다. 할인가 강조 부탁드립니다.",
    status: "COMPLETED",
    daysAgo: 25,
    partnerId: "ptn-03",
    resultUrls: ["https://hotdeal.example.kr/board/view/33120"],
    resultMemo: "핫딜 게시판 3곳 등록 완료. 반응 좋아 상단 노출되었습니다.",
  },

  /* --- 다른 광고주 — 관리자 화면 볼륨 확보 --- */
  {
    customerId: "cust-02",
    productId: "prd-blog-top",
    qty: 2,
    requestNote: "키워드: 강남 피부과, 강남 리프팅",
    status: "IN_PROGRESS",
    daysAgo: 9,
    partnerId: "ptn-02",
  },
  {
    customerId: "cust-02",
    productId: "prd-news-major",
    qty: 1,
    status: "IN_REVIEW",
    daysAgo: 11,
    partnerId: "ptn-03",
    resultUrls: ["https://major.example.co.kr/news/20260810/778120"],
    resultMemo: "일간지 1건 게재 완료했습니다.",
  },
  {
    customerId: "cust-02",
    productId: "prd-review-place",
    qty: 50,
    targetUrl: "https://map.naver.com/p/medicallounge-gangnam",
    status: "COMPLETED",
    daysAgo: 20,
    partnerId: "ptn-02",
    resultUrls: ["https://map.naver.com/p/medicallounge-gangnam/review"],
    resultMemo: "리뷰 50건 등록 완료했습니다.",
  },
  {
    customerId: "cust-03",
    productId: "prd-review-experience",
    qty: 10,
    requestNote: "원데이 클래스 체험 제공입니다.",
    status: "ASSIGNED",
    daysAgo: 3,
    partnerId: "ptn-02",
  },
  {
    customerId: "cust-04",
    productId: "prd-ig-feed",
    qty: 20,
    targetUrl: "https://www.instagram.com/p/stayinseoul-0812",
    status: "RECEIVED",
    daysAgo: 1,
  },
  {
    customerId: "cust-04",
    productId: "prd-yt-shorts-bulk",
    qty: 50,
    targetUrl: "https://www.youtube.com/shorts/stayinseoul-hongdae",
    status: "IN_REVIEW",
    daysAgo: 7,
    partnerId: "ptn-01",
    resultUrls: ["https://www.youtube.com/shorts/stayinseoul-hongdae"],
    resultMemo: "50건 배포 완료했습니다.",
  },
];

function buildFiles(names: string[] | undefined, uploadedAt: string): AttachedFile[] {
  if (!names?.length) return [];
  return names.map((name, i) => ({
    id: `file-${uploadedAt.slice(0, 10)}-${i}-${name.length}`,
    name,
    // 데모용 크기 — 실제 업로드가 없으므로 이름 길이 기반으로 그럴듯한 값을 만든다
    size: 180_000 + name.length * 37_000,
    uploadedAt,
  }));
}

function buildOrders(): Order[] {
  const orders: Order[] = [];

  for (const seed of ORDER_SEEDS) {
    const product = products.find((p) => p.id === seed.productId);
    if (!product) continue;

    const createdAt = at(-seed.daysAgo, 10, 20 + (orders.length % 30));
    const orderNo = nextOrderNo(orders, new Date(createdAt));
    const step = ORDER_STATUS_META[seed.status].step;

    const history: OrderHistoryEntry[] = [
      { status: "RECEIVED", at: createdAt, by: "CUSTOMER", note: "주문 접수" },
    ];

    const order: Order = {
      orderNo,
      customerId: seed.customerId,
      productId: product.id,
      productName: product.name,
      categoryId: product.categoryId,
      qty: seed.qty,
      unitPrice: product.price,
      amount: product.price * seed.qty,
      targetUrl: seed.targetUrl ?? "",
      requestNote: seed.requestNote ?? "",
      files: buildFiles(seed.files, createdAt),
      status: seed.status,
      createdAt,
      history,
    };

    if (step >= 1 && seed.partnerId) {
      const partner = partners.find((p) => p.id === seed.partnerId);
      const assignedAt = shift(createdAt, 0, 5);
      order.partnerId = seed.partnerId;
      order.unitCost =
        partner?.unitCosts.find((u) => u.productId === product.id)?.cost ?? product.cost;
      order.assignedAt = assignedAt;
      order.dueDate = shift(assignedAt, product.leadDays);
      history.push({
        status: "ASSIGNED",
        at: assignedAt,
        by: "ADMIN",
        note: `${partner?.name ?? "실행사"} 배정`,
      });
    }

    if (step >= 2) {
      const startedAt = shift(createdAt, 1);
      order.startedAt = startedAt;
      history.push({ status: "IN_PROGRESS", at: startedAt, by: "PARTNER", note: "작업 시작" });
    }

    if (step >= 3) {
      const submittedAt = shift(createdAt, Math.max(2, Math.round(seed.daysAgo * 0.75)));
      order.submittedAt = submittedAt;
      order.result = {
        doneQty: seed.qty,
        resultUrls: seed.resultUrls ?? [],
        files: [],
        memo: seed.resultMemo ?? "",
        submittedAt,
      };
      history.push({ status: "IN_REVIEW", at: submittedAt, by: "PARTNER", note: "작업 완료 요청" });
    }

    if (step >= 4) {
      const completedAt = shift(createdAt, Math.max(3, Math.round(seed.daysAgo * 0.9)));
      order.completedAt = completedAt;
      history.push({ status: "COMPLETED", at: completedAt, by: "ADMIN", note: "검수 승인" });
    }

    orders.push(order);
  }

  // 최신 주문이 위에 오도록
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------------------------------ */
/* 포인트 — 충전/사용 내역을 시간순으로 만들고 최종 잔액을 광고주에 반영  */
/* ------------------------------------------------------------------ */

const CHARGE_PLAN: Record<
  string,
  Array<{ daysAgo: number; amount: number; method: "CARD" | "TRANSFER" }>
> = {
  "cust-01": [
    { daysAgo: 58, amount: 3_000_000, method: "TRANSFER" },
    { daysAgo: 21, amount: 2_000_000, method: "CARD" },
    { daysAgo: 4, amount: 1_000_000, method: "TRANSFER" },
  ],
  "cust-02": [
    { daysAgo: 40, amount: 5_000_000, method: "TRANSFER" },
    { daysAgo: 12, amount: 3_000_000, method: "TRANSFER" },
  ],
  "cust-03": [{ daysAgo: 28, amount: 1_000_000, method: "CARD" }],
  "cust-04": [{ daysAgo: 20, amount: 2_000_000, method: "CARD" }],
  "cust-05": [{ daysAgo: 14, amount: 500_000, method: "CARD" }],
};

function buildPointTxs(orders: Order[]): PointTx[] {
  const txs: PointTx[] = [];

  for (const customer of customers) {
    const events: Array<{ at: string; make: (balance: number) => PointTx }> = [];

    for (const [i, charge] of (CHARGE_PLAN[customer.id] ?? []).entries()) {
      const createdAt = at(-charge.daysAgo, 9, 30);
      events.push({
        at: createdAt,
        make: (balance) => ({
          id: `pt-${customer.id}-c${i}`,
          customerId: customer.id,
          type: "CHARGE",
          title: charge.method === "CARD" ? "신용카드 충전" : "계좌이체 충전",
          amount: charge.amount,
          balance: balance + charge.amount,
          method: charge.method,
          createdAt,
        }),
      });
    }

    for (const order of orders.filter((o) => o.customerId === customer.id)) {
      events.push({
        at: order.createdAt,
        make: (balance) => ({
          id: `pt-${order.orderNo}`,
          customerId: customer.id,
          type: "USE",
          title: `${order.productName} 주문 결제`,
          amount: -order.amount,
          balance: balance - order.amount,
          orderNo: order.orderNo,
          createdAt: order.createdAt,
        }),
      });
    }

    events.sort((a, b) => a.at.localeCompare(b.at));

    let balance = 0;
    for (const event of events) {
      const tx = event.make(balance);
      balance = tx.balance;
      txs.push(tx);
    }
    customer.point = balance;
  }

  return txs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/* ------------------------------------------------------------------ */
/* 정산 — 완료된 주문에 대해 생성                                       */
/* ------------------------------------------------------------------ */

function buildSettlements(orders: Order[]): Settlement[] {
  return orders
    .filter((o) => o.status === "COMPLETED" && o.partnerId && o.completedAt)
    .map((o, i) => {
      const unitCost = o.unitCost ?? 0;
      const daysSince = Math.round(
        (Date.now() - new Date(o.completedAt as string).getTime()) / 86_400_000,
      );
      // 완료 후 15일이 지난 건은 지급 완료, 그 외는 정산 예정으로 둔다
      const paid = daysSince >= 15;
      return {
        id: `stl-${o.orderNo}`,
        orderNo: o.orderNo,
        partnerId: o.partnerId as string,
        qty: o.result?.doneQty ?? o.qty,
        unitCost,
        amount: unitCost * (o.result?.doneQty ?? o.qty),
        completedAt: o.completedAt as string,
        status: paid ? "PAID" : i % 2 === 0 ? "SCHEDULED" : "PENDING",
        scheduledAt: shift(o.completedAt as string, 15),
        paidAt: paid ? shift(o.completedAt as string, 15) : undefined,
      } satisfies Settlement;
    });
}

/* ------------------------------------------------------------------ */
/* 문의                                                                 */
/* ------------------------------------------------------------------ */

function buildInquiries(orders: Order[]): Inquiry[] {
  const firstOf = (customerId: string) => orders.find((o) => o.customerId === customerId)?.orderNo;

  return [
    {
      id: "inq-01",
      customerId: "cust-01",
      category: "ORDER",
      title: "진행중인 블로그 글 키워드를 변경할 수 있을까요?",
      content:
        "지난주 주문한 블로그 배포 건인데, 강조 키워드를 '성수동 샐러드'에서 '성수동 다이어트 도시락'으로 변경 가능한지 궁금합니다.",
      orderNo: firstOf("cust-01"),
      status: "OPEN",
      createdAt: at(-1, 14, 10),
    },
    {
      id: "inq-02",
      customerId: "cust-01",
      category: "PAYMENT",
      title: "세금계산서 발행 요청드립니다.",
      content: "지난달 충전한 200만 포인트에 대한 세금계산서 발행 부탁드립니다.",
      status: "ANSWERED",
      createdAt: at(-9, 11, 0),
      answer:
        "안녕하세요, 광개토 Viral입니다. 등록된 사업자 정보로 세금계산서 발행 완료했습니다. 메일 확인 부탁드립니다.",
      answeredAt: at(-9, 16, 30),
    },
    {
      id: "inq-03",
      customerId: "cust-02",
      category: "SERVICE",
      title: "블로그 상위노출은 기간이 얼마나 걸리나요?",
      content: "강남 지역 키워드로 진행하려고 하는데 예상 기간과 성과 기준이 궁금합니다.",
      status: "OPEN",
      createdAt: at(-2, 9, 45),
    },
    {
      id: "inq-04",
      customerId: "cust-04",
      category: "ORDER",
      title: "인스타 피드 배포 시작 일정 문의",
      content: "어제 주문한 인스타 피드 배포 건 언제부터 작업 시작되나요?",
      status: "OPEN",
      createdAt: at(0, 10, 5),
    },
    {
      id: "inq-05",
      customerId: "cust-03",
      category: "ETC",
      title: "체험단 모집 인원을 늘리고 싶습니다.",
      content: "현재 10명으로 신청했는데 20명으로 늘리려면 추가 주문을 하면 될까요?",
      status: "ANSWERED",
      createdAt: at(-3, 13, 20),
      answer: "네, 추가 10명으로 별도 주문해 주시면 동일 담당자가 함께 진행해 드립니다.",
      answeredAt: at(-3, 15, 0),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* 시드 생성                                                            */
/* ------------------------------------------------------------------ */

/**
 * 데모용 초기 데이터를 만든다.
 * 매 호출마다 "오늘" 기준으로 날짜를 다시 계산하므로,
 * 데이터 초기화 버튼을 누르면 항상 최신 상태의 데모 데이터가 만들어진다.
 */
export function createSeedData(): AppData {
  const orders = buildOrders();
  const pointTxs = buildPointTxs(orders);

  return {
    categories: categories.map((c) => ({ ...c })),
    products: products.map((p) => ({ ...p })),
    customers: customers.map((c) => ({ ...c })),
    partners: partners.map((p) => ({ ...p })),
    orders,
    pointTxs,
    settlements: buildSettlements(orders),
    inquiries: buildInquiries(orders),
  };
}

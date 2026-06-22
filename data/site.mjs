// 사이트 전역 설정 및 비즈니스 정보 (E-E-A-T 신뢰 신호 포함)
export const site = {
  name: "스피드공사",
  legalName: "스피드공사 배관·하수구 안내",
  tagline: "전국 배관공사·하수구막힘 방문 안내",
  // 검색 색인용 기본 도메인 (배포 시 환경변수 SITE_URL 로 교체 가능)
  baseUrl: process.env.SITE_URL || "https://speedgongsa.co.kr",
  phone: "0000-0000",
  phoneHref: "tel:0000-0000",
  email: "help@speedgongsa.co.kr",
  locale: "ko_KR",
  // E-E-A-T: 책임 저자/검수자 정보
  author: {
    name: "스피드공사 현장팀",
    role: "배관·하수구 현장 안내 에디터",
    reviewer: "현장 작업 검수 담당",
    bio: "스피드공사 현장팀은 전국 배관공사·하수구막힘 작업 현장에서 확인한 증상·작업 방식·비용 기준을 직접 정리하고, 고객 문의를 바탕으로 안내 내용을 업데이트합니다.",
  },
  // 편집/운영 정책 공개 (구글 뉴스/E-E-A-T 신호)
  editorialPolicy:
    "스피드공사는 ‘무조건 출동·무조건 해결’ 같은 과장 문구 대신, 고객이 작업 전 확인해야 할 실제 기준을 안내합니다. 모든 비용은 현장 구조·막힘 정도에 따라 달라지므로 방문 전 증상과 위치를 알려주시면 예상 작업 범위를 먼저 안내합니다.",
  social: {},
};

// 상단 메뉴 (키워드 반복 없이 탐색용으로 구성)
export const primaryNav = [
  { label: "홈", url: "/" },
  { label: "서비스 안내", url: "/service/", mega: "service" },
  { label: "지역별 안내", url: "/area/", mega: "area" },
  { label: "증상별 안내", url: "/symptoms/" },
  { label: "비용 안내", url: "/price/" },
  { label: "작업 사례", url: "/case/" },
  { label: "예약 문의", url: "/contact/" },
];

// 서비스 메가메뉴 (PC 3열 / 모바일 아코디언)
export const serviceMenu = [
  {
    group: "배관 공사",
    items: [
      { label: "배관공사", slug: "pipe" },
      { label: "배관누수", slug: "leak" },
      { label: "아파트배관공사", slug: "apartment-pipe" },
      { label: "상가배관공사", slug: "commercial-pipe" },
      { label: "수도배관공사", slug: "water-pipe" },
    ],
  },
  {
    group: "막힘 해결",
    items: [
      { label: "하수구막힘", slug: "drain" },
      { label: "싱크대막힘", slug: "sink" },
      { label: "변기막힘", slug: "toilet" },
      { label: "세면대막힘", slug: "washbasin" },
      { label: "욕실배수구막힘", slug: "bathroom-drain" },
      { label: "주방배수구막힘", slug: "kitchen-drain" },
      { label: "음식점하수구막힘", slug: "restaurant-drain" },
    ],
  },
  {
    group: "점검 · 장비",
    items: [
      { label: "배관내시경", slug: "camera-inspection" },
      { label: "고압세척", slug: "high-pressure-cleaning" },
      { label: "배수관청소", slug: "drain-cleaning" },
    ],
  },
];

// 서비스 slug -> label 빠른 조회
export const serviceLabelBySlug = Object.fromEntries(
  serviceMenu.flatMap((g) => g.items.map((i) => [i.slug, i.label]))
);

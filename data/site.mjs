// 사이트 전역 설정 및 비즈니스 정보 (E-E-A-T 신뢰 신호 포함)
export const site = {
  name: "스피드 배관공사",
  legalName: "스피드 배관공사",
  tagline: "전국 배관공사·하수구막힘 방문 안내",
  // 검색 색인용 기본 도메인 (배포 시 환경변수 SITE_URL 로 교체 가능)
  baseUrl: process.env.SITE_URL || "https://plumbing-service-afo.pages.dev",
  // 전화예약 번호는 준비 중 — 버튼/링크는 예약문의 페이지로 연결한다.
  phone: "준비 중",
  phoneHref: "/contact/",
  // 버튼 등에 쓰는 CTA 문구 (전화번호 미정이므로 '예약 문의'로 통일)
  ctaText: "예약 문의",
  email: "help@plumbingservice.co.kr",
  locale: "ko_KR",
  // E-E-A-T: 책임 저자/검수자 정보
  author: {
    name: "스피드 배관공사 현장팀",
    role: "배관·하수구 현장 안내 담당",
    reviewer: "현장 작업 기준 검수 담당",
    bio: "스피드 배관공사 현장팀은 전국 배관공사·하수구막힘 작업 기준과 지역별 방문 정보를 직접 정리하고, 고객 문의를 바탕으로 안내 기준을 업데이트합니다.",
  },
  // 편집/운영 정책 공개 (구글 뉴스/E-E-A-T 신호)
  editorialPolicy:
    "스피드 배관공사는 과장된 광고 문구 대신 고객이 문의 전 확인해야 할 실제 작업 기준을 안내합니다. 비용은 현장 구조와 막힘 상태에 따라 달라질 수 있으므로 현장 확인 후 안내하는 것을 원칙으로 합니다.",
  social: {},
};

// 상단 메뉴 (키워드 반복 없이 짧고 명확하게 — 도어웨이 방지)
export const primaryNav = [
  { label: "홈", url: "/" },
  { label: "배관공사", url: "/service/pipe/" },
  { label: "하수구막힘", url: "/service/drain/" },
  { label: "서비스 안내", url: "/service/", mega: "program" },
  { label: "지역별 안내", url: "/area/", mega: "region" },
  { label: "지하철역별", url: "/subway/" },
  { label: "비용 안내", url: "/price/" },
  { label: "작업사례", url: "/case/" },
  { label: "예약문의", url: "/contact/" },
];

// 서비스 메가메뉴 (PC 3~4열 / 모바일 아코디언)
export const programMenu = [
  {
    group: "배관공사·수리",
    items: [
      { label: "배관공사", slug: "pipe" },
      { label: "수도배관공사", slug: "water-pipe" },
      { label: "아파트배관공사", slug: "apartment-pipe" },
      { label: "상가배관공사", slug: "commercial-pipe" },
      { label: "배관누수", slug: "leak" },
    ],
  },
  {
    group: "막힘·뚫음",
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
    group: "청소·점검",
    items: [
      { label: "고압세척", slug: "high-pressure-cleaning" },
      { label: "배관내시경", slug: "camera-inspection" },
      { label: "배수관청소", slug: "drain-cleaning" },
    ],
  },
];

// 서비스 slug -> label 빠른 조회
export const programLabelBySlug = Object.fromEntries(
  programMenu.flatMap((g) => g.items.map((i) => [i.slug, i.label]))
);

# 스피드공사 (SpeedGongsa)

전국 **배관공사·하수구막힘 방문 안내** 정적 사이트. 도어웨이 위험을 줄인 지역 SEO 구조와
E-E-A-T·구조화 데이터·빠른 로딩(Core Web Vitals)에 맞춰 정적 HTML로 생성합니다.

- **상호:** 스피드공사
- **전화예약:** 0000-0000

## 빠른 시작

```bash
npm run build   # dist/ 에 정적 사이트 생성
npm run serve   # http://localhost:4173 미리보기
npm run dev     # build + serve
npm run audit   # 유사도·중복·도어웨이 감사 (near-duplicate 0 확인)
```

빌드 결과(`dist/`)는 어떤 정적 호스팅(Cloudflare Pages, Netlify, Vercel, S3, Nginx 등)에도
그대로 올릴 수 있습니다. 도메인은 `SITE_URL` 환경변수로 교체합니다.

## 구조

```
data/
  site.mjs        # 비즈니스 정보, 상단 메뉴, 서비스 메가메뉴
  services.mjs    # 서비스(배관공사·하수구막힘 등) 고유 본문
  areas.mjs       # 시·도 → 시·군·구 지역 트리(행정구역 데이터 정규화)
  seoul/gyeonggi/incheon/metros/provinces.mjs  # 실제 행정구역 원본 데이터
  symptoms.mjs    # 증상별 안내 데이터
src/
  assets/styles.css  # 프리미엄 네이비 팔레트 디자인 토큰 + 컴포넌트 오버레이(Pretendard)
  assets/main.js     # PC 메가메뉴 / 모바일 아코디언 / 스크롤 인터랙션 / 목차 스파이
  templates/layout.mjs  # 공통 레이아웃 + SEO 헤드 + JSON-LD 헬퍼
scripts/
  build.mjs       # 정적 사이트 생성기
  variants.mjs    # 변형 엔진(슬러그 시드 — 도어웨이/유사 본문 방지)
  romanize.mjs    # 한글→로마자 슬러그
  audit-similarity.mjs  # 유사도/도어웨이 감사(MinHash/LSH)
  serve.mjs       # 의존성 없는 미리보기 서버
dist/             # 생성된 정적 사이트(배포 대상)
```

## URL 구조 (지시서 준수)

- 전국 메인: `/`
- 서비스: `/service/pipe/`, `/service/drain/`, `/service/sink/` …
- 지역: `/area/` → `/area/seoul/` → `/area/seoul/gangnam-gu/`
  - 경기 광주시 ↔ 광주광역시 구분: `/area/gyeonggi/gwangju-si/` vs `/area/gwangju/`
- 증상별 `/symptoms/` · 작업방식 `/process/` · 비용 `/price/`
- 작업 전 확인 `/guide/before-service/` · 사례 `/case/` · 예약 `/contact/`
- 업체소개 `/about/` · 개인정보 `/privacy/` · 이용약관 `/terms/`

> 메뉴·URL에는 “배관공사/하수구막힘” 키워드를 반복하지 않고, Title·H1·메타·본문에서 자연스럽게 사용합니다.

## SEO 적용 사항

- **메타 디스크립션 80자 이내** (빌드 시 전 페이지 강제 검증)
- **타이틀·디스크립션 중복 0** (빌드가 강제 검사 — 위반 시 빌드 실패)
- **도어웨이/유사 본문 방지**: 지역 페이지는 실제 행정구역 데이터(주거 형태·생활권)와
  슬러그 시드 변형 엔진으로 본문·소제목을 페이지마다 다르게 생성 → near-duplicate(≥0.5) **0쌍**
- **E-E-A-T**: 작성자·검수자 표기, 최종 수정일, 운영/편집 정책 공개(`/about/`)
- **구조화 데이터(JSON-LD)**: Plumber(LocalBusiness), Article(author/dateModified),
  Service, FAQPage, BreadcrumbList (허위 Review/AggregateRating 미사용)
- **선호 썸네일 지정**: `og:image` + schema `image`
- **내부링크**: 지역·서비스를 롱테일 앵커로 연결, 비용/작업 전 확인/외부 권위 기관 링크 연결
- `sitemap.xml`, `robots.txt`, `rss.xml`, `llms.txt`, IndexNow 키 파일 자동 생성
- 시맨틱 마크업, 모바일 우선, 비차단 폰트(async), 하단 고정 전화 바

## 콘텐츠 추가

- 서비스: `data/services.mjs` 에 항목 추가
- 지역: `data/areas.mjs`(또는 원본 행정구역 데이터)에 항목 추가

추가 후 `npm run build` 한 번이면 메뉴·사이트맵·내부링크에 자동 반영됩니다.

## 주의

비용·작업 정보는 현장 상황에 따라 달라지므로 “현장 확인 후 안내”를 원칙으로 표기합니다.
과장 문구·허위 후기를 사용하지 않습니다.

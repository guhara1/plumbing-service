# 스피드 배관공사

전국 **배관공사·하수구막힘 방문 안내** 정적 사이트. E-E-A-T·구조화 데이터와 빠른 로딩(Core Web Vitals)에 맞춰 정적 HTML로 생성합니다.

- **상호:** 스피드 배관공사
- **전화예약:** 준비 중 (번호 준비 전까지 `예약문의`로 접수)
- **메인 키워드:** 배관공사 · 하수구막힘

## 빠른 시작

```bash
npm run build   # dist/ 에 정적 사이트 생성
npm run serve   # http://localhost:4173 미리보기
npm run dev     # build + serve
```

빌드 결과(`dist/`)는 어떤 정적 호스팅(Cloudflare Pages, Netlify, Vercel, S3, Nginx 등)에도 그대로 올릴 수 있습니다.

## 구조

```
data/
  site.mjs            # 비즈니스 정보, 상단 메뉴, 서비스 메가메뉴(3그룹)
  programs.mjs        # 15개 서비스 페이지 고유 본문(배관공사·하수구막힘 등)
  programs-extra.mjs  # 서비스별 추가 콘텐츠(작업 흐름/주의/지역 안내)
  regions.mjs         # 전국 17개 시·도 + 권역 그룹
  seoul.mjs / gyeonggi.mjs / incheon.mjs / metros.mjs / provinces.mjs  # 지역 트리
src/
  assets/styles.css   # 프리미엄 네이비 팔레트 디자인 토큰 + 컴포넌트 오버레이(Pretendard)
  assets/main.js      # PC 메가메뉴 / 모바일 아코디언 내비
  templates/layout.mjs# 공통 레이아웃 + SEO 헤드 + JSON-LD 헬퍼(Plumber)
scripts/
  build.mjs           # 정적 사이트 생성기
  locations.mjs       # 서울 계층(구·동) 생성기
  region-tree.mjs     # 범용 지역 트리(광역→시→구→동) 생성기
  variants.mjs        # 변형 엔진(도어웨이 방지)
  serve.mjs           # 의존성 없는 미리보기 서버
dist/                 # 생성된 정적 사이트(배포 대상, 약 2,960페이지)
```

## 메뉴 구조

상단 메뉴: 홈 · 배관공사 · 하수구막힘 · **서비스 안내**(메가) · **지역별 안내**(메가) · 비용 안내 · 작업사례 · 예약문의

「서비스 안내」 메가메뉴 3그룹:

1. **배관공사·수리** — 배관공사, 수도배관공사, 아파트배관공사, 상가배관공사, 배관누수
2. **막힘·뚫음** — 하수구막힘, 싱크대막힘, 변기막힘, 세면대막힘, 욕실배수구막힘, 주방배수구막힘, 음식점하수구막힘
3. **청소·점검** — 고압세척, 배관내시경, 배수관청소

> 메뉴·URL에는 키워드를 반복하지 않습니다("배관공사"·"하수구막힘"은 메뉴/URL에서 빼고, SEO Title·H1·본문에서 자연스럽게 사용).

## URL 구조 (도어웨이 위험 최소화)

```
/                       전국 메인
/service/               서비스 안내
/service/pipe/          배관공사 (drain, sink, toilet, leak …)
/area/                  지역별 안내
/area/seoul/            시·도 허브
/area/seoul/gangnam-gu/ 시군구
/area/seoul/gangnam-gu/yeoksam/  생활권(행정동)
/price/ /guide/ /case/ /contact/ /about/ /privacy/ /terms/
```

지역명만 바꾼 대량 페이지 대신, 지역 데이터(주거 형태·상권·인접 지역·특징)와 변형 엔진으로 **페이지마다 본문이 달라지도록** 생성합니다.

## SEO 적용 사항

- **메타 디스크립션 80자 이내** (전 페이지, 빌드 시 중복 0 검증)
- **모든 페이지 본문 2,000자+** (서비스/지역 페이지, 도어웨이 방지)
- **E-E-A-T**: 현장팀 바이라인·검수자·최종 수정일, 운영 정책 공개(`/about/`)
- **구조화 데이터(JSON-LD)**: Plumber(LocalBusiness), Article, FAQPage, BreadcrumbList, Service
- **선호 썸네일 지정**: `og:image` + schema `image`
- **내부링크**: 서비스 ↔ 지역 롱테일 연결, 관련 서비스 상호 연결, 권위 있는 공공 자료 참조 링크(`/guide/`)
- `sitemap.xml`, `robots.txt`, `rss.xml`, `llms.txt`, IndexNow 키 자동 생성
- 시맨틱 마크업, 모바일 우선, HTTPS 권장, JS 비차단(`defer`)

## 정책 준수 (스팸·과장 방지)

- **고정 금액 단정 금지** — 비용은 "현장 확인 후 안내" 원칙, 비용이 달라지는 기준만 안내
- **허위 후기 금지** — 가짜 후기 대신 실제 작업 진행 방식/기준을 안내
- **과장 문구 금지** — "무조건 24시 출동" 같은 표현 미사용

## 콘텐츠 추가

- 서비스: `data/programs.mjs` + `data/programs-extra.mjs`
- 지역: `data/seoul.mjs` / `gyeonggi.mjs` / `metros.mjs` / `provinces.mjs`

추가 후 `npm run build` 한 번이면 메뉴·사이트맵·내부링크에 자동 반영됩니다.

## 주의

비용·작업 정보는 현장 구조와 막힘 상태에 따라 달라질 수 있으므로, 페이지에는 항상 "현장 확인 후 안내" 원칙을 노출합니다.

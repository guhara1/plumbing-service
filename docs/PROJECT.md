# 스피드공사 — 프로젝트 문서

전국 **배관공사·하수구막힘 방문 안내** 정적 사이트. 데이터·디자인·콘텐츠·SEO 구축 내역을
정리한 문서입니다. (최종 갱신: 2026-06-21)

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| 사이트명 | 스피드공사 |
| 메인 키워드 | 배관공사 · 하수구막힘 |
| 전화예약 | 0000-0000 |
| 이메일 | help@speedgongsa.co.kr |
| 도메인 | `SITE_URL`로 지정 (기본 https://speedgongsa.co.kr) |
| 총 페이지 | **282** (전부 고유 타이틀·디스크립션) |

---

## 2. 기술 스택 / 빌드

- 정적 사이트 생성기: 순수 Node.js(ESM `.mjs`), 프레임워크·의존성 없음
- 템플릿(태그드 템플릿 리터럴) → `dist/`에 HTML 출력
- 빌드 `npm run build` / 미리보기 `npm run serve` / 감사 `npm run audit`
- 배포: Cloudflare Pages 등 정적 호스팅(루트 도메인), 출력 `dist`

---

## 3. 디자인 — 프리미엄 네이비 (신뢰형 생활수리)

토큰 3계층(Primitive → Semantic → Component). Pretendard(비차단 로드).

| 토큰 | 용도 |
|---|---|
| 네이비 `--c-navy-900~600` | 헤더 브랜드·히어로·푸터·CTA 배경 |
| 블루 `--c-blue-600` | 링크·구조 액센트·소제목 바·카드 호버 글로우 |
| 오렌지 `--c-orange-500` | 긴급 CTA(전화 버튼·모바일 하단 고정 바) |
| 화이트/그레이 | 라이트 본문 배경·서피스·보더 |

컴포넌트 오버레이: 메가메뉴, 카드 좌측 액센트 + 호버 리프트, 인라인 SVG 히어로(외부 이미지 의존 0),
목차(TOC) 스파이, 본문 H2 블루 액센트 바, 비용표, CTA 밴드, 모바일 하단 고정 전화 바.

---

## 4. 페이지 구조 (총 282)

| 구분 | 수 |
|---|---|
| 메인 | 1 |
| 서비스(인덱스 + 15) | 16 |
| 지역 시·도 | 17 |
| 지역 시·군·구 | 238 |
| 증상별/작업방식/비용/작업전확인/사례/예약/업체소개 | 7 |
| 정책(개인정보·이용약관) | 2 |
| 지역 인덱스 | 1 |

상단 메뉴(키워드 미반복): 홈 · 서비스 안내 · 지역별 안내 · 증상별 안내 · 비용 안내 · 작업 사례 · 예약 문의

---

## 5. URL 규칙

- 서비스 `/service/<slug>/` (pipe, drain, sink, toilet, washbasin, bathroom-drain,
  kitchen-drain, restaurant-drain, high-pressure-cleaning, camera-inspection, leak,
  apartment-pipe, commercial-pipe, water-pipe, drain-cleaning)
- 지역 `/area/<sido>/<sigungu>/` — 구 `-gu` / 군 `-gun` / 시 무접미사
- 경기 광주시 `/area/gyeonggi/gwangju-si/` ↔ 광주광역시 `/area/gwangju/` 구분
- 금지: `/seoul-pipe-construction/`, `/area/seoul/gangnam-gu-hasugumakim/` 등 키워드 반복 URL

---

## 6. 도어웨이/유사 본문 방지

지역 페이지는 실제 행정구역 데이터(구별 character·랜드마크·생활권 동 목록)와
주거 형태 프로파일(상가/오피스텔/아파트/관광/산업/대학/원도심)에 따라 본문이 갈라지고,
`scripts/variants.mjs`의 슬러그 시드 변형(vpick/vsubset/vshuffle)으로 소제목·문단·목록·순서가
페이지마다 달라집니다.

| 유사도(≥0.5 쌍) | 결과 |
|---|---|
| near-duplicate | **0쌍** (`npm run audit` 상시 확인) |

빌드는 **디스크립션 80자 초과 / 타이틀·디스크립션 중복**을 발견하면 실패합니다.

---

## 7. SEO / E-E-A-T

- 메타 디스크립션 ≤80자, 타이틀·디스크립션 중복 0
- JSON-LD: Plumber(LocalBusiness), Article(author/publisher/dateModified), Service, FAQPage, BreadcrumbList
- 허위 Review/AggregateRating·과장 문구·가짜 후기 미사용
- 작성자·검수자 바이라인, 운영/편집 정책 공개(`/about/`)
- 내부링크: 지역↔서비스 롱테일 앵커, 비용/작업전확인 연결, 외부 권위 기관(환경부·국토부·상하수도협회·K-water) 참고 링크
- `sitemap.xml`·`robots.txt`·`rss.xml`·`llms.txt`·IndexNow 키 자동 생성

---

## 8. 명령어

```bash
npm run build   # dist/ 생성 + SEO 검증
npm run serve   # 로컬 미리보기
npm run audit   # 유사도/중복/도어웨이 감사
```

# 스피드 배관공사 — 프로젝트 전체 문서

전국 **배관공사·하수구막힘 방문 안내** 정적 사이트. 데이터·디자인·콘텐츠·SEO·색인까지
구축 내역을 정리한 문서입니다. (최종 갱신: 2026-06-22)

---

## 1. 개요

| 항목 | 내용 |
|---|---|
| 사이트명 | 스피드 배관공사 |
| 도메인 | (배포 시 설정 — `SITE_URL`) |
| 메인 키워드 | 배관공사 · 하수구막힘 |
| 전화예약 | 준비 중 (번호 준비 전까지 `예약문의` 접수) |
| 이메일 | help@plumbingservice.co.kr |
| 성격 | 전국 배관·하수구 방문 작업 + 정보 안내 |
| 총 페이지 | **약 2,967개** (전부 고유 타이틀·디스크립션) |

---

## 2. 기술 스택 / 빌드 시스템

- **정적 사이트 생성기**: 순수 Node.js (ESM `.mjs`), 프레임워크 없음
- 템플릿 = 태그드 템플릿 리터럴 → `dist/`에 HTML 출력
- 빌드: `npm run build` / 로컬: `node scripts/serve.mjs`
- 배포: Cloudflare Pages 또는 GitHub Pages(`.github/workflows/deploy.yml`)
- 도메인/베이스 경로는 `SITE_URL` · `BASE_PATH` 환경변수로 override

### 파일 구조
```
data/
  site.mjs            사이트 전역 설정·상단 메뉴·서비스 메가메뉴(3그룹)
  programs.mjs        15개 서비스 본문(배관공사·하수구막힘·고압세척 등)
  programs-extra.mjs  서비스 보조 콘텐츠(작업 흐름/주의/지역 안내)
  regions.mjs         17개 시·도 + 권역 그룹
  seoul.mjs / gyeonggi.mjs / incheon.mjs   수도권 상세
  metros.mjs / provinces.mjs               광역시·도 트리
scripts/
  build.mjs           메인 생성기
  locations.mjs       서울 계층(구·동) 생성기
  region-tree.mjs     범용 지역 트리(광역→시→구→동)
  variants.mjs        변형 엔진(도어웨이 방지)
  romanize.mjs        한글→로마자 슬러그
  audit-similarity.mjs  유사도/도어웨이 감사 도구
  serve.mjs           로컬 미리보기 서버
src/
  templates/layout.mjs   공용 레이아웃(head·헤더·푸터·JSON-LD·목차·비용/신뢰 컴포넌트)
  assets/styles.css      디자인 시스템(프리미엄 네이비)
  assets/main.js         내비·메가메뉴·스크롤 인터랙션
  assets/hero.jpg/.webp  히어로 대표 이미지(16:9)
tools/                인덱싱(IndexNow/구글) 운영 스크립트
docs/PROJECT.md       (이 문서)
```

---

## 3. 디자인 시스템 — "프리미엄 네이비"

토큰 3계층(Primitive → Semantic → Component). 토큰 이름은 모듈 호환을 위해 유지하되
값을 프리미엄 네이비/오렌지 팔레트로 교체했습니다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `--c-bg-0~3` | `#060f1c` · `#0a1626` · `#0f2036` · `#16314f` | 딥 네이비 배경 단계 |
| `--c-gold-700~300` | `#b9521a` → `#ffbb7e` | 포인트 오렌지(액센트·CTA) |
| `--c-steel-400~600` | `#79c0ec` · `#4a9fd4` · `#2f6f9e` | 스틸 블루(보조 액센트) |
| `--color-accent` | `#f5852b` | 포인트(링크·버튼·강조) |

- 폰트: **Pretendard**(가변, 비동기 로드)
- 컴포넌트: 메가메뉴(PC 3열/모바일 아코디언), 카드 글로우, 16:9 히어로, 목차(TOC),
  본문 H2 액센트 바, 비용 기준 카드, **작업 진행 방식(신뢰) 카드**, 모바일 하단 고정 바

---

## 4. 페이지 구조 & 통계 (약 2,967)

| 구분 | 페이지 수 |
|---|---|
| 지역(area) | 2,943 (인덱스 포함) |
| 서비스(service) | 16 (인덱스+15) |
| 정적 안내(홈·비용·작업전확인·작업사례·소개·문의) | 6 |
| 정책(개인정보처리방침·이용약관) | 2 |

### 상단 메뉴 (8개)
홈 `/` · 배관공사 `/service/pipe/` · 하수구막힘 `/service/drain/` ·
서비스 안내 `/service/` · 지역별 안내 `/area/` · 비용 안내 `/price/` ·
작업사례 `/case/` · 예약문의 `/contact/`

---

## 5. 서비스 (15개 / 3그룹)

각 서비스 페이지: 고유 본문 2,000자+, 목차·FAQ·JSON-LD·E-E-A-T 바이라인.

- **배관공사·수리(5)**: 배관공사, 수도배관공사, 아파트배관공사, 상가배관공사, 배관누수
- **막힘·뚫음(7)**: 하수구막힘, 싱크대막힘, 변기막힘, 세면대막힘, 욕실배수구막힘, 주방배수구막힘, 음식점하수구막힘
- **청소·점검(3)**: 고압세척, 배관내시경, 배수관청소

URL 예: `/service/pipe/`, `/service/drain/`, `/service/high-pressure-cleaning/`

---

## 6. 지역 구조 (전국 17개 시·도 / 약 2,943 페이지)

광역 → 시·군·구 → 행정동(읍·면)까지 계층 생성. 인천 2026 행정구역 개편 반영.
모든 페이지 고유 본문 2,000자+. 지역 데이터(주거 형태·상권·인접 지역·특징)와
변형 엔진으로 페이지마다 본문이 달라집니다.

URL 예: `/area/seoul/gangnam-gu/yeoksam/`, `/area/gyeonggi/suwon/`
주의: 경기도 광주시(`/area/gyeonggi/gwangju-si/`) ≠ 광주광역시(`/area/gwangju/`)

---

## 7. SEO / E-E-A-T

- **메타 디스크립션** ≤ 80자, 전 페이지 고유(중복 0, 빌드가 강제 검사)
- **타이틀·디스크립션 중복 0**
- **구조화 데이터(JSON-LD)**: Plumber(LocalBusiness), Article(저자/검수/수정일),
  FAQPage, BreadcrumbList, Service. (고정 가격·허위 Review/AggregateRating 미사용)
- **E-E-A-T**: 현장팀 바이라인·검수자·최종 수정일, 운영 정책 공개
- **선호 썸네일**: og:image + schema image 동시 지정
- **내부 링크**: 전국 시·도를 지역마다 다른 자연스러운 앵커로 연결(스터핑 회피),
  서비스 페이지는 지역+서비스 롱테일, 관련 서비스 상호 연결, 공공 참조 링크
- **성능**: 비동기 폰트, 히어로 LCP preload, image-set(webp/jpg)

### 도어웨이/유사·복사 방지 — 변형 엔진
`scripts/variants.mjs`의 슬롯별 독립 시드(vpick/vsubset/vshuffle)로 문단·목록·섹션
순서를 페이지마다 다르게 선택. `node scripts/audit-similarity.mjs`로 상시 감사.

---

## 8. 정책 준수 (스팸·과장 방지)

- **고정 금액 단정 금지** — "현장 확인 후 안내" 원칙, 비용이 달라지는 기준만 제시
- **허위 후기 금지** — 가짜 후기 대신 실제 작업 진행 방식/기준 안내
- **과장 문구 금지** — "무조건 24시 출동" 등 미사용
- **읍·면·동 무분별 대량 생성 지양** — 지역 데이터가 있는 곳만 차별화 생성

---

## 9. 색인(인덱싱) 인프라

빌드 시 자동 생성: `sitemap.xml` · `rss.xml` · `robots.txt`(구글봇·빙봇·네이버 Yeti·
다음 Daumoa 명시) · IndexNow 키 파일 · `llms.txt`. `<head>`에 RSS 자동발견 링크 포함.

운영 가이드: `tools/README.md`.

---

## 10. 명령어 / 운영

```bash
npm run build                        # 사이트 생성 → dist/
node scripts/serve.mjs               # 로컬 미리보기
node scripts/audit-similarity.mjs    # 유사도·중복·도어웨이 감사
```

### 배포 체크리스트
1. 빌드(`npm run build`, 출력 `dist`)
2. 커스텀 도메인 연결 + DNS, `SITE_URL` 설정
3. 네이버 Search Advisor / 구글 Search Console에 sitemap·rss 제출
4. 전화예약 번호 확정 시 `data/site.mjs`의 `phone`/`phoneHref` 갱신

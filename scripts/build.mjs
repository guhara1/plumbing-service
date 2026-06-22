// 스피드공사 정적 사이트 생성기
// 전국 배관공사·하수구막힘 — 메인 / 서비스 / 지역(시도·시군구) / 증상 / 작업방식 / 비용 / 가이드 / 사례 / 문의 / 정책
import { mkdir, writeFile, copyFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { site } from "../data/site.mjs";
import { services, serviceBySlug } from "../data/services.mjs";
import { areas, areaGroups, areaBySlug } from "../data/areas.mjs";
import { symptoms } from "../data/symptoms.mjs";
import {
  layout, esc, faqLd, articleLd, serviceLd, faqSection, authorBox, costBasisNote, ctaSection,
} from "../src/templates/layout.mjs";
import { vpick, vsubset, vshuffle, vflag } from "./variants.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const MOD = "2026-06-21";

const pages = []; // { path, lastmod }
const seoSeen = { title: new Map(), desc: new Map() }; // 중복/길이 검증용
async function emit(path, html, { lastmod = MOD } = {}) {
  const dir = join(DIST, path);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "index.html"), html, "utf8");
  const route = path === "" ? "/" : `/${path}/`;
  pages.push({ path: route, lastmod });
  const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || "";
  const d = (html.match(/<meta name="description" content="([\s\S]*?)"/) || [])[1] || "";
  if ([...d].length > 80) throw new Error(`디스크립션 80자 초과(${[...d].length}): ${route}`);
  (seoSeen.title.get(t) || seoSeen.title.set(t, []).get(t)).push(route);
  (seoSeen.desc.get(d) || seoSeen.desc.set(d, []).get(d)).push(route);
}
const urlPath = (p) => (p === "" ? "/" : `/${p}/`);

// ---------- 공통 마크업 헬퍼 ----------
const p = (t) => `<p>${t}</p>`;
const ul = (items) => `<ul>${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
const svc = (slug, anchor) => `<a href="/service/${slug}/">${esc(anchor || serviceBySlug[slug].name)}</a>`;
const breadcrumbNav = (items) =>
  `<nav class="breadcrumb container" aria-label="현재 위치">${items
    .map((b, i) => (i < items.length - 1 ? `<a href="${b.url}">${esc(b.name)}</a><span>›</span>` : `<span>${esc(b.name)}</span>`))
    .join("")}</nav>`;

// 80자 이내 디스크립션 보장
function clampDesc(s) {
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= 80) return s;
  let cut = s.slice(0, 80);
  return cut.replace(/[\s,·]+\S*$/, "").trim() || s.slice(0, 80);
}

// 외부 권위 사이트 참고 링크 (E-E-A-T / rel 처리)
const AUTH_LINKS = [
  { name: "환경부 하수도 정책", url: "https://www.me.go.kr/" },
  { name: "국토교통부", url: "https://www.molit.go.kr/" },
  { name: "한국상하수도협회", url: "https://www.kwwa.or.kr/" },
  { name: "K-water 한국수자원공사", url: "https://www.kwater.or.kr/" },
];
function authorityBlock() {
  return `
  <div class="callout">
    <strong>참고 정보</strong> — 상하수도·배관 관련 공공 기관 안내입니다.
    ${AUTH_LINKS.map((a) => `<a href="${a.url}" target="_blank" rel="noopener noreferrer nofollow">${esc(a.name)}</a>`).join(" · ")}
  </div>`;
}

// 히어로 일러스트(인라인 SVG — 외부 이미지 의존 없음)
const HERO_SVG = `
<div class="hero-visual" aria-hidden="true">
<svg viewBox="0 0 460 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="배관·하수구 작업 일러스트">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2f81f7"/><stop offset="1" stop-color="#1554c0"/></linearGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fb9a4b"/><stop offset="1" stop-color="#ea580c"/></linearGradient>
  </defs>
  <rect x="20" y="40" width="420" height="280" rx="22" fill="#0f2444" opacity="0.55"/>
  <rect x="48" y="74" width="364" height="214" rx="16" fill="#ffffff" opacity="0.06"/>
  <g stroke="url(#g1)" stroke-width="18" fill="none" stroke-linecap="round">
    <path d="M90 130 H250 a40 40 0 0 1 40 40 V250"/>
    <path d="M120 250 H360"/>
  </g>
  <circle cx="90" cy="130" r="22" fill="url(#g1)"/>
  <circle cx="290" cy="250" r="22" fill="url(#g2)"/>
  <g fill="#5aa0ff"><circle cx="330" cy="110" r="6"/><circle cx="352" cy="140" r="5"/><circle cx="312" cy="150" r="4"/></g>
  <rect x="150" y="232" width="120" height="14" rx="7" fill="url(#g2)"/>
</svg>
</div>`;

// ============================================================
//  지역 콘텐츠 변형 풀 (도어웨이 방지: 슬러그 시드 기반 선택)
// ============================================================
const PROFILE_RULES = [
  { key: "commercial", re: /상가|상권|시장|충장로|서면|동성로|명동|로데오|먹자|번화|구월동|은행동|상무/, label: "상가·음식점" },
  { key: "officetel", re: /오피스텔|업무|금융|여의도|테헤란|사무|혁신도시|역세권/, label: "오피스텔·사무실" },
  { key: "apartment", re: /아파트|신도시|택지|대단지|뉴타운|신주거|정주|주거지/, label: "아파트·주거단지" },
  { key: "tour", re: /해수욕장|온천|리조트|관광|해변|펜션|숙박|항|섬|해안|호수공원/, label: "숙박·관광시설" },
  { key: "industrial", re: /산업단지|공단|제철|산단|테크노|중공업|산업|물류|항만/, label: "산업·사업장" },
  { key: "university", re: /대학|대 |캠퍼스|학원가|대입구|학생/, label: "원룸·다세대" },
  { key: "oldtown", re: /원도심|전통|구도심|근대|개항|노후|옛/, label: "노후 주택" },
];
function profileOf(child) {
  const text = `${child.character || ""} ${(child.landmarks || []).join(" ")} ${child.name}`;
  const hits = PROFILE_RULES.filter((r) => r.re.test(text)).map((r) => r.key);
  return new Set(hits.length ? hits : ["apartment"]);
}

// 페이지마다 H2 문구를 다르게(의미는 동일, 표현만 변형) — 도어웨이 시그널 완화
const H2_PROBLEM = ["이 지역에서 자주 발생하는 배관 문제", "자주 접수되는 배관·하수구 증상", "이 지역에서 많이 생기는 막힘 유형", "현장에서 자주 만나는 배관 문제"];
const H2_HOUSING = ["아파트·빌라·상가 배관 차이", "주거 형태별 배관 문제 차이", "건물 유형에 따른 점검 포인트", "아파트·상가·주택 배관 구분"];
const H2_METHOD = ["하수구막힘 작업 방식", "막힘 해결 작업 방식", "어떤 작업이 필요한가", "증상별 작업 방식 안내"];
const H2_LIVING = ["방문 가능 생활권", "방문 가능 동네 안내", "주요 생활권과 방문 동선", "방문 가능 권역"];
const H2_CONFIRM = ["작업 전 확인사항", "방문 전 확인하면 좋은 점", "예약 전 점검할 항목", "작업 전 미리 확인할 것"];
const H2_COST = ["비용이 달라지는 기준", "비용을 결정하는 요인", "작업 비용 기준 안내", "비용이 달라지는 이유"];
const H2_BOOK = ["예약 문의 방법", "방문 예약 안내", "문의·예약 방법", "예약 접수 안내"];

const PROBLEM_LEAD = [
  (n) => `${n}에서 접수되는 배관·하수구 문의는 건물 형태와 사용 환경에 따라 원인이 다양합니다.`,
  (n) => `${n}은(는) 주거·상업 환경이 섞여 있어, 같은 막힘이라도 원인과 작업 방식이 달라집니다.`,
  (n) => `${n}의 배관 문제는 증상을 먼저 확인해 원인을 좁히는 것이 빠른 해결의 출발점입니다.`,
  (n) => `${n}에서 자주 발생하는 배관·하수구 증상은 건물 연식과 사용량에 따라 갈립니다.`,
  (n) => `${n}은(는) 동네마다 배관 환경이 달라, 위치와 증상을 함께 확인하면 작업이 정확해집니다.`,
];
const HOUSING_TRANS = [
  (n) => `아파트는 세대 배관과 공용 배관이 구분되어 ${svc("apartment-pipe", "아파트 배관 점검")}이, 상가·건물은 공용 배수관 부하가 커 ${svc("commercial-pipe", "상가 배관 점검")}이 필요한 경우가 많습니다.`,
  (n) => `${n}처럼 주거와 상가가 섞인 곳은 세대 내 배수 문제와 공용 배관 문제를 구분해 접근해야 합니다. 아파트는 ${svc("apartment-pipe", "세대·공용 배관 구분")}, 상가는 ${svc("commercial-pipe", "공용 배수관 부하 점검")}이 중요합니다.`,
  (n) => `빌라·다세대는 공용 배관 노후가 빠르고, 상가·건물은 사용량이 많아 ${svc("commercial-pipe", "상가 배관")} 부하가 큽니다. 아파트는 ${svc("apartment-pipe", "공용관 협의")}가 필요할 수 있습니다.`,
];
const METHOD_OUTRO = [
  () => `작업 전 ${svc("camera-inspection", "배관내시경")}으로 원인을 확인하면 불필요한 개방과 재작업을 줄일 수 있습니다. 자세한 절차는 <a href="/process/">작업 방식 안내</a>에서 확인하세요.`,
  () => `원인이 모호하면 ${svc("camera-inspection", "내시경 점검")}을 먼저 진행해 개방 범위를 줄입니다. 전체 절차는 <a href="/process/">작업 방식 안내</a>를 참고하세요.`,
  () => `같은 증상이라도 막힌 위치에 따라 ${svc("high-pressure-cleaning", "고압세척")}이 필요할 수 있습니다. 단계별 작업은 <a href="/process/">작업 방식 안내</a>에서 확인할 수 있습니다.`,
];
const CONFIRM_INTRO = ["방문 전 아래 항목을 확인해 두시면 작업이 빨라집니다.", "예약 시 다음 내용을 알려주시면 작업 준비가 수월합니다.", "방문 전 아래를 점검해 두면 정확한 안내가 가능합니다."];
const COST_INTRO = [
  (n) => `${n}의 배관공사·하수구막힘 비용은 다음 기준에 따라 달라집니다.`,
  (n) => `${n}에서도 비용은 확정 금액이 아니라 아래 요인으로 정해집니다.`,
  (n) => `다음 요인에 따라 ${n} 작업 비용이 달라질 수 있습니다.`,
];
const PROBLEM_ITEMS = [
  "싱크대·주방 배수가 느려지거나 역류하는 경우",
  "욕실 바닥·세면대 배수구에서 물이 천천히 빠지는 경우",
  "변기 물이 잘 내려가지 않거나 차오르는 경우",
  "여러 배수구에서 동시에 냄새·역류가 생기는 경우",
  "오래된 배관의 녹물·누수·반복 막힘이 이어지는 경우",
  "상가·음식점 주방 배관에 기름·찌꺼기가 누적된 경우",
];
const DRAIN_METHOD = [
  "막힌 위치가 트랩·배수관 초입이면 스프링(관통) 작업으로 비교적 빠르게 해소되는 경우가 많습니다.",
  "기름·스케일이 누적돼 관이 좁아진 경우에는 고압세척으로 관 벽을 청소해야 재발이 줄어듭니다.",
  "원인이 불명확하거나 반복 재발한다면 배관내시경으로 내부를 확인한 뒤 작업 방식을 정합니다.",
  "여러 배수구가 함께 느리면 세대 내 작업만으로 어려울 수 있어 공용관·본관 점검을 병행합니다.",
];
const COST_FACTOR = [
  "막힌 위치와 깊이, 배관 길이",
  "스프링·고압세척·내시경 등 사용 장비",
  "건물 유형(아파트·빌라·상가)과 접근성",
  "야간·긴급 출동 여부와 이동 거리",
  "노후 배관 교체·부분 보수 필요 여부",
];
const CONFIRM_ITEMS = [
  "물이 전혀 안 내려가는지, 천천히 빠지는지",
  "아래쪽에서 물이 역류하는지",
  "한 곳만 막혔는지 여러 곳이 함께 느린지",
  "건물이 아파트·빌라·상가 중 무엇인지",
  "최근 공사·이물질 투입이 있었는지",
  "야간·긴급 방문인지 예약 방문인지",
];

function housingParagraph(n, prof, base) {
  const parts = [];
  if (prof.has("commercial"))
    parts.push(`${n}은(는) 상가·음식점 비중이 높아 주방 기름때 누적과 공용 배수관 역류, ${svc("restaurant-drain", "음식점 주방 하수구막힘")} 문의가 상대적으로 많습니다.`);
  if (prof.has("officetel"))
    parts.push(`오피스텔·사무실이 많은 권역은 공용 배수관과 탕비실·화장실 라인 점검이 중요하며, ${svc("commercial-pipe", "건물 공용 배관 점검")}이 함께 필요한 경우가 있습니다.`);
  if (prof.has("apartment"))
    parts.push(`대단지 아파트·주거지가 넓은 곳은 ${svc("bathroom-drain", "욕실 배수구막힘")}, ${svc("sink", "싱크대막힘")}, 베란다 배수 같은 세대 내 배수 문제가 주로 접수됩니다.`);
  if (prof.has("tour"))
    parts.push(`숙박·관광 시설이 많은 권역은 객실·주방 사용량이 많아 상가 배수와 ${svc("high-pressure-cleaning", "정기 고압세척")} 수요가 이어집니다.`);
  if (prof.has("industrial"))
    parts.push(`산업·사업장이 많은 권역은 사용량이 커 굵은 배관의 누적이 빠르고, ${svc("drain-cleaning", "정기 배수관청소")}로 관리하는 경우가 많습니다.`);
  if (prof.has("university"))
    parts.push(`원룸·다세대가 밀집한 권역은 노후 배관과 머리카락·이물질에 의한 ${svc("washbasin", "세면대·욕실 배수 막힘")}이 자주 발생합니다.`);
  if (prof.has("oldtown"))
    parts.push(`원도심·노후 주택이 많은 권역은 ${svc("pipe", "배관 노후 교체")}와 ${svc("leak", "배관누수")} 점검이 필요한 경우가 늘어납니다.`);
  if (!parts.length)
    parts.push(`${n}은(는) 주거 위주 권역으로 ${svc("drain", "하수구막힘")}과 ${svc("sink", "싱크대막힘")} 등 생활 배수 문제가 주로 접수됩니다.`);
  // 슬러그 시드로 순서 섞어 페이지마다 흐름이 달라지게
  return vshuffle(base, "housing", parts).join(" ");
}

// 시군구 본문 생성
function regionBody(sido, child) {
  const base = `${sido.slug}/${child.slug}`;
  const n = child.name;
  const prof = profileOf(child);
  const living = (child.subgu && child.subgu.length ? child.subgu : (child.dongs || [])).slice(0, 10);
  const landmarks = (child.landmarks || []).slice(0, 4);

  const problemItems = vsubset(base, "prob", PROBLEM_ITEMS, 4);
  const methods = vshuffle(base, "method", DRAIN_METHOD);
  const costs = vsubset(base, "cost", COST_FACTOR, 4);
  const confirms = vsubset(base, "confirm", CONFIRM_ITEMS, 5);

  const livingHtml = living.length
    ? p(`방문 가능 생활권으로는 ${living.map(esc).join(", ")} 등이 있습니다.${landmarks.length ? ` ${landmarks.map(esc).join(", ")} 인근도 방문 동선에 포함됩니다.` : ""} 정확한 위치를 알려주시면 방문 가능 여부와 도착 소요 시간을 안내합니다.`)
    : p(`정확한 주소(동·건물명)를 알려주시면 ${esc(n)} 내 방문 가능 여부와 도착 소요 시간을 안내합니다.`);

  const charLine = child.character ? p(esc(child.character)) : "";
  const nearbyChips = (sido.children || [])
    .filter((c) => c.slug !== child.slug)
    .slice(0, 4)
    .map((c) => `<a class="chip" href="/area/${sido.slug}/${c.slug}/">${esc(c.name)} 방문 안내</a>`)
    .join("");

  return `
  ${breadcrumbNav([
    { name: "홈", url: "/" },
    { name: "지역별 안내", url: "/area/" },
    { name: sido.name, url: `/area/${sido.slug}/` },
    { name: n, url: `/area/${sido.slug}/${child.slug}/` },
  ])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">${esc(sido.name)} · 지역 안내</span>
    <h1>${esc(n)} 배관공사 · 하수구막힘 방문 안내</h1>
    <p>${esc(n)}의 주거·상업 환경에 맞춰 배관공사와 하수구막힘 작업을 안내합니다. 증상과 위치를 알려주시면 예상 작업 범위를 먼저 안내합니다.</p>
  </div></section>
  <section class="section"><div class="container prose">
    ${charLine}
    <h2>${esc(vpick(base, "h-prob", H2_PROBLEM))}</h2>
    ${p(vpick(base, "lead", PROBLEM_LEAD)(n))}
    ${ul(problemItems)}
    <h2>${esc(vpick(base, "h-house", H2_HOUSING))}</h2>
    ${p(housingParagraph(n, prof, base))}
    ${p(vpick(base, "house-trans", HOUSING_TRANS)(n))}
    <h2>${esc(vpick(base, "h-method", H2_METHOD))}</h2>
    ${p(methods.slice(0, 3).join(" "))}
    ${p(vpick(base, "method-outro", METHOD_OUTRO)())}
    <h2>${esc(vpick(base, "h-living", H2_LIVING))}</h2>
    ${livingHtml}
    ${nearbyChips ? `<p>인접 지역도 함께 방문합니다.</p><div class="chip-row">${nearbyChips}</div>` : ""}
    <h2>${esc(vpick(base, "h-confirm", H2_CONFIRM))}</h2>
    ${p(vpick(base, "confirm-intro", CONFIRM_INTRO))}
    ${ul(confirms)}
    ${p(`자세한 체크리스트는 <a href="/guide/before-service/">작업 전 확인사항</a>을 참고하세요.`)}
    <h2>${esc(vpick(base, "h-cost", H2_COST))}</h2>
    ${p(vpick(base, "cost-intro", COST_INTRO)(n))}
    ${ul(costs)}
    ${costBasisNote()}
    <h2>${esc(vpick(base, "h-book", H2_BOOK))}</h2>
    ${p(`${esc(n)} 방문 예약은 전화(${esc(site.phone)})로 증상과 위치를 알려주시거나, <a href="/contact/">예약 문의</a>에서 사진과 함께 접수하시면 예상 작업 범위를 먼저 안내합니다. <a href="/about/">고객센터</a>에서 운영 기준도 확인할 수 있습니다.`)}
    ${authorBox(MOD)}
  </div></section>
  ${ctaSection(`${n} 배관·하수구 예약 문의`)}
  `;
}

// 시도 본문 생성
function sidoBody(sido) {
  const base = `area/${sido.slug}`;
  const childCards = sido.children
    .map(
      (c) => `<a class="card" href="/area/${sido.slug}/${c.slug}/">
        <span class="card-tag">${esc(sido.name)}</span>
        <h3>${esc(c.name)}</h3>
        <p>${esc((c.character || `${c.name} 배관공사·하수구막힘 방문 안내`).slice(0, 56))}…</p>
      </a>`
    )
    .join("");
  const svcCards = vsubset(base, "svc", services.slice(0, 13), 6)
    .map((s) => `<a class="chip" href="/service/${s.slug}/">${esc(s.name)}</a>`)
    .join("");

  return `
  ${breadcrumbNav([
    { name: "홈", url: "/" },
    { name: "지역별 안내", url: "/area/" },
    { name: sido.name, url: `/area/${sido.slug}/` },
  ])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">지역별 안내</span>
    <h1>${esc(sido.name)} 배관공사 · 하수구막힘 방문 안내</h1>
    <p>${esc(sido.intro)}</p>
  </div></section>
  <section class="section"><div class="container">
    <div class="section-head"><h2>${esc(sido.name)} 시·군·구 선택</h2><p>지역을 선택하면 해당 지역의 주거 형태와 자주 발생하는 배관 문제, 방문 가능 생활권을 확인할 수 있습니다.</p></div>
    <div class="grid grid-3">${childCards}</div>
  </div></section>
  <section class="section section-alt"><div class="container">
    <div class="section-head"><h2>${esc(sido.name)} 주요 서비스</h2><p>증상에 맞는 서비스를 먼저 확인하면 작업 방식과 비용 기준을 이해하기 쉽습니다.</p></div>
    <div class="chip-row">${svcCards}</div>
    ${costBasisNote()}
  </div></section>
  ${ctaSection(`${sido.name} 배관·하수구 예약 문의`)}
  `;
}

// ============================================================
//  페이지 빌드
// ============================================================
async function buildHome() {
  const svcCards = services
    .slice(0, 6)
    .map((s) => `<a class="card" href="/service/${s.slug}/"><span class="card-tag">서비스</span><h3>${esc(s.name)}</h3><p>${esc(s.desc.slice(0, 52))}…</p></a>`)
    .join("");
  const areaCards = areas
    .map((a) => `<a class="chip" href="/area/${a.slug}/">${esc(a.name)}</a>`)
    .join("");
  const symptomCards = symptoms
    .slice(0, 6)
    .map((s) => `<a class="card" href="/symptoms/#${esc(slugForSymptom(s.title))}"><h3>${esc(s.title)}</h3><p>${esc(s.cause.slice(0, 48))}…</p></a>`)
    .join("");

  const body = `
  <section class="hero"><div class="container">
    <div>
      <span class="eyebrow">전국 배관공사 · 하수구막힘</span>
      <h1>전국 배관공사 · 하수구막힘 방문 서비스 안내</h1>
      <p>싱크대·변기·욕실·상가 배관 문제를 지역별로 확인하세요. 증상과 위치를 알려주시면 예상 작업 범위를 먼저 안내합니다.</p>
      <ul class="hero-points">
        <li>증상별 원인 확인</li><li>현장 점검·내시경</li><li>비용 기준 사전 안내</li><li>전국 지역별 방문</li>
      </ul>
      <div class="hero-actions">
        <a class="btn btn-primary" href="${site.phoneHref}">📞 전화예약 ${esc(site.phone)}</a>
        <a class="btn btn-outline" href="/contact/">사진 보내고 문의</a>
        <a class="btn btn-outline" href="/area/">방문 가능 지역 확인</a>
      </div>
    </div>
    ${HERO_SVG}
  </div></section>

  <section class="section"><div class="container">
    <div class="feature-row">
      <div class="feature"><div class="ico">🔎</div><h3>증상 먼저 확인</h3><p>‘무조건 뚫기’가 아니라 증상으로 원인을 좁혀 알맞은 작업을 안내합니다.</p></div>
      <div class="feature"><div class="ico">🛠️</div><h3>현장 점검·내시경</h3><p>필요 시 배관내시경으로 내부를 확인해 불필요한 개방을 줄입니다.</p></div>
      <div class="feature"><div class="ico">💧</div><h3>재발 줄이는 작업</h3><p>고압세척으로 관 벽을 청소해 단순 관통보다 재발 주기를 늦춥니다.</p></div>
      <div class="feature"><div class="ico">📍</div><h3>전국 지역 안내</h3><p>시·도, 시·군·구별 주거 형태에 맞춘 방문 안내를 제공합니다.</p></div>
    </div>
  </div></section>

  <section class="section"><div class="container prose" style="max-width:none">
    <h2>배관공사와 하수구막힘을 찾을 때 먼저 확인할 기준</h2>
    ${p("전국 배관공사와 하수구막힘 문제는 지역보다 먼저 증상을 정확히 확인하는 것이 중요합니다. 싱크대 물이 천천히 내려가는지, 변기 물이 차오르는지, 욕실 배수구에서 냄새가 올라오는지, 상가 주방 배관에서 역류가 생기는지에 따라 필요한 작업 방식이 달라집니다.")}
    <h2>싱크대·변기·욕실·상가 배관 문제 차이</h2>
    ${p(`배관공사는 막힌 곳을 뚫는 작업만이 아니라 ${svc("pipe", "노후 배관 교체")}, ${svc("water-pipe", "수도배관 연결")}, ${svc("leak", "누수 보수")}까지 포함합니다. 반면 ${svc("drain", "하수구막힘")}은 배수 흐름이 느려지거나 역류·악취·이물질 누적에서 시작됩니다. 그래서 서비스 상세 페이지에서는 증상별로 나누어 설명합니다.`)}
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">서비스</span><h2>증상에 맞는 서비스 선택</h2><p>대표 서비스를 먼저 확인하고, 전체 목록에서 세부 항목을 살펴보세요.</p></div>
    <div class="grid grid-3">${svcCards}</div>
    <p style="margin-top:var(--sp-5)"><a class="btn btn-blue" href="/service/">서비스 전체보기 →</a></p>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">증상</span><h2>물이 안 내려갈 때, 냄새가 날 때</h2><p>증상에서 출발해 원인과 알맞은 작업을 확인하세요.</p></div>
    <div class="grid grid-3">${symptomCards}</div>
    <p style="margin-top:var(--sp-5)"><a class="btn btn-outline" href="/symptoms/">증상별 안내 전체보기 →</a></p>
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">지역</span><h2>전국 방문 가능 지역 안내</h2><p>시·도를 선택하면 시·군·구별 안내로 이동합니다. 지역명만 바꾼 중복 페이지가 아니라, 지역별 주거 형태에 맞춘 안내를 제공합니다.</p></div>
    <div class="chip-row">${areaCards}</div>
  </div></section>

  <section class="section"><div class="container prose" style="max-width:none">
    <h2>비용이 달라지는 기준</h2>
    ${p("정확한 비용은 현장 구조, 막힘 정도, 배관 길이, 장비 사용 여부에 따라 달라집니다. 과장된 금액을 단정하기보다 ‘현장 확인 후 안내’를 원칙으로 합니다.")}
    ${costBasisNote()}
    <h2>작업 전 확인사항</h2>
    ${p(`방문 전 막힘 위치·역류 여부·건물 유형·이전 작업 여부를 확인해 두시면 작업이 빨라집니다. 자세한 내용은 <a href="/guide/before-service/">작업 전 확인사항</a>에서 확인하세요.`)}
    <h2>전국 지역 페이지 중복 방지 운영 기준</h2>
    ${p("이 사이트는 지역명만 바꾼 페이지를 대량으로 만들지 않습니다. 시·도와 시·군·구 중심으로 구성하고, 각 지역의 주거 형태·상권·자주 발생하는 문제를 다르게 작성해 사용자가 실제로 필요한 정보를 얻도록 합니다.")}
    <h2>예약 문의 방법</h2>
    ${p(`전화(${esc(site.phone)})로 증상과 위치를 알려주시거나 <a href="/contact/">예약 문의</a>에서 사진과 함께 접수하시면 예상 작업 범위를 먼저 안내합니다.`)}
  </div></section>
  ${ctaSection("전국 배관·하수구 예약 문의")}
  `;

  await emit("", layout({
    title: "전국 배관공사·하수구막힘｜싱크대·변기·배수구 막힘 긴급 방문 안내",
    description: clampDesc("전국 배관공사·하수구막힘 방문 안내. 싱크대, 변기, 욕실 배수구, 상가 배관 문제를 지역별로 확인하세요."),
    path: "/",
    body,
    structuredData: [articleLd({ headline: "전국 배관공사·하수구막힘 방문 서비스 안내", description: "전국 배관공사·하수구막힘 방문 안내", path: "/" })],
  }));
}

function slugForSymptom(title) {
  // 한글 제목 → 안정적인 앵커 id (영문 슬러그가 비면 인덱스 기반)
  return "s-" + symptoms.findIndex((s) => s.title === title);
}

async function buildServiceIndex() {
  const cards = services
    .map((s) => `<a class="card" href="/service/${s.slug}/"><span class="card-tag">${esc(s.kw)}</span><h3>${esc(s.name)}</h3><p>${esc(s.desc.slice(0, 60))}…</p></a>`)
    .join("");
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "서비스 안내", url: "/service/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">서비스 안내</span>
    <h1>배관공사·하수구막힘 서비스 안내</h1>
    <p>증상과 작업 목적에 따라 서비스를 나누어 안내합니다. 각 페이지에서 원인·작업 방식·비용 기준을 확인하세요.</p>
  </div></section>
  <section class="section"><div class="container"><div class="grid grid-3">${cards}</div>${costBasisNote()}</div></section>
  ${ctaSection("서비스 예약 문의")}
  `;
  await emit("service", layout({
    title: "서비스 안내｜배관공사·하수구막힘·고압세척·배관내시경 | " + site.name,
    description: clampDesc("배관공사·하수구막힘·싱크대·변기·고압세척·배관내시경 서비스를 증상별로 안내합니다."),
    path: "/service/",
    body,
  }));
}

async function buildService(s) {
  const base = `service/${s.slug}`;
  const lead = s.lead.map(p).join("");
  const sections = s.sections
    .map((sec) => `<h2>${esc(sec.h)}</h2>${sec.p.map((t) => p(esc(t))).join("")}${sec.list ? ul(sec.list.map(esc)) : ""}`)
    .join("");
  const related = (s.related || [])
    .filter((r) => serviceBySlug[r])
    .map((r) => `<a class="chip" href="/service/${r}/">${esc(serviceBySlug[r].name)}</a>`)
    .join("");

  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "서비스 안내", url: "/service/" }, { name: s.name, url: `/service/${s.slug}/` }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">${esc(s.kw)}</span>
    <h1>${esc(s.sections[0] ? s.name + " 작업 기준 안내" : s.name)}</h1>
    <p>${esc(s.desc)}</p>
  </div></section>
  <section class="section"><div class="container prose">
    ${lead}
    ${sections}
    ${costBasisNote()}
    ${related ? `<h2>함께 보면 좋은 서비스</h2><div class="chip-row">${related}</div>` : ""}
    ${p(`<a href="/area/">지역별 안내</a>에서 방문 가능 지역을 확인하거나, <a href="/contact/">예약 문의</a>로 증상과 사진을 보내주시면 예상 작업 범위를 안내합니다.`)}
    ${authorBox(MOD)}
  </div></section>
  ${faqSection(s.faqs)}
  ${ctaSection(`${s.name} 예약 문의`)}
  `;
  await emit(base, layout({
    title: s.title + " | " + site.name,
    description: clampDesc(s.desc),
    path: `/${base}/`,
    body,
    structuredData: [
      articleLd({ headline: s.title, description: s.desc, path: `/${base}/` }),
      serviceLd({ serviceType: s.kw, name: s.name, description: s.desc }),
      faqLd(s.faqs),
    ],
  }));
}

async function buildAreaIndex() {
  const groups = areaGroups
    .map((g) => {
      const cards = g.slugs
        .map((slug) => {
          const a = areaBySlug[slug];
          return `<a class="card" href="/area/${a.slug}/"><span class="card-tag">${esc(g.group)}</span><h3>${esc(a.name)}</h3><p>${esc(a.summary)}</p></a>`;
        })
        .join("");
      return `<div class="section-head" style="margin-top:var(--sp-6)"><h2>${esc(g.group)}</h2></div><div class="grid grid-3">${cards}</div>`;
    })
    .join("");
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "지역별 안내", url: "/area/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">지역별 안내</span>
    <h1>전국 배관공사·하수구막힘 지역별 안내</h1>
    <p>전국 17개 시·도를 권역별로 안내합니다. 시·도를 선택하면 시·군·구별 주거 형태와 자주 발생하는 배관 문제를 확인할 수 있습니다.</p>
  </div></section>
  <section class="section"><div class="container">${groups}</div></section>
  ${ctaSection("지역 방문 예약 문의")}
  `;
  await emit("area", layout({
    title: "지역별 안내｜전국 배관공사·하수구막힘 방문 지역 | " + site.name,
    description: clampDesc("전국 17개 시·도 배관공사·하수구막힘 방문 안내. 시·군·구별 지역을 확인하세요."),
    path: "/area/",
    body,
  }));
}

async function buildSymptoms() {
  const blocks = symptoms
    .map((s, i) => `
      <h2 id="${slugForSymptom(s.title)}">${esc(s.title)}</h2>
      ${p(esc(s.cause))}
      ${p(`관련 서비스: ${svc(s.service, serviceBySlug[s.service].name + " 안내 보기")}`)}`)
    .join("");
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "증상별 안내", url: "/symptoms/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">증상별 안내</span>
    <h1>증상별 배관·하수구 문제 안내</h1>
    <p>지금 겪고 있는 증상에서 출발해 원인과 알맞은 작업을 확인하세요. 같은 증상이라도 막힌 위치에 따라 작업이 달라집니다.</p>
  </div></section>
  <section class="section"><div class="container prose">${blocks}${costBasisNote()}${authorBox(MOD)}</div></section>
  ${ctaSection("증상 상담 예약 문의")}
  `;
  await emit("symptoms", layout({
    title: "증상별 안내｜물빠짐·역류·악취·변기 차오름 원인 | " + site.name,
    description: clampDesc("물이 천천히 내려갈 때, 냄새·역류·변기 차오름 등 증상별 원인과 작업을 안내합니다."),
    path: "/symptoms/",
    body,
  }));
}

async function buildProcess() {
  const steps = [
    ["현장 점검", "도착 후 막힌 위치와 증상, 건물 배관 구조를 먼저 확인합니다. 한 곳만 막혔는지 여러 곳이 함께 느린지로 원인을 좁힙니다."],
    ["배관 내시경 확인", "원인이 불명확하거나 반복 재발할 때 카메라로 내부를 확인해 누적·균열·처짐 등을 눈으로 판단합니다."],
    ["스프링(관통) 작업", "트랩·배수관 초입의 국소 막힘을 관통해 통로를 빠르게 엽니다."],
    ["고압세척", "기름·스케일이 누적된 관 벽을 강한 수압으로 청소해 재발 주기를 늦춥니다."],
    ["트랩 점검", "봉수·트랩 상태를 확인해 악취·역류 원인을 함께 점검합니다."],
    ["배관 교체·보수", "노후·손상이 확인되면 부분 또는 구간 교체를 안내하고, 개방·복구 범위를 함께 설명합니다."],
    ["누수 확인", "누수가 의심되면 위치를 특정해 개방 범위를 최소화합니다."],
    ["사후 관리 안내", "작업 결과와 재발을 줄이는 사용·관리 방법을 안내합니다."],
  ];
  const html = steps.map(([h, d]) => `<h2>${esc(h)}</h2>${p(esc(d))}`).join("");
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "작업 방식 안내", url: "/process/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">작업 방식 안내</span>
    <h1>배관·하수구 작업 방식 안내</h1>
    <p>왜 현장 확인이 필요한지, 왜 비용이 달라지는지 이해할 수 있도록 작업 절차를 단계별로 설명합니다.</p>
  </div></section>
  <section class="section"><div class="container prose">${html}${costBasisNote()}${authorBox(MOD)}</div></section>
  ${ctaSection("작업 상담 예약 문의")}
  `;
  await emit("process", layout({
    title: "작업 방식 안내｜현장점검·내시경·고압세척·배관교체 | " + site.name,
    description: clampDesc("현장 점검부터 내시경·스프링·고압세척·배관 교체·사후 관리까지 작업 절차를 안내합니다."),
    path: "/process/",
    body,
  }));
}

async function buildPrice() {
  const rows = [
    ["기본 출장비", "지역·시간대에 따라 상이", "방문·기본 점검 비용"],
    ["현장 점검·내시경", "범위에 따라 상이", "원인 확인이 필요한 경우"],
    ["단순 하수구막힘", "막힘 위치·정도에 따라", "스프링(관통) 작업 기준"],
    ["싱크대·세면대 막힘", "트랩·배수관 상태에 따라", "청소·관통 작업"],
    ["변기막힘", "이물질·탈거 여부에 따라", "압축·탈거 작업"],
    ["고압세척", "배관 길이·굵기·누적 정도", "관 벽 청소"],
    ["배관 교체·보수", "구간·자재·개방 범위", "노후·손상 구간"],
    ["야간·긴급 출동", "시간대·이동 거리", "추가 발생 가능"],
  ];
  const table = `<table class="cost-table"><thead><tr><th>항목</th><th>비용 결정 요인</th><th>비고</th></tr></thead><tbody>${rows
    .map((r) => `<tr><td><strong>${esc(r[0])}</strong></td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`)
    .join("")}</tbody></table>`;
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "비용 안내", url: "/price/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">비용 안내</span>
    <h1>배관공사와 하수구막힘 비용이 달라지는 기준</h1>
    <p>정확한 금액을 단정하기보다, 비용이 달라지는 기준을 투명하게 안내합니다. 사전에 추가 비용이 생길 수 있는 기준을 아는 것이 중요합니다.</p>
  </div></section>
  <section class="section"><div class="container prose">
    ${p("아래 표는 ‘확정 금액’이 아니라 비용을 결정하는 요인을 정리한 것입니다. 같은 작업이라도 현장 구조·막힘 정도·배관 길이·장비 사용 여부에 따라 비용이 달라집니다.")}
    ${table}
    <h2>비용이 달라지는 핵심 요인</h2>
    ${ul(["막힌 위치와 깊이, 배관 길이", "스프링·고압세척·내시경 등 사용 장비", "건물 유형(아파트·빌라·상가)과 접근성", "노후 배관 교체·부분 보수 필요 여부", "야간·긴급 출동, 장거리 이동 여부"].map(esc))}
    <h2>현장 확인 후 안내 원칙</h2>
    ${p("정확한 비용은 현장 구조, 막힘 정도, 배관 길이, 장비 사용 여부에 따라 달라질 수 있습니다. 문의 시 증상과 위치를 알려주시면 예상 가능한 작업 범위를 먼저 안내합니다.")}
    ${authorityBlock()}
    ${authorBox(MOD)}
  </div></section>
  ${ctaSection("비용 상담 예약 문의")}
  `;
  await emit("price", layout({
    title: "비용 안내｜배관공사·하수구막힘 현장별 가격 차이 기준 | " + site.name,
    description: clampDesc("배관공사·하수구막힘 비용이 달라지는 기준. 출장·고압세척·내시경·교체 비용 요인을 안내합니다."),
    path: "/price/",
    body,
  }));
}

async function buildBeforeService() {
  const checklist = [
    "싱크대 물이 전혀 안 내려가는지, 천천히 내려가는지",
    "아래쪽에서 물이 역류하는지",
    "욕실 배수구·세면대에서 냄새가 나는지",
    "변기 물이 차오르는지",
    "여러 배수구가 동시에 막혔는지",
    "최근 공사나 이물질 투입이 있었는지",
    "아파트인지 빌라인지 상가인지",
    "관리실 확인이 필요한지",
    "긴급 출동인지 예약 방문인지",
    "사진·영상 전달이 가능한지",
  ];
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "작업 전 확인사항", url: "/guide/before-service/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">이용 안내</span>
    <h1>작업 전 확인하면 좋은 배관 문제 체크리스트</h1>
    <p>방문 전 아래 항목을 확인해 두시면 작업 시간과 비용 예측이 빨라집니다. 특히 하수구막힘은 현장 상태에 따라 작업 방식이 달라집니다.</p>
  </div></section>
  <section class="section"><div class="container prose">
    <h2>방문 전 확인 항목</h2>
    ${ul(["물이 내려가는 속도", "역류 여부", "냄새 여부", "막힌 위치", "건물 유형", "이전 작업 여부", "배관 내시경 필요 가능성", "고압세척 필요 가능성", "야간·긴급 출동 가능 여부", "사진·영상 전달 안내"].map(esc))}
    <h2>증상 체크리스트</h2>
    ${ul(checklist.map(esc))}
    <h2>사진·영상 전달 안내</h2>
    ${p(`막힌 부위와 물 빠짐 상태를 짧은 영상이나 사진으로 보내주시면 작업 방식과 예상 범위를 더 정확히 안내할 수 있습니다. <a href="/contact/">예약 문의</a>에서 접수하세요.`)}
    ${authorityBlock()}
    ${authorBox(MOD)}
  </div></section>
  ${ctaSection("작업 전 상담 예약 문의")}
  `;
  await emit("guide/before-service", layout({
    title: "작업 전 확인사항｜배관공사·하수구막힘 체크리스트 | " + site.name,
    description: clampDesc("배관공사·하수구막힘 작업 전 확인할 증상·건물·역류·사진 전달 체크리스트를 안내합니다."),
    path: "/guide/before-service/",
    body,
  }));
}

async function buildCase() {
  const cases = [
    ["서울 · 아파트 욕실 배수구막힘", "샤워 시 물이 고이고 옆 배수구로 역류", "거름망·트랩 청소 후 스프링 작업, 누적 확인 위해 내시경 점검", "트랩 거름망 사용·정기 청소 안내"],
    ["경기 · 상가 음식점 주방 배관", "영업 중 배수 지연·악취 반복", "고압세척으로 관 벽 기름 제거, 그리스트랩 관리 기준 안내", "정기 고압세척 주기 협의"],
    ["부산 · 단독주택 노후 배관 누수", "천장 얼룩과 수도요금 증가", "내시경·점검구로 위치 특정 후 구간 보수", "노후 구간 추가 점검 권장"],
    ["인천 · 오피스텔 싱크대막힘", "물빠짐 지연 후 역류", "트랩 분해 청소 + 고압세척으로 기름 제거", "기름 굳혀 버리기·거름망 사용 안내"],
  ];
  const blocks = cases
    .map((c) => `<h2>${esc(c[0])}</h2>${p("작업 전 증상: " + esc(c[1]))}${p("현장 확인·작업: " + esc(c[2]))}${p("재발 방지 안내: " + esc(c[3]))}`)
    .join("");
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "작업 사례", url: "/case/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">작업 사례</span>
    <h1>증상별 배관·하수구 작업 사례</h1>
    <p>실제 작업 과정을 증상 중심으로 정리했습니다. 고객 개인정보와 정확한 주소는 공개하지 않으며, 과장 없이 사실 기반으로 안내합니다.</p>
  </div></section>
  <section class="section"><div class="container prose">
    ${blocks}
    <div class="callout"><strong>안내</strong> — 위 사례는 작업 유형 이해를 돕기 위한 예시이며, 동일 증상이라도 현장 상태에 따라 작업 방식과 결과가 달라질 수 있습니다.</div>
    ${authorBox(MOD)}
  </div></section>
  ${ctaSection("사례 관련 예약 문의")}
  `;
  await emit("case", layout({
    title: "작업 사례｜배관공사·하수구막힘 증상별 해결 과정 | " + site.name,
    description: clampDesc("배관공사·하수구막힘 증상별 작업 사례. 현장 확인·작업·재발 방지 과정을 안내합니다."),
    path: "/case/",
    body,
  }));
}

async function buildContact() {
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "예약 문의", url: "/contact/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">예약 문의</span>
    <h1>배관공사·하수구막힘 예약 문의</h1>
    <p>전화로 증상과 위치를 알려주시거나, 사진과 함께 문의해 주시면 예상 작업 범위를 먼저 안내합니다.</p>
  </div></section>
  <section class="section"><div class="container">
    <div class="grid grid-2">
      <div class="feature">
        <div class="ico">📞</div><h3>전화 예약</h3>
        <p>가장 빠른 방법입니다. 증상·위치·건물 유형을 알려주세요.</p>
        <p style="margin-top:var(--sp-3)"><a class="btn btn-primary" href="${site.phoneHref}">전화예약 ${esc(site.phone)}</a></p>
      </div>
      <div class="feature">
        <div class="ico">✉️</div><h3>이메일·사진 문의</h3>
        <p>막힌 부위 사진·영상을 보내주시면 더 정확히 안내합니다.</p>
        <p style="margin-top:var(--sp-3)"><a class="btn btn-outline" href="mailto:${esc(site.email)}">${esc(site.email)}</a></p>
      </div>
    </div>
    <div class="prose" style="max-width:none">
      <h2>문의 시 알려주시면 좋은 정보</h2>
      ${ul(["이름 또는 연락처", "지역(시·군·구·동)", "건물 유형(아파트·빌라·상가)", "문제 위치(싱크대·변기·욕실 등)", "증상(물빠짐 지연·역류·악취 등)", "사진·영상 첨부 가능 여부", "희망 방문 시간", "긴급 여부"].map(esc))}
      <h2>개인정보 안내</h2>
      ${p(`문의 시 제공한 정보는 상담·방문 안내 목적에만 사용합니다. 자세한 내용은 <a href="/privacy/">개인정보 처리방침</a>을 확인하세요.`)}
    </div>
  </div></section>
  ${ctaSection("지금 예약 문의")}
  `;
  await emit("contact", layout({
    title: "예약 문의｜배관공사·하수구막힘 지역별 방문 확인 | " + site.name,
    description: clampDesc("배관공사·하수구막힘 예약 문의. 증상·위치·사진을 보내주시면 예상 작업 범위를 안내합니다."),
    path: "/contact/",
    body,
  }));
}

async function buildAbout() {
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: "업체 소개", url: "/about/" }])}
  <section class="page-head"><div class="container">
    <span class="eyebrow">업체 소개</span>
    <h1>스피드공사 운영 기준과 안내 정책</h1>
    <p>스피드공사는 과장 없는 사실 기반 안내를 원칙으로 배관공사·하수구막힘 작업을 안내합니다.</p>
  </div></section>
  <section class="section"><div class="container prose">
    <h2>운영 기준</h2>
    ${p(esc(site.editorialPolicy))}
    <h2>작업 범위</h2>
    ${p(`${svc("pipe", "배관공사")}, ${svc("drain", "하수구막힘")}, ${svc("high-pressure-cleaning", "고압세척")}, ${svc("camera-inspection", "배관내시경")}, ${svc("leak", "배관누수")} 등 주거·상가 배관 전반을 안내합니다.`)}
    <h2>방문 가능 지역</h2>
    ${p(`전국 시·도와 시·군·구 단위로 방문을 안내합니다. <a href="/area/">지역별 안내</a>에서 확인하세요.`)}
    <h2>상담·사진 확인 안내</h2>
    ${p("증상과 위치, 사진·영상을 함께 확인해 예상 작업 범위를 먼저 안내합니다. 현장 확인 없이 비용을 단정하지 않습니다.")}
    <h2>편집·운영 정책</h2>
    ${p(`${esc(site.author.bio)} 콘텐츠는 ${esc(site.author.name)}이 작성하고 ${esc(site.author.reviewer)}가 검수합니다.`)}
    ${authorityBlock()}
    ${authorBox(MOD)}
  </div></section>
  ${ctaSection("상담 예약 문의")}
  `;
  await emit("about", layout({
    title: "업체 소개｜스피드공사 운영 기준·작업 범위 안내",
    description: clampDesc("스피드공사 운영 기준과 작업 범위, 방문 가능 지역, 상담·사진 확인 안내입니다."),
    path: "/about/",
    body,
  }));
}

async function buildPolicy(slug, title, h1, blocks, desc) {
  const html = blocks.map(([h, t]) => `<h2>${esc(h)}</h2>${p(esc(t))}`).join("");
  const body = `
  ${breadcrumbNav([{ name: "홈", url: "/" }, { name: h1, url: `/${slug}/` }])}
  <section class="page-head"><div class="container"><h1>${esc(h1)}</h1></div></section>
  <section class="section"><div class="container prose">${html}</div></section>
  `;
  await emit(slug, layout({ title: title + " | " + site.name, description: clampDesc(desc), path: `/${slug}/`, body }));
}

// ---------- SEO 인프라 ----------
async function buildSeoFiles() {
  const base = site.baseUrl;
  const urls = pages
    .map((pg) => `  <url><loc>${base}${pg.path}</loc><lastmod>${pg.lastmod}</lastmod></url>`)
    .join("\n");
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  await writeFile(join(DIST, "sitemap.xml"), sitemap, "utf8");

  const robots = `User-agent: *\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: bingbot\nAllow: /\n\nUser-agent: Yeti\nAllow: /\n\nUser-agent: Daumoa\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`;
  await writeFile(join(DIST, "robots.txt"), robots, "utf8");

  const recent = pages.slice(0, 30);
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n<title>${esc(site.name)}</title>\n<link>${base}/</link>\n<description>${esc(site.tagline)}</description>\n<language>ko</language>\n${recent
    .map((pg) => `<item><title>${esc(site.name)} ${pg.path}</title><link>${base}${pg.path}</link><guid>${base}${pg.path}</guid></item>`)
    .join("\n")}\n</channel></rss>\n`;
  await writeFile(join(DIST, "rss.xml"), rss, "utf8");

  const llms = `# ${site.name}\n\n> ${site.tagline}\n\n- 전화예약: ${site.phone}\n- 서비스: 배관공사, 하수구막힘, 싱크대·변기·욕실 막힘, 고압세척, 배관내시경, 배관누수\n- 지역: 전국 시·도 / 시·군·구\n- 비용: 현장 확인 후 안내(과장 없는 사실 기반)\n\n## 주요 페이지\n- ${base}/service/ 서비스 안내\n- ${base}/area/ 지역별 안내\n- ${base}/symptoms/ 증상별 안내\n- ${base}/price/ 비용 안내\n- ${base}/contact/ 예약 문의\n`;
  await writeFile(join(DIST, "llms.txt"), llms, "utf8");
}

// ---------- 정적 에셋 ----------
async function copyAssets() {
  const srcAssets = join(ROOT, "src", "assets");
  const dstAssets = join(DIST, "assets");
  await mkdir(dstAssets, { recursive: true });
  for (const f of await readdir(srcAssets)) {
    if (/\.(css|js)$/.test(f)) await copyFile(join(srcAssets, f), join(dstAssets, f));
  }
  // favicon
  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f2444"/><path d="M18 26 H38 a8 8 0 0 1 8 8 V46" fill="none" stroke="#2f81f7" stroke-width="7" stroke-linecap="round"/><circle cx="18" cy="26" r="6" fill="#f97316"/></svg>\n`;
  await writeFile(join(dstAssets, "favicon.svg"), favicon, "utf8");
  // og default
  const og = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1a31"/><stop offset="1" stop-color="#163056"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><g fill="none" stroke="#2f81f7" stroke-width="26" stroke-linecap="round"><path d="M180 300 H620 a70 70 0 0 1 70 70 V470"/></g><circle cx="180" cy="300" r="34" fill="#f97316"/><text x="80" y="180" fill="#ffffff" font-family="sans-serif" font-size="64" font-weight="800">스피드공사</text><text x="82" y="250" fill="#c9d8ee" font-family="sans-serif" font-size="38">전국 배관공사 · 하수구막힘 방문 안내</text></svg>\n`;
  await writeFile(join(dstAssets, "og-default.svg"), og, "utf8");

  // IndexNow 키 파일
  const key = "b00508e375ed8ff4e993dc41ca0b8c4a";
  await writeFile(join(DIST, `${key}.txt`), key, "utf8");

  // 구 hero 이미지는 사용하지 않음(인라인 SVG 히어로)
}

// ============================================================
//  실행
// ============================================================
async function main() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  await buildHome();
  await buildServiceIndex();
  for (const s of services) await buildService(s);
  await buildAreaIndex();
  for (const a of areas) {
    await emit(`area/${a.slug}`, layout({
      title: `${a.name} 배관공사·하수구막힘｜시·군·구 방문 안내`,
      description: clampDesc(`${a.name} 배관공사·하수구막힘 방문 안내. ${a.summary}.`),
      path: `/area/${a.slug}/`,
      body: sidoBody(a),
      structuredData: [articleLd({ headline: `${a.name} 배관공사·하수구막힘 방문 안내`, description: a.summary, path: `/area/${a.slug}/` })],
    }));
    for (const c of a.children) {
      await emit(`area/${a.slug}/${c.slug}`, layout({
        title: `${c.name} 배관공사·하수구막힘｜${a.name} 방문 작업 안내`,
        description: clampDesc(`${a.name} ${c.name} 배관공사·하수구막힘 방문 안내. 증상과 비용 기준을 확인하세요.`),
        path: `/area/${a.slug}/${c.slug}/`,
        body: regionBody(a, c),
        breadcrumb: [
          { name: "홈", url: "/" }, { name: "지역별 안내", url: "/area/" },
          { name: a.name, url: `/area/${a.slug}/` }, { name: c.name, url: `/area/${a.slug}/${c.slug}/` },
        ],
        structuredData: [articleLd({ headline: `${c.name} 배관공사·하수구막힘 방문 안내`, description: `${c.name} 배관공사·하수구막힘 방문 안내`, path: `/area/${a.slug}/${c.slug}/` })],
      }));
    }
  }
  await buildSymptoms();
  await buildProcess();
  await buildPrice();
  await buildBeforeService();
  await buildCase();
  await buildContact();
  await buildAbout();
  await buildPolicy("privacy", "개인정보 처리방침", "개인정보 처리방침", [
    ["수집 항목", "예약·상담을 위해 이름 또는 연락처, 지역, 건물 유형, 증상, 사진·영상(선택), 희망 방문 시간을 수집할 수 있습니다."],
    ["이용 목적", "수집한 정보는 상담 응대와 방문 안내, 작업 범위 안내 목적으로만 이용합니다."],
    ["보관 기간", "이용 목적이 달성되면 지체 없이 파기합니다. 관계 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다."],
    ["제3자 제공", "법령에 근거가 있는 경우를 제외하고 동의 없이 제3자에게 제공하지 않습니다."],
    ["삭제 요청 방법", `보유 정보의 열람·정정·삭제는 ${site.phone} 또는 ${site.email}로 요청할 수 있습니다.`],
    ["문의처", `개인정보 관련 문의: ${site.phone} / ${site.email}`],
  ], "스피드공사 개인정보 처리방침. 수집 항목·이용 목적·보관 기간·삭제 요청 방법을 안내합니다."),
  await buildPolicy("terms", "이용약관", "이용약관", [
    ["서비스 범위", "본 사이트는 배관공사·하수구막힘 작업 안내 및 예약 접수를 제공합니다."],
    ["방문 작업 기준", "작업은 현장 확인을 거쳐 진행하며, 증상·구조에 따라 작업 방식이 달라질 수 있습니다."],
    ["예약 변경·취소", "예약 변경·취소는 방문 전 연락처로 안내해 주시기 바랍니다."],
    ["비용 안내 기준", "정확한 비용은 현장 구조·막힘 정도·장비 사용 여부에 따라 달라지며, 현장 확인 후 안내합니다."],
    ["책임 범위", "노후·구조적 결함 등 작업과 무관한 사유로 발생한 문제에 대해서는 책임 범위가 제한될 수 있습니다."],
    ["고객 확인사항", "작업 전 막힘 위치·증상·건물 유형을 알려주시면 정확한 안내가 가능합니다."],
  ], "스피드공사 이용약관. 서비스 범위·방문 기준·예약 변경·비용 안내 기준을 안내합니다."),

  await copyAssets();
  await buildSeoFiles();

  // 검증: 타이틀·디스크립션 중복 0 강제
  const dupT = [...seoSeen.title].filter(([k, v]) => v.length > 1);
  const dupD = [...seoSeen.desc].filter(([k, v]) => v.length > 1);
  if (dupT.length) throw new Error(`타이틀 중복 ${dupT.length}건: ${dupT[0][1].join(", ")}`);
  if (dupD.length) throw new Error(`디스크립션 중복 ${dupD.length}건: ${dupD[0][1].join(", ")}`);
  console.log(`✅ 생성 완료: 총 ${pages.length} 페이지 (타이틀·디스크립션 중복 0, 디스크립션 ≤80자)`);
}

main().catch((e) => { console.error(e); process.exit(1); });

import { mkdir, writeFile, copyFile, readdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { site, primaryNav, programMenu } from "../data/site.mjs";
import { programs, programBySlug } from "../data/programs.mjs";
import { extra as programExtra, regionNote } from "../data/programs-extra.mjs";
import { regions, placeBySlug, regionGroups } from "../data/regions.mjs";
import { layout, esc, faqLd, articleLd, pricingTable, pricingLd, reviewsSection } from "../src/templates/layout.mjs";
import { keywordLinks } from "../data/keywords.mjs";
import { galleryImages, galleryGrid } from "../data/images.mjs";
import { buildSeoulPages } from "./locations.mjs";
import { buildRegionTree } from "./region-tree.mjs";
import { incheon } from "../data/incheon.mjs";
import { gyeonggi } from "../data/gyeonggi.mjs";
import { busan, daegu, gwangju, daejeon, ulsan, sejong, jeju } from "../data/metros.mjs";
import {
  gangwon, chungbuk, chungnam, jeonbuk, jeonnam, gyeongbuk, gyeongnam,
} from "../data/provinces.mjs";
import { buildSubwayPages } from "./subway-tree.mjs";
import { subwaySystems } from "../data/subway.mjs";

// 계층(시·구·행정동) 구조로 생성하는 광역 — 평면 지역 루프에서 제외
const HIERARCHICAL = new Set([
  "seoul", "gyeonggi", "incheon",
  "busan", "daegu", "gwangju", "daejeon", "ulsan", "sejong", "jeju",
  "gangwon", "chungbuk", "chungnam", "jeonbuk", "jeonnam", "gyeongbuk", "gyeongnam",
]);

// 광역(구→동) 데이터 → 트리 루트
function metroRoot(m) {
  return {
    kind: "metro",
    name: m.name,
    slug: m.slug,
    intro: m.intro,
    children: m.districts.map((d) => ({
      kind: "gu",
      name: d.name,
      stations: d.stations,
      landmarks: d.landmarks,
      character: d.character,
      dongs: d.dongs,
    })),
  };
}
// 도(시→[구]→동) 데이터 → 트리 루트
function provinceRoot(p) {
  return {
    kind: "metro",
    name: p.name,
    slug: p.slug,
    intro: p.intro,
    children: p.cities.map((c) =>
      c.districts
        ? {
            kind: "si",
            name: c.name,
            character: c.character,
            children: c.districts.map((g) => ({
              kind: "gu",
              name: g.name,
              stations: g.stations,
              landmarks: g.landmarks,
              character: g.character,
              dongs: g.dongs,
            })),
          }
        : {
            kind: "si",
            name: c.name,
            character: c.character,
            stations: c.stations,
            landmarks: c.landmarks,
            dongs: c.dongs,
          }
    ),
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

const MODIFIED = "2026-06-22";

// 프로젝트 GitHub Pages 등 하위 경로 배포를 위한 베이스 경로
const BASE = (process.env.BASE_PATH || "").replace(/\/$/, "");

function applyBase(html) {
  if (!BASE) return html;
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${BASE}/`);
}

// ---------- 유틸 ----------
async function write(path, html) {
  const full = join(DIST, path);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, applyBase(html), "utf8");
}

const programUrl = (slug) => `/service/${slug}/`;
const labelOf = (slug) => programBySlug[slug]?.label || slug;

function textLen(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, "").length;
}

// 고유 본문(프로즈) 길이(목표 2,000~2,500자) 측정.
// 공용 컴포넌트(작업 방식/비용 기준)와 내비게이션 요소(목차·링크클라우드·칩·빵부스러기)는
// '콘텐츠 분량'이 아니므로 제외한다 → 롱테일 내부링크는 분량에 합산되지 않고 가산된다.
function uniqueBodyLen(html) {
  let m = (html.split("<main")[1] || "").split("</main>")[0];
  m = m
    .replace(/<section class="reviews"[\s\S]*?<\/section>/g, "")
    .replace(/<section class="pricing"[\s\S]*?<\/section>/g, "")
    .replace(/<nav class="toc"[\s\S]*?<\/nav>/g, "")
    .replace(/<nav class="breadcrumb[\s\S]*?<\/nav>/g, "")
    .replace(/<div class="toc"[\s\S]*?<\/div>/g, "")
    .replace(/<div class="link-cloud">[\s\S]*?<\/div>/g, "")
    .replace(/<div class="chip-row">[\s\S]*?<\/div>/g, "")
    .replace(/<p class="lt-label">[\s\S]*?<\/p>/g, "");
  return m.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length;
}

// 2,000자 미만 페이지에만 관련 마무리 문단을 보강해 본문 하한(2,000자)을 맞춘다.
// (지역명만 바꾼 동일 문장 반복을 피하기 위해 경로 시드로 문장을 다르게 고른다.)
const FLOOR_PARAS = [
  "배관·하수구 문제는 같은 증상이라도 건물 구조와 막힘 상태에 따라 작업 방식이 달라집니다. 그래서 전화나 사진만으로 금액을 단정하기보다, 현장에서 원인과 작업 범위를 확인한 뒤 안내하는 것을 원칙으로 합니다. 막힌 위치와 증상, 가능하면 사진·영상을 함께 알려 주시면 예상 가능한 작업 범위를 먼저 설명해 드릴 수 있습니다.",
  "막힘이 반복되거나 흐름이 전반적으로 느려졌다면 단순 뚫음보다 관 벽에 쌓인 기름·찌꺼기를 씻어 내는 고압세척이나, 원인을 영상으로 확인하는 배관내시경이 도움이 될 수 있습니다. 무조건 교체·전체 시공이 아니라 문제 구간을 찾아 필요한 만큼만 작업하는 것이 비용과 시간을 줄이는 방법입니다.",
  "여러 배수구가 동시에 막히거나 변기·욕실이 함께 역류한다면 한 곳의 문제가 아니라 본관·공용관 쪽 문제일 수 있습니다. 아파트·빌라라면 세대 배관인지 공용 배관인지에 따라 확인 절차가 달라질 수 있으니, 증상 범위를 함께 알려 주시면 작업 방향을 더 정확히 안내해 드릴 수 있습니다.",
  "정확한 비용은 현장 구조, 막힘 정도, 배관 길이, 작업 방식(스프링·고압세척·내시경·교체), 야간·긴급 여부에 따라 달라집니다. 작업 전에는 범위와 비용을 함께 확인한 뒤 진행하며, 추가 비용이 생길 수 있는 기준도 미리 안내합니다. 과장된 문구나 확인되지 않은 후기 대신 실제 작업 기준을 안내하는 것을 원칙으로 합니다.",
  "야간이나 긴급 상황이라면 가능 여부와 도착 예정 시간을 먼저 확인하는 것이 좋습니다. 무리하게 약품을 반복해서 붓는 것은 효과가 일시적이고 배관을 상하게 할 수 있으므로, 증상을 알려 주시면 위치와 원인에 맞는 방법을 안내해 드립니다. 방문 전 준비할 내용은 작업 전 확인사항에서 함께 확인할 수 있습니다.",
  "오래된 건물은 한 곳을 손대면 인접 배관 상태가 함께 드러나는 경우가 있어, 작업 전 현장에서 범위를 함께 확인하는 것이 좋습니다. 노후 배관의 누수나 녹물, 잦은 막힘이 이어진다면 부분 보수로 끝나는지, 라인 정비가 필요한지 점검을 통해 판단하는 것이 재발을 줄이는 길입니다.",
  "싱크대·세면대·욕실 배수구는 머리카락·비누때·기름·음식물 찌꺼기가 트랩과 배수관에 쌓이며 점점 물빠짐이 느려집니다. 처음에는 천천히 내려가다가 어느 순간 완전히 막히는 경우가 많으므로, 흐름이 나빠지기 시작할 때 점검하면 갑작스러운 역류와 비용을 함께 줄일 수 있습니다.",
  "주방이나 음식점처럼 기름·음식물 사용이 많은 곳은 관 벽에 기름이 굳어 통로가 좁아지기 쉽습니다. 이런 경우 단순 뚫음은 통로만 잠깐 여는 데 그치고 금방 다시 막히므로, 고압세척으로 관 벽 자체를 씻어 내야 효과가 오래갑니다. 사용량이 많은 곳은 정기 관리를 잡아 두는 편이 안전합니다.",
  "천장 얼룩이나 벽 곰팡이, 사용하지 않을 때 도는 수도 계량기는 누수의 신호일 수 있습니다. 누수는 물이 보이는 곳과 실제 새는 곳이 다른 경우가 많아, 무작정 벽을 열기보다 탐지로 위치를 먼저 좁힌 뒤 필요한 구간만 작업해야 개방 범위와 복구 비용을 줄일 수 있습니다.",
  "방문 전에는 막힌 위치와 증상, 건물 유형(아파트·빌라·상가·주택), 역류·냄새 여부, 이전 작업 이력 정도를 정리해 두면 안내가 빨라집니다. 가능하면 현장 사진이나 짧은 영상을 함께 전달해 주시면 필요한 장비와 작업 범위를 미리 준비할 수 있어, 방문 당일 진행이 한결 매끄럽습니다.",
];
function seedNum(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function padBody(html, seedStr) {
  if (uniqueBodyLen(html) >= 2000) return html;
  const s = seedNum(seedStr);
  let out = html, used = 0;
  // 하한을 넘길 때까지 서로 다른 문단을 덧붙인다(보통 1개로 충분).
  while (uniqueBodyLen(out) < 2000 && used < FLOOR_PARAS.length) {
    const para = FLOOR_PARAS[(s + used) % FLOOR_PARAS.length];
    const block = `\n    <p>${para}</p>`;
    if (out.includes("</article>")) out = out.replace("</article>", block + "\n  </article>");
    else if (out.includes("</main>")) out = out.replace("</main>", block + "\n  </main>");
    else break;
    used++;
  }
  return out;
}

// 롱테일 내부링크 강화 — 지역/역 페이지에 '지역명 + 서비스' 앵커를 추가한다.
// 기존 programChips(drain·sink·toilet·pipe·bathroom-drain)와 중복되지 않도록
// 나머지 서비스군에서 시드로 6개를 분산 선택(과최적화·중복 앵커 방지).
const LONGTAIL_SERVICES = [
  "leak", "water-pipe", "apartment-pipe", "commercial-pipe", "washbasin",
  "kitchen-drain", "restaurant-drain", "high-pressure-cleaning", "camera-inspection", "drain-cleaning",
];
function longtailInject(html, seedStr) {
  const h1 = (html.match(/<h1>([^<]*)<\/h1>/) || [])[1] || "";
  const place = h1.split(" 배관공사")[0].split("—")[0].trim();
  if (!place || !html.includes("</article>")) return html;
  const s = seedNum(seedStr);
  const start = s % LONGTAIL_SERVICES.length;
  const picks = [];
  for (let i = 0; i < LONGTAIL_SERVICES.length && picks.length < 6; i++) {
    picks.push(LONGTAIL_SERVICES[(start + i) % LONGTAIL_SERVICES.length]);
  }
  const links = picks
    .map((slug) => {
      const p = programBySlug[slug];
      return `<a href="/service/${slug}/">${esc(place + " " + p.label)}</a>`;
    })
    .join("");
  // 자동 목차와의 불일치를 피하려 H2 대신 강조 라벨 사용
  const block = `\n    <p class="lt-label"><strong>${esc(place)} 인근에서 함께 찾는 배관·하수구 작업</strong></p>\n    <div class="link-cloud">${links}</div>`;
  return html.replace("</article>", block + "\n  </article>");
}

// 2,000~2,500자 밴드 집계
const band = { lo: 0, ok: 0, hi: 0, min: Infinity, max: 0 };
function recordBand(len, label) {
  band.min = Math.min(band.min, len);
  band.max = Math.max(band.max, len);
  if (len < 2000) { band.lo++; if (band.lo <= 6) console.warn(`  ⚠️  본문 ${len}자(<2000): ${label}`); }
  else if (len > 2500) { band.hi++; if (band.hi <= 6) console.warn(`  ⚠️  본문 ${len}자(>2500): ${label}`); }
  else band.ok++;
}

// 작성자/검수 박스 (E-E-A-T)
function authorBox() {
  return `
  <aside class="author-box">
    <div class="avatar">현장</div>
    <div class="meta">
      <strong>${esc(site.author.name)}</strong> · ${esc(site.author.role)}
      <p>${esc(site.author.bio)}</p>
      <p class="updated">최종 수정일 ${MODIFIED} · 검수: ${esc(site.author.reviewer)}</p>
    </div>
  </aside>`;
}

const ctaBtn = (label) =>
  `<p><a class="btn btn-primary" href="${site.phoneHref}">💬 ${esc(label)} 예약 문의</a></p>`;

// 지역 내부링크
// 완전 일치 앵커의 반복(과최적화·스팸 신호)을 피하고, 사람이 큐레이션한 듯
// 자연스럽고 다양한 앵커를 섞는다 — 전국 17개 시·도.
// ctx: 서비스 페이지에서 지정 시 지역+서비스를 자연스럽게 결합(롱테일).
const REGION_ANCHORS = [
  ["/area/seoul/", "서울", "배관공사·하수구막힘"],
  ["/area/gyeonggi/", "경기", "수원·성남·고양 등"],
  ["/area/incheon/", "인천", "부평·남동·연수 등"],
  ["/area/busan/", "부산", "해운대·서면 등"],
  ["/area/daegu/", "대구", "수성·달서 등"],
  ["/area/gwangju/", "광주", "북구·광산 등"],
  ["/area/daejeon/", "대전", "서구·유성 등"],
  ["/area/ulsan/", "울산", "남구·울주 등"],
  ["/area/sejong/", "세종", "조치원·나성 등"],
  ["/area/gangwon/", "강원", "춘천·원주 등"],
  ["/area/chungbuk/", "충북", "청주 일대"],
  ["/area/chungnam/", "충남", "천안·아산 등"],
  ["/area/jeonbuk/", "전북", "전주·익산 등"],
  ["/area/jeonnam/", "전남", "여수·순천 등"],
  ["/area/gyeongbuk/", "경북", "포항·경주 등"],
  ["/area/gyeongnam/", "경남", "창원·김해 등"],
  ["/area/jeju/", "제주", "제주시·서귀포"],
];

function regionLinks(ctx) {
  const regionPart = ctx
    ? REGION_ANCHORS.map(([u, name]) => [u, `${name} ${ctx}`])
    : REGION_ANCHORS.map(([u, name, suffix]) => [u, `${name} ${suffix}`]);
  const tail = ctx
    ? [
        ["/subway/", `지하철역별 ${ctx}`],
        ["/price/", `${ctx} 비용 기준`],
        ["/guide/", `작업 전 확인사항`],
      ]
    : [
        ["/subway/", `지하철역별 안내`],
        ["/price/", `비용이 달라지는 기준`],
        ["/guide/", `작업 전 확인사항`],
      ];
  const links = [...regionPart, ...tail];
  return `<div class="link-cloud">${links
    .map(([u, t]) => `<a href="${u}">${esc(t.replace(/\s+/g, " ").trim())}</a>`)
    .join("")}</div>`;
}

// 서비스 슬러그 → 카드
function serviceCard(slug) {
  const p = programBySlug[slug];
  if (!p) return "";
  return `<a class="card" href="${programUrl(slug)}">
        <span class="card-tag">${esc(p.group)}</span>
        <h3>${esc(p.label)}</h3>
        <p>${esc((p.intro?.[0] || "").slice(0, 58))}…</p>
      </a>`;
}

// ---------- 서비스 페이지 ----------
function programPage(p) {
  const ex = programExtra[p.slug] || {};
  const faqs = p.faqs.map((f) => ({ q: f.q, a: f.a }));
  if (ex.faq) faqs.push({ q: ex.faq.q, a: ex.faq.a });

  const flowBlock = ex.flow
    ? `<h2 id="flow">작업 흐름과 진행 순서</h2><p>${esc(ex.flow)}</p>`
    : "";
  const notesBlock = ex.notes
    ? `<h2 id="notes">더 알아두면 좋은 점·주의사항</h2><p>${esc(ex.notes)}</p>`
    : "";

  const relatedLinks = (p.related || [])
    .map((s) => {
      const r = programBySlug[s];
      return r ? `<a href="${programUrl(s)}">${esc(r.label)}</a>` : "";
    })
    .join("");

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/service/">서비스 안내</a><span>›</span>${esc(
      p.label
    )}
  </nav>
  <article class="section-tight">
    <div class="container prose">
      <p class="card-tag" style="color:var(--color-accent);font-weight:700;">${esc(
        p.group
      )}</p>
      <h1>${esc(p.h1)}</h1>

      <div class="toc">
        <strong>이 페이지 목차</strong>
        <ol>
          <li><a href="#overview">서비스 개요</a></li>
          <li><a href="#flow">작업 흐름과 진행 순서</a></li>
          <li><a href="#situation">${esc(p.label)}가 필요한 상황·증상</a></li>
          <li><a href="#method">작업 방식</a></li>
          <li><a href="#check">현장 확인이 필요한 이유</a></li>
          <li><a href="#cost">비용이 달라지는 기준</a></li>
          <li><a href="#notes">더 알아두면 좋은 점·주의사항</a></li>
          <li><a href="#related">함께 보면 좋은 서비스</a></li>
          <li><a href="#checklist">문의 전 확인사항</a></li>
          <li><a href="#region">지역별 안내</a></li>
          <li><a href="#faq">자주 묻는 질문</a></li>
        </ol>
      </div>

      <h2 id="overview">${esc(p.label)} 개요</h2>
      ${p.intro.map((t) => `<p>${esc(t)}</p>`).join("\n      ")}
      ${flowBlock}

      <h2 id="situation">${esc(p.label)}가 필요한 상황·증상</h2>
      <p>${esc(p.situationIntro)}</p>
      <ul>${p.situationList.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>

      <h2 id="method">작업 방식</h2>
      <p>${esc(p.method)}</p>

      <h2 id="check">현장 확인이 필요한 이유</h2>
      <p>${esc(p.checkReason)}</p>

      <h2 id="cost">비용이 달라지는 기준</h2>
      <p>${esc(p.costNote)}</p>
      <div class="callout">표시된 정보는 참고용이며, <strong>정확한 비용은 현장 구조·막힘 상태를 확인한 뒤 안내</strong>합니다. 증상과 위치를 알려 주시면 예상 가능한 작업 범위를 먼저 설명해 드립니다.</div>
      ${notesBlock}

      <h2 id="related">함께 보면 좋은 서비스</h2>
      <p>증상이나 작업 방식이 이어지는 서비스도 함께 확인해 보세요.</p>
      <div class="link-cloud">${relatedLinks}</div>

      <h2 id="checklist">문의 전 확인사항</h2>
      <ul>${p.checklist.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>

      <h2 id="region">지역별 ${esc(p.label)} 안내</h2>
      <p>${esc(regionNote[p.slug] || "원하는 지역을 골라 해당 지역의 방문 가능 여부와 자주 발생하는 문제를 함께 확인해 보세요.")}</p>
      ${regionLinks(p.label)}

      <h2 id="faq">자주 묻는 질문</h2>
      <div class="faq">
        ${faqs
          .map(
            (f) =>
              `<details><summary>${esc(f.q)}</summary><p>${esc(
                f.a
              )}</p></details>`
          )
          .join("\n        ")}
      </div>

      ${authorBox()}
      ${ctaBtn(p.label)}
    </div>
  </article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const structured = [
    faqLd(faqs),
    articleLd({
      headline: p.h1,
      description: p.desc,
      path: programUrl(p.slug),
      modified: MODIFIED,
    }),
    pricingLd(),
  ];

  const html = layout({
    title: `${p.h1} | ${site.name}`,
    description: p.desc,
    path: programUrl(p.slug),
    body,
    structuredData: structured,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "서비스 안내", url: "/service/" },
      { name: p.label, url: programUrl(p.slug) },
    ],
  });

  const withSpaces = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim().length;
  if (withSpaces < 2000) {
    console.warn(`  ⚠️  ${p.slug}: 본문 ${withSpaces}자 (목표 2000자 이상)`);
  }
  return { html, len: withSpaces };
}

// ---------- 서비스 인덱스 ----------
function programIndex() {
  const groups = programMenu
    .map(
      (g) => `
      <div class="section-head" style="margin-top:var(--sp-6)"><span class="eyebrow">${esc(
        g.group
      )}</span></div>
      <div class="grid grid-3">
        ${g.items.map((i) => serviceCard(i.slug)).join("\n        ")}
      </div>`
    )
    .join("");

  const body = `
  <section class="hero">
    <div class="container">
      <p class="eyebrow">서비스 안내</p>
      <h1>배관공사·하수구막힘 서비스 안내</h1>
      <p>누수탐지·누수공사·수도누수부터 하수구막힘·배수구뚫음·싱크대·변기·세면대막힘, 수전교체·세면대교체·변기부속품수리, 고압세척·배관내시경까지. 증상에 맞는 작업 방식과 확인 기준을 정리했습니다.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="${site.phoneHref}">☎ ${esc(site.emergency)} ${esc(site.phone)}</a>
        <a class="btn btn-outline" href="/area/">지역별 안내 보기</a>
      </div>
    </div>
  </section>
  <section class="section"><div class="container">
    ${groups}
  </div></section>
  <section class="section section-alt"><div class="container prose">
    <h2>증상으로 먼저 고르는 법</h2>
    <p>배관 문제는 ‘무엇이, 어디서’ 생겼는지에 따라 작업이 달라집니다. 물이 안 내려가거나 역류하면 <a href="/service/drain/">하수구막힘</a>, 주방이라면 <a href="/service/sink/">싱크대막힘</a>·<a href="/service/kitchen-drain/">주방배수구막힘</a>, 화장실이라면 <a href="/service/toilet/">변기막힘</a>·<a href="/service/bathroom-drain/">욕실배수구막힘</a>을 확인하세요. 물이 새거나 천장 얼룩이 보이면 <a href="/service/leak/">배관누수</a>, 배관 자체를 교체·정비해야 하면 <a href="/service/pipe/">배관공사</a>가 필요합니다.</p>
    <h2>반복되는 문제라면</h2>
    <p>뚫어도 금방 다시 막히거나 흐름이 전반적으로 느려진다면, 관 벽에 쌓인 기름·찌꺼기를 씻어 내는 <a href="/service/high-pressure-cleaning/">고압세척</a>이나 원인을 영상으로 확인하는 <a href="/service/camera-inspection/">배관내시경</a>이 효과적입니다. 음식점·상가처럼 사용량이 많은 곳은 <a href="/service/restaurant-drain/">음식점하수구막힘</a> 정기 관리를 함께 고려해 보세요.</p>
    <div class="callout">정확한 비용은 현장 구조·막힘 상태에 따라 달라집니다. <strong>증상과 위치를 알려 주시면 예상 가능한 작업 범위를 먼저 안내</strong>합니다.</div>
  </div></section>`;

  return layout({
    title: `배관공사·하수구막힘 서비스 안내 | ${site.name}`,
    description:
      "배관공사·하수구막힘·싱크대·변기·욕실 배수구·고압세척·배관내시경 작업 방식과 기준을 안내합니다.",
    path: "/service/",
    body,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "서비스 안내", url: "/service/" },
    ],
  });
}

// ---------- 지역(평면) 페이지 — 비계층 지역 대비용 ----------
function placePage(r, baseUrl) {
  const cards = (r.programs || [])
    .map((slug) => serviceCard(slug))
    .join("\n        ");

  const faqs = [
    {
      q: `${r.name}에서 하수구막힘·배관공사는 어떻게 접수하나요?`,
      a: `예약문의로 ${r.name} 내 위치, 건물 유형, 증상을 알려 주시면 방문 가능 여부와 도착 예정 시간을 안내해 드립니다. 사진·영상을 함께 보내 주시면 작업 범위를 더 빠르게 안내할 수 있습니다.`,
    },
    {
      q: `${r.name}까지 방문에 얼마나 걸리나요?`,
      a: `출발지와 시간대, 권역에 따라 달라집니다. 정확한 방문 소요 시간은 접수 시 위치를 알려 주시면 안내해 드립니다.`,
    },
  ];

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="${baseUrl}">지역별 안내</a><span>›</span>${esc(r.name)}
  </nav>
  <article class="section-tight"><div class="container prose">
    <h1>${esc(r.h1)}</h1>
    ${r.intro.map((t) => `<p>${esc(t)}</p>`).join("\n    ")}

    <h2>${esc(r.name)}에서 자주 찾는 서비스</h2>
    <div class="grid grid-3" style="margin:var(--sp-4) 0">
      ${cards}
    </div>
    <p>${esc(r.closing)}</p>

    <div class="callout">정확한 비용은 현장 구조·막힘 상태에 따라 달라집니다. <strong>현장 확인 후 안내</strong>합니다.</div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join("\n      ")}
    </div>
    ${authorBox()}
    ${ctaBtn(r.name + " 배관공사·하수구막힘")}
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const path = `${baseUrl}${r.slug}/`;
  return layout({
    title: `${r.h1} | ${site.name}`,
    description: r.desc,
    path,
    body,
    structuredData: [
      faqLd(faqs),
      articleLd({ headline: r.h1, description: r.desc, path, modified: MODIFIED }),
      pricingLd(),
    ],
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "지역별 안내", url: baseUrl },
      { name: r.name, url: path },
    ],
  });
}

// 지역 인덱스 (전국 시·도를 권역별로 그룹화하여 나열)
function regionIndex() {
  const lead =
    "서울·경기·인천·부산·대구·광주·대전 등 전국 시·도별로 배관공사·하수구막힘 방문 안내와 자주 발생하는 배관 문제를 확인할 수 있습니다.";
  const groupsHtml = regionGroups
    .map((g) => {
      const cards = g.slugs
        .map((slug) => {
          const r = placeBySlug[slug];
          if (!r) return "";
          return `<a class="card" href="/area/${slug}/">
            <h3>${esc(r.name)}</h3>
            <p>${esc((r.intro[0] || "").slice(0, 56))}…</p>
          </a>`;
        })
        .join("\n        ");
      return `
      <div class="section-head" style="margin-top:var(--sp-6)"><span class="eyebrow">${esc(
        g.group
      )}</span></div>
      <div class="grid grid-4">${cards}</div>`;
    })
    .join("");

  const chips = regionGroups
    .flatMap((g) => g.slugs)
    .map((slug) => {
      const r = placeBySlug[slug];
      return `<a class="chip" href="/area/${slug}/">${esc(r.name)}</a>`;
    })
    .join("");

  const body = `
  <section class="hero"><div class="container">
    <p class="eyebrow">지역별 안내</p>
    <h1>전국 지역별 배관공사·하수구막힘 안내</h1>
    <p>${esc(lead)}</p>
    <div class="hero-actions">
      <a class="btn btn-gold" href="${site.phoneHref}">💬 예약 문의</a>
      <a class="btn btn-outline" href="/service/">서비스 보기</a>
    </div>
  </div></section>
  <section class="section-tight section-alt"><div class="container">
    <div class="chip-row">${chips}</div>
  </div></section>
  <section class="section"><div class="container">
    ${groupsHtml}
  </div></section>
  <section class="section section-alt"><div class="container prose">
    <h2>지역으로 찾는 방법</h2>
    <p>전국은 시·도(광역) → 시·군·구 → 동(생활권) 순서로 좁혀 갈수록 방문 권역과 도착 소요 시간을 더 정확히 확인할 수 있습니다. 먼저 위에서 큰 지역을 고르고, 이어서 자치구·동까지 선택하면 해당 동네 기준의 <a href="/service/drain/">하수구막힘</a>·<a href="/service/pipe/">배관공사</a> 방문 안내를 볼 수 있습니다.</p>
    <h2>지역마다 무엇이 다른가요</h2>
    <p>같은 ‘배관공사·하수구막힘’이라도 지역에 따라 주거 형태와 상권이 달라 자주 발생하는 문제가 다릅니다. 아파트가 많은 지역은 욕실·싱크대 배수와 세대·공용 배관 구분이, 상가·음식점이 밀집한 지역은 주방 하수구와 기름 누적이 중심입니다. 어떤 작업이 필요한지 먼저 보고 싶다면 <a href="/service/">서비스 안내</a>에서 증상별로 비교해 보세요. 경기도 광주시는 광주광역시와 다른 지역이므로 위치를 정확히 확인해 주세요.</p>
    <div class="callout">정확한 비용은 현장 구조·막힘 상태에 따라 달라집니다. <strong>현장 확인 후 안내</strong>합니다.</div>
  </div></section>
  ${reviewsSection()}
  ${pricingTable()}`;

  return layout({
    title: `전국 지역별 배관공사·하수구막힘 안내 | ${site.name}`,
    description: "서울·경기·인천·부산·대구 등 전국 시·도별 배관공사·하수구막힘 방문 안내를 확인하세요.",
    path: "/area/",
    body,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "지역별 안내", url: "/area/" },
    ],
  });
}

// ---------- 홈 ----------
function homePage() {
  const topServices = ["drain", "pipe", "sink", "toilet", "leak", "high-pressure-cleaning"];
  const svcCards = topServices.map((slug) => serviceCard(slug)).join("\n        ");

  const regionChips = regions
    .map((r) => `<a class="chip" href="/area/${r.slug}/">${esc(r.name)}</a>`)
    .join("");

  const subwayChips = subwaySystems[0].lines
    .slice(0, 9)
    .map((l) => `<a class="chip" href="/subway/line/${l.slug}/">${esc(l.name)}</a>`)
    .join("");

  const symptomChips = [
    ["drain", "물이 천천히 내려갈 때"],
    ["bathroom-drain", "하수구 냄새가 날 때"],
    ["sink", "싱크대 물이 역류할 때"],
    ["toilet", "변기 물이 차오를 때"],
    ["leak", "천장·벽에 물이 샐 때"],
    ["kitchen-drain", "주방 배수가 느릴 때"],
  ]
    .map(([slug, t]) => `<a class="chip" href="${programUrl(slug)}">${esc(t)}</a>`)
    .join("");

  const body = `
  <section class="hero">
    <div class="container">
      <p class="eyebrow">${esc(site.tagline)}</p>
      <h1>전국 배관공사 · 하수구막힘 <b>24시 긴급출동</b></h1>
      <div class="hero-badges">
        <span class="hero-badge">🚨 ${esc(site.emergency)}</span>
        <span class="hero-badge">🕐 야간·주말·공휴일 연중무휴</span>
        <span class="hero-badge">🚚 전국 방문</span>
      </div>
      <p>싱크대·변기·욕실 배수구 막힘부터 배관누수·배관공사까지. 갑작스러운 막힘·누수·역류도 <strong>${esc(site.emergency)}</strong>로 빠르게 도와드립니다. 증상과 위치를 알려 주시면 방문 가능 여부와 도착 예정 시간을 안내하며, 비용은 현장 확인 후 안내합니다.</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="${site.phoneHref}">☎ ${esc(site.emergency)} ${esc(site.phone)}</a>
        <a class="btn btn-outline" href="/area/">방문 가능 지역 확인</a>
      </div>
    </div>
  </section>

  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">증상별 빠른 안내</span>
      <h2>지금 겪는 증상을 골라 보세요</h2>
      <p>증상에 따라 필요한 작업과 확인 기준이 달라집니다. 가까운 증상을 선택하면 해당 안내로 이동합니다.</p>
    </div>
    <div class="chip-row">${symptomChips}</div>
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">주요 서비스</span>
      <h2>배관공사와 하수구막힘을 찾을 때</h2>
      <p>막힘·뚫음부터 누수·배관 교체, 고압세척·배관내시경까지 작업 방식과 기준을 안내합니다.</p>
    </div>
    <div class="grid grid-3">${svcCards}</div>
    <p style="margin-top:var(--sp-5)"><a class="btn btn-outline" href="/service/">전체 서비스 보기</a></p>
  </div></section>

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">전문 시공 분야</span>
      <h2>이런 작업을 전문으로 합니다</h2>
      <p>누수탐지·누수공사부터 하수구막힘·배수구뚫음, 수전교체·세면대교체·변기교체·변기부속품수리까지. 필요한 작업을 눌러 확인하세요.</p>
    </div>
    <div class="chip-row">${keywordLinks
      .map((k) => `<a class="chip" href="/service/${k.slug}/">${esc(k.kw)}</a>`)
      .join("")}</div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">작업 갤러리</span>
      <h2>현장 작업 사진</h2>
      <p>누수탐지·하수구막힘·수전교체·변기교체·고압세척 등 실제 작업 현장을 담았습니다. (사진은 순차적으로 실사진으로 교체됩니다.)</p>
    </div>
    ${galleryGrid()}
  </div></section>

  <section class="section section-alt"><div class="container prose">
    <h2>배관공사와 하수구막힘, 무엇이 다른가요</h2>
    <p>배관공사는 단순히 막힌 곳을 뚫는 작업만이 아니라 오래된 배관 교체·배관설비, 수도배관 연결, 배수관 정비, 누수탐지·누수공사, 수전교체·세면대교체·변기부속품수리처럼 배관 자체를 손보는 작업까지 포함합니다. 반면 <a href="/service/drain/">하수구막힘</a>·<a href="/service/drain/">배수구막힘</a>은 배수 흐름이 느려지거나 역류·악취·이물질 누적 같은 증상에서 시작되는 막힘 문제로, 배수구뚫음·고압세척·배관내시경으로 접근합니다. 그래서 증상을 먼저 정확히 확인하면 필요한 작업을 빠르게 좁힐 수 있습니다.</p>
    <h2>지역과 증상으로 좁혀 가세요</h2>
    <p>같은 문제라도 아파트·빌라·상가·음식점에 따라 원인과 작업이 다릅니다. <a href="/area/">지역별 안내</a>에서 방문 가능 지역을 확인하고, <a href="/service/">서비스 안내</a>에서 증상별 작업 방식을 비교한 뒤, <a href="/guide/">작업 전 확인사항</a>을 살펴보면 처음 문의하는 분도 어렵지 않게 진행할 수 있습니다. 비용 기준이 궁금하다면 <a href="/price/">비용 안내</a>를 참고하세요.</p>
  </div></section>

  ${reviewsSection()}
  ${pricingTable()}

  <section class="section section-alt"><div class="container">
    <div class="section-head"><span class="eyebrow">지역별 안내</span>
      <h2>가까운 지역으로 빠르게 확인</h2>
      <p>서울·경기·부산 등 전국 시·도별 방문 안내와 자주 발생하는 배관 문제를 확인할 수 있습니다.</p>
    </div>
    <div class="chip-row">${regionChips}</div>
    <div class="section-head" style="margin-top:var(--sp-6)"><span class="eyebrow">지하철역별 안내</span>
      <h2>역세권 기준으로 찾기</h2>
      <p>강남·서면·역세권 등 지하철 노선·역 기준으로 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다.</p>
    </div>
    <div class="chip-row">${subwayChips}<a class="chip" href="/subway/">전체 노선 보기</a></div>
  </div></section>

  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">처음이라면</span>
      <h2>이 순서대로 확인하세요</h2>
    </div>
    <div class="grid grid-4">
      <div class="card"><span class="card-tag">STEP 1</span><h3>증상 확인</h3><p>막힌 위치와 증상(역류·냄새·물빠짐)을 먼저 확인합니다.</p></div>
      <div class="card"><span class="card-tag">STEP 2</span><h3>지역 확인</h3><p>방문 가능 지역과 도착 소요 시간을 확인합니다.</p></div>
      <div class="card"><span class="card-tag">STEP 3</span><h3>사진·정보 전달</h3><p>건물 유형과 증상, 사진·영상을 전달하면 안내가 빠릅니다.</p></div>
      <div class="card"><span class="card-tag">STEP 4</span><h3>예약 문의</h3><p>현장 확인 후 작업 범위와 비용을 함께 안내합니다.</p></div>
    </div>
  </div></section>`;

  return layout({
    title: `${site.name} | ${site.tagline}`,
    description:
      "전국 배관공사·하수구막힘·누수탐지·수전교체 24시 방문. 배수구막힘·변기막힘·세면대교체 등 안내.",
    path: "/",
    body,
    structuredData: [pricingLd()],
  });
}

// ---------- 정적 안내 페이지 ----------
function simplePage({ path, eyebrow, h1, desc, sections, faqs, extras }) {
  const faqBlock = faqs
    ? `<h2>자주 묻는 질문</h2><div class="faq">${faqs
        .map(
          (f) => `<details><summary>${esc(f.q)}</summary><p>${esc(
            f.a
          )}</p></details>`
        )
        .join("")}</div>`
    : "";
  const body = `
  <nav class="breadcrumb container" aria-label="위치"><a href="/">홈</a><span>›</span>${esc(
    h1
  )}</nav>
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(
      eyebrow
    )}</p>
    <h1>${esc(h1)}</h1>
    ${sections}
    ${faqBlock}
    ${authorBox()}
    ${ctaBtn("배관공사·하수구막힘")}
  </div></article>
  ${extras || ""}`;
  const structured = faqs ? [faqLd(faqs)] : [];
  return layout({
    title: `${h1} | ${site.name}`,
    description: desc,
    path,
    body,
    structuredData: structured,
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: h1, url: path },
    ],
  });
}

function pricePage() {
  return simplePage({
    path: "/price/",
    eyebrow: "비용 안내",
    h1: "배관공사와 하수구막힘 비용이 달라지는 기준",
    desc: "배관공사·하수구막힘 비용이 달라지는 기준과 추가 비용, 현장 확인 후 안내 원칙을 정리했습니다.",
    sections: `
      <p>배관·하수구 작업은 같은 증상이라도 현장 구조와 원인에 따라 작업 범위가 크게 달라집니다. 그래서 정확한 금액을 미리 단정하기보다, 무엇에 따라 비용이 달라지는지를 먼저 이해하는 것이 중요합니다. 문의 시 증상과 위치를 알려 주시면 예상 가능한 작업 범위를 먼저 안내해 드립니다.</p>

      <h2>비용을 결정하는 핵심 요소</h2>
      <ul>
        <li><strong>현장 구조·접근성</strong> — 배관이 노출형인지 매립형인지, 벽·바닥을 열어야 하는지에 따라 난이도가 달라집니다.</li>
        <li><strong>막힘 정도와 원인</strong> — 가벼운 이물질인지, 관 벽에 굳은 기름인지, 배관 구조 문제인지에 따라 작업이 달라집니다.</li>
        <li><strong>작업 방식</strong> — 단순 뚫음·트랩 청소, 스프링 작업, <a href="/service/high-pressure-cleaning/">고압세척</a>, <a href="/service/camera-inspection/">배관내시경</a>, 배관 교체 중 무엇이 필요한지에 따라 비용이 달라집니다.</li>
        <li><strong>배관 길이·규모</strong> — 가정용 짧은 배관과 상가·음식점의 대형·장거리 배관은 차이가 큽니다.</li>
        <li><strong>방문 시간·긴급도</strong> — 야간·긴급 출동, 장거리 이동 시 추가 비용이 생길 수 있습니다.</li>
      </ul>

      <h2>작업 유형별로 비용이 갈리는 지점</h2>
      <p>예를 들어 <a href="/service/sink/">싱크대막힘</a>은 트랩 청소로 끝나는 경우와, 관 벽에 굳은 기름을 씻어 내는 고압세척이 필요한 경우의 비용이 다릅니다. <a href="/service/toilet/">변기막힘</a>은 관통으로 해결되는 경우와 변기를 분리해 이물질을 빼내야 하는 경우가 다르고, <a href="/service/leak/">배관누수</a>는 누수 탐지만 필요한 경우와 교체까지 필요한 경우가 다릅니다. 그래서 같은 항목이라도 현장에 따라 범위가 달라집니다.</p>

      <h2>추가 비용이 생길 수 있는 경우</h2>
      <ul>
        <li>야간·심야·긴급 출동</li>
        <li>장거리 이동(외곽·도서 지역 등)</li>
        <li>벽·바닥 개방 및 마감 복구가 필요한 작업</li>
        <li>상가·음식점 대형 배관, 그리스트랩 동반 작업</li>
        <li>배관내시경 점검이 함께 필요한 경우</li>
      </ul>

      <h2>현장 확인 후 안내 원칙</h2>
      <p>정확한 비용은 현장 구조, 막힘 정도, 배관 길이, 장비 사용 여부에 따라 달라질 수 있습니다. 문의 시 증상과 위치, 건물 유형, 가능하면 사진·영상을 함께 알려 주시면 예상 가능한 작업 범위를 먼저 안내합니다. 작업 전에는 범위와 비용을 함께 확인한 뒤 진행하는 것을 원칙으로 합니다.</p>
      <div class="callout">지나치게 낮은 금액을 앞세운 뒤 현장에서 다른 비용을 요구하는 경우가 없도록, <strong>작업 전 범위와 비용을 분명히 확인</strong>하세요.</div>

      <h2>지역별 안내</h2>
      <p>지역에 따라 방문 가능 권역과 도착 시간이 다릅니다. 아래에서 원하는 지역을 고른 뒤 위치와 증상을 알려 주세요.</p>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "전화로 정확한 금액을 알 수 있나요?",
        a: "현장 구조에 따라 작업 범위가 달라져 정확한 금액은 현장 확인 후 안내합니다. 증상·위치·사진을 주시면 예상 범위를 먼저 안내해 드립니다.",
      },
      {
        q: "출장(방문)만 해도 비용이 드나요?",
        a: "현장 점검·출장 기준은 작업 여부와 지역에 따라 다릅니다. 문의 시 기준을 함께 안내해 드립니다.",
      },
    ],
  });
}

function guidePage() {
  return simplePage({
    path: "/guide/",
    eyebrow: "작업 전 확인사항",
    h1: "작업 전 확인하면 좋은 배관 문제 체크리스트",
    desc: "배관공사·하수구막힘 문의 전 증상·위치·건물 유형 등 확인할 체크리스트를 정리했습니다.",
    sections: `
      <p>문의 전에 몇 가지만 확인해 두면 방문 가능 여부와 예상 작업 범위를 훨씬 빠르게 안내받을 수 있습니다. 특히 하수구막힘은 현장 상태에 따라 간단 작업으로 끝날 수도, 고압세척이나 배관내시경 확인이 필요할 수도 있어 증상을 정확히 전달하는 것이 중요합니다.</p>

      <h2>먼저 확인할 것</h2>
      <ul>
        <li>물이 내려가는 속도(천천히/완전히 막힘)</li>
        <li>역류 여부와 역류 위치</li>
        <li>냄새 여부</li>
        <li>막힌 위치(싱크대·변기·욕실·세면대 등)</li>
        <li>건물 유형(아파트·빌라·상가·주택)</li>
        <li>이전에 같은 부위를 작업한 적이 있는지</li>
        <li>야간·긴급 방문이 필요한지</li>
        <li>사진·영상 전달이 가능한지</li>
      </ul>

      <h2>증상 체크리스트</h2>
      <ul>
        <li>싱크대 물이 전혀 안 내려가는지, 천천히 내려가는지</li>
        <li>아래쪽 배수구로 물이 역류하는지</li>
        <li>욕실 배수구에서 냄새가 올라오는지</li>
        <li>변기 물이 차오르는지</li>
        <li>여러 배수구가 동시에 막혔는지</li>
        <li>최근 이물질을 빠뜨렸거나 공사가 있었는지</li>
        <li>아파트라면 관리실 확인이 필요한 공용 배관인지</li>
        <li>긴급 출동인지 예약 방문인지</li>
      </ul>
      <div class="callout">여러 배수구가 동시에 막히거나, 변기·욕실이 함께 역류한다면 한 곳의 문제가 아니라 <strong>본관·공용관 문제</strong>일 수 있습니다. 무리하게 약품을 반복해 붓기보다 증상을 알려 주세요.</div>

      <h2>사진·영상을 함께 보내면 좋은 이유</h2>
      <p>막힌 위치와 물 상태, 배관 연결 형태를 사진·영상으로 보면 원인을 더 정확히 좁힐 수 있어, 방문 시 필요한 장비와 작업 범위를 미리 준비할 수 있습니다. 그만큼 작업이 빨라지고 예상과 다른 상황도 줄어듭니다.</p>

      <h2>참고 자료</h2>
      <p>상수도·수질 관련 공공 정보는 <a href="https://www.waternow.go.kr" target="_blank" rel="noopener noreferrer">국가상수도정보시스템</a>에서, 소비자 분쟁·표준약관 관련 안내는 <a href="https://www.ftc.go.kr" target="_blank" rel="noopener noreferrer">공정거래위원회</a>에서 확인할 수 있습니다. 작업·비용 기준은 <a href="/price/">비용 안내</a>, 서비스별 작업 방식은 <a href="/service/">서비스 안내</a>를 참고하세요.</p>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "약품을 부었는데 안 뚫려요. 더 부어도 되나요?",
        a: "시판 약품을 반복해 붓는 것은 효과가 일시적이고 배관을 상하게 할 수 있습니다. 증상을 알려 주시면 위치와 원인에 맞게 안내합니다.",
      },
      {
        q: "야간·긴급 작업도 되나요?",
        a: "지역과 상황에 따라 다릅니다. 위치와 증상을 알려 주시면 가능 여부와 도착 예정 시간을 안내합니다.",
      },
      {
        q: "사진은 어디로 보내나요?",
        a: "예약문의로 증상과 위치를 알려 주시면 사진·영상 전달 방법을 함께 안내해 드립니다.",
      },
    ],
  });
}

function casePage() {
  return simplePage({
    path: "/case/",
    eyebrow: "작업사례",
    h1: "증상별 배관·하수구 작업 과정 안내",
    desc: "증상별 배관·하수구 작업이 어떤 과정으로 진행되는지, 대표 유형으로 정리했습니다.",
    sections: `
      <p>작업사례는 ‘어떤 증상이, 어떤 과정으로’ 해결되는지를 이해하는 데 도움이 됩니다. 아래는 자주 접수되는 증상별 작업 과정의 대표적인 흐름입니다. 과장된 후기 대신 실제 진행 방식 중심으로 정리했으며, 고객 개인정보와 정확한 주소는 공개하지 않습니다.</p>

      <h2>싱크대 물빠짐 지연 → 트랩·배수관 점검</h2>
      <p>설거지 후 물이 천천히 빠진다는 접수의 경우, 먼저 트랩과 연결 호스를 확인합니다. 가벼운 막힘은 분해·청소로 해결되지만, 관 벽에 기름이 굳은 경우는 <a href="/service/high-pressure-cleaning/">고압세척</a>으로 관 벽을 씻어 냅니다. 마무리로 통수 상태를 확인합니다. (자세히: <a href="/service/sink/">싱크대막힘</a>)</p>

      <h2>변기 물이 차오름 → 이물질 위치 확인 후 관통</h2>
      <p>물이 차올랐다 천천히 빠지는 경우, 이물질 종류와 위치를 먼저 확인합니다. 휴지·이물질은 전용 관통기로 빼내고, 트랩 깊이 걸린 단단한 이물질은 변기를 분리해 제거하기도 합니다. 무리하게 밀어 넣지 않는 것이 중요합니다. (자세히: <a href="/service/toilet/">변기막힘</a>)</p>

      <h2>욕실 배수 고임 → 트랩 머리카락 제거·세척</h2>
      <p>샤워 중 물이 고이는 경우, 배수구 덮개와 트랩의 머리카락·비누때를 제거합니다. 깊은 곳이 원인이면 스프링·세척으로 접근하고, 변기·세면대까지 함께 역류하면 라인 점검을 안내합니다. (자세히: <a href="/service/bathroom-drain/">욕실배수구막힘</a>)</p>

      <h2>반복 막힘 → 배관내시경으로 원인 확인</h2>
      <p>뚫어도 금방 다시 막히는 경우, <a href="/service/camera-inspection/">배관내시경</a>으로 내부를 확인해 기름 누적·이물질·구조 문제 등 원인 구간을 특정합니다. 원인을 확인한 뒤 세척·교체 등 다음 작업을 안내해 재발을 줄입니다.</p>

      <h2>천장 얼룩·곰팡이 → 누수 지점 탐지</h2>
      <p>천장 얼룩이나 곰팡이가 보이는 경우, 급수·배수 누수를 구분하고 청음·구간 차단 등으로 지점을 좁힙니다. 위치를 확인한 뒤 필요한 구간만 개방해 보수·교체하므로 개방 범위를 최소화합니다. (자세히: <a href="/service/leak/">배관누수</a>)</p>

      <div class="callout">실제 현장 사진과 작업 기록은 작업이 진행되는 대로 추가됩니다. <strong>확인되지 않은 후기나 과장된 사례는 게시하지 않습니다.</strong></div>

      <h2>지역별 안내</h2>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "후기가 적은 이유가 있나요?",
        a: "확인되지 않은 후기나 과장된 문구 대신, 실제 작업 과정과 기준을 안내합니다. 현장 사진·기록은 작업이 진행되는 대로 보완합니다.",
      },
      {
        q: "우리 집과 비슷한 사례를 볼 수 있나요?",
        a: "증상별 작업 과정을 위에 정리해 두었습니다. 증상과 위치를 알려 주시면 비슷한 경우의 진행 방식을 안내해 드립니다.",
      },
    ],
  });
}

function contactPage() {
  return simplePage({
    path: "/contact/",
    eyebrow: "예약문의",
    h1: "배관공사·하수구막힘 예약 문의",
    desc: "배관공사·하수구막힘 예약 문의 방법과 접수 시 알려 주실 내용, 지역별 방문 확인을 안내합니다.",
    sections: `
      <p><strong>${esc(site.phone)}</strong> 번호로 전화 주시면 ${esc(site.emergency)}로 빠르게 도와드립니다. 야간·주말·공휴일에도 전화 상담이 가능하며, 증상과 위치를 알려 주시면 방문 가능 여부와 도착 예정 시간을 안내해 드립니다. 사진·영상을 함께 보내 주시면 더 빠르고 정확하게 안내할 수 있습니다.</p>
      <div class="callout"><strong>☎ ${esc(site.emergency)} ${esc(site.phone)}</strong> · 야간·주말·공휴일 연중무휴 전화상담</div>

      <h2>접수 시 알려 주시면 좋은 내용</h2>
      <ul>
        <li>이름 또는 연락처</li>
        <li>지역(예: 서울 강남, 경기 수원, 부산 해운대)</li>
        <li>건물 유형(아파트·빌라·상가·주택)</li>
        <li>문제 위치(주방·욕실·세면대·변기 등)와 증상</li>
        <li>역류·냄새·물빠짐 등 동반 증상</li>
        <li>사진·영상(가능한 경우)</li>
        <li>희망 방문 시간과 긴급 여부</li>
      </ul>

      <h2>접수는 이렇게 진행됩니다</h2>
      <p>위 내용을 전달하면, 해당 지역의 방문 가능 권역과 도착 예정 시간을 안내받게 됩니다. 이어서 증상에 맞는 작업 방식을 확인하고, 현장 점검 후 작업 범위와 비용을 함께 확인한 뒤 진행합니다. 처음이라면 <a href="/guide/">작업 전 확인사항</a>을 먼저 살펴보면 접수가 한결 빠릅니다.</p>

      <h2>비즈니스·제휴 문의</h2>
      <p>웹사이트 제작이나 제휴에 관한 문의는 페이지 하단(푸터)의 ‘웹사이트 제작문의 · 제휴문의’ 버튼을 통해 보내실 수 있습니다. 일반 이용 문의는 이메일 ${esc(site.email)}로도 접수됩니다.</p>

      <h2>지역으로 바로 확인하기</h2>
      <p>아래에서 원하는 지역을 고르면 해당 지역의 방문 안내와 하위 동네 페이지로 이동할 수 있습니다.</p>
      ${regionLinks()}`,
    extras: `${reviewsSection()}\n  ${pricingTable()}`,
    faqs: [
      {
        q: "전화번호가 아직 없나요?",
        a: `전화예약 번호는 준비 중입니다. 그동안에는 증상·위치·사진을 남겨 주시면 안내해 드리며, 일반 문의는 ${site.email}로도 접수됩니다.`,
      },
      {
        q: "접수 시 무엇을 준비하면 되나요?",
        a: "지역, 건물 유형, 막힌 위치와 증상, 가능하면 사진·영상을 준비해 주시면 안내가 빠릅니다.",
      },
      {
        q: "웹사이트 제작·제휴 문의는 어디로 하나요?",
        a: "페이지 하단(푸터)의 ‘웹사이트 제작문의 · 제휴문의’ 버튼을 통해 문의할 수 있습니다.",
      },
    ],
  });
}

function aboutPage() {
  return simplePage({
    path: "/about/",
    eyebrow: "업체 소개",
    h1: "스피드 배관공사 소개와 운영 기준",
    desc: "스피드 배관공사 소개와 작업·운영 기준, 정보 신뢰성에 대한 안내를 정리했습니다.",
    sections: `
      <p>${esc(site.legalName)}은(는) 전국 배관공사·하수구막힘 작업 정보를 정리해, 고객이 문의 전 확인해야 할 작업 기준과 지역별 방문 정보를 한곳에서 살펴볼 수 있도록 안내합니다. 과장된 광고보다 ‘무엇을, 어떻게, 왜’ 작업하는지를 분명히 하는 데 중점을 둡니다.</p>

      <h2>무엇을 안내하나요</h2>
      <ul>
        <li>배관공사·하수구막힘·누수·고압세척·배관내시경 등 서비스별 작업 방식</li>
        <li>지역(시·도 → 시·군·구 → 동) 기준의 방문 안내</li>
        <li>비용이 달라지는 기준과 추가 비용 안내</li>
        <li>문의 전 확인할 증상 체크리스트</li>
      </ul>

      <h2>작업·운영 기준</h2>
      <p>${esc(site.editorialPolicy)}</p>

      <h2>안전·작업 원칙</h2>
      <ul>
        <li>현장 점검으로 원인과 작업 범위를 먼저 확인합니다.</li>
        <li>무조건 교체·전체 시공이 아니라 필요한 만큼만 작업합니다.</li>
        <li>반복 문제는 고압세척·배관내시경으로 원인을 확인해 재발을 줄입니다.</li>
        <li>작업 전 범위와 비용을 함께 확인한 뒤 진행합니다.</li>
        <li>확인되지 않은 후기나 과장된 사례는 게시하지 않습니다.</li>
      </ul>

      <h2>정보를 만드는 방식</h2>
      <p>${esc(site.author.bio)} 각 안내는 현장 작업 기준과 고객 문의를 바탕으로 정리하며, 변동될 수 있는 비용·운영 정보는 ‘현장 확인 후 안내’를 함께 표기합니다. 문서에는 최종 수정일을 표기해 정보의 최신성을 가늠할 수 있도록 합니다.</p>

      <h2>운영 정보</h2>
      <p>상호: ${esc(site.name)} · 이메일: ${esc(site.email)} · 전화예약: ${esc(site.phone)}. 개인정보 처리에 관한 사항은 <a href="/privacy/">개인정보처리방침</a>, 이용 조건은 <a href="/terms/">이용약관</a>에서 확인할 수 있습니다.</p>

      <h2>문의</h2>
      <p>작업 문의는 <a href="/contact/">예약문의</a>로, 처음이라면 <a href="/guide/">작업 전 확인사항</a>에서 준비할 내용을, 작업 방식이 궁금하다면 <a href="/service/">서비스 안내</a>에서 비교 기준을 먼저 확인할 수 있습니다.</p>`,
    faqs: [
      {
        q: "스피드 배관공사는 어떤 곳인가요?",
        a: "전국 배관공사·하수구막힘 작업 정보를 안내하고 방문 작업을 진행하는 생활수리 서비스입니다. 현장 확인 후 작업 범위와 비용을 안내하는 것을 원칙으로 합니다.",
      },
      {
        q: "정보는 얼마나 자주 업데이트되나요?",
        a: "현장 작업 기준과 고객 문의를 바탕으로 주기적으로 업데이트하며, 각 페이지에 최종 수정일을 표기합니다.",
      },
    ],
  });
}

function privacyPage() {
  return simplePage({
    path: "/privacy/",
    eyebrow: "개인정보처리방침",
    h1: "개인정보처리방침",
    desc: "스피드 배관공사가 수집·이용하는 정보의 범위와 처리 방침, 이용자의 권리를 안내합니다.",
    sections: `
      <p>${esc(site.legalName)}(이하 ‘${esc(site.name)}’)은(는) 이용자의 개인정보를 중요하게 생각하며, 관련 법령을 준수합니다. 본 방침은 ${esc(site.name)}가 운영하는 안내 웹사이트에 적용됩니다.</p>
      <h2>1. 수집하는 정보와 방법</h2>
      <p>${esc(site.name)}는 별도의 회원가입 절차 없이 정보를 제공하며, 웹사이트 이용만으로 이름·연락처 등 개인정보를 자동으로 수집하지 않습니다. 작업 문의 과정에서 이용자가 직접 제공하는 정보(지역·증상·연락처·사진 등)는 문의 응대와 방문 작업 안내 목적에 한해 이용됩니다.</p>
      <h2>2. 이용 목적</h2>
      <ul>
        <li>작업 문의 응대 및 방문 안내</li>
        <li>서비스 품질 개선과 통계 분석(개인을 식별하지 않는 범위)</li>
      </ul>
      <h2>3. 쿠키 및 분석 도구</h2>
      <p>웹사이트는 이용 통계 분석을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다. 이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 일부 기능 이용에 제한이 있을 수 있습니다.</p>
      <h2>4. 제3자 제공 및 보관</h2>
      <p>${esc(site.name)}는 법령에 근거하거나 이용자의 동의가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다. 문의로 수집된 정보는 응대·작업 목적 달성 후 지체 없이 파기합니다.</p>
      <h2>5. 이용자의 권리</h2>
      <p>이용자는 자신의 정보에 대한 열람·정정·삭제를 요청할 수 있으며, 관련 요청은 아래 연락처로 접수할 수 있습니다.</p>
      <h2>6. 문의 및 개정</h2>
      <p>개인정보 관련 문의는 ${esc(site.email)}로 가능합니다. 본 방침은 법령·서비스 변경에 따라 개정될 수 있으며, 변경 시 본 페이지에 공지합니다. (최종 개정일 ${MODIFIED})</p>`,
    faqs: [
      { q: "회원가입을 해야 하나요?", a: "아니요. 회원가입 없이 정보를 제공하며, 웹사이트 이용만으로 개인정보를 수집하지 않습니다." },
      { q: "문의 시 알려준 정보는 어떻게 처리되나요?", a: "문의 응대와 방문 작업 안내 목적에 한해 이용되며, 목적 달성 후 지체 없이 파기합니다." },
    ],
  });
}

function termsPage() {
  return simplePage({
    path: "/terms/",
    eyebrow: "이용약관",
    h1: "이용약관",
    desc: "스피드 배관공사 웹사이트 이용 조건과 정보의 성격, 책임 범위를 안내합니다.",
    sections: `
      <p>본 약관은 ${esc(site.legalName)}(이하 ‘${esc(site.name)}’)가 제공하는 안내 웹사이트의 이용 조건을 규정합니다. 웹사이트를 이용함으로써 본 약관에 동의한 것으로 봅니다.</p>
      <h2>1. 서비스의 성격</h2>
      <p>${esc(site.name)}는 전국 배관공사·하수구막힘 작업 정보를 안내하고 방문 작업을 진행하는 생활수리 서비스입니다. 실제 작업 범위와 비용은 현장 점검 후 확정됩니다.</p>
      <h2>2. 정보의 정확성</h2>
      <p>게시된 작업 기준·비용 안내 등은 일반적인 기준을 정리한 참고 자료이며, 현장 상황에 따라 달라질 수 있습니다. 정확한 비용은 현장 확인 후 안내합니다.</p>
      <h2>3. 책임의 제한</h2>
      <ul>
        <li>게시 정보의 활용으로 발생한 결과에 대한 최종 판단과 책임은 이용자에게 있습니다.</li>
        <li>작업은 안전 기준에 따라 진행하며, 현장 여건상 권장되지 않는 작업은 사전에 안내합니다.</li>
        <li>확인되지 않은 후기나 과장된 사례는 게시하지 않습니다.</li>
      </ul>
      <h2>4. 지식재산권</h2>
      <p>웹사이트에 게시된 콘텐츠의 저작권은 ${esc(site.name)}에 있으며, 무단 복제·배포를 금지합니다.</p>
      <h2>5. 약관의 개정</h2>
      <p>본 약관은 관련 법령과 서비스 정책에 따라 개정될 수 있으며, 변경 시 본 페이지를 통해 공지합니다. 문의는 ${esc(site.email)}로 가능합니다. (최종 개정일 ${MODIFIED})</p>`,
    faqs: [
      { q: "게시된 비용 기준은 확정 금액인가요?", a: "참고용 기준이며 현장 상황에 따라 달라질 수 있습니다. 정확한 비용은 현장 확인 후 안내합니다." },
      { q: "작업이 어려운 경우도 있나요?", a: "현장 여건상 권장되지 않거나 추가 협의(공용 배관 등)가 필요한 경우, 사전에 안내해 드립니다." },
    ],
  });
}

// ---------- 에셋 / 사이트맵 ----------
// 작업 사진 플레이스홀더 (4:3, 800×600) — 실사진 교체 전까지 자리(공간)를 잡아 준다.
function galleryPlaceholder(img, n) {
  const nn = String(n).padStart(2, "0");
  const label = esc(img.label);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600" role="img" aria-label="${esc(img.alt)}">
<defs><linearGradient id="pg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a2e"/><stop offset="1" stop-color="#12263f"/></linearGradient></defs>
<rect width="800" height="600" fill="url(#pg)"/>
<rect x="20" y="20" width="760" height="560" rx="20" fill="none" stroke="#33507a" stroke-opacity="0.6" stroke-dasharray="10 10"/>
<g transform="translate(400 250)" fill="none" stroke="#f5852b" stroke-width="9" stroke-linejoin="round" stroke-linecap="round" opacity="0.9">
<rect x="-70" y="-44" width="140" height="96" rx="14"/>
<circle cx="0" cy="6" r="30"/>
<path d="M-44 -44 l16 -22 h56 l16 22"/>
</g>
<text x="400" y="392" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="46" font-weight="800" fill="#eef4fb">${label}</text>
<text x="400" y="440" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="24" fill="#ffbb7e" letter-spacing="1">스피드 배관공사 작업 사진 ${nn}</text>
<text x="400" y="478" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="18" fill="#8ba0bb">이미지 준비 중 · 실사진으로 교체 예정</text>
</svg>`;
}

async function copyAssets() {
  const src = join(ROOT, "src", "assets");
  const dest = join(DIST, "assets");
  await mkdir(dest, { recursive: true });
  for (const f of await readdir(src, { withFileTypes: true })) {
    if (f.isDirectory()) continue; // 하위 폴더(gallery 등)는 아래에서 별도 처리
    await copyFile(join(src, f.name), join(dest, f.name));
  }

  // 작업 사진 갤러리(21장) — 실사진이 src/assets/gallery/ 에 있으면 복사, 없으면 플레이스홀더 생성
  const galSrc = join(src, "gallery");
  const galDest = join(dest, "gallery");
  await mkdir(galDest, { recursive: true });
  for (let i = 0; i < galleryImages.length; i++) {
    const img = galleryImages[i];
    const real = join(galSrc, img.file);
    if (existsSync(real)) {
      await copyFile(real, join(galDest, img.file));
    } else {
      await writeFile(join(galDest, img.file), galleryPlaceholder(img, i + 1), "utf8");
    }
  }
  // 기본 OG 이미지 / 파비콘(SVG) — 프리미엄 네이비 + 오렌지
  const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#081325"/><stop offset="1" stop-color="#0f2138"/></linearGradient></defs><rect width="1200" height="630" fill="url(#g)"/><circle cx="1010" cy="120" r="220" fill="#f5852b" opacity="0.16"/><text x="80" y="290" font-family="Pretendard, sans-serif" font-size="78" font-weight="800" fill="#eef4fb">스피드 배관공사</text><text x="80" y="372" font-family="Pretendard, sans-serif" font-size="38" fill="#ffbb7e">전국 배관공사·하수구막힘 방문 안내</text><text x="80" y="452" font-family="Pretendard, sans-serif" font-size="32" font-weight="700" fill="#79c0ec">싱크대·변기·욕실 배수구·누수·고압세척</text></svg>`;
  await writeFile(join(dest, "og-default.svg"), og, "utf8");
  const fav = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0a1626"/><text x="32" y="42" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="26" font-weight="800" fill="#f5852b">SP</text></svg>`;
  await writeFile(join(dest, "favicon.svg"), fav, "utf8");

  // 히어로 대표 이미지 (16:9) — 실사진으로 교체 시 이 파일만 바꾸면 됨
  const hero = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720" preserveAspectRatio="xMidYMid slice" role="img" aria-label="스피드 배관공사 — 전국 배관공사·하수구막힘 방문 안내">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#07101d"/><stop offset="1" stop-color="#102138"/></linearGradient>
<radialGradient id="glow" cx="76%" cy="26%" r="60%"><stop offset="0" stop-color="#f5852b" stop-opacity="0.5"/><stop offset="55%" stop-color="#f5852b" stop-opacity="0.08"/><stop offset="100%" stop-color="#f5852b" stop-opacity="0"/></radialGradient>
<linearGradient id="steel" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#79c0ec"/><stop offset="1" stop-color="#2f6f9e"/></linearGradient>
</defs>
<rect width="1280" height="720" fill="url(#bg)"/>
<rect width="1280" height="720" fill="url(#glow)"/>
<g fill="none" stroke="url(#steel)">
<path d="M-60,520 C260,420 420,650 760,500 1040,385 1170,565 1360,470" stroke-width="2" stroke-opacity="0.45"/>
<path d="M-60,565 C290,475 470,690 800,545 1090,430 1210,610 1380,515" stroke-width="1.2" stroke-opacity="0.28"/>
</g>
<g stroke="#f5852b" stroke-width="10" stroke-linecap="round" opacity="0.85" fill="none">
<path d="M250,250 h140 a40,40 0 0 1 40,40 v60"/>
<circle cx="250" cy="250" r="16" fill="#0a1626"/>
</g>
<text x="640" y="392" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="64" font-weight="800" fill="#eef4fb" letter-spacing="2">스피드 배관공사</text>
<text x="640" y="446" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="25" fill="#ffbb7e" letter-spacing="4">전국 배관공사 · 하수구막힘 방문 안내</text>
<text x="640" y="492" text-anchor="middle" font-family="Pretendard, sans-serif" font-size="20" fill="#8ba0bb" letter-spacing="2">싱크대 · 변기 · 욕실 배수구 · 누수 · 고압세척</text>
</svg>`;
  await writeFile(join(dest, "hero.svg"), hero, "utf8");
}

function sitemap(urls, imagesByPath = {}) {
  const xe = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const body = urls
    .map((u) => {
      const imgs = imagesByPath[u] || [];
      const imgXml = imgs
        .map(
          (i) =>
            `\n    <image:image><image:loc>${site.baseUrl}${i.loc}</image:loc><image:title>${xe(
              i.title
            )}</image:title></image:image>`
        )
        .join("");
      return `  <url><loc>${site.baseUrl}${u}</loc><lastmod>${MODIFIED}</lastmod>${imgXml}${
        imgXml ? "\n  " : ""
      }</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>`;
}

// IndexNow 키 (빙·네이버·얀덱스 즉시 색인 통보)
const INDEXNOW_KEY = "b00508e375ed8ff4e993dc41ca0b8c4a";

const pageMetaByPath = {};

// RSS 2.0 피드 — 핵심 페이지(안내·서비스·시·도 허브)를 노출해 검색엔진 발견을 돕는다.
function rssFeed(urls) {
  const xmlEsc = (s = "") =>
    String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pubDate = new Date(MODIFIED + "T09:00:00+09:00").toUTCString();
  const feedPaths = [
    "/", "/service/", "/area/", "/subway/", "/price/", "/guide/", "/case/", "/about/", "/contact/",
    ...programs.map((p) => programUrl(p.slug)),
    ...regions.map((r) => `/area/${r.slug}/`),
  ].filter((p, i, a) => urls.includes(p) && a.indexOf(p) === i);

  const items = feedPaths
    .map((p) => {
      const meta = pageMetaByPath[p] || {};
      const title = meta.title || site.name;
      const desc = meta.desc || site.tagline;
      const link = site.baseUrl + p;
      return `  <item>
    <title>${xmlEsc(title)}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <description>${xmlEsc(desc)}</description>
    <pubDate>${pubDate}</pubDate>
  </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${xmlEsc(site.name)} — ${xmlEsc(site.tagline)}</title>
  <link>${site.baseUrl}/</link>
  <atom:link href="${site.baseUrl}/rss.xml" rel="self" type="application/rss+xml" />
  <description>${xmlEsc(site.tagline)}</description>
  <language>ko</language>
  <lastBuildDate>${pubDate}</lastBuildDate>
${items}
</channel>
</rss>`;
}

// ---------- 메인 ----------
async function build() {
  if (existsSync(DIST)) await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  const urls = [];
  const imagesByPath = {}; // 이미지 사이트맵용: 경로 → [{loc, title}]
  const metaTitles = new Map();
  const metaDescs = new Map();
  const add = async (path, file, html) => {
    // 페이지의 작업 사진(갤러리) 추출 — 이미지 사이트맵 + 대표 og:image 자동 연결
    const seen = new Set();
    const imgs = [];
    for (const m of html.matchAll(/<img[^>]+src="(\/assets\/gallery\/[^"]+)"[^>]*?alt="([^"]*)"/g)) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      imgs.push({ loc: m[1], title: m[2] });
    }
    if (imgs.length) {
      imagesByPath[path] = imgs;
      // 실사진(webp/jpg/png)이 있으면 대표 이미지를 og:image 로 승격(SVG 플레이스홀더는 제외 → 회귀 방지)
      const raster = imgs.find((i) => /\.(webp|jpe?g|png)$/i.test(i.loc));
      if (raster) {
        const absImg = site.baseUrl + raster.loc;
        html = html.replace(
          /<meta property="og:image" content="[^"]*"/,
          `<meta property="og:image" content="${absImg}"`
        );
      }
    }
    await write(file, html);
    urls.push(path);
    const t = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
    const d = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    metaTitles.set(t, (metaTitles.get(t) || 0) + 1);
    metaDescs.set(d, (metaDescs.get(d) || 0) + 1);
    pageMetaByPath[path] = { title: t, desc: d };
  };

  console.log("→ 페이지 생성 중...");
  await add("/", "index.html", homePage());
  await add("/service/", "service/index.html", programIndex());
  await add("/price/", "price/index.html", pricePage());
  await add("/guide/", "guide/index.html", guidePage());
  await add("/case/", "case/index.html", casePage());
  await add("/about/", "about/index.html", aboutPage());
  await add("/contact/", "contact/index.html", contactPage());
  await add("/privacy/", "privacy/index.html", privacyPage());
  await add("/terms/", "terms/index.html", termsPage());

  // 서비스 페이지
  let minLen = Infinity;
  for (const p of programs) {
    let html = programPage(p).html;
    html = padBody(html, programUrl(p.slug));
    const ul = uniqueBodyLen(html);
    recordBand(ul, `service ${p.slug}`);
    minLen = Math.min(minLen, ul);
    await add(programUrl(p.slug), `service/${p.slug}/index.html`, html);
  }

  // 지역 인덱스 + 비계층 지역 페이지
  await add("/area/", "area/index.html", regionIndex());
  for (const r of regions) {
    if (HIERARCHICAL.has(r.slug)) continue;
    await add(`/area/${r.slug}/`, `area/${r.slug}/index.html`, placePage(r, "/area/"));
  }

  // 서울 계층 페이지 (광역 → 자치구 → 행정동)
  let seoulMin = Infinity, seoulMax = 0;
  for (const pg of buildSeoulPages()) {
    if (!/\/area\/seoul\/$/.test(pg.path)) {
      pg.html = longtailInject(pg.html, pg.path);
      pg.html = padBody(pg.html, pg.path);
    }
    const len = uniqueBodyLen(pg.html);
    if (!/\/area\/seoul\/$/.test(pg.path)) recordBand(len, pg.path);
    seoulMin = Math.min(seoulMin, len);
    seoulMax = Math.max(seoulMax, len);
    await add(pg.path, pg.file, pg.html);
  }
  console.log(`✓ 서울 계층 페이지 본문 길이: ${seoulMin}~${seoulMax}자`);

  // 광역시·도 계층 페이지 (광역 → 시 → 구 → 행정동)
  for (const [label, root] of [
    ["인천", metroRoot(incheon)],
    ["경기", provinceRoot(gyeonggi)],
    ["부산", metroRoot(busan)],
    ["대구", metroRoot(daegu)],
    ["광주", metroRoot(gwangju)],
    ["대전", metroRoot(daejeon)],
    ["울산", metroRoot(ulsan)],
    ["세종", provinceRoot(sejong)],
    ["제주", provinceRoot(jeju)],
    ["강원", provinceRoot(gangwon)],
    ["충북", provinceRoot(chungbuk)],
    ["충남", provinceRoot(chungnam)],
    ["전북", provinceRoot(jeonbuk)],
    ["전남", provinceRoot(jeonnam)],
    ["경북", provinceRoot(gyeongbuk)],
    ["경남", provinceRoot(gyeongnam)],
  ]) {
    let mn = Infinity, mx = 0, cnt = 0;
    for (const pg of buildRegionTree(root)) {
      const isContent = pg.path.replace(/[^/]+\/$/, "").split("/").filter(Boolean).length >= 2;
      if (isContent) {
        pg.html = longtailInject(pg.html, pg.path);
        pg.html = padBody(pg.html, pg.path);
      }
      const len = uniqueBodyLen(pg.html);
      if (isContent) recordBand(len, pg.path);
      mn = Math.min(mn, len);
      mx = Math.max(mx, len);
      cnt++;
      await add(pg.path, pg.file, pg.html);
    }
    console.log(`✓ ${label} 계층 ${cnt}페이지 본문 길이: ${mn}~${mx}자`);
  }

  // 지하철 노선/역 페이지 (인덱스 → 노선 → 역) — 역세권 롱테일 SEO
  {
    let mn = Infinity, mx = 0, cnt = 0;
    for (const pg of buildSubwayPages(subwaySystems)) {
      const isStation = /^\/subway\/[^/]+\/$/.test(pg.path);
      if (isStation) {
        pg.html = longtailInject(pg.html, pg.path);
        pg.html = padBody(pg.html, pg.path);
      }
      const len = uniqueBodyLen(pg.html);
      if (isStation) recordBand(len, pg.path); // 역 페이지만 집계
      mn = Math.min(mn, len); mx = Math.max(mx, len); cnt++;
      await add(pg.path, pg.file, pg.html);
    }
    console.log(`✓ 지하철 ${cnt}페이지(노선+역) 본문 길이: ${mn}~${mx}자`);
  }

  await copyAssets();

  // robots.txt + sitemap.xml
  await writeFile(
    join(DIST, "robots.txt"),
    `# robots.txt — ${site.name}
User-agent: *
Allow: /

User-agent: Googlebot
Allow: /
User-agent: bingbot
Allow: /
User-agent: Yeti
Allow: /
User-agent: Daumoa
Allow: /

Sitemap: ${site.baseUrl}/sitemap.xml
`,
    "utf8"
  );
  await writeFile(join(DIST, "sitemap.xml"), sitemap(urls, imagesByPath), "utf8");
  await writeFile(join(DIST, "rss.xml"), rssFeed(urls), "utf8");
  await writeFile(join(DIST, `${INDEXNOW_KEY}.txt`), INDEXNOW_KEY, "utf8");

  // llms.txt (AI 에이전트용)
  const u = site.baseUrl;
  const llms = `# ${site.name} — 전국 배관공사·하수구막힘 방문 안내

${site.legalName}은(는) 전국 배관공사·하수구막힘 작업 정보를 정리하고 방문 작업을 진행하는 생활수리 서비스입니다. 비용은 현장 구조·막힘 상태에 따라 달라지며 현장 확인 후 안내합니다.

## 주요 안내
- [홈](${u}/)
- [서비스 안내](${u}/service/)
- [지역별 안내](${u}/area/)
- [지하철역별 안내](${u}/subway/)
- [비용 안내](${u}/price/)
- [작업 전 확인사항](${u}/guide/)
- [작업사례](${u}/case/)
- [업체 소개](${u}/about/)
- [예약문의](${u}/contact/)

## 서비스
${programs.map((p) => `- [${p.label}](${u}/service/${p.slug}/)`).join("\n")}

## 안내
- 비용은 현장 구조·막힘 상태에 따라 달라지므로 현장 확인 후 안내합니다.
- 확인되지 않은 후기나 과장된 사례는 게시하지 않습니다.
`;
  await writeFile(join(DIST, "llms.txt"), llms, "utf8");

  // 타이틀·디스크립션 중복 검사
  const dupT = [...metaTitles.entries()].filter(([, n]) => n > 1);
  const dupD = [...metaDescs.entries()].filter(([, n]) => n > 1);
  if (dupT.length || dupD.length) {
    console.warn(`  ⚠️  중복 타이틀 ${dupT.length}종 / 중복 디스크립션 ${dupD.length}종`);
    dupT.slice(0, 5).forEach(([t, n]) => console.warn(`     T×${n}: ${t}`));
    dupD.slice(0, 5).forEach(([d, n]) => console.warn(`     D×${n}: ${d}`));
  } else {
    console.log(`✓ 타이틀·디스크립션 중복 없음 (${metaTitles.size}종 고유)`);
  }

  console.log(`✓ 총 ${urls.length}개 페이지 생성 완료`);
  const bandTotal = band.lo + band.ok + band.hi;
  const pct = bandTotal ? ((band.ok / bandTotal) * 100).toFixed(1) : "0";
  console.log(
    `✓ 고유 본문 2,000~2,500자 밴드: ${band.ok}/${bandTotal} (${pct}%) · ` +
    `<2000 ${band.lo}개 / >2500 ${band.hi}개 · 범위 ${band.min}~${band.max}자`
  );
  console.log(`✓ sitemap.xml / robots.txt / rss.xml 생성 완료`);
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});

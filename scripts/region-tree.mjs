// 범용 지역 계층 생성기 (광역 → 시 → 구 → 행정동, 임의 깊이)
// - 경기(시→구→동 / 시→동), 인천(구·군→동) 등에 사용
// - 각 페이지 2000~2500자 목표, 구/동별 실제 정보 + 인접 동 + 문장 변형으로 도어웨이 방지
import { layout, esc, faqLd, articleLd, pricingTable, pricingLd, reviewsSection } from "../src/templates/layout.mjs";
import { site } from "../data/site.mjs";
import { programBySlug } from "../data/programs.mjs";
import { slugify } from "./romanize.mjs";
import { vpick, vsubset, vshuffle } from "./variants.mjs";

const MODIFIED = "2026-06-21";
const PROGRAM_PICKS = ["drain", "sink", "toilet", "pipe", "bathroom-drain"];
const phone = site.phone;

function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
const pick = (s, arr) => arr[s % arr.length];

// 타이틀·디스크립션 변형 (중복 방지: 지역명 조합 + 시드 기반 문형 변형)
export function dongMeta(dongName, metro, areaName) {
  const s = seed(metro + "|" + areaName + "|" + dongName);
  // 타이틀은 무조건 '지역명 + 배관공사·하수구막힘'으로 시작
  const titles = [
    `${dongName} 배관공사·하수구막힘 방문 안내 — ${metro} ${areaName} | ${site.name}`,
    `${dongName} 배관공사·하수구막힘 안내 · ${metro} ${areaName} | ${site.name}`,
    `${dongName} 배관공사·하수구막힘 방문 접수 — ${metro} ${areaName} | ${site.name}`,
    `${dongName} 배관공사·하수구막힘 안내 가이드 (${metro} ${areaName}) | ${site.name}`,
  ];
  const descs = [
    `${metro} ${areaName} ${dongName} 배관공사·하수구막힘 방문 권역과 작업 전 확인 사항 안내.`,
    `${areaName} ${dongName} 배관공사·하수구막힘 방문 권역과 작업 기준을 정리했습니다.`,
    `${dongName}(${areaName}) 하수구막힘·배관 작업 흐름과 비용 기준·접수 방법 안내.`,
    `${areaName} ${dongName} 배관·하수구 방문 작업 방식·확인 사항을 안내합니다.`,
    `${dongName} 배관공사·하수구막힘 확인사항과 인근 동 정보를 ${metro} 기준으로 정리.`,
  ];
  return {
    title: titles[s % titles.length],
    description: descs[(s >>> 2) % descs.length].slice(0, 80),
  };
}
export function branchMeta(fullName, childLabel) {
  const s = seed("b|" + fullName);
  // 타이틀은 무조건 '지역명 + 배관공사·하수구막힘'으로 시작
  const titles = [
    `${fullName} 배관공사·하수구막힘 방문 안내 | ${site.name}`,
    `${fullName} 배관공사·하수구막힘 — ${childLabel}별 방문 안내 | ${site.name}`,
    `${fullName} 배관공사·하수구막힘 작업·접수 안내 | ${site.name}`,
    `${fullName} 배관공사·하수구막힘 방문 가이드 | ${site.name}`,
  ];
  const descs = [
    `${fullName} 배관공사·하수구막힘 안내와 ${childLabel}별 방문 권역, 확인 사항 정리.`,
    `${fullName}에서 배관공사·하수구막힘을 ${childLabel}별로 확인하고 작업 기준을 살펴보세요.`,
    `${fullName} 하수구막힘·배관 작업 방식과 비용 기준, 접수 방법을 안내합니다.`,
    `${fullName} 방문 작업 흐름과 ${childLabel}별 안내, 작업 전 확인사항을 정리.`,
  ];
  return {
    title: titles[s % titles.length],
    description: descs[(s >>> 2) % descs.length].slice(0, 80),
  };
}

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
function callout() {
  return `<div class="callout">표시된 정보와 가격은 변동될 수 있으므로, <strong>실제 비용은 현장 구조·막힘 상태에 따라 달라집니다. 정확한 금액은 현장 확인 후 안내합니다.</strong></div>`;
}
const ctaBtn = (label) =>
  `<p><a class="btn btn-primary" href="${site.phoneHref}">💬 ${esc(label)} 예약 문의</a></p>`;
function programChips(place) {
  const pre = place ? `${place} ` : "";
  return `<div class="link-cloud">${PROGRAM_PICKS.map((slug) => {
    const p = programBySlug[slug];
    return `<a href="/service/${slug}/">${esc(pre + p.label)}</a>`;
  }).join("")}</div>`;
}
const stationsText = (n) => (n.stations && n.stations.length ? n.stations.slice(0, 4).join("·") : "");
const landmarksText = (n) => (n.landmarks && n.landmarks.length ? n.landmarks.slice(0, 4).join("·") : "");
function bcNav(node) {
  const parts = [
    `<a href="/">홈</a>`,
    `<a href="/area/">지역별 안내</a>`,
    ...node.ancestors.map((a) => `<a href="${a.url}">${esc(a.name)}</a>`),
    esc(node.name),
  ];
  return `<nav class="breadcrumb container" aria-label="위치">${parts.join("<span>›</span>")}</nav>`;
}
const crumb = (node) => [
  { name: "홈", url: "/" },
  { name: "지역별 안내", url: "/area/" },
  ...node.ancestors.map((a) => ({ name: a.name, url: a.url })),
  { name: node.name, url: node.url },
];

// ---------- 트리 정규화 ----------
function normalize(node, ancestors, parent) {
  node.ancestors = ancestors;
  node.parent = parent || null;
  if (node.kind !== "metro") node.slug = node._slug || slugify(node.name);
  node.url = "/area/" + [...ancestors.map((a) => a.slug), node.slug].join("/") + "/";

  let kids = node.children;
  if (node.dongs) {
    kids = node.dongs.map((d) => (typeof d === "string" ? { kind: "dong", name: d } : d));
    node.children = kids;
  }
  if (kids && kids.length) {
    const used = new Set();
    const childAnc = [...ancestors, { name: node.name, url: node.url, slug: node.slug }];
    for (const k of kids) {
      let sg = slugify(k.name) || "area";
      let base = sg,
        n = 2;
      while (used.has(sg)) sg = base + n++;
      used.add(sg);
      k._slug = sg;
      normalize(k, childAnc, node);
    }
  }
}

// ---------- 행정동(말단) 페이지 ----------
function dongPage(node) {
  const parent = node.parent; // 구 또는 시
  const dongName = node.name;
  const areaName = parent.name; // 예: 영통구 / 부천시
  const metro = node.ancestors[0].name; // 경기 / 인천
  const st = stationsText(parent);
  const lm = landmarksText(parent);
  const sib = (parent.children || []).filter((c) => c.kind === "dong" && c.name !== dongName);
  const near = sib.slice(0, 5);
  const nearText = near.length ? near.map((d) => d.name).join("·") : areaName + " 일대";
  const n1 = near[0] ? near[0].name : areaName + " 일대";

  // 변형 base: 광역+상위지역+동명 → 동명 동(여러 도시의 중앙동 등)도 분기
  const vb = "DG␟" + metro + "␟" + areaName + "␟" + dongName;

  // ── 개요 2문단 (독립 슬롯 조합) ──
  const openA = vpick(vb, "openA", [
    `${dongName}은(는) ${metro} ${areaName}에 속한 행정동입니다.`,
    `${metro} ${areaName} ${dongName} 일대는 주거와 상가가 맞물린 권역입니다.`,
    `${areaName} ${dongName}은(는) ${metro} 안에서도 배관·하수구 문의가 이어지는 동네입니다.`,
    `${dongName}은(는) ${areaName} 생활권의 한 축을 이루는 ${metro} 소속 행정동입니다.`,
    `${metro} ${areaName}의 ${dongName}은(는) 인접 동과 권역이 촘촘히 이어지는 지역입니다.`,
  ]);
  const openCtx = (parent.character ? esc(parent.character) + " " : "") +
    (st ? `인근으로는 ${esc(st)} 등이 가까워 이동이 이어지고, ` : "") +
    (lm ? `${esc(lm)} 같은 시설이 생활 권역의 기준점이 됩니다.` : "주변 생활 권역을 중심으로 이동 동선이 형성됩니다.");
  const demand = vpick(vb, "demand", [
    `${dongName} 일대에서 배관공사나 하수구막힘이 생겼을 때는 방문 권역과 도착 소요 시간을 먼저 확인하는 것이 좋습니다.`,
    `${dongName} 인근에서 배관·하수구 작업을 의뢰하려는 분들은 같은 ${areaName} 안에서도 권역에 따라 도착 시간이 달라질 수 있다는 점을 염두에 두면 좋습니다.`,
    `${dongName}에서 작업을 맡기려면 방문 가능 여부와 소요 시간을 접수 시 확인하는 것이 정확합니다.`,
    `${n1} 방면과 맞닿은 ${dongName}은(는) 출발지에 따라 도착 시간이 달라질 수 있어, 위치를 정확히 알리면 안내가 수월합니다.`,
  ]);

  // ── '자주 발생하는 문제' 불릿 (6개 중 4개, 순서 셔플) ──
  const whoBullets = vsubset(vb, "who", [
    `${areaName} 내 아파트·빌라 욕실이나 싱크대 배수가 느려지거나 역류하는 경우`,
    `퇴근 후나 늦은 시간에 ${dongName} 인근에서 변기막힘·역류가 생긴 경우`,
    `노후 주거지에서 배관 누수나 녹물이 반복되는 경우`,
    `${dongName} 인근 상가·음식점 주방에서 기름·음식물 누적으로 하수구가 막히는 경우`,
    `${n1} 등 인접 동까지 권역을 두고 ${dongName} 방문 가능 여부를 함께 확인하려는 경우`,
    `여러 배수구가 동시에 느려져 본관·공용관 점검이 필요해 보이는 경우`,
  ], 4);

  // ── 확인할 점 문단 + 불릿 ──
  const checkPara = vpick(vb, "checkP", [
    `표시된 정보나 비용은 변동될 수 있으므로, 방문 가능 여부·작업 범위·예상 비용은 접수 단계에서 직접 확인하는 것이 좋습니다. ${dongName} 인근은 출발지에 따라 방문 소요 시간이 달라질 수 있어, 막힌 위치와 증상을 미리 알려 주면 안내가 빠릅니다.`,
    `같은 ${areaName}이라도 ${dongName} 기준 권역과 도착 시간은 출발지에 따라 다릅니다. 접수 시 위치·증상·건물 유형을 함께 알리면 안내가 정확해집니다.`,
    `${dongName}에서 작업을 맡길 때는 방문 가능 권역, 작업 방식, 추가 요금을 접수 과정에서 확인하는 것이 좋습니다. 표시 정보는 참고용이며 실제 비용은 현장 확인 후 안내됩니다.`,
  ]);
  const checkBullets = vsubset(vb, "check", [
    `막힌 위치·증상(싱크대·변기·욕실·세면대 등)`,
    `물 역류 여부와 냄새 유무`,
    `건물 유형(아파트·빌라·상가·주택)과 사용 연식`,
    `이전에 같은 부위를 작업한 적이 있는지`,
    `야간·긴급 작업이 필요한지`,
    `사진·영상 전달이 가능한지`,
  ], 5);

  // ── 작업 방식 안내 문단 ──
  const comparePara = vpick(vb, "compare", [
    `배관·하수구 작업은 보통 현장 점검 → 원인 진단(필요 시 배관내시경) → 스프링·고압세척·교체 등 작업 → 마무리 통수 확인 순으로 진행됩니다. 가벼운 이물질 막힘은 스프링으로, 기름·찌꺼기가 관 벽에 쌓인 경우는 고압세척으로, 노후 배관 문제는 부분 교체로 접근합니다.`,
    `${dongName} 인근에서는 막힌 위치와 원인에 따라 스프링(관통), 고압세척, 배관내시경 점검, 부분 교체를 조합해 작업합니다. 무리하게 한 가지 방식만 반복하기보다 현장에서 원인을 확인한 뒤 맞는 방식을 정하는 것이 재발을 줄입니다.`,
    `먼저 현장에서 막힘·누수 원인을 진단합니다. 단순 막힘은 스프링 작업으로 끝나는 경우가 많고, 반복되거나 흐름이 전반적으로 느리면 고압세척이나 내시경 확인이 필요할 수 있습니다. 노후 배관이 원인이면 문제 구간만 교체합니다.`,
  ]);

  // ── 방문 가능 생활권 / 이동 문단 ──
  const flowPara = vpick(vb, "flow", [
    `접수 시 ${dongName} 위치와 막힌 위치·증상을 전달하면, 방문 가능 여부와 도착 예정 시간을 안내받게 됩니다. 사진이나 영상을 함께 보내 주면 원인 파악과 작업 방식 판단이 빨라지고, 야간·긴급 작업이 가능한지도 접수 시 함께 확인할 수 있습니다.`,
    `${dongName}에서의 접수는 위치 전달 → 증상·건물 유형 알림 → 방문 가능 여부와 예상 작업 범위 확인 → 예약 문의 순으로 진행하면 매끄럽습니다. 야간·긴급 상황이라면 가능 여부와 도착 시간을 먼저 확인해 두는 것이 좋습니다.`,
    `먼저 ${dongName} 위치와 증상을 정해 문의하면 도착 예정 시간을 안내받을 수 있습니다. 늦은 시간 작업을 원한다면 야간·긴급 출동 가능 여부와 추가 요금을 함께 확인해 두세요.`,
  ]);

  const faqs = [
    {
      q: `${dongName}에서 하수구막힘은 어떻게 접수하나요?`,
      a: vpick(vb, "fa1", [
        `${dongName}(${metro} ${areaName}) 위치와 막힌 위치·증상을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 사진·영상을 함께 보내면 원인 파악이 빨라집니다.`,
        `${metro} ${areaName} ${dongName}이라고 알리고 증상(역류·물빠짐 지연 등)과 건물 유형을 전달하면 도착 예정 시간과 예상 작업 범위를 안내받습니다. 추가 요금 여부도 미리 확인하세요.`,
      ]),
    },
    {
      q: `${dongName}에서 배관공사도 맡길 수 있나요?`,
      a: vpick(vb, "fa2", [
        `네, 노후 배관 교체·누수 보수·라인 정비 등 배관공사도 ${dongName} 방문 권역인지 접수 시 확인하면 됩니다. 현장 점검 후 문제 구간만 필요한 만큼 작업하는 것을 원칙으로 합니다.`,
        `배관공사는 막힘과 달리 배관 자체를 보수·교체하는 작업입니다. ${dongName} 인근에서 권역에 포함되는지 확인하고, 증상과 건물 유형을 함께 알리면 작업 범위를 안내받을 수 있습니다.`,
      ]),
    },
    {
      q: `${dongName}까지 방문에 얼마나 걸리나요?`,
      a: vpick(vb, "fa3", [
        `출발지와 시간대, ${areaName} 내 권역에 따라 달라집니다. 정확한 방문 소요 시간은 접수 시 확인하는 것이 좋습니다.`,
        `${dongName}은(는) 출발지와 교통 상황에 따라 도착 시간이 달라집니다. 접수 시 위치를 알리면 예상 소요 시간을 안내받을 수 있습니다.`,
      ]),
    },
    {
      q: `${areaName}에서 야간·긴급 작업도 되나요?`,
      a: vpick(vb, "fa4", [
        `상황과 일정에 따라 야간·긴급 방문이 가능한 경우가 있습니다. 무조건 즉시 출동을 보장하기보다, 접수 시 가능 여부와 도착 시간, 추가 요금을 함께 확인하는 것이 정확합니다.`,
        `${areaName} 권역과 시간대에 따라 야간·긴급 작업 가능 여부가 달라집니다. 막힌 위치와 증상을 알리면 당일 가능 여부를 안내받을 수 있습니다.`,
      ]),
    },
  ];

  const secOverview = `
    <h2>${esc(dongName)} 지역 개요</h2>
    <p>${esc(openA)} ${openCtx}</p>
    <p>${esc(demand)} 같은 ${esc(areaName)} 안에서 ${esc(nearText)} 등 인접 동과 권역이 맞닿아 있어, 방문 위치를 정확히 알리면 안내가 한결 수월합니다.</p>`;
  const secWho = `
    <h2>${esc(dongName)}에서 자주 발생하는 배관·하수구 문제</h2>
    <ul>${whoBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secCheck = `
    <h2>${esc(dongName)} 작업 전 확인사항</h2>
    <p>${esc(checkPara)}</p>
    <ul>${checkBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    ${callout()}`;
  const secCompare = `
    <h2>${esc(dongName)} 배관·하수구 작업 방식 안내</h2>
    <p>${esc(comparePara)}</p>
    ${programChips(dongName)}`;
  const secFlow = `
    <h2>${esc(dongName)} 방문 가능 생활권과 이동</h2>
    <p>${esc(flowPara)}</p>`;
  const secTips = `
    <h2>${esc(dongName)} 비용이 달라지는 기준</h2>
    <p>${esc(vpick(vb, "tipA", [
      `${dongName} 인근에서 비용은 현장 구조, 막힘 정도, 작업 방식(스프링·고압세척·내시경·교체), 배관 길이, 야간·긴급 여부에 따라 달라집니다. 같은 증상이라도 원인이 트랩 한 곳일 수도, 배관 깊은 곳일 수도 있어 현장 확인 후 안내하는 것이 정확합니다.`,
      `${dongName}에서는 단순 뚫음으로 끝나는 경우와 고압세척·부분 교체가 필요한 경우의 비용 차이가 큽니다. 막힘 정도와 배관 상태, 작업 시간대에 따라 달라지므로, 정확한 금액은 현장 구조를 본 뒤 안내합니다.`,
      `${areaName} 일대에서 비용을 가늠할 때는 막힌 위치, 원인(이물질·기름·노후), 작업 방식, 배관 길이를 함께 보는 것이 좋습니다. 야간·긴급 작업은 조건이 달라질 수 있어 접수 시 함께 확인하면 됩니다.`,
      `${dongName} 인근 작업은 현장 구조와 막힘 상태에 따라 비용이 달라집니다. 미리 고정 금액을 단정하기보다, 증상·사진을 전달하면 예상 가능한 작업 범위를 먼저 설명해 드립니다.`,
    ]))}</p>
    <p>${esc(vpick(vb, "tipB", [
      `${dongName}에서 작업을 맡길 때는 막힌 위치와 물 역류 여부, 건물 유형(아파트·빌라·상가)을 미리 알려 두면 진행이 매끄럽습니다. 야간·긴급 시간대는 방문 가능 여부와 추가 요금이 달라질 수 있으니 접수 시 함께 확인하세요.`,
      `${dongName}에서 방문 작업이 처음이라면 출입 방법과 주차, 사진·영상 전달 가능 여부를 접수 시 미리 맞춰 두면 도착 후 바로 점검을 시작할 수 있어 시간을 아낄 수 있습니다.`,
      `${dongName} 인근에서 늦은 시간 작업을 생각한다면 야간·긴급 출동 가능 여부와 추가 요금, 도착 소요 시간을 접수 단계에서 확인해 두면 당일 진행이 매끄럽습니다.`,
      `${dongName}에서 비용을 정확히 가늠하려면 막힘 정도와 이전 작업 이력, 건물 유형을 함께 알려 주는 것이 좋습니다. 표시 정보는 참고용이며 실제 비용은 현장 확인 후 안내됩니다.`,
    ]))}</p>`;

  const middle = vshuffle(vb, "order", [secWho, secCheck, secCompare, secFlow, secTips]).join("\n");

  const body = `
  ${bcNav(node)}
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(metro)} ${esc(
    areaName
  )}</p>
    <h1>${esc(dongName)} 배관공사·하수구막힘 방문 안내</h1>
    ${secOverview}
    ${middle}

    <h2>${esc(dongName)} 인근 지역</h2>
    <p>같은 ${esc(areaName)} 내 ${esc(nearText)} 등 인접 동과 함께 비교하면 방문 권역을 잡기 쉽습니다.</p>
    <div class="link-cloud">
      ${near.map((d) => `<a href="${d.url}">${esc(d.name)}</a>`).join("")}
      <a href="${parent.url}">${esc(areaName)} 전체</a>
      <a href="${node.ancestors[0].url}">${esc(metro)} 전체</a>
    </div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join("\n      ")}
    </div>

    ${authorBox()}
    ${ctaBtn(dongName + " 배관공사·하수구막힘")}
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  return {
    path: node.url,
    file: node.url.replace(/^\//, "").replace(/\/$/, "") + "/index.html",
    html: layout({
      ...dongMeta(dongName, metro, areaName),
      path: node.url,
      body,
      structuredData: [
        faqLd(faqs),
        articleLd({
          headline: `${dongName} 배관공사·하수구막힘 방문 안내`,
          description: `${dongName}(${metro} ${areaName}) 배관공사·하수구막힘 방문 안내`,
          path: node.url,
          modified: MODIFIED,
        }),
        pricingLd(),
      ],
      breadcrumb: crumb(node),
    }),
  };
}

// ---------- 시/구(중간) 페이지 ----------
function branchPage(node) {
  const metro = node.kind === "metro" ? node.name : node.ancestors[0].name;
  const childKind = node.children && node.children[0] ? node.children[0].kind : "dong";
  const childLabel = childKind === "si" ? "시·군" : childKind === "gu" ? "자치구·구" : "행정동";
  const st = stationsText(node);
  const lm = landmarksText(node);
  const fullName = node.kind === "metro" ? node.name : `${metro} ${node.name}`;

  const childLinks = (node.children || [])
    .map((c) => `<a href="${c.url}">${esc(c.name)}</a>`)
    .join("");
  const childCards = (node.children || [])
    .map(
      (c) => `<a class="card" href="${c.url}">
        <h3>${esc(c.name)}</h3>
        <p>${esc((c.character || `${c.name} 배관공사·하수구막힘 방문 안내`).slice(0, 50))}…</p>
      </a>`
    )
    .join("\n        ");

  const nm = node.name;
  const child1 = node.children && node.children[0] ? node.children[0].name : childLabel;
  // 변형 base: 광역 + 지역명 → 동명 구(여러 광역시의 동구·남구 등)도 분기
  const vb = "BR␟" + metro + "␟" + nm;

  const faqs = [
    {
      q: `${fullName}에서 하수구막힘은 어떻게 접수하나요?`,
      a: vpick(vb, "fa1", [
        `${fullName} 내 ${childLabel}와 막힌 위치·증상을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 사진·영상을 함께 보내면 원인 파악이 빠릅니다.`,
        `${fullName}에서는 원하는 ${childLabel}와 증상(역류·물빠짐 지연 등), 건물 유형을 알리면 방문 가능 여부와 도착 예정 시간을 안내받을 수 있습니다.`,
      ]),
    },
    {
      q: `${fullName}에서 받을 수 있는 작업은 무엇인가요?`,
      a: vpick(vb, "fa2", [
        `하수구막힘·싱크대막힘·변기막힘·욕실배수구막힘 같은 막힘 작업과 노후 배관 교체·누수 보수 등 배관공사를 함께 확인할 수 있습니다.`,
        `막힘 뚫음(스프링·고압세척), 배관내시경 점검, 배관 부분 교체·누수 보수 등을 ${nm} 기준으로 확인할 수 있습니다.`,
      ]),
    },
    {
      q: `${fullName} 어디까지 방문이 되나요?`,
      a: vpick(vb, "fa3", [
        `${childLabel}별로 방문 권역이 다를 수 있습니다. 아래 목록에서 해당 지역을 확인하고 접수 시 위치를 알리면 됩니다.`,
        `${nm} 내 ${childLabel}에 따라 권역이 달라집니다. ${child1} 등 원하는 지역을 고른 뒤 접수 시 위치를 알리면 방문 가능 여부를 확인할 수 있습니다.`,
      ]),
    },
  ];

  // 중간 페이지 본문 (2000자 목표)
  const charPara = node.character
    ? `<p>${esc(nm)}은(는) ${esc(node.character)}${
        st ? ` ${esc(st)} 등으로 이동이 이어지고,` : ""
      }${lm ? ` ${esc(lm)} 같은 시설이 생활 권역의 기준점이 됩니다.` : ""}</p>`
    : `<p>${esc(node.intro || vpick(vb, "noChar", [
        `${fullName}은(는) 권역이 넓어 같은 지역이라도 ${childLabel}에 따라 방문 권역과 도착 소요 시간이 달라질 수 있습니다.`,
        `${fullName}은(는) ${child1} 등 여러 ${childLabel}로 나뉘어, 어느 지역을 먼저 고르느냐에 따라 방문 권역과 안내가 달라집니다.`,
        `${fullName}은(는) 생활권이 넓게 이어져 있어, ${childLabel}별로 방문 가능 권역과 도착 시간을 따로 확인하는 것이 좋습니다.`,
      ]))}</p>`;

  const isMetro = node.kind === "metro";

  const childSection = isMetro
    ? `<section class="section"><div class="container">
        <div class="section-head"><span class="eyebrow">${esc(node.name)} ${esc(
        childLabel
      )}</span>
          <h2>${esc(childLabel)}를 선택하세요</h2>
          <p>${esc(
            childLabel
          )}를 고른 뒤 하위 지역까지 좁혀 가면, 해당 지역의 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다.</p>
        </div>
        <div class="grid grid-4">${childCards}</div>
      </div></section>`
    : `<h2>${esc(node.name)} ${esc(childLabel)}에서 찾기</h2>
       <p>아래에서 ${esc(node.name)}의 ${esc(
        childLabel
      )}를 선택하면 해당 지역의 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다. (숫자 행정동은 대표 동명으로 통합해 안내합니다.)</p>
       <div class="link-cloud">${childLinks}</div>`;

  const secFeature = `
    <h2>${esc(nm)} 지역 특징</h2>
    ${charPara}
    <p>${esc(vpick(vb, "feat", [
      `같은 ‘${fullName} 배관공사·하수구막힘’이라도 ${childLabel}에 따라 방문 권역과 도착 소요 시간이 달라질 수 있어, 원하는 지역을 먼저 고르면 방문 가능 여부와 작업 방식을 더 정확히 확인할 수 있습니다.`,
      `${nm}은(는) ${child1} 등으로 권역이 나뉘어, 어느 ${childLabel}을(를) 먼저 고르느냐에 따라 방문 가능 권역과 도착 시간이 달라집니다.`,
      `${fullName}에서 배관·하수구 작업을 맡길 때는 ${childLabel}별 권역 차이를 먼저 살펴보면 방문 가능 여부를 정확히 좁힐 수 있습니다.`,
    ]))}</p>`;

  const secWho = `
    <h2>${esc(nm)}에서 자주 발생하는 배관·하수구 문제</h2>
    <ul>${vsubset(vb, "who", [
      `아파트·빌라 욕실이나 싱크대 배수가 느려지거나 역류하는 경우`,
      `${nm} 안에서 퇴근 후·늦은 시간에 변기막힘·역류가 생긴 경우`,
      `노후 주거지에서 배관 누수나 녹물이 반복되는 경우`,
      `상가·음식점 주방에서 기름·음식물 누적으로 하수구가 막히는 경우`,
      `${child1} 등 ${nm} 내 여러 지역을 두고 방문 권역을 함께 살펴보려는 경우`,
      `여러 배수구가 동시에 느려져 본관·공용관 점검이 필요해 보이는 경우`,
    ], 4).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

  const secCompare = `
    <h2>${esc(nm)} 배관·하수구 작업 방식 안내</h2>
    <p>${esc(vpick(vb, "compare", [
      `${nm}에서는 막힌 위치와 원인에 따라 작업 방식이 달라집니다. 가벼운 이물질 막힘은 스프링(관통)으로, 기름·찌꺼기가 관 벽에 쌓인 경우는 고압세척으로, 원인이 안 보이거나 반복되면 배관내시경으로 내부를 확인합니다. 노후 배관이 원인이면 문제 구간만 부분 교체합니다.`,
      `${nm}에서 작업은 현장 점검 → 원인 진단 → 작업(스프링·고압세척·내시경·교체) → 마무리 통수 확인 순으로 진행됩니다. 무리하게 한 방식만 반복하기보다 현장에서 원인을 확인한 뒤 맞는 방식을 정하는 것이 재발을 줄입니다.`,
      `${nm} 인근에서는 단순 막힘은 뚫음으로, 반복 막힘이나 흐름 저하는 고압세척으로, 노후·누수 문제는 배관 보수·교체로 접근합니다. 현장 구조와 막힘 상태를 먼저 확인해야 필요한 만큼만 작업할 수 있습니다.`,
    ]))}</p>`;

  const secGuide = `
    <h2>${esc(nm)} 배관공사·하수구막힘 한눈에 보기</h2>
    <p>${esc(vpick(vb, "guide", [
      `${nm}에서 배관·하수구 작업을 맡길 때는 방문 권역(어느 지역까지 방문 가능한지), 막힌 위치·증상, 작업 방식(스프링·고압세척·내시경·교체), 예상 작업 범위와 추가 요금을 순서대로 확인하면 선택이 쉬워집니다. 특히 ${childLabel}에 따라 도착 소요 시간이 달라질 수 있으니, 원하는 지역을 먼저 정해 두는 것이 좋습니다.`,
      `${nm} 작업은 ① 방문 권역 ② 막힌 위치·증상 ③ 작업 방식 ④ 비용·추가 요금 순으로 확인하면 정리가 쉽습니다. ${childLabel}마다 권역이 달라 원하는 지역을 먼저 정하는 것이 핵심입니다.`,
      `${nm}에서는 어느 ${childLabel}까지 방문되는지, 어떤 작업이 필요한지, 비용은 어떻게 달라지는지를 차례로 확인하면 판단 기준이 분명해집니다. 지역에 따라 도착 시간이 달라지는 점만 미리 감안하세요.`,
    ]))}</p>`;

  const secPrograms = `
    <h2>${esc(nm)}에서 확인해 볼 작업</h2>
    <p>${esc(vpick(vb, "prog", [
      `하수구막힘·싱크대막힘·변기막힘·욕실배수구막힘 같은 막힘 작업과 노후 배관 교체·누수 보수 등 배관공사를 ${nm} 기준으로 확인해 보세요.`,
      `${nm} 인근에서는 막힘 뚫음(스프링·고압세척), 배관내시경 점검, 배관 부분 교체·누수 보수를 증상에 맞게 확인하면 됩니다.`,
      `증상과 위치에 따라 막힘 뚫음, 고압세척, 배관내시경, 배관 교체 중에서 ${nm} 기준으로 확인해 보세요.`,
    ]))}</p>
    ${programChips(nm)}
    ${callout()}`;

  const secBooking = `
    <h2>${esc(nm)} 배관공사·하수구막힘 예약 문의 방법</h2>
    <p>${esc(vpick(vb, "booking", [
      `${nm}에서 배관·하수구 작업을 의뢰할 때는 원하는 하위 지역, 막힌 위치·증상, 건물 유형을 함께 전달하면 방문 가능 여부와 도착 예정 시간을 안내받을 수 있습니다. 처음이라면 지역 확인 → 증상·건물 유형 알림 → 작업 방식·범위 확인 → 예약 문의 순서로 진행하면 됩니다. 사진·영상을 함께 보내면 원인 파악이 빨라지고, 야간·긴급 작업 가능 여부도 미리 확인해 두면 좋습니다.`,
      `${nm} 접수는 원하는 ${childLabel}와 증상·건물 유형을 알리는 것에서 시작합니다. 방문 가능 여부와 도착 예정 시간, 예상 작업 범위를 함께 확인하고, 야간·긴급 작업 가능 여부도 미리 물어 두면 좋습니다.`,
      `${nm}에서 처음 문의한다면 ${child1} 등 지역을 먼저 정하고, 막힌 위치와 증상을 알린 뒤 작업 방식을 확인하는 순서가 편합니다. 사진·영상 전달이 가능한지 함께 알리면 안내가 빨라집니다.`,
    ]))} 안내된 정보는 참고용이며 실제 작업 조건과 비용은 현장 확인 과정에서 확정됩니다.</p>`;

  const secChecklist = `
    <h2>작업 전 확인사항</h2>
    <ul>${vsubset(vb, "check", [
      `방문 희망 지역과 방문 소요 시간`,
      `막힌 위치·증상과 물 역류 여부`,
      `건물 유형(아파트·빌라·상가·주택)과 사용 연식`,
      `이전 작업 이력과 동반 증상(냄새 등)`,
      `야간·긴급 작업 필요 여부`,
      `${childLabel}별 방문 가능 권역 차이`,
    ], 5).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;

  const secFaq = `
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`)
        .join("\n      ")}
    </div>
    ${authorBox()}
    ${ctaBtn(fullName + " 배관공사·하수구막힘")}`;

  let body;
  if (isMetro) {
    body = `
    ${bcNav(node)}
    <section class="hero"><div class="container">
      <p class="eyebrow">${esc(node.name)}</p>
      <h1>${esc(node.name)} 배관공사·하수구막힘 — ${esc(childLabel)}·동별 안내</h1>
      <p>${esc(
        node.intro ||
          `${node.name}은(는) ${childLabel}와 행정동에 따라 방문 권역과 도착 소요 시간이 달라집니다. 원하는 지역을 먼저 고르면 방문 가능 여부와 작업 방식을 더 정확히 확인할 수 있습니다.`
      )}</p>
      <div class="hero-actions">
        <a class="btn btn-gold" href="${site.phoneHref}">💬 예약 문의</a>
        <a class="btn btn-outline" href="/service/">서비스 보기</a>
      </div>
    </div></section>
    ${childSection}
    <section class="section section-alt"><div class="container prose">
      ${secFeature}${secWho}${secCompare}${secGuide}${secPrograms}${secBooking}${secChecklist}${secFaq}
    </div></section>
    ${reviewsSection()}
  ${pricingTable()}`;
  } else {
    // 본문 섹션 순서를 페이지마다 다르게(도어웨이 방지) — 도입/목록/FAQ 위치는 유지
    const pre = vshuffle(vb, "preOrder", [secWho, secCompare, secGuide]).join("");
    const post = vshuffle(vb, "postOrder", [secPrograms, secBooking, secChecklist]).join("");
    body = `
    ${bcNav(node)}
    <article class="section-tight"><div class="container prose">
      <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(metro)}</p>
      <h1>${esc(fullName)} 배관공사·하수구막힘 방문 안내</h1>
      ${secFeature}${pre}
      ${childSection}
      ${post}${secFaq}
    </div></article>
    ${reviewsSection()}
  ${pricingTable()}`;
  }

  return {
    path: node.url,
    file: node.url.replace(/^\//, "").replace(/\/$/, "") + "/index.html",
    html: layout({
      ...branchMeta(fullName, childLabel),
      path: node.url,
      body,
      structuredData: [
        faqLd(faqs),
        articleLd({
          headline: `${fullName} 배관공사·하수구막힘 방문 안내`,
          description: `${fullName} 배관공사·하수구막힘 방문 안내`,
          path: node.url,
          modified: MODIFIED,
        }),
        pricingLd(),
      ],
      breadcrumb: crumb(node),
    }),
  };
}

function collect(node, out) {
  if (node.kind === "dong") out.push(dongPage(node));
  else {
    out.push(branchPage(node));
    for (const k of node.children || []) collect(k, out);
  }
}

// 지역 트리 전체 빌드
export function buildRegionTree(root) {
  normalize(root, [], null);
  const pages = [];
  collect(root, pages);
  return pages;
}

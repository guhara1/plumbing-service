// 전국 지하철 노선/역 페이지 생성기 (권역 시스템별)
// - 시스템(수도권/부산/대구/광주/대전 등)별 레지스트리 → 같은 도시 내에서만 환승 통합
// - 도시 간 동일 역명(서울 시청 ≠ 부산 시청)은 별개 페이지로 분리, 메타 고유화
// - /subway/(인덱스) → /subway/line/{노선}/ → /subway/{역}/ (역 정규 페이지)
import { layout, esc, faqLd, articleLd, pricingTable, pricingLd, reviewsSection } from "../src/templates/layout.mjs";
import { site } from "../data/site.mjs";
import { programBySlug } from "../data/programs.mjs";
import { slugify } from "./romanize.mjs";
import { vpick, vsubset, vshuffle, vflag } from "./variants.mjs";

const MODIFIED = "2026-06-21";
const PROGRAM_PICKS = ["drain", "sink", "toilet", "pipe", "bathroom-drain"];
const phone = site.phone;

function seed(str) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
const pick = (s, arr) => arr[s % arr.length];
let _lineBySlug = {};

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
const ctaBtn = (label) => `<p><a class="btn btn-primary" href="${site.phoneHref}">💬 ${esc(label)} 예약 문의</a></p>`;
function programChips(place) {
  const pre = place ? `${place} ` : "";
  return `<div class="link-cloud">${PROGRAM_PICKS.map((slug) => `<a href="/service/${slug}/">${esc(pre + programBySlug[slug].label)}</a>`).join("")}</div>`;
}
const crumb = (parts) => parts.map(([name, url]) => ({ name, url: url || "" }));

// 역 타이틀·디스크립션 변형 (역명 + 노선명으로 도시 간 동명역까지 고유화)
function stationMeta(station, l1) {
  const s = seed("st|" + l1 + "|" + station);
  // 타이틀은 무조건 '역명 + 배관공사·하수구막힘'으로 시작
  const titles = [
    `${station} 배관공사·하수구막힘 방문 안내 — ${l1} | ${site.name}`,
    `${station} 배관공사·하수구막힘 안내 · ${l1} | ${site.name}`,
    `${station} 배관공사·하수구막힘 방문 접수 (${l1}) | ${site.name}`,
    `${station} 배관공사·하수구막힘 안내 가이드 — ${l1} | ${site.name}`,
  ];
  const descs = [
    `${l1} ${station} 인근 배관공사·하수구막힘 방문 권역과 작업 전 확인 안내.`,
    `${station}(${l1})에서 배관공사·하수구막힘 작업 시 볼 방문·접수 기준 안내.`,
    `${l1} ${station} 인근 하수구막힘·배관 작업 흐름과 비용 기준·접수 안내.`,
    `${station}(${l1}) 배관공사·하수구막힘 확인사항과 인접역 정보 안내.`,
    `${l1} ${station} 기준 배관공사·하수구막힘 방문·접수 안내입니다.`,
  ];
  return { title: titles[s % titles.length], description: descs[(s >>> 2) % descs.length].slice(0, 80) };
}

// ---------- 역 페이지(정규) ----------
function stationPage(reg, sys) {
  const station = reg.name;
  const lineNames = reg.lines.map((l) => l.lineName);
  const l1 = lineNames[0];
  const isTransfer = reg.lines.length > 1;
  const sysName = sys.name; // 부산/대구/대전 등 — 동명역 구분 핵심

  const neigh = [];
  for (const l of reg.lines) {
    const line = _lineBySlug[l.lineSlug];
    if (line.stations[l.idx - 1]) neigh.push(line.stations[l.idx - 1]);
    if (line.stations[l.idx + 1]) neigh.push(line.stations[l.idx + 1]);
  }
  const uniqNeigh = [...new Set(neigh)].slice(0, 6);
  const neighText = uniqNeigh.length ? uniqNeigh.join("·") : "인근 역";
  const n1 = uniqNeigh[0] || "인근 역";
  const lineText = lineNames.join("·");
  const pos = reg.lines[0].idx; // 노선 내 위치
  const lineLen = (_lineBySlug[reg.lines[0].lineSlug].stations || []).length;
  const where = pos <= 2 ? "노선 초입" : pos >= lineLen - 3 ? "노선 끝자락" : "노선 중간 구간";

  // 변형 base: 시스템·노선·역명을 모두 포함 → 동명역(부산 교대 ≠ 대구 교대)도 분기
  const vb = "ST␟" + sys.id + "␟" + l1 + "␟" + station;

  // ── 개요 문단 (독립 슬롯 3개 조합) ──
  const openA = vpick(vb, "openA", [
    `${station}은(는) ${sysName} ${lineText}이(가) 지나는 지하철역입니다.`,
    `${sysName} ${lineText}의 ${station} 일대는 상가·주거가 섞여 배관·하수구 문의가 꾸준한 역세권입니다.`,
    `${station}은(는) ${sysName} 도심을 잇는 ${lineText} 위의 역으로, 인근 배관공사·하수구막힘 접수가 이어집니다.`,
    `${sysName} 지하철 ${lineText}에서 ${station}은(는) ${where}에 자리한 역입니다.`,
    `${station}은(는) ${sysName} 생활권을 잇는 ${lineText} 역세권의 한 축입니다.`,
  ]);
  const openB = vpick(vb, "openB", [
    `${isTransfer ? `${reg.lines.length}개 노선이 만나는 환승역이라 여러 방향에서 접근이 쉽고, ` : `단일 노선 역이라 동선이 단순한 편이고, `}인접역으로는 ${neighText} 등이 가깝습니다.`,
    `${n1} 방면과 맞닿아 있어 ${station} 인근은 ${isTransfer ? "환승 수요까지 더해져 " : ""}이동 동선이 다양합니다.`,
    `인접한 ${neighText} 구간과 이어져, 출발지에 따라 ${station}까지의 방문 동선이 달라집니다.`,
    `${where}에 있는 만큼 ${neighText} 등 인접역과 묶어 권역을 살피면 방문 안내를 잡기 쉽습니다.`,
  ]);
  const openC = vpick(vb, "openC", [
    `${station} 인근에서 배관공사나 하수구막힘이 생겼을 때는 방문 권역과 도착 소요 시간을 먼저 확인하는 것이 좋습니다.`,
    `${station} 주변에서 배관·하수구 작업을 맡기려면 권역과 도착 시간을 접수 단계에서 맞춰 보는 것이 정확합니다.`,
    `${station} 역세권은 출발지에 따라 도착 시간이 달라질 수 있어, 막힌 위치와 증상을 미리 정리해 두면 안내가 빠릅니다.`,
    `${station}에서 작업을 맡기려는 분들은 같은 ${sysName} 안에서도 권역에 따라 도착 시간 차이가 있다는 점을 염두에 두면 좋습니다.`,
  ]);

  // ── '이런 경우' 불릿 풀 (6개 중 4개 선택, 순서도 셔플) ──
  const whoBullets = vsubset(vb, "who", [
    `${station} 인근 상가·음식점에서 주방 하수구막힘이나 기름 누적으로 역류가 반복되는 경우`,
    `퇴근 후나 늦은 시간에 ${station} 주변에서 변기·싱크대 막힘을 급히 처리하고 싶은 경우`,
    `${lineText} 역세권 주거 인근에서 욕실·세면대 배수가 느리거나 노후 배관 누수가 의심되는 경우`,
    `${sysName} 안에서 ${station} 인근 건물의 배관 점검·내시경 확인이 필요한 경우`,
    `처음이라 막힘 정도를 모르고 우선 현장 점검부터 받아 보고 싶은 경우`,
    `${n1} 등 인접역까지 동선을 두고 ${station} 권역 방문 가능 여부를 함께 확인하려는 경우`,
  ], 4);

  // ── 확인할 점 문단 + 불릿 ──
  const checkPara = vpick(vb, "checkP", [
    `표시된 정보나 비용은 변동될 수 있으므로, 방문 가능 여부·작업 범위·총 비용은 접수 단계에서 직접 확인하는 것이 좋습니다. ${station} 인근이라도 실제 방문 권역과 도착 시간은 출발지에 따라 다릅니다.`,
    `${station}처럼 ${where}에 있는 역은 같은 ${sysName} 안에서도 권역에 따라 도착 시간이 달라집니다. 접수 시 위치·증상·건물 유형을 함께 알리면 안내가 정확합니다.`,
    `역 인근이라고 해서 모든 권역이 같은 조건은 아닙니다. ${station} 기준 방문 가능 권역과 비용은 현장 구조·막힘 정도에 따라 달라지므로 접수 과정에서 확인하는 것이 좋습니다.`,
  ]);
  const checkBullets = vsubset(vb, "check", [
    `${station} 인근 방문 가능 권역과 도착 소요 시간`,
    `막힌 위치(싱크대·변기·욕실·세면대 등)와 증상`,
    `역류·냄새 등 동반 증상과 여러 배수구 동시 막힘 여부`,
    `건물 유형(아파트·빌라·상가·주택)과 사용 연식`,
    `야간·긴급 작업 가능 여부와 추가 요금`,
    `증상 사진 전달 여부와 ${lineText} 이동 동선에 따른 방문 시간대`,
  ], 5);

  // ── 작업 방식 문단 ──
  const comparePara = vpick(vb, "compare", [
    `가벼운 이물질 막힘은 스프링(관통기)으로, 기름·찌꺼기가 관 벽에 두껍게 쌓인 경우는 고압세척으로 접근합니다. 원인이 안 보이거나 반복되면 배관내시경으로 내부를 확인하고, 노후 배관 누수는 부분 교체나 라인 정비로 안내합니다.`,
    `${station} 인근에서는 현장 점검 → 배관내시경 확인 → 스프링·고압세척·교체 중 적합한 방식 → 마무리 흐름 확인 순으로 진행합니다. 막힘 정도와 위치를 먼저 확인하면 불필요한 작업 없이 필요한 만큼만 처리할 수 있습니다.`,
    `처음이라면 현장에서 막힘 위치와 정도를 확인한 뒤, 단순 막힘은 뚫음으로, 누적·노후 문제는 고압세척이나 부분 교체로 접근합니다. 이동 없이 ${station} 인근에서 점검부터 받아 보고 작업 범위를 정하는 방식이 좋습니다.`,
  ]);

  // ── 작업 흐름 문단 ──
  const flowPara = vpick(vb, "flow", [
    `접수 시 ${station} 인근 위치와 막힌 위치·증상·건물 유형을 전달하면, 방문 가능 여부와 도착 예정 시간을 안내받게 됩니다. 현장에서는 점검 → 배관내시경 → 스프링/고압세척/교체 → 마무리 흐름 확인 순으로 진행하며, 작업 범위는 현장 구조에 맞춰 정합니다.`,
    `${station}에서의 접수는 위치·증상 전달 → 방문 가능 여부와 작업 범위 확인 → 현장 점검 → 작업 → 마무리 확인 순으로 진행하면 매끄럽습니다. 역류·냄새 같은 동반 증상과 사진을 미리 전달해 두면 도착 후 작업이 빨라집니다.`,
    `먼저 ${station} 인근 위치와 증상을 정해 문의하면 도착 예정 시간을 안내받을 수 있습니다. 야간·긴급 작업을 원한다면 가능 여부와 추가 요금을 함께 확인해 두세요.`,
  ]);

  // ── FAQ 답변 풀 ──
  const faqs = [
    { q: `${station} 인근에서 하수구막힘은 어떻게 접수하나요?`, a: vpick(vb, "fa1", [
      `${station} 인근 위치와 막힌 위치·증상을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 정확한 비용은 현장 구조·막힘 정도에 따라 달라져 현장 확인 후 안내합니다.`,
      `${sysName} ${l1} ${station} 인근이라고 알리고 막힌 위치(싱크대·변기·욕실 등)와 증상을 전달하면 도착 예정 시간을 안내받습니다. 야간·긴급 여부도 미리 확인하세요.`,
    ]) },
    { q: `${station}에서 배관내시경·고압세척도 가능한가요?`, a: vpick(vb, "fa2", [
      `네, ${station} 인근에서 막힘이 반복되거나 원인이 보이지 않으면 배관내시경으로 내부를 확인하고, 기름·찌꺼기 누적은 고압세척으로 관 벽을 씻어 냅니다. 현장 점검 후 필요한 방식을 안내합니다.`,
      `${station} 인근에서도 스프링 뚫음 외에 고압세척, 배관내시경 점검을 진행할 수 있습니다. 막힘 정도와 배관 상태에 따라 적합한 방식을 현장에서 정합니다.`,
    ]) },
    { q: `${station}까지 방문에 얼마나 걸리나요? 야간·긴급도 되나요?`, a: vpick(vb, "fa3", [
      `출발지와 시간대, 역 인근 권역에 따라 달라집니다. 야간·긴급 작업 가능 여부와 추가 요금은 접수 시 함께 확인하는 것이 좋습니다.`,
      `${where}에 있는 ${station}은(는) 출발지와 교통 상황에 따라 도착 시간이 달라집니다. 접수 시 위치를 알리면 예상 소요 시간과 야간·긴급 가능 여부를 안내받을 수 있습니다.`,
    ]) },
  ];

  const lineLinks = reg.lines.map((l) => `<a href="/subway/line/${l.lineSlug}/">${esc(l.lineName)}</a>`).join("");
  const neighLinks = uniqNeigh.map((n) => `<a href="/subway/${sys.reg.get(n).slug}/">${esc(n)}</a>`).join("");

  // ── 중간 섹션을 페이지마다 다른 순서로 배치 ──
  const secOverview = `
    <h2>${esc(station)} 역세권 개요</h2>
    <p>${esc(openA)} ${esc(openB)}</p>
    <p>${esc(openC)} 표시된 정보나 비용은 변동될 수 있어, 실제 방문 가능 여부와 비용은 현장 확인 후 안내하는 것이 정확합니다.</p>`;
  const secWho = `
    <h2>${esc(station)} 인근에서 배관공사·하수구막힘을 찾는 경우</h2>
    <ul>${whoBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secCheck = `
    <h2>${esc(station)} 작업 전 확인사항</h2>
    <p>${esc(checkPara)}</p>
    <ul>${checkBullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    ${callout()}`;
  const secCompare = `
    <h2>${esc(station)} 인근에서 진행하는 작업 방식</h2>
    <p>${esc(comparePara)}</p>
    ${programChips(station)}`;
  const secFlow = `
    <h2>${esc(station)} 배관공사·하수구막힘 작업 흐름</h2>
    <p>${esc(flowPara)}</p>`;
  const secTips = `
    <h2>${esc(station)} 역세권에서 자주 발생하는 배관·하수구 문제</h2>
    <p>${esc(vpick(vb, "tipA", [
      `${station} 인근 상가·음식점 밀집 구간에서는 주방 하수구막힘과 기름 누적으로 인한 역류가 자주 발생합니다. 관 벽에 굳은 기름은 단순 뚫음으로 한계가 있어 고압세척으로 관 벽을 씻어 내는 편이 재발을 줄입니다.`,
      `${station} 주거 인근에서는 욕실·세면대 배수 지연, 머리카락·비누때 누적, 노후 배관 누수가 흔합니다. 트랩 청소로 풀리는 경우도 있지만 깊은 곳이 원인이면 배관내시경으로 위치를 확인하는 것이 정확합니다.`,
      `${lineText} 역세권은 상가와 주거가 섞여 있어 주방 하수구막힘부터 변기·세면대 막힘, 배관 누수까지 증상이 다양합니다. 막힌 위치와 정도에 따라 작업 방식이 달라지므로 현장 점검을 먼저 권합니다.`,
      `${station} 인근 노후 건물에서는 여러 배수구가 동시에 느려지거나 역류하는 경우가 있습니다. 이때는 세대 배관이 아니라 본관·공용관 문제일 수 있어, 현장에서 증상 범위를 확인해 작업 위치를 정합니다.`,
    ]))}</p>
    <p>${esc(vpick(vb, "tipB", [
      `${station}에서 작업을 맡길 때는 막힌 위치, 역류·냄새 같은 증상, 건물 유형을 미리 정리해 두면 진행이 매끄럽습니다. 야간·긴급 시간대는 가능 여부와 추가 요금이 달라질 수 있으니 접수 시 함께 확인하세요.`,
      `${station} 인근에서 증상 사진을 미리 전달하면 도착 후 작업 방향을 빠르게 잡을 수 있습니다. 늦은 시간대 방문은 도착 시간이 길어질 수 있어, 원하는 시간을 미리 알려 두는 것이 좋습니다.`,
      `${station} 인근에서 야간·긴급 작업을 생각한다면 가능 여부와 추가 요금, 도착 소요 시간을 접수 단계에서 확인해 두면 당일 진행이 매끄럽습니다.`,
      `${station}에서 처음 작업을 맡긴다면 출입 방법과 주차, 공용 배관일 경우 관리실 확인 필요 여부를 접수 시 미리 맞춰 두면 도착 후 바로 점검을 시작할 수 있어 시간을 아낄 수 있습니다.`,
    ]))}</p>`;

  const middle = vshuffle(vb, "order", [secWho, secCheck, secCompare, secFlow, secTips]).join("\n");

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/subway/">지하철역별 안내</a><span>›</span><a href="/subway/line/${reg.lines[0].lineSlug}/">${esc(l1)}</a><span>›</span>${esc(station)}
  </nav>
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(sys.name)} 지하철 · ${esc(lineText)}</p>
    <h1>${esc(station)} 배관공사·하수구막힘 방문 안내</h1>
    ${secOverview}
    ${middle}

    <h2>${esc(station)} 노선·인접역</h2>
    <p>${esc(station)}이(가) 속한 ${esc(lineText)}과(와) ${esc(neighText)} 등 인접역을 함께 확인하면 이동 동선에 맞는 안내를 받기 좋습니다.</p>
    <div class="link-cloud">${lineLinks}${neighLinks}</div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n      ")}
    </div>
    ${authorBox()}
    ${ctaBtn(station + " 배관공사·하수구막힘")}
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const path = `/subway/${reg.slug}/`;
  return {
    path,
    file: `subway/${reg.slug}/index.html`,
    html: layout({
      ...stationMeta(station, l1),
      path,
      body,
      structuredData: [
        faqLd(faqs),
        articleLd({ headline: `${station} 배관공사·하수구막힘 방문 안내`, description: `${l1} ${station} 인근 배관공사·하수구막힘 방문 작업 안내`, path, modified: MODIFIED }),
        pricingLd(),
      ],
      breadcrumb: crumb([["홈", "/"], ["지하철역별 안내", "/subway/"], [l1, `/subway/line/${reg.lines[0].lineSlug}/`], [station, path]]),
    }),
  };
}

// ---------- 노선 페이지 ----------
function linePage(line, sys) {
  const stationLinks = line.stations.map((st) => `<a href="/subway/${sys.reg.get(st).slug}/">${esc(st)}</a>`).join("");
  const area = line.area || sys.name;
  const cnt = line.stations.length;
  const first = line.stations[0] || "";
  const last = line.stations[cnt - 1] || "";
  const mid = line.stations[Math.floor(cnt / 2)] || "";
  const vb = "LN␟" + sys.id + "␟" + line.name;

  const intro = vpick(vb, "intro", [
    `${line.name}은(는) ${area}을(를) 지나는 노선으로 ${cnt}개 역을 운행합니다. 같은 노선이라도 역에 따라 방문 권역과 도착 소요 시간이 달라지므로, 원하는 역을 먼저 고르면 배관공사·하수구막힘 안내를 더 정확히 확인할 수 있습니다.`,
    `${first}에서 ${last}까지 ${cnt}개 역을 잇는 ${line.name}은(는) ${area} 일대를 지납니다. 역마다 인근 권역이 달라, ${mid} 같은 중간 구간을 포함해 원하는 역을 먼저 정하면 안내가 빨라집니다.`,
    `${sys.name} ${line.name}은(는) ${area}을(를) 따라 ${cnt}개 역이 이어지는 노선입니다. 노선이 지나는 지역과 환승역을 함께 고려하면 이동 동선에 맞는 역을 고르기 쉽습니다.`,
    `${line.name}은(는) ${area}을(를) 관통하며 ${first}·${mid}·${last} 등 ${cnt}개 역을 지납니다. 역별로 배관공사·하수구막힘 방문 권역이 다르니 가까운 역부터 살펴보세요.`,
  ]);
  const compare = vpick(vb, "compare", [
    `가벼운 막힘은 스프링 뚫음, 기름·찌꺼기 누적은 고압세척, 원인 불명·반복 막힘은 배관내시경, 노후 배관 누수는 부분 교체·라인 정비로 접근합니다. 증상과 위치에 따라 적합한 방식이 달라집니다.`,
    `${line.name} 인근에서는 하수구막힘·싱크대막힘·변기막힘 같은 막힘 작업부터 배관공사·누수 보수, 고압세척까지 증상에 맞게 진행합니다. 막힌 위치를 먼저 확인하면 작업이 정확합니다.`,
    `막힘 정도와 위치에 따라 스프링(가벼운 막힘), 고압세척(기름 누적), 배관내시경(원인 확인), 부분 교체(노후·누수) 중에서 현장 점검 후 선택합니다.`,
  ]);
  const useGuide = vpick(vb, "use", [
    `역세권에서 배관공사나 하수구막힘을 접수할 때는 원하는 역, 막힌 위치·증상, 건물 유형을 함께 전달하면 방문 가능 여부와 도착 예정 시간을 안내받을 수 있습니다. 노선이 길수록 역마다 권역이 다르니, 가까운 역을 먼저 정해 두면 접수와 안내가 한결 빠릅니다.`,
    `${line.name} 접수는 역 선택 → 증상·위치 전달 → 방문 가능 여부와 작업 범위 확인 → 현장 점검·작업 순으로 진행하면 매끄럽습니다. ${first}·${last} 등 끝 구간은 도심과 도착 시간이 다를 수 있어 미리 확인해 두면 좋습니다.`,
    `먼저 ${line.name}에서 가까운 역을 정하고 막힌 위치·증상을 전달하면 도착 예정 시간을 안내받을 수 있습니다. 야간·긴급 작업 가능 여부와 추가 요금도 함께 확인하세요.`,
  ]);
  const cmp2 = vpick(vb, "cmp2", [
    `단순 막힘은 현장에서 뚫음·세척으로 끝나는 경우가 많지만, 막힘이 반복되거나 노후 배관 누수가 의심되면 배관내시경 점검 후 부분 교체나 라인 정비가 필요할 수 있습니다. ${line.name} 인근에서도 증상에 따라 작업 깊이가 달라집니다.`,
    `${line.name} 역세권에서는 가벼운 하수구막힘과, 관 벽에 굳은 기름·노후 배관 문제를 구분해 접근합니다. 전자는 뚫음·세척으로, 후자는 고압세척·내시경·교체로 재발을 줄이는 방향으로 진행합니다.`,
    `핵심 차이는 ‘막힘만 뚫으면 되는지, 배관 상태를 점검해야 하는지’입니다. ${line.name} 인근에서 반복 막힘이나 누수는 내시경으로 원인 구간을 먼저 확인하는 것이 정확합니다.`,
  ]);

  const faqs = [
    { q: `${line.name} 어느 역에서 배관공사·하수구막힘을 맡길 수 있나요?`, a: vpick(vb, "fa1", [
      `${line.name} 각 역 인근에서 방문 가능 여부를 확인할 수 있습니다. 위 역 목록에서 원하는 역을 선택한 뒤 접수 시 위치와 증상을 알리면 됩니다.`,
      `${first}부터 ${last}까지 ${line.name} 각 역세권에서 확인할 수 있습니다. 원하는 역을 고르고 접수 시 위치·증상을 알리면 방문 가능 여부를 안내받습니다.`,
    ]) },
    { q: `${line.name}에서 배관내시경·고압세척도 가능한가요?`, a: vpick(vb, "fa2", [
      `네, 막힘이 반복되거나 원인이 보이지 않으면 배관내시경으로 내부를 확인하고, 기름·찌꺼기 누적은 고압세척으로 관 벽을 씻어 냅니다. 역 인근이 방문 가능 권역인지 접수 시 확인하면 됩니다.`,
      `${line.name} 역 인근에서도 스프링 뚫음 외에 고압세척, 배관내시경 점검을 진행할 수 있습니다. 막힘 정도에 따라 현장에서 방식을 정합니다.`,
    ]) },
    { q: `접수는 어떻게 하나요?`, a: `원하는 역과 막힌 위치·증상·건물 유형을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 정확한 비용은 현장 확인 후 안내합니다.` },
  ];

  const secStations = `
    <h2>${esc(line.name)} 역에서 찾기</h2>
    <p>아래에서 역을 선택하면 해당 역 인근의 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다.</p>
    <div class="link-cloud">${stationLinks}</div>`;
  const secCompare = `
    <h2>${esc(line.name)} 인근에서 진행하는 작업 방식</h2>
    <p>${esc(compare)}</p>
    ${programChips(line.name)}
    ${callout()}`;
  const secWho = `
    <h2>${esc(line.name)} 인근에서 배관공사·하수구막힘을 찾는 경우</h2>
    <ul>${vsubset(vb, "who", [
      `${line.name} 역세권 상가·음식점에서 주방 하수구막힘·기름 누적 역류가 반복되는 경우`,
      `퇴근 후나 늦은 시간에 노선 인근에서 변기·싱크대 막힘을 급히 처리하고 싶은 경우`,
      `주거 인근에서 욕실·세면대 배수 지연이나 노후 배관 누수가 의심되는 경우`,
      `반복 막힘·원인 불명으로 배관내시경 점검이 필요한 경우`,
      `${first}·${last} 등 노선 양 끝 구간에서 건물 배관 점검·작업을 맡기려는 경우`,
    ], 4).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secUse = `
    <h2>${esc(line.name)} 방문·이동 안내</h2>
    <p>${esc(useGuide)}</p>`;
  const secCheck = `
    <h2>작업 전 확인사항</h2>
    <ul>${vsubset(vb, "check", [
      `방문 희망 역과 인근 방문 소요 시간`,
      `막힌 위치(싱크대·변기·욕실·세면대 등)와 증상`,
      `역류·냄새 등 동반 증상과 여러 배수구 동시 막힘 여부`,
      `건물 유형(아파트·빌라·상가·주택)과 공용 배관 여부`,
      `야간·긴급 작업 가능 여부와 추가 요금`,
      `증상 사진 전달 여부와 ${line.name} 이동 동선에 따른 방문 시간대`,
    ], 5).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secCmp2 = `
    <h2>${esc(line.name)} 단순 막힘과 배관 점검 구분</h2>
    <p>${esc(cmp2)} 어떤 방식이 맞을지는 증상과 배관 상태에 따라 달라집니다.</p>`;

  const middle = vshuffle(vb, "order", [secCompare, secWho, secUse, secCheck, secCmp2]).join("\n");

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/subway/">지하철역별 안내</a><span>›</span>${esc(line.name)}
  </nav>
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">${esc(sys.name)} 지하철</p>
    <h1>${esc(line.name)} 배관공사·하수구막힘 — 역별 안내</h1>
    <p>${esc(intro)}</p>
    ${secStations}
    ${middle}

    <h2>지역·서비스와 함께 보기</h2>
    <p>노선 인근 지역과 배관·하수구 서비스를 함께 확인하면 선택 기준을 잡기 쉽습니다.</p>
    <div class="link-cloud">
      <a href="/area/seoul/">서울</a><a href="/area/gyeonggi/">경기</a><a href="/area/incheon/">인천</a><a href="/area/busan/">부산</a>
      <a href="/service/drain/">하수구막힘</a><a href="/service/pipe/">배관공사</a><a href="/service/sink/">싱크대막힘</a><a href="/guide/">예약 가이드</a>
    </div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("\n      ")}
    </div>
    ${authorBox()}
    ${ctaBtn(line.name + " 배관공사·하수구막힘")}
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const path = `/subway/line/${line.slug}/`;
  return {
    path,
    file: `subway/line/${line.slug}/index.html`,
    html: layout({
      title: `${line.name} 배관공사·하수구막힘 — 역별 안내 | ${site.name}`,
      description: `${line.name} 역별 배관공사·하수구막힘 방문 권역과 작업 전 확인 사항을 정리했습니다.`.slice(0, 80),
      path,
      body,
      structuredData: [faqLd(faqs), articleLd({ headline: `${line.name} 배관공사·하수구막힘 — 역별 안내`, description: `${line.name} 역별 배관공사·하수구막힘 방문 안내`, path, modified: MODIFIED }), pricingLd()],
      breadcrumb: crumb([["홈", "/"], ["지하철역별 안내", "/subway/"], [line.name, path]]),
    }),
  };
}

// ---------- 지하철 인덱스 ----------
function subwayIndex(systems, stationCount, lineCount) {
  const sections = systems.map((sys) => {
    const cards = sys.lines.map((l) => `<a class="card" href="/subway/line/${l.slug}/">
        <h3>${esc(l.name)}</h3>
        <p>${esc(l.area || sys.name)} · ${l.stations.length}개 역</p>
      </a>`).join("\n      ");
    return `<div class="section-head" style="margin-top:var(--sp-6)"><span class="eyebrow">${esc(sys.name)} 지하철</span></div>
    <div class="grid grid-3">${cards}</div>`;
  }).join("\n");
  const body = `
  <section class="hero"><div class="container">
    <p class="eyebrow">지하철역별 안내</p>
    <h1>지하철역별 배관공사·하수구막힘 안내</h1>
    <p>수도권·부산·대구·광주·대전 등 전국 지하철 노선과 역 기준으로 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다. 노선을 고른 뒤 가까운 역을 선택하면 역세권 안내를 볼 수 있습니다. (총 ${lineCount}개 노선·${stationCount}개 역)</p>
    <div class="hero-actions">
      <a class="btn btn-gold" href="${site.phoneHref}">💬 예약 문의</a>
      <a class="btn btn-outline" href="/area/">지역별 안내</a>
    </div>
  </div></section>
  <section class="section"><div class="container">
    ${sections}
  </div></section>
  <section class="section section-alt"><div class="container prose">
    <h2>지하철역 기준으로 찾는 방법</h2>
    <p>전국 지하철은 노선마다 지나는 지역과 분위기가 다릅니다. 노선을 먼저 고른 뒤 가까운 역을 선택하면, 해당 역세권 기준으로 배관공사·하수구막힘 방문 권역과 작업 안내를 확인할 수 있습니다. 같은 역이라도 출발지에 따라 방문 소요 시간이 달라지므로, 원하는 역과 시간대를 정해 두면 안내가 빠릅니다.</p>
    <p>작업 방식은 가벼운 막힘(스프링 뚫음), 기름·찌꺼기 누적(고압세척), 원인 불명·반복 막힘(배관내시경), 노후 배관 누수(부분 교체·정비)로 나눠 보면 이해가 쉬워집니다. 상가·음식점 밀집 역세권은 주방 하수구막힘이, 주거 인근은 욕실·싱크대 배수와 노후 배관 문제가 상대적으로 잦습니다.</p>
    ${callout()}
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      <details><summary>지하철역 기준으로 어떻게 접수하나요?</summary><p>원하는 노선과 역을 고른 뒤 역 인근 위치·막힌 위치·증상·건물 유형을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다.</p></details>
      <details><summary>역 인근에서 고압세척·배관내시경도 되나요?</summary><p>막힘이 반복되거나 원인이 보이지 않으면 배관내시경으로 내부를 확인하고, 기름·찌꺼기 누적은 고압세척으로 진행합니다. 역 인근이 방문 가능 권역인지 접수 시 확인하면 됩니다.</p></details>
      <details><summary>어느 지역까지 가능한가요?</summary><p>노선·역마다 방문 권역이 다를 수 있습니다. 역을 선택하고 접수 시 위치를 알리면 됩니다. 정확한 비용은 현장 확인 후 안내합니다.</p></details>
    </div>
    ${authorBox()}
  </div></section>`;
  return {
    path: "/subway/",
    file: "subway/index.html",
    html: layout({
      title: `지하철역별 배관공사·하수구막힘 안내 | ${site.name}`,
      description: "전국 지하철 역세권별 배관공사·하수구막힘 방문 안내를 확인하세요.",
      path: "/subway/",
      body,
      breadcrumb: crumb([["홈", "/"], ["지하철역별 안내", "/subway/"]]),
    }),
  };
}

export function buildSubwayPages(systems) {
  // 노선 슬러그 + 전역 노선 맵
  _lineBySlug = {};
  for (const sys of systems) {
    for (const l of sys.lines) { l.slug = l.slug || slugify(l.name); _lineBySlug[l.slug] = l; }
  }
  // 시스템별 역 레지스트리 + 전역 슬러그 중복 방지
  const usedSlugs = new Set();
  let stationCount = 0, lineCount = 0;
  for (const sys of systems) {
    sys.reg = new Map();
    for (const line of sys.lines) {
      lineCount++;
      line.stations.forEach((st, idx) => {
        let r = sys.reg.get(st);
        if (!r) { r = { name: st, lines: [] }; sys.reg.set(st, r); }
        r.lines.push({ lineName: line.name, lineSlug: line.slug, idx });
      });
    }
    for (const r of sys.reg.values()) {
      let base = slugify(r.name.replace(/역$/, "")) || "station";
      if (sys.id !== "sudogwon") base = sys.id + "-" + base;
      let sg = base, n = 2;
      while (usedSlugs.has(sg)) sg = base + "-" + n++;
      usedSlugs.add(sg);
      r.slug = sg;
    }
    stationCount += sys.reg.size;
  }
  const pages = [subwayIndex(systems, stationCount, lineCount)];
  for (const sys of systems) {
    for (const line of sys.lines) pages.push(linePage(line, sys));
    for (const r of sys.reg.values()) pages.push(stationPage(r, sys));
  }
  return pages;
}

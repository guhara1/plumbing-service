// 서울 계층(광역 → 자치구 → 행정동) 페이지 생성기
// - 각 페이지 2000~2500자 목표
// - 구별 실제 정보(역·랜드마크·특징) + 동별 인접 동 목록을 주입해 고유성 확보
import { layout, esc, faqLd, articleLd, pricingTable, pricingLd, reviewsSection } from "../src/templates/layout.mjs";
import { site } from "../data/site.mjs";
import { programBySlug } from "../data/programs.mjs";
import { seoul } from "../data/seoul.mjs";
import { slugify } from "./romanize.mjs";
import { dongMeta, branchMeta } from "./region-tree.mjs";
import { vpick, vsubset, vshuffle } from "./variants.mjs";

const MODIFIED = "2026-06-21";
const PROGRAM_PICKS = ["drain", "sink", "toilet", "pipe", "bathroom-drain"];

// 문자열 → 안정적 정수 시드
function seed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
const pick = (s, arr) => arr[s % arr.length];

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

// 롱테일 서비스 링크 (place 지정 시 '지역 하수구막힘' 형태)
function programChips(place) {
  const pre = place ? `${place} ` : "";
  return `<div class="link-cloud">${PROGRAM_PICKS.map((slug) => {
    const p = programBySlug[slug];
    return `<a href="/service/${slug}/">${esc(pre + p.label)}</a>`;
  }).join("")}</div>`;
}

const phone = site.phone;
const ctaBtn = (label) =>
  `<p><a class="btn btn-primary" href="${site.phoneHref}">💬 ${esc(label)} 예약 문의</a></p>`;

function callout() {
  return `<div class="callout">표시된 정보와 가격은 변동될 수 있으므로, <strong>실제 비용은 현장 구조·막힘 상태에 따라 달라집니다.</strong> 정확한 금액은 현장 확인 후 안내합니다.</div>`;
}

// ---------- 동 페이지 ----------
function dongPage(gu, dongName, siblings) {
  const s = seed(gu.name + dongName);
  const guSlug = gu.slug;
  const dongSlug = gu.dongSlug[dongName];
  const path = `/area/seoul/${guSlug}/${dongSlug}/`;
  const stationText = gu.stations.slice(0, 3).join("·");
  const landmarkText = gu.landmarks.slice(0, 3).join("·");
  const near = siblings.filter((d) => d !== dongName).slice(0, 5);
  const nearText = near.length ? near.join("·") : gu.name + " 일대";

  const vb = "SDG␟서울␟" + gu.name + "␟" + dongName;
  const openA = vpick(vb, "openA", [
    `${dongName}은(는) 서울 ${gu.name}에 속한 행정동으로, ${gu.character}`,
    `서울 ${gu.name} ${dongName} 일대는 ${gu.character}`,
    `${gu.name} ${dongName}은(는) ${gu.character}`,
    `서울 ${gu.name}의 ${dongName}은(는) 생활 권역이 또렷한 동네로, ${gu.character}`,
    `${dongName}(서울 ${gu.name})은(는) 인근 동과 권역이 이어지는 지역으로, ${gu.character}`,
  ]);
  const demand = vpick(vb, "demand", [
    `이 일대에서 배관공사나 하수구막힘이 생겼을 때는 ${dongName}의 위치와 방문 권역, 도착 시간을 먼저 확인하는 것이 좋습니다.`,
    `${dongName}에서 하수구막힘·배관공사를 맡기려는 분들은 방문 가능 권역과 도착 소요 시간을 먼저 확인하는 경우가 많습니다.`,
    `${dongName} 인근에서 막힘·누수 문제가 생기면 같은 ${gu.name} 안에서도 권역에 따라 도착 시간이 달라질 수 있다는 점을 염두에 두면 좋습니다.`,
    `${nearText} 등과 맞닿은 ${dongName}은(는) 출발지에 따라 도착 시간이 달라질 수 있어, 막힌 위치를 정확히 알리면 안내가 빠릅니다.`,
  ]);
  const tip = vpick(vb, "tip", [
    `${dongName}처럼 주거·상가가 섞인 동네일수록 욕실·싱크대 배수부터 음식점 주방 하수구막힘까지 증상이 다양해, 막힌 위치와 증상을 미리 정리해 문의하면 안내가 빠릅니다.`,
    `${dongName}에서 처음 의뢰한다면 막힘 위치(싱크대·변기·욕실 등)와 역류·냄새 여부를 먼저 정리해 두면 작업 방식과 도착 시간을 더 빨리 안내받을 수 있습니다.`,
    `${dongName} 인근은 ${stationText} 등으로 이동이 이어지는 편이라, 방문 소요 시간은 출발지에 따라 달라질 수 있습니다.`,
  ]);
  const comparePara = vpick(vb, "compare", [
    `욕실·세면대 물빠짐이 느리다면 하수구막힘·욕실배수구 점검을, 설거지 후 역류가 잦다면 싱크대막힘을, 변기가 차오른다면 변기막힘을 먼저 확인해 보세요. 노후 배관에서 누수가 반복되면 막힘 작업이 아니라 배관공사가 필요할 수 있습니다.`,
    `${dongName} 인근에서는 싱크대·욕실 배수 막힘, 변기막힘, 노후 배관 누수까지 증상이 제각각입니다. 막힌 위치와 역류·냄새 여부를 먼저 정리하면 어떤 작업이 맞을지 판단이 쉬워집니다.`,
    `가벼운 물빠짐 지연은 하수구막힘·세면대 점검부터, 같은 곳이 반복해서 막히면 배관 상태 점검(배관공사)까지 비교해 보세요. 막힌 위치를 정확히 알리면 ${dongName} 방문 작업이 한결 수월합니다.`,
  ]);
  const flowPara = vpick(vb, "flow", [
    `접수 시 ${dongName} 위치와 막힌 곳·증상, 원하는 시간을 전달하면 방문 가능 여부와 도착 예정 시간을 안내받게 됩니다. 현장에서는 점검으로 막힌 위치를 확인한 뒤, 필요하면 배관내시경으로 내부를 보고 스프링·고압세척·교체 중 맞는 방식으로 작업합니다. 작업 후에는 물을 흘려 보내 흐름이 회복됐는지 마무리 확인을 합니다. 늦은 시간 작업을 원한다면 야간·긴급 가능 여부와 추가 요금을 미리 확인하세요.`,
    `${dongName}에서의 작업은 위치·증상 전달 → 방문 가능 여부와 도착 시간 확인 → 현장 점검 → 작업 방식 결정 → 마무리 확인 순으로 진행하면 매끄럽습니다. 반복 막힘이나 원인 불명 누수는 배관내시경으로 구간을 먼저 확인하면 불필요한 개방을 줄일 수 있습니다.`,
    `먼저 ${dongName} 위치와 막힌 위치·역류 여부를 정해 문의하면 도착 예정 시간을 안내받을 수 있습니다. 현장 점검으로 원인을 확인한 뒤 스프링·고압세척·부분 교체 중 필요한 만큼만 작업하고, 마지막에 흐름을 확인합니다. 건물 유형과 출입·주차를 미리 알려 두면 진행이 수월합니다.`,
  ]);

  const faqs = [
    {
      q: `${dongName}에서 하수구막힘은 어떻게 접수하나요?`,
      a: vpick(vb, "fa1", [
        `${dongName}(서울 ${gu.name}) 위치와 막힌 곳(싱크대·변기·욕실 등), 증상, 원하는 시간을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 정확한 비용은 현장 확인 후 안내합니다.`,
        `서울 ${gu.name} ${dongName}이라고 알리고 막힌 위치와 역류·냄새 여부를 전달하면 도착 예정 시간과 작업 방식을 안내받습니다. 사진을 함께 보내 주시면 상황 파악이 빠릅니다.`,
      ]),
    },
    {
      q: `${dongName}에서 배관공사·누수 작업도 되나요?`,
      a: vpick(vb, "fa2", [
        `네, 단순 막힘 뚫음뿐 아니라 노후 배관 누수·교체 같은 배관공사도 안내합니다. ${dongName}에서도 현장 구조를 확인한 뒤 문제 구간만 필요한 만큼 작업하는 것을 원칙으로 합니다.`,
        `반복 막힘이나 누수는 막힘 작업이 아니라 배관 점검·교체가 필요할 수 있습니다. ${dongName} 인근도 현장 점검 후 작업 범위와 함께 안내합니다.`,
      ]),
    },
    {
      q: `${dongName}까지 방문에 얼마나 걸리나요?`,
      a: vpick(vb, "fa3", [
        `출발지와 시간대, ${gu.name} 내 권역에 따라 달라집니다. 야간·긴급 작업 가능 여부와 도착 소요 시간은 접수 시 확인하는 것이 좋습니다.`,
        `${dongName}은(는) 출발지와 교통 상황에 따라 도착 시간이 달라집니다. 위치를 알리면 예상 소요 시간과 야간·긴급 가능 여부를 함께 안내받을 수 있습니다.`,
      ]),
    },
  ];

  const secOverview = `
    <h2>${esc(dongName)} 지역 개요</h2>
    <p>${esc(openA)} 인근으로는 ${esc(stationText)} 등이 가까워 이동이 이어지며, ${esc(
    landmarkText
  )} 같은 시설이 생활 권역의 기준점이 됩니다.</p>
    <p>${esc(demand)} 같은 ${esc(gu.name)} 안에서도 ${esc(
    nearText
  )} 등 인접 동과 권역이 맞닿아 있어, 막힌 위치를 정확히 알리면 방문 안내가 한결 수월합니다.</p>`;
  const secWho = `
    <h2>${esc(dongName)}에서 자주 발생하는 배관·하수구 문제</h2>
    <ul>${vsubset(vb, "who", [
      `아파트·빌라 욕실·세면대 물빠짐이 느려지거나 역류하는 경우`,
      `설거지 후 싱크대 배수가 막히거나 ‘꿀럭’ 소리와 함께 역류하는 경우`,
      `변기에 휴지·물티슈가 걸려 물이 차오르거나 안 내려가는 경우`,
      `${stationText} 인근 상가·음식점 주방 하수구가 기름·음식물로 자주 막히는 경우`,
      `노후 배관에서 누수가 반복되거나 녹물·냄새가 올라오는 경우`,
      `${nearText.split("·")[0]} 등 인접 동과 묶인 ${gu.name} 권역에서 야간·긴급 막힘이 생긴 경우`,
    ], 4).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secCheck = `
    <h2>${esc(dongName)} 작업 전 확인사항</h2>
    <p>${esc(tip)} 표시된 정보나 비용은 변동될 수 있으므로, 방문 가능 여부와 작업 범위·비용은 현장 확인 후 안내합니다.</p>
    <ul>${vsubset(vb, "check", [
      `막힌 위치(싱크대·변기·욕실·세면대 등)와 증상`,
      `역류 여부와 냄새 유무`,
      `건물 유형(아파트·빌라·상가·주택)과 사용 연식`,
      `이전에 같은 부위를 작업한 적이 있는지`,
      `야간·긴급 작업이 필요한지`,
      `상황을 보여 주는 사진 전달 가능 여부`,
    ], 5).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>
    ${callout()}`;
  const secCompare = `
    <h2>${esc(dongName)}에서 증상별로 살펴볼 작업</h2>
    <p>${esc(comparePara)}</p>
    ${programChips(dongName)}`;
  const secFlow = `
    <h2>${esc(dongName)} 방문 작업 흐름</h2>
    <p>${esc(flowPara)}</p>
    <p>${esc(vpick(vb, "flow2", [
      `${dongName}처럼 주거와 상가가 섞인 동네는 가정 욕실·싱크대 막힘부터 음식점 주방 하수구막힘까지 작업이 다양합니다. 핵심은 ‘막힌 위치와 원인을 현장에서 먼저 확인하고, 필요한 만큼만 작업’하는 것입니다.`,
      `${dongName}에서는 현장 점검 → 배관내시경 → 스프링·고압세척·교체 → 마무리 확인의 순서로 진행합니다. 무조건 뚫기보다 원인 구간을 확인해야 같은 문제의 재발을 줄일 수 있습니다.`,
      `${gu.name} ${dongName} 일대에서는 단순 막힘과 노후 배관 문제가 섞여 있는 경우가 많은데, 현장에서 구조와 원인을 확인한 뒤 작업 방식을 정하는 것이 정확합니다.`,
    ]))} 어떤 작업이 맞을지는 막힌 위치와 원인에 따라 달라지므로, 접수 단계에서 증상·건물 유형·출입·주차를 함께 알려 두면 진행이 매끄럽습니다.</p>`;

  const secTips = `
    <h2>${esc(dongName)} 비용이 달라지는 기준</h2>
    <p>${esc(vpick(vb, "tipA", [
      `${dongName} 인근에서도 비용은 현장 구조, 막힘 정도, 작업 방식(스프링·고압세척·교체), 배관 길이, 야간·긴급 여부에 따라 달라집니다. 가벼운 트랩 막힘과 관 벽에 굳은 기름 세척, 노후 배관 교체는 작업 난이도가 크게 다릅니다.`,
      `${dongName}에서는 막힌 위치와 정도, 단순 뚫음인지 고압세척·부분 교체가 필요한지에 따라 비용이 달라집니다. 같은 증상이라도 원인이 트랩 한 곳일 수도, 배관 라인 전체일 수도 있어 현장 확인이 필요합니다.`,
      `${gu.name} 일대에서 비용을 정할 때는 현장 구조·막힘 상태·작업 방식·배관 길이·긴급도를 함께 봅니다. 전화나 사진만으로 금액을 단정하면 실제 작업과 차이가 생기기 쉬워, 정확한 금액은 현장 확인 후 안내합니다.`,
      `${dongName} 인근 작업이 처음이라면 증상과 막힌 위치를 정리해 두는 것이 좋습니다. 막힘 정도와 배관 상태에 따라 작업 범위가 달라지므로, 비용은 현장 확인 후 작업 범위와 함께 안내합니다.`,
    ]))}</p>
    <p>${esc(vpick(vb, "tipB", [
      `${dongName}에서 작업을 맡길 때는 막힌 곳 주변을 비워 두고, 역류·냄새 여부와 건물 유형을 미리 알려 두면 진행이 매끄럽습니다. 야간·긴급 시간대는 도착 시간과 추가 요금이 달라질 수 있으니 접수 시 함께 확인하세요.`,
      `방문 작업 전 ${dongName}에서는 막힌 위치 사진을 미리 보내 두면 작업 방식과 도착 시간을 더 빨리 안내받을 수 있습니다. 공용 배관이 의심되면 관리실 확인이 필요할 수 있어 미리 알려 두면 좋습니다.`,
      `${dongName} 인근에서 야간·긴급 작업을 생각한다면 가능 여부와 추가 요금, 도착 소요 시간을 접수 단계에서 확인해 두면 당일 진행이 매끄럽습니다.`,
      `${dongName}에서 처음 의뢰한다면 출입 방법과 주차, 막힌 위치·증상을 접수 시 미리 맞춰 두면 현장 도착 후 바로 점검을 시작할 수 있어 시간을 아낄 수 있습니다.`,
    ]))}</p>`;

  const middle = vshuffle(vb, "order", [secWho, secCheck, secCompare, secFlow, secTips]).join("\n");

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/area/">지역별 안내</a><span>›</span><a href="/area/seoul/">서울</a><span>›</span><a href="/area/seoul/${guSlug}/">${esc(
    gu.name
  )}</a><span>›</span>${esc(dongName)}
  </nav>
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">서울 ${esc(
      gu.name
    )}</p>
    <h1>${esc(dongName)} 배관공사·하수구막힘 방문 안내</h1>
    ${secOverview}
    ${middle}

    <h2>${esc(dongName)} 인근 지역</h2>
    <p>같은 ${esc(gu.name)} 내 ${esc(
    nearText
  )} 등 인접 동과 함께 비교하면 방문 권역을 잡기 쉽습니다.</p>
    <div class="link-cloud">
      ${near
        .map(
          (d) =>
            `<a href="/area/seoul/${guSlug}/${gu.dongSlug[d]}/">${esc(d)}</a>`
        )
        .join("")}
      <a href="/area/seoul/${guSlug}/">${esc(gu.name)} 전체</a>
      <a href="/area/seoul/">서울 전체</a>
    </div>

    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map(
          (f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`
        )
        .join("\n      ")}
    </div>

    ${authorBox()}
    ${ctaBtn(dongName + " 하수구막힘")}
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const html = layout({
    ...dongMeta(dongName, "서울", gu.name),
    path,
    body,
    structuredData: [
      faqLd(faqs),
      articleLd({
        headline: `${dongName} 배관공사·하수구막힘 방문 안내`,
        description: `${dongName}(서울 ${gu.name}) 배관공사·하수구막힘 방문 작업 안내`,
        path,
        modified: MODIFIED,
      }),
      pricingLd(),
    ],
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "지역별 안내", url: "/area/" },
      { name: "서울", url: "/area/seoul/" },
      { name: gu.name, url: `/area/seoul/${guSlug}/` },
      { name: dongName, url: path },
    ],
  });
  return { path, file: `area/seoul/${guSlug}/${dongSlug}/index.html`, html };
}

// ---------- 자치구 페이지 ----------
function guPage(gu) {
  const guSlug = gu.slug;
  const path = `/area/seoul/${guSlug}/`;
  const stationText = gu.stations.join("·");
  const landmarkText = gu.landmarks.join("·");

  const dongLinks = gu.dongs
    .map(
      (d) =>
        `<a href="/area/seoul/${guSlug}/${gu.dongSlug[d]}/">${esc(d)}</a>`
    )
    .join("");

  const nm = gu.name;
  const dong1 = gu.dongs[0] || "행정동";
  const vb = "SGU␟서울␟" + nm;

  const faqs = [
    {
      q: `서울 ${nm}에서 하수구막힘은 어떻게 접수하나요?`,
      a: vpick(vb, "fa1", [
        `${nm} 내 동네(행정동)와 막힌 곳·증상, 원하는 시간을 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 정확한 비용은 현장 확인 후 안내합니다.`,
        `서울 ${nm}에서는 원하는 행정동과 막힌 위치·역류 여부를 전달하면 방문 가능 여부와 도착 예정 시간, 작업 방식을 안내받을 수 있습니다.`,
      ]),
    },
    {
      q: `${nm}에서 어떤 작업을 맡길 수 있나요?`,
      a: vpick(vb, "fa2", [
        `싱크대·변기·욕실 배수구막힘 같은 막힘 작업부터 노후 배관 누수·교체 같은 배관공사, 고압세척·배관내시경 점검까지 ${nm} 기준으로 안내합니다.`,
        `하수구막힘·싱크대막힘·변기막힘 등 막힘 작업과 배관누수·교체, 상가·음식점 주방 배관 세척까지 ${nm} 안에서 안내받을 수 있습니다.`,
      ]),
    },
    {
      q: `${nm} 어느 동까지 방문이 되나요?`,
      a: vpick(vb, "fa3", [
        `${nm} 내 행정동별로 방문 권역이 다를 수 있습니다. 아래 동 목록에서 해당 동을 확인하고 접수 시 위치를 알리면 됩니다.`,
        `${dong1} 등 ${nm} 내 행정동에 따라 권역이 달라집니다. 원하는 동을 고른 뒤 접수 시 위치를 알리면 방문 가능 여부와 야간·긴급 가능 여부를 확인할 수 있습니다.`,
      ]),
    },
  ];

  const secFeature = `
    <h2>${esc(nm)} 지역 특징</h2>
    <p>${esc(nm)}은(는) ${esc(gu.character)} ${esc(stationText)} 등으로 이동이 이어지고, ${esc(landmarkText)} 같은 시설이 생활 권역의 기준점이 됩니다.</p>
    <p>${esc(vpick(vb, "feat", [
      `같은 ‘서울 ${nm} 하수구막힘’이라도 행정동에 따라 방문 권역과 도착 소요 시간이 달라질 수 있어, 원하는 동네를 먼저 고르면 방문 가능 여부와 작업 방식을 더 정확히 확인할 수 있습니다.`,
      `${nm}은(는) ${dong1} 등 여러 행정동으로 나뉘어, 어느 동을 먼저 고르느냐에 따라 방문 가능 권역과 도착 시간이 달라집니다.`,
      `서울 ${nm}에서 배관공사·하수구막힘 작업을 맡길 때는 행정동별 권역 차이를 먼저 살펴보면 방문 가능 여부를 정확히 좁힐 수 있습니다.`,
    ]))}</p>`;
  const secLife = `
    <h2>${esc(nm)} 주요 생활권과 이동</h2>
    <p>${esc(vpick(vb, "life", [
      `${nm}은(는) ${stationText} 등으로 이동이 이어지고, ${landmarkText} 같은 시설을 중심으로 생활 권역이 형성됩니다. 같은 구 안에서도 권역에 따라 주거·상가 비중과 배관 환경이 달라, 막힌 위치를 정확히 알리면 도착 소요 시간과 방문 가능 여부를 더 정확히 안내받을 수 있습니다.`,
      `${stationText} 등을 축으로 이동이 이어지는 ${nm}은(는) ${landmarkText} 일대를 중심으로 생활권이 묶입니다. 동네마다 동선이 다르니 방문 위치를 정확히 알리면 안내가 빨라집니다.`,
      `${nm}의 생활권은 ${landmarkText} 같은 시설과 ${stationText} 등 교통을 따라 형성됩니다. 같은 구라도 동에 따라 도착 시간이 달라질 수 있어 위치 전달이 중요합니다.`,
    ]))}</p>`;
  const secWho = `
    <h2>${esc(nm)}에서 자주 발생하는 배관·하수구 문제</h2>
    <ul>${vsubset(vb, "who", [
      `아파트·빌라 욕실·세면대 배수가 느려지거나 역류하는 경우`,
      `${nm} 안에서 싱크대 설거지 후 배수가 막히거나 역류하는 경우`,
      `변기에 휴지·물티슈가 걸려 물이 안 내려가는 경우`,
      `상가·음식점 주방 하수구가 기름·음식물로 자주 막히는 경우`,
      `${dong1} 등 노후 단지·주택에서 배관 누수가 반복되는 경우`,
      `야간·긴급으로 역류·막힘이 생겨 빠른 방문이 필요한 경우`,
    ], 4).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secCompare = `
    <h2>${esc(nm)} 작업 방식 안내</h2>
    <p>${esc(vpick(vb, "cmp", [
      `${nm}에서는 현장 점검으로 막힌 위치와 원인을 먼저 확인한 뒤, 가벼운 막힘은 스프링(관통기)으로, 관 벽에 굳은 기름·찌꺼기는 고압세척으로, 노후·파손 배관은 부분 교체로 접근합니다. 원인이 안 보이거나 반복되면 배관내시경으로 내부를 확인하고, 작업 후에는 흐름이 회복됐는지 마무리 확인을 합니다.`,
      `${nm}에서 단순 막힘은 스프링 작업으로, 기름이 두껍게 쌓인 주방·상가 배관은 고압세척으로, 누수·노후 배관은 교체로 진행합니다. 무조건 뚫기보다 원인 구간을 확인해 필요한 만큼만 작업하는 것이 재발을 줄이는 방법입니다.`,
      `${nm} 작업은 현장 점검 → 배관내시경 → 스프링·고압세척·교체 → 마무리 확인의 순서로 진행합니다. 막힘인지 누수인지, 세대 배관인지 공용관인지에 따라 작업 방식이 달라지므로 현장 확인을 먼저 합니다.`,
    ]))} 어떤 작업이 맞을지는 막힌 위치와 원인, 건물 유형에 따라 달라집니다.</p>`;
  const secDongs = `
    <h2>${esc(nm)} 행정동에서 찾기</h2>
    <p>아래에서 ${esc(nm)}의 행정동을 선택하면 해당 동네의 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다. (숫자 행정동은 대표 동명으로 통합해 안내합니다.)</p>
    <div class="link-cloud">${dongLinks}</div>`;
  const secPrograms = `
    <h2>${esc(nm)}에서 증상별로 살펴볼 작업</h2>
    <p>${esc(vpick(vb, "prog", [
      `욕실·세면대 물빠짐이 느리면 하수구막힘·욕실배수구를, 싱크대 역류는 싱크대막힘을, 변기가 차오르면 변기막힘을 확인해 보세요. 누수가 반복되면 막힘 작업이 아니라 배관공사가 필요할 수 있습니다.`,
      `${nm} 인근에서는 싱크대·욕실 배수 막힘, 변기막힘, 노후 배관 누수까지 증상이 제각각입니다. 막힌 위치와 역류·냄새 여부를 먼저 정리하면 작업 선택이 쉬워집니다.`,
      `막힌 위치와 증상에 따라 하수구막힘·싱크대막힘·변기막힘·욕실배수구막힘·배관공사 중에서 ${nm} 기준으로 비교해 보세요.`,
    ]))}</p>
    ${programChips(nm)}
    ${callout()}`;
  const secBooking = `
    <h2>${esc(nm)} 예약 문의 안내</h2>
    <p>${esc(vpick(vb, "book", [
      `${nm}에서 배관공사나 하수구막힘을 접수할 때는 원하는 동네(행정동), 막힌 위치·증상, 원하는 시간을 함께 전달하면 방문 가능 여부와 도착 예정 시간을 안내받을 수 있습니다. 처음이라면 지역 확인 → 증상 전달 → 현장 점검 → 작업·비용 확인 순서로 진행하면 됩니다.`,
      `${nm} 접수는 원하는 행정동과 막힌 위치·역류 여부를 알리는 것에서 시작합니다. 방문 가능 여부와 도착 예정 시간을 확인하고, 비용은 현장 점검 후 작업 범위와 함께 안내받으면 진행이 매끄럽습니다.`,
      `${nm}에서 처음 문의한다면 ${dong1} 등 동네를 먼저 정하고, 막힌 위치와 증상을 전달한 뒤 현장 점검으로 작업 범위를 확인하는 순서가 편합니다.`,
    ]))} 야간·긴급 작업 가능 여부와 공용 배관 확인 필요 여부도 미리 알려 두면 좋습니다. 안내된 정보는 참고용이며 실제 작업 조건과 비용은 현장 확인 후 확정됩니다.</p>`;
  const secCheck = `
    <h2>작업 전 확인사항</h2>
    <ul>${vsubset(vb, "check", [
      `방문 희망 동네(행정동)와 막힌 위치`,
      `막힌 곳의 증상(물빠짐 지연·완전 막힘·역류)`,
      `역류·냄새 여부와 건물 유형(아파트·빌라·상가·주택)`,
      `이전에 같은 부위를 작업한 적이 있는지`,
      `야간·긴급 작업 필요 여부`,
      `상황을 보여 주는 사진 전달 가능 여부`,
    ], 5).map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
  const secFaq = `
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      ${faqs
        .map(
          (f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`
        )
        .join("\n      ")}
    </div>`;

  const pre = vshuffle(vb, "preOrder", [secLife, secWho, secCompare]).join("");
  const post = vshuffle(vb, "postOrder", [secPrograms, secBooking, secCheck]).join("");

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/area/">지역별 안내</a><span>›</span><a href="/area/seoul/">서울</a><span>›</span>${esc(
    gu.name
  )}
  </nav>
  <article class="section-tight"><div class="container prose">
    <p class="card-tag" style="color:var(--color-accent);font-weight:700">서울특별시</p>
    <h1>서울 ${esc(gu.name)} 배관공사·하수구막힘 방문 안내</h1>
    ${secFeature}${pre}
    ${secDongs}
    ${post}${secFaq}

    ${authorBox()}
    ${ctaBtn("서울 " + gu.name + " 하수구막힘")}
  </div></article>
  ${reviewsSection()}
  ${pricingTable()}`;

  const html = layout({
    ...branchMeta("서울 " + gu.name, "행정동"),
    path,
    body,
    structuredData: [
      faqLd(faqs),
      articleLd({
        headline: `서울 ${gu.name} 배관공사·하수구막힘 방문 안내`,
        description: `서울 ${gu.name} 배관공사·하수구막힘 방문 작업 안내`,
        path,
        modified: MODIFIED,
      }),
      pricingLd(),
    ],
    breadcrumb: [
      { name: "홈", url: "/" },
      { name: "지역별 안내", url: "/area/" },
      { name: "서울", url: "/area/seoul/" },
      { name: gu.name, url: path },
    ],
  });
  return { path, file: `area/seoul/${guSlug}/index.html`, html };
}

// ---------- 서울 광역 페이지 ----------
function seoulOverviewPage() {
  const cards = seoul.districts
    .map(
      (gu) => `<a class="card" href="/area/seoul/${gu.slug}/">
        <h3>${esc(gu.name)}</h3>
        <p>${esc(gu.character.slice(0, 52))}…</p>
      </a>`
    )
    .join("\n        ");

  const body = `
  <nav class="breadcrumb container" aria-label="위치">
    <a href="/">홈</a><span>›</span><a href="/area/">지역별 안내</a><span>›</span>서울
  </nav>
  <section class="hero"><div class="container">
    <p class="eyebrow">서울특별시</p>
    <h1>서울 배관공사·하수구막힘 — 자치구·동별 안내</h1>
    <p>${esc(seoul.intro)}</p>
    <div class="hero-actions">
      <a class="btn btn-gold" href="${site.phoneHref}">💬 예약 문의</a>
      <a class="btn btn-outline" href="/service/">서비스 보기</a>
    </div>
  </div></section>
  <section class="section"><div class="container">
    <div class="section-head"><span class="eyebrow">서울 25개 자치구</span>
      <h2>자치구를 선택하세요</h2>
      <p>자치구를 고른 뒤 행정동까지 좁혀 가면, 해당 동네의 배관공사·하수구막힘 방문 안내를 확인할 수 있습니다.</p>
    </div>
    <div class="grid grid-4">${cards}</div>
  </div></section>
  <section class="section section-alt"><div class="container prose">
    <h2>서울에서 배관공사·하수구막힘 방문 안내를 찾는 방법</h2>
    <p>서울은 강남·서초·송파 같은 동남권부터 마포·서대문·은평 등 서북권, 노원·도봉·강북 등 동북권까지 자치구별로 주거·상가 비중과 배관 환경이 다릅니다. 먼저 자치구를 고른 뒤 행정동까지 좁혀 가면, 같은 ‘서울 하수구막힘’이라도 본인 위치에 맞는 방문 권역과 도착 소요 시간을 더 정확히 확인할 수 있습니다.</p>
    <p>작업은 막힌 위치와 원인을 현장에서 확인한 뒤 스프링(관통기), 고압세척, 부분 교체 중 필요한 방식으로 진행하며, 반복 막힘이나 누수는 배관내시경으로 원인 구간을 확인합니다. 자주 발생하는 배관 문제는 가정 욕실·싱크대 막힘부터 상가·음식점 주방 하수구막힘까지 구별로 다릅니다. 숫자로 나뉜 행정동(○○1동·2동 등)은 대표 동명으로 통합해 안내하므로, 원하는 동네 이름으로 바로 찾아볼 수 있습니다.</p>
    ${callout()}
    <h2>자주 묻는 질문</h2>
    <div class="faq">
      <details><summary>서울 어느 지역까지 방문이 되나요?</summary><p>자치구·행정동별로 방문 권역이 다를 수 있습니다. 원하는 동네를 고른 뒤 접수 시 위치를 알리면 방문 가능 여부와 도착 소요 시간을 안내받을 수 있습니다.</p></details>
      <details><summary>서울에서 배관공사·누수 작업도 되나요?</summary><p>단순 막힘 뚫음뿐 아니라 노후 배관 누수·교체 같은 배관공사도 안내합니다. 서울 전역에서 현장 구조를 확인한 뒤 문제 구간만 필요한 만큼 작업하는 것을 원칙으로 합니다.</p></details>
      <details><summary>야간·긴급 작업도 되나요?</summary><p>막힌 위치와 증상, 원하는 자치구·행정동과 시간을 알리면 야간·긴급 가능 여부와 도착 소요 시간을 안내받을 수 있습니다. 정확한 비용은 현장 확인 후 안내합니다.</p></details>
    </div>
    ${authorBox()}
  </div></section>
  ${reviewsSection()}
  ${pricingTable()}`;

  return {
    path: "/area/seoul/",
    file: "area/seoul/index.html",
    html: layout({
      title: `서울 배관공사·하수구막힘 자치구·동별 안내 | ${site.name}`,
      description: "서울 25개 자치구·행정동별 배관공사·하수구막힘 방문 안내를 확인하세요.",
      path: "/area/seoul/",
      body,
      structuredData: [pricingLd()],
      breadcrumb: [
        { name: "홈", url: "/" },
        { name: "지역별 안내", url: "/area/" },
        { name: "서울", url: "/area/seoul/" },
      ],
    }),
  };
}

// 서울 전체 페이지 빌드
export function buildSeoulPages() {
  // 슬러그 사전 계산(구/동, 구 내 중복 방지)
  seoul.slug = "seoul";
  for (const gu of seoul.districts) {
    gu.slug = slugify(gu.name);
    gu.dongSlug = {};
    const used = new Set();
    for (const d of gu.dongs) {
      let sg = slugify(d);
      if (!sg) sg = "dong";
      let base = sg,
        n = 2;
      while (used.has(sg)) sg = base + n++;
      used.add(sg);
      gu.dongSlug[d] = sg;
    }
  }

  const pages = [seoulOverviewPage()];
  for (const gu of seoul.districts) {
    pages.push(guPage(gu));
    for (const d of gu.dongs) pages.push(dongPage(gu, d, gu.dongs));
  }
  return pages;
}

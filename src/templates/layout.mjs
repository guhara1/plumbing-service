import { site, primaryNav, programMenu } from "../../data/site.mjs";
import { regionGroups, regionNameBySlug } from "../../data/regions.mjs";
import { slugify } from "../../scripts/romanize.mjs";

// HTML 이스케이프
export const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const abs = (url) => (url.startsWith("http") ? url : site.baseUrl + url);

// 메가메뉴 데이터: [{ group, items: [{ label, url }] }]
const PROGRAM_MEGA = programMenu.map((g) => ({
  group: g.group,
  items: g.items.map((i) => ({ label: i.label, url: `/service/${i.slug}/` })),
}));
const REGION_MEGA = regionGroups.map((g) => ({
  group: g.group,
  items: g.slugs.map((s) => ({
    label: regionNameBySlug[s] || s,
    url: `/area/${s}/`,
  })),
}));

// 메가메뉴 렌더 (PC 다열 / 모바일 아코디언 공용 마크업)
function renderMega(menu) {
  const cols = menu
    .map(
      (g) => `
        <div class="mega-col">
          <h4>${esc(g.group)}</h4>
          <ul>
            ${g.items
              .map((i) => `<li><a href="${i.url}">${esc(i.label)}</a></li>`)
              .join("\n            ")}
          </ul>
        </div>`
    )
    .join("");
  return `<div class="mega"><div class="mega-grid">${cols}</div></div>`;
}

function renderNav(currentPath) {
  const items = primaryNav
    .map((item) => {
      const active = item.url === currentPath ? ' aria-current="page"' : "";
      const menu =
        item.mega === "program"
          ? PROGRAM_MEGA
          : item.mega === "region"
          ? REGION_MEGA
          : null;
      if (menu) {
        return `<li class="has-mega">
          <a href="${item.url}" aria-haspopup="true" aria-expanded="false"${active}>${esc(
          item.label
        )}</a>
          ${renderMega(menu)}
        </li>`;
      }
      return `<li><a href="${item.url}"${active}>${esc(item.label)}</a></li>`;
    })
    .join("\n        ");
  return `<nav class="nav" id="primary-nav" aria-label="주 메뉴"><ul>${items}</ul></nav>`;
}

function renderHeader(currentPath) {
  return `
  <a class="skip-link" href="#main">본문 바로가기</a>
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="${esc(site.name)} 홈">
        <span class="brand-mark">SP</span>
        <span>${esc(site.name)}<small>${esc(site.tagline)}</small></span>
      </a>
      ${renderNav(currentPath)}
      <a class="header-cta desktop" href="${site.phoneHref}">💬 ${esc(site.ctaText)}</a>
      <button class="nav-toggle" aria-label="메뉴 열기" aria-controls="primary-nav" aria-expanded="false">☰</button>
    </div>
  </header>
  <div class="nav-backdrop"></div>`;
}

function renderFooter() {
  const year = new Date().getFullYear();
  return `
  <footer class="site-footer">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-brand">
          <h4>${esc(site.name)}</h4>
          <p>${esc(site.tagline)}</p>
          <address class="footer-nap">
            <a class="phone" href="${site.phoneHref}">전화예약 ${esc(site.phone)}</a>
            <span class="nap-line">전화예약 준비 중 · 예약문의로 접수해 주세요</span>
            <a class="nap-mail" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
          </address>
          <div class="footer-cta">
            <span class="footer-cta-label">비즈니스 문의</span>
            <div class="footer-cta-btns">
              <a class="tg-btn" href="https://t.me/googleseolab" target="_blank" rel="noopener noreferrer nofollow">
                <span class="tg-ico" aria-hidden="true">✈</span> 웹사이트 제작문의
              </a>
              <a class="tg-btn" href="https://t.me/googleseolab" target="_blank" rel="noopener noreferrer nofollow">
                <span class="tg-ico" aria-hidden="true">✈</span> 제휴문의
              </a>
            </div>
          </div>
        </div>
        <nav class="footer-col" aria-label="서비스 안내">
          <h4>서비스 안내</h4>
          <ul>
            <li><a href="/service/pipe/">배관공사</a></li>
            <li><a href="/service/drain/">하수구막힘</a></li>
            <li><a href="/service/">전체 서비스</a></li>
            <li><a href="/area/">지역별 안내</a></li>
            <li><a href="/subway/">지하철역별 안내</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-label="이용 안내">
          <h4>이용 안내</h4>
          <ul>
            <li><a href="/price/">비용 안내</a></li>
            <li><a href="/guide/">작업 전 확인사항</a></li>
            <li><a href="/case/">작업사례</a></li>
            <li><a href="/contact/">예약문의</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-label="정책 및 약관">
          <h4>정책·약관</h4>
          <ul>
            <li><a href="/about/">업체 소개</a></li>
            <li><a href="/privacy/">개인정보처리방침</a></li>
            <li><a href="/terms/">이용약관</a></li>
            <li><a href="/sitemap.xml">사이트맵</a></li>
          </ul>
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© ${year} ${esc(site.name)}. All rights reserved. · ${esc(site.tagline)}</p>
        <p class="disclaimer">본 사이트는 전국 배관공사·하수구막힘 작업 정보를 안내합니다. 비용은 현장 구조와 막힘 상태에 따라 달라질 수 있으므로, 정확한 금액은 현장 확인 후 안내하는 것을 원칙으로 합니다. 허위 후기나 확인되지 않은 작업 사례는 게시하지 않습니다.</p>
      </div>
    </div>
  </footer>
  <a class="mobile-callbar" href="${site.phoneHref}">💬 ${esc(site.ctaText)} · 사진 보내기</a>

  <div class="promo-pop" id="promo-pop" role="dialog" aria-label="광고·협업 문의 안내">
    <button class="promo-close" type="button" aria-label="닫기">×</button>
    <p class="promo-msg"><strong>스피드 배관공사</strong>광고·협업 문의는 텔레그램으로 편하게 연락 주세요.</p>
    <div class="promo-btns">
      <a class="promo-btn" href="https://t.me/googleseolab" target="_blank" rel="noopener noreferrer nofollow"><span aria-hidden="true">✈</span> 광고 문의</a>
      <a class="promo-btn alt" href="https://t.me/googleseolab" target="_blank" rel="noopener noreferrer nofollow"><span aria-hidden="true">✈</span> 협업 문의</a>
    </div>
  </div>`;
}

// 본문 H2에 앵커 id를 부여하고, 클릭 시 이동하는 목차(TOC)를 자동 생성.
// - 이미 수동 목차(class="toc")가 있는 페이지(서비스 등)는 건너뜀.
// - 콘텐츠형 페이지(H2 4개 이상)에만 삽입 → 인덱스/허브 페이지는 제외.
function injectToc(body) {
  if (!body || /class="toc"/.test(body)) return body;
  const heads = [];
  const used = new Set();
  // id가 없는 H2에만 슬러그 id 부여
  const withIds = body.replace(
    /<h2(?![^>]*\sid=)([^>]*)>([\s\S]*?)<\/h2>/g,
    (m, attrs, inner) => {
      const text = inner.replace(/<[^>]+>/g, "").trim();
      let base = (slugify(text) || "section").slice(0, 40).replace(/-+$/, "");
      let id = base, n = 2;
      while (used.has(id)) id = `${base}-${n++}`;
      used.add(id);
      heads.push({ id, text });
      return `<h2${attrs} id="${id}">${inner}</h2>`;
    }
  );
  if (heads.length < 4) return body;
  const items = heads
    .map((h) => `<li><a href="#${h.id}">${esc(h.text)}</a></li>`)
    .join("");
  const toc = `<nav class="toc" aria-label="이 페이지 목차"><strong>이 페이지 목차</strong><ol>${items}</ol></nav>`;
  // 첫 번째 H2 바로 앞에 목차 삽입
  return withIds.replace(/<h2[^>]*\sid=/, toc + "\n      $&");
}

// JSON-LD 직렬화
const jsonld = (obj) =>
  `<script type="application/ld+json">${JSON.stringify(obj).replace(
    /</g,
    "\\u003c"
  )}</script>`;

/**
 * 페이지 레이아웃
 * @param {object} o
 * @param {string} o.title - <title>
 * @param {string} o.description - 메타 디스크립션 (80자 이내 권장)
 * @param {string} o.path - 현재 경로 (예: /service/pipe/)
 * @param {string} o.body - 본문 HTML
 * @param {string} [o.ogImage] - 선호 썸네일 경로
 * @param {object[]} [o.structuredData] - 추가 JSON-LD 객체 배열
 * @param {Array<{name,url}>} [o.breadcrumb]
 */
export function layout(o) {
  const canonical = abs(o.path);
  const ogImage = abs(o.ogImage || "/assets/og-default.svg");
  const desc = o.description || site.tagline;
  o = { ...o, body: injectToc(o.body) };

  // 히어로 대표 이미지는 CSS 배경(::after)이라 초기 문서에서 탐색되지 않는다.
  // LCP 조기 발견 + 높은 우선순위 확보를 위해 히어로가 있는 페이지에만 preload 주입.
  const hasHero = /class="hero"/.test(o.body || "");
  const heroPreload = hasHero
    ? `\n  <link rel="preload" as="image" href="/assets/hero.webp" type="image/webp" fetchpriority="high" />`
    : "";

  // 조직(LocalBusiness — Plumber) 기본 JSON-LD
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Plumber",
    name: site.name,
    description: site.tagline,
    url: site.baseUrl,
    image: ogImage,
    areaServed: "KR",
    knowsLanguage: "ko",
    serviceType: ["배관공사", "하수구막힘", "고압세척", "배관누수"],
  };

  const breadcrumbLd = o.breadcrumb
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: o.breadcrumb.map((b, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: b.name,
          item: abs(b.url),
        })),
      }
    : null;

  const extra = (o.structuredData || [])
    .concat(breadcrumbLd ? [breadcrumbLd] : [])
    .map(jsonld)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(o.title)}</title>
  <meta name="description" content="${esc(desc)}" />
  <link rel="canonical" href="${canonical}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="author" content="${esc(site.author.name)}" />
  <link rel="alternate" type="application/rss+xml" title="${esc(site.name)} RSS" href="${site.baseUrl}/rss.xml" />

  <!-- Open Graph / 선호 썸네일 지정 -->
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="${esc(site.name)}" />
  <meta property="og:title" content="${esc(o.title)}" />
  <meta property="og:description" content="${esc(desc)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:locale" content="${site.locale}" />
  <meta name="twitter:card" content="summary_large_image" />

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />${heroPreload}
  <script>document.documentElement.classList.add('js')</script>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin />
  <link rel="preload" as="style" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" media="print" onload="this.media='all'" />
  <noscript><link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" /></noscript>
  <link rel="stylesheet" href="/assets/styles.css" />

  ${jsonld(orgLd)}
  ${extra}
</head>
<body>
  ${renderHeader(o.path)}
  <main id="main">
    ${o.body}
  </main>
  ${renderFooter()}
  <script src="/assets/main.js" defer></script>
</body>
</html>`;
}

// 비용이 달라지는 기준 (전 페이지 공용 컴포넌트)
// - 고정 금액을 단정하지 않고, 비용이 달라지는 '기준'을 안내한다(스팸·과장 방지).
export const COST_FACTORS = [
  { name: "현장 구조·접근성", desc: "배관이 노출형인지 매립형인지, 벽·바닥 개방이 필요한지에 따라 작업 난이도가 달라집니다." },
  { name: "원인과 작업 방식", desc: "단순 뚫음·트랩 청소로 끝나는지, 고압세척·배관내시경·교체가 필요한지에 따라 비용이 달라집니다." },
  { name: "배관 길이·규모", desc: "가정용 짧은 배관과 상가·음식점의 대형·장거리 배관은 작업 범위가 크게 다릅니다." },
  { name: "방문 시간·긴급도", desc: "야간·긴급 출동, 장거리 이동 여부에 따라 추가 비용이 생길 수 있습니다." },
];

export function pricingTable() {
  const cards = COST_FACTORS.map(
    (c) => `
      <div class="price-card">
        <h3>${esc(c.name)}</h3>
        <p class="desc">${esc(c.desc)}</p>
      </div>`
  ).join("");
  return `
  <section class="pricing" aria-label="비용이 달라지는 기준">
    <div class="container">
      <div class="pricing-head">
        <h2>비용이 달라지는 기준</h2>
        <p>정확한 비용은 현장 구조·막힘 상태에 따라 달라집니다. 고정 금액을 단정하기보다, 무엇에 따라 비용이 달라지는지 먼저 안내합니다.</p>
      </div>
      <div class="pricing-grid">${cards}</div>
      <p class="pricing-note">증상과 위치를 알려 주시면 예상 가능한 작업 범위를 먼저 안내합니다. <a href="/price/">비용 안내 자세히 보기 →</a></p>
    </div>
  </section>`;
}

// 안심 작업 기준 (전 페이지 공용 컴포넌트)
// - 허위 후기 대신, 실제 작업 진행 방식과 신뢰 기준을 안내한다(가짜 후기 금지).
export const TRUST_POINTS = [
  { icon: "①", title: "현장 점검 후 안내", text: "전화·사진만으로 금액을 단정하지 않고, 현장에서 원인과 작업 범위를 확인한 뒤 안내합니다." },
  { icon: "②", title: "필요한 만큼만 작업", text: "무조건 교체·전체 시공이 아니라, 문제 구간을 찾아 필요한 범위만 작업하는 것을 원칙으로 합니다." },
  { icon: "③", title: "원인까지 확인", text: "반복 막힘은 고압세척·배관내시경으로 원인을 확인해, 같은 문제가 되풀이되지 않도록 안내합니다." },
  { icon: "④", title: "투명한 비용 기준", text: "추가 비용이 생길 수 있는 기준을 미리 안내하고, 작업 전 범위와 비용을 함께 확인합니다." },
];

export function reviewsSection() {
  const cards = TRUST_POINTS.map(
    (r) => `
      <div class="trust-card">
        <span class="trust-ico" aria-hidden="true">${esc(r.icon)}</span>
        <h3>${esc(r.title)}</h3>
        <p>${esc(r.text)}</p>
      </div>`
  ).join("");
  return `
  <section class="reviews" aria-label="작업 진행 방식">
    <div class="container">
      <div class="reviews-head">
        <span class="eyebrow">작업 진행 방식</span>
        <h2>스피드 배관공사가 작업하는 기준</h2>
        <p class="trust-lead">과장된 광고나 확인되지 않은 후기 대신, 현장에서 실제로 어떻게 작업하는지를 안내합니다.</p>
      </div>
      <div class="grid grid-4">${cards}</div>
    </div>
  </section>`;
}

// 서비스 구조화 데이터 (Service) — 고정 가격을 단정하지 않는다.
export const pricingLd = () => ({
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "배관공사·하수구막힘",
  provider: { "@type": "Plumber", name: site.name },
  areaServed: "KR",
  description:
    "배관공사·하수구막힘·고압세척·배관누수 방문 작업. 비용은 현장 구조와 막힘 상태에 따라 달라지며 현장 확인 후 안내합니다.",
});

// FAQPage JSON-LD 헬퍼
export const faqLd = (faqs) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});

// Article JSON-LD 헬퍼 (E-E-A-T: author/publisher/dateModified)
export const articleLd = (o) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: o.headline,
  description: o.description,
  image: abs(o.image || "/assets/og-default.svg"),
  datePublished: o.published || "2026-01-10",
  dateModified: o.modified || "2026-06-21",
  author: {
    "@type": "Organization",
    name: site.author.name,
    url: site.baseUrl + "/about/",
  },
  publisher: {
    "@type": "Organization",
    name: site.name,
    url: site.baseUrl,
  },
  mainEntityOfPage: abs(o.path),
});

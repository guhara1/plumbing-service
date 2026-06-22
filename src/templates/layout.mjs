import { site, primaryNav, serviceMenu } from "../../data/site.mjs";
import { areaGroups, areaNameBySlug } from "../../data/areas.mjs";
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
const SERVICE_MEGA = serviceMenu.map((g) => ({
  group: g.group,
  items: g.items.map((i) => ({ label: i.label, url: `/service/${i.slug}/` })),
}));
const AREA_MEGA = areaGroups.map((g) => ({
  group: g.group,
  items: g.slugs.map((s) => ({
    label: areaNameBySlug[s] || s,
    url: `/area/${s}/`,
  })),
}));

// 메가메뉴 렌더 (PC / 모바일 아코디언 공용 마크업)
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
        item.mega === "service"
          ? SERVICE_MEGA
          : item.mega === "area"
          ? AREA_MEGA
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
        <span class="brand-mark" aria-hidden="true">SP</span>
        <span>${esc(site.name)}<small>${esc(site.tagline)}</small></span>
      </a>
      ${renderNav(currentPath)}
      <a class="header-cta desktop" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )}</a>
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
            <a class="phone" href="${site.phoneHref}">${esc(site.phone)}</a>
            <span class="nap-line">전화예약 · 긴급 배관·하수구 방문 상담</span>
            <a class="nap-mail" href="mailto:${esc(site.email)}">${esc(site.email)}</a>
          </address>
          <div class="footer-cta">
            <span class="footer-cta-label">예약 문의</span>
            <div class="footer-cta-btns">
              <a class="cta-btn" href="${site.phoneHref}"><span class="cta-ico" aria-hidden="true">📞</span> 전화 문의</a>
              <a class="cta-btn" href="/contact/"><span class="cta-ico" aria-hidden="true">📷</span> 사진 보내기</a>
            </div>
          </div>
        </div>
        <nav class="footer-col" aria-label="서비스 안내">
          <h4>서비스 안내</h4>
          <ul>
            <li><a href="/service/pipe/">배관공사</a></li>
            <li><a href="/service/drain/">하수구막힘</a></li>
            <li><a href="/service/high-pressure-cleaning/">고압세척</a></li>
            <li><a href="/service/camera-inspection/">배관내시경</a></li>
            <li><a href="/service/">서비스 전체보기</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-label="안내">
          <h4>안내</h4>
          <ul>
            <li><a href="/area/">지역별 안내</a></li>
            <li><a href="/symptoms/">증상별 안내</a></li>
            <li><a href="/process/">작업 방식 안내</a></li>
            <li><a href="/price/">비용 안내</a></li>
            <li><a href="/guide/before-service/">작업 전 확인사항</a></li>
          </ul>
        </nav>
        <nav class="footer-col" aria-label="고객센터 및 정책">
          <h4>고객센터·정책</h4>
          <ul>
            <li><a href="/about/">업체 소개</a></li>
            <li><a href="/case/">작업 사례</a></li>
            <li><a href="/privacy/">개인정보 처리방침</a></li>
            <li><a href="/terms/">이용약관</a></li>
            <li><a href="/sitemap.xml">사이트맵</a></li>
          </ul>
        </nav>
      </div>
      <div class="footer-bottom">
        <p>© ${year} ${esc(site.name)}. All rights reserved. · 전화예약 ${esc(site.phone)}</p>
        <p class="disclaimer">표시된 비용·작업 정보는 현장 구조와 막힘 정도에 따라 달라질 수 있으며, 정확한 작업 범위와 비용은 현장 확인 후 안내합니다. 본 사이트는 배관공사·하수구막힘 작업 안내를 위한 정보 페이지이며, 과장 없는 사실 기반 안내를 원칙으로 합니다.</p>
      </div>
    </div>
  </footer>
  <a class="mobile-callbar" href="${site.phoneHref}">📞 전화예약 ${esc(
    site.phone
  )} · 지금 바로 상담</a>`;
}

// 본문 H2에 앵커 id를 부여하고, 클릭 시 이동하는 목차(TOC)를 자동 생성.
function injectToc(body) {
  if (!body || /class="toc"/.test(body)) return body;
  const heads = [];
  const used = new Set();
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
 * @param {object} o {title, description, path, body, ogImage?, structuredData?, breadcrumb?}
 */
export function layout(o) {
  const canonical = abs(o.path);
  const ogImage = abs(o.ogImage || "/assets/og-default.svg");
  const desc = o.description || site.tagline;
  o = { ...o, body: injectToc(o.body) };

  // 조직(LocalBusiness=Plumber) 기본 JSON-LD
  const orgLd = {
    "@context": "https://schema.org",
    "@type": "Plumber",
    name: site.name,
    description: site.tagline,
    url: site.baseUrl,
    telephone: site.phone,
    email: site.email,
    image: ogImage,
    areaServed: "KR",
    knowsLanguage: "ko",
    priceRange: "₩₩",
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

  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
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

// Service JSON-LD 헬퍼
export const serviceLd = (o) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: o.serviceType,
  name: o.name,
  description: o.description,
  provider: { "@type": "Plumber", name: site.name, telephone: site.phone, url: site.baseUrl },
  areaServed: "KR",
});

// FAQ 섹션 렌더 (공용 컴포넌트)
export function faqSection(faqs, heading = "자주 묻는 질문") {
  const items = faqs
    .map(
      (f) => `
      <details>
        <summary>${esc(f.q)}</summary>
        <p>${esc(f.a)}</p>
      </details>`
    )
    .join("");
  return `
  <section class="section faq-section" aria-label="${esc(heading)}">
    <div class="container">
      <div class="section-head"><span class="eyebrow">FAQ</span><h2>${esc(heading)}</h2></div>
      <div class="faq">${items}</div>
    </div>
  </section>`;
}

// 작성자(E-E-A-T) 박스
export function authorBox(modified = "2026-06-21") {
  return `
  <div class="author-box">
    <div class="avatar" aria-hidden="true">스</div>
    <div class="meta">
      <strong>${esc(site.author.name)}</strong> · ${esc(site.author.role)}
      <p>${esc(site.author.bio)}</p>
      <p class="updated">검수: ${esc(site.author.reviewer)} · 최종 수정일 ${esc(modified)}</p>
    </div>
  </div>`;
}

// 비용 기준 안내 박스 (확정 금액 단정 금지 — 범위·기준 중심)
export function costBasisNote() {
  return `
  <div class="callout">
    <strong>비용 안내 원칙</strong> — 정확한 비용은 현장 구조, 막힘 정도, 배관 길이, 장비 사용 여부에 따라 달라집니다.
    문의 시 증상과 위치를 알려주시면 예상 가능한 작업 범위를 먼저 안내합니다. <a href="/price/">비용이 달라지는 기준 보기 →</a>
  </div>`;
}

// 하단 공통 예약 CTA 섹션
export function ctaSection(title = "예약 문의", note = "증상과 위치를 알려주시면 예상 작업 범위를 먼저 안내합니다.") {
  return `
  <section class="section cta-band" aria-label="예약 문의">
    <div class="container cta-inner">
      <div>
        <h2>${esc(title)}</h2>
        <p>${esc(note)}</p>
      </div>
      <div class="cta-actions">
        <a class="btn btn-primary" href="${site.phoneHref}">📞 전화예약 ${esc(site.phone)}</a>
        <a class="btn btn-outline" href="/contact/">사진 보내고 문의하기</a>
      </div>
    </div>
  </section>`;
}

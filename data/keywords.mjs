// 고객 타깃 키워드 (SEO) — 메인·서비스·지역·지하철 전 페이지 공용 데이터
// - 지역/역 페이지의 내부링크 클라우드를 "지역명 + 키워드" 앵커로 페이지마다 다르게 출력한다.
// - 본문 변형 풀 리라이팅에도 같은 어휘를 사용해 키워드 밀도를 자연스럽게 높인다.
import { vsubset } from "../scripts/variants.mjs";

// 각 키워드를 가장 관련 있는 서비스 페이지로 연결 → 키워드 앵커 내부링크 강화
// slug 은 data/site.mjs programMenu 에 존재하는 실제 서비스 페이지여야 한다.
export const keywordLinks = [
  { kw: "누수탐지", slug: "leak" },
  { kw: "누수공사", slug: "leak" },
  { kw: "수도누수", slug: "leak" },
  { kw: "욕실배관누수", slug: "leak" },
  { kw: "주방배관누수", slug: "leak" },
  { kw: "하수구막힘", slug: "drain" },
  { kw: "배수구막힘", slug: "drain" },
  { kw: "배수구뚫음", slug: "drain" },
  { kw: "배관막힘", slug: "pipe" },
  { kw: "배관설비", slug: "pipe" },
  { kw: "수전교체", slug: "water-pipe" },
  { kw: "수도수리", slug: "water-pipe" },
  { kw: "싱크대하수구막힘", slug: "sink" },
  { kw: "싱크대수전교체", slug: "sink" },
  { kw: "주방배수구막힘", slug: "kitchen-drain" },
  { kw: "변기막힘", slug: "toilet" },
  { kw: "화장실변기교체", slug: "toilet" },
  { kw: "변기부속품수리", slug: "toilet" },
  { kw: "화장실수전교체", slug: "bathroom-drain" },
  { kw: "세면대막힘", slug: "washbasin" },
  { kw: "세면대교체", slug: "washbasin" },
];

// 키워드 문자열만 (본문 리라이팅·메인 페이지 나열용)
export const keywordList = keywordLinks.map((k) => k.kw);

// 본문에 자연스럽게 녹이는 수식어 키워드
export const modifierKeywords = [
  "이물질 제거", "배관내시경", "역류", "물샘", "부품 교체",
  "전문 업체", "공사 비용", "가격", "수리", "고압세척",
];

// 모든 페이지에 primary 키워드 21개 전부를 내부링크로 노출(순서만 페이지마다 셔플 → 동일 블록 방지)
// + 수식어 키워드 12개를 캡션으로 함께 노출해, 요청 키워드 33개가 전 페이지에 100% 포함되게 한다.
// place 지정 시 "지역명 + 키워드" 롱테일 앵커가 되어 지역 SEO 에 유리하다.
// 이 블록(link-cloud)은 본문 길이 집계에서 제외되므로 2,000~2,500자 밴드에 영향을 주지 않는다.
export function keywordCloud(base, place, n = keywordLinks.length) {
  const pre = place ? `${place} ` : "";
  const links = vsubset(base, "kwcloud", keywordLinks, n)
    .map((k) => `<a href="/service/${k.slug}/">${pre}${k.kw}</a>`)
    .join("");
  // 수식어 키워드(이물질·제거·내시경·역류·물샘·부품·업체·공사·비용·가격·수리·고압세척) 전부 포함
  const mods =
    `<span class="kw-mods">${pre}이물질 제거 · 배수구뚫음 · 고압세척 · 배관내시경 · 역류 · 물샘 · 수도누수 · 부품 교체 · 수리 · 공사 비용 · 가격 안내 전문 업체</span>`;
  return `<div class="link-cloud">${links}${mods}</div>`;
}

// 본문 문장에 끼워 넣을 "지역명 + 키워드 n개" 텍스트(변형 시드로 페이지마다 다르게)
export function keywordPhrase(base, slot, n = 4) {
  return vsubset(base, "kwphrase␟" + slot, keywordList, n).join("·");
}

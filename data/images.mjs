// 작업 사진 슬롯 (21장) — 메인·서비스·지역·지하철 전 페이지 공용
// ─────────────────────────────────────────────────────────────
// 실제 사진으로 교체하는 방법 (택1):
//  A) 파일만 바꾸기 — 아래 file 이름 그대로 실사진을 src/assets/gallery/ 에 넣으면
//     빌드 시 그 파일이 복사되고, 없으면 자동으로 플레이스홀더(SVG)가 생성됩니다.
//     (예: src/assets/gallery/work-01.webp 를 넣고 아래 file 을 "work-01.webp" 로 수정)
//  B) 경로 바꾸기 — file 값을 원하는 파일명으로 바꾸고 해당 파일을 넣으면 됩니다.
// alt/label 은 이미지 검색 SEO 및 접근성을 위한 설명이므로 키워드를 유지하세요.
import { vseed } from "../scripts/variants.mjs";

// 각 슬롯: file(파일명) · alt(대체텍스트=키워드) · label(플레이스홀더에 표시할 짧은 라벨)
export const galleryImages = [
  { file: "work-01.svg", alt: "누수탐지 현장 작업", label: "누수탐지" },
  { file: "work-02.svg", alt: "누수공사 배관 보수 작업", label: "누수공사" },
  { file: "work-03.svg", alt: "하수구막힘 관통 작업", label: "하수구막힘" },
  { file: "work-04.svg", alt: "배수구막힘 뚫음 작업", label: "배수구막힘" },
  { file: "work-05.svg", alt: "배관막힘 점검 작업", label: "배관막힘" },
  { file: "work-06.svg", alt: "배관설비 시공 현장", label: "배관설비" },
  { file: "work-07.svg", alt: "주방 수전교체 작업", label: "수전교체" },
  { file: "work-08.svg", alt: "싱크대수전교체 작업", label: "싱크대수전교체" },
  { file: "work-09.svg", alt: "화장실수전교체 작업", label: "화장실수전교체" },
  { file: "work-10.svg", alt: "변기막힘 관통 작업", label: "변기막힘" },
  { file: "work-11.svg", alt: "화장실변기교체 작업", label: "변기교체" },
  { file: "work-12.svg", alt: "변기부속품수리 작업", label: "변기부속품수리" },
  { file: "work-13.svg", alt: "싱크대하수구막힘 작업", label: "싱크대하수구막힘" },
  { file: "work-14.svg", alt: "세면대막힘 작업", label: "세면대막힘" },
  { file: "work-15.svg", alt: "세면대교체 작업", label: "세면대교체" },
  { file: "work-16.svg", alt: "배수구뚫음 스프링 작업", label: "배수구뚫음" },
  { file: "work-17.svg", alt: "욕실배관누수 보수 작업", label: "욕실배관누수" },
  { file: "work-18.svg", alt: "수도누수 탐지 작업", label: "수도누수" },
  { file: "work-19.svg", alt: "주방배수구막힘 고압세척", label: "주방배수구막힘" },
  { file: "work-20.svg", alt: "배관내시경 점검 작업", label: "배관내시경" },
  { file: "work-21.svg", alt: "고압세척 배관 청소 작업", label: "고압세척" },
];

const src = (img) => `/assets/gallery/${img.file}`;

// 페이지별로 한 장을 고르는 단일 이미지 슬롯(도어웨이 방지: 시드 기반 분산).
// place 지정 시 alt/캡션 앞에 지역명을 붙여 지역 이미지 SEO 를 강화한다.
export function pageFigure(base, place = "") {
  const img = galleryImages[vseed(base + "␟figure") % galleryImages.length];
  const pre = place ? `${place} ` : "";
  const alt = `${pre}${img.alt}`;
  return `<figure class="media-figure">
    <img src="${src(img)}" alt="${alt}" width="800" height="600" loading="lazy" decoding="async" />
    <figcaption>${alt}</figcaption>
  </figure>`;
}

// 여러 장을 고르는 갤러리 그리드(메인/서비스 페이지용).
export function galleryGrid(items = galleryImages, place = "") {
  const pre = place ? `${place} ` : "";
  return `<div class="gallery-grid">${items
    .map(
      (img) => `<figure class="media-figure">
      <img src="${src(img)}" alt="${pre}${img.alt}" width="800" height="600" loading="lazy" decoding="async" />
      <figcaption>${pre}${img.alt}</figcaption>
    </figure>`
    )
    .join("")}</div>`;
}

// 지역(/area/) 트리 데이터
// 기존 행정구역 데이터(시·도 → 시군구)를 스피드공사 URL 규칙에 맞게 정규화한다.
//  - 자치구: <slug>-gu / 군: <slug>-gun / 시: <slug>(접미사 없음)
//  - 충돌·중복 방지용 수동 오버라이드(경기 광주시, 제주시 등)
// 본문(고유 콘텐츠)은 build.mjs 에서 character/landmarks/dongs + 변형 엔진으로 생성한다.

import { seoul } from "./seoul.mjs";
import { gyeonggi } from "./gyeonggi.mjs";
import { incheon } from "./incheon.mjs";
import { busan, daegu, gwangju, daejeon, ulsan, jeju } from "./metros.mjs";
import { gangwon, chungbuk, chungnam, jeonbuk, jeonnam, gyeongbuk, gyeongnam } from "./provinces.mjs";
import { slugify } from "../scripts/romanize.mjs";

// 시·도별 메타(권역, 한 줄 요약, 도입 문단) — 배관·하수구 문맥
const SIDO_META = {
  seoul:    { group: "수도권", summary: "25개 자치구 구별 방문 안내", intro: "서울은 자치구마다 주거 형태와 상권이 크게 달라, 같은 배관 문제라도 작업 방식이 달라집니다. 오피스텔·상가가 많은 도심권은 공용 배수관과 주방 라인을, 대단지 아파트가 많은 외곽권은 욕실·베란다·싱크대 배수를 중심으로 점검합니다." },
  gyeonggi: { group: "수도권", summary: "수원·성남·고양·용인 등 시 단위 안내", intro: "경기는 도시마다 생활권이 달라 시 단위로 나누어 안내합니다. 신도시는 아파트·오피스텔 배수 문제가, 원도심·산업단지는 노후 배관과 상가·공장 배수 문제가 상대적으로 많습니다." },
  incheon:  { group: "수도권", summary: "부평·남동·연수·서구 방문 안내", intro: "인천은 2026년 개편으로 9개 구·2개 군으로 재편되며, 송도·청라·검단 같은 신도시와 원도심의 배관 상태가 크게 다릅니다. 권역별 주거 형태에 맞춰 점검 항목을 달리합니다." },
  busan:    { group: "영남·제주", summary: "해운대·부산진·동래·사하 안내", intro: "부산은 해안 관광지·원도심·신주거지가 섞여 있어 상가·숙박시설 배수와 노후 주택 배관 문제가 함께 나타납니다. 구·군에 따라 방문 동선과 작업 유형이 달라집니다." },
  daegu:    { group: "영남·제주", summary: "수성·달서·북구·동구 안내", intro: "대구는 도심 상권과 대단지 주거지, 산업단지가 나뉘어 있어 권역별로 막힘 유형이 다릅니다. 상권은 음식점 배수, 주거지는 욕실·싱크대 배수를 중심으로 점검합니다." },
  daejeon:  { group: "강원·충청", summary: "서구·유성·중구·동구 안내", intro: "대전은 둔산·유성 신주거·연구단지와 원도심이 함께 있어, 신축 아파트 배수와 노후 주택 배관 문제가 모두 나타납니다." },
  gwangju:  { group: "호남", summary: "북구·광산·서구·남구 안내", intro: "광주광역시는 상무지구 업무권과 수완·첨단 신주거지, 원도심이 나뉘어 있습니다. 경기도 광주시와 혼동하지 않도록 별도 권역으로 안내합니다." },
  ulsan:    { group: "영남·제주", summary: "남구·중구·북구·울주 안내", intro: "울산은 산업도시 특성상 상가·사업장 배수 부하가 크고, 농소·강동 등 신주거지의 아파트 배수 문제도 늘고 있습니다." },
  sejong:   { group: "강원·충청", summary: "조치원·나성·아름·보람 생활권 안내", intro: "세종은 자치구가 없어 생활권(동)과 조치원 등 읍·면 중심으로 안내합니다. 신도시 동 지역은 아파트·오피스텔 배수, 읍·면 지역은 단독·상가 배관을 중심으로 점검합니다." },
  gangwon:  { group: "강원·충청", summary: "춘천·원주·강릉 등 시 단위 안내", intro: "강원은 도시 간 거리가 멀고 관광지가 많아, 숙박시설·상가 배수와 단독주택 배관 문제 문의가 많습니다. 시·군 단위로 방문 가능 권역을 안내합니다." },
  chungbuk: { group: "강원·충청", summary: "청주 등 시·군 단위 안내", intro: "충북은 청주를 중심으로 신주거지와 산업단지가 형성되어 있고, 군 지역은 단독주택·상가 배관 문의가 많습니다." },
  chungnam: { group: "강원·충청", summary: "천안·아산 등 시·군 단위 안내", intro: "충남은 천안·아산 등 수도권 인접 도시의 아파트 배수 문제와 서해안 관광지의 숙박·상가 배수 문제가 함께 나타납니다." },
  jeonbuk:  { group: "호남", summary: "전주·익산·군산 등 안내", intro: "전북은 전주 한옥마을·원도심과 혁신도시 신주거지가 나뉘어 있어, 노후 배관과 신축 배수 문제가 모두 나타납니다." },
  jeonnam:  { group: "호남", summary: "여수·순천·목포 등 안내", intro: "전남은 해안·관광 도시가 많아 숙박시설·상가 배수 문의가 많고, 원도심 단독주택의 노후 배관 문제도 이어집니다." },
  gyeongbuk:{ group: "영남·제주", summary: "포항·구미·경주 등 안내", intro: "경북은 포항·구미 산업도시와 경주 관광권, 농촌 군 지역이 넓게 분포해 권역별 배관 작업 유형이 크게 다릅니다." },
  gyeongnam:{ group: "영남·제주", summary: "창원·김해·진주 등 안내", intro: "경남은 창원·김해 산업·신주거지와 통영·거제 관광권이 함께 있어, 아파트·상가·숙박 배수 문제가 다양하게 나타납니다." },
  jeju:     { group: "영남·제주", summary: "제주시·서귀포 방문 안내", intro: "제주는 시내 동 지역과 읍·면, 관광 숙박권의 배관 환경이 크게 다릅니다. 숙박시설·상가 배수와 단독주택 배관을 권역별로 안내합니다." },
};

// 이름 → 자식 슬러그(접미사 규칙 + 오버라이드)
const SLUG_OVERRIDE = {
  // sido별 { 이름: slug }
  gyeonggi: { "광주시": "gwangju-si" },
  jeju: { "제주시": "jeju-si", "서귀포시": "seogwipo" },
};
function childSlug(sidoSlug, name) {
  const ov = SLUG_OVERRIDE[sidoSlug]?.[name];
  if (ov) return ov;
  const base = slugify(name);
  if (/구$/.test(name)) return base + "-gu";
  if (/군$/.test(name)) return base + "-gun";
  return base; // 시/읍/면/동
}

function uniqueChildren(children) {
  const seen = new Set();
  return children.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });
}

// 광역시/특별자치(구·군) → children
function fromDistricts(sidoSlug, districts) {
  return districts.map((d) => ({
    name: d.name,
    slug: childSlug(sidoSlug, d.name),
    character: d.character || "",
    landmarks: d.landmarks || [],
    stations: d.stations || [],
    dongs: d.dongs || [],
  }));
}

// 도/경기(시 → [일반구] → 동) → children(시 단위)
function fromCities(sidoSlug, cities) {
  return cities.map((c) => {
    if (c.districts) {
      const subgu = c.districts.map((d) => d.name);
      const dongs = c.districts.flatMap((d) => d.dongs || []).slice(0, 14);
      const landmarks = c.districts.flatMap((d) => d.landmarks || []).slice(0, 5);
      const stations = c.districts.flatMap((d) => d.stations || []).slice(0, 5);
      return { name: c.name, slug: childSlug(sidoSlug, c.name), character: c.character || "", subgu, dongs, landmarks, stations };
    }
    return {
      name: c.name,
      slug: childSlug(sidoSlug, c.name),
      character: c.character || "",
      landmarks: c.landmarks || [],
      stations: c.stations || [],
      dongs: c.dongs || [],
    };
  });
}

// 세종 생활권(동/읍·면) — 자치구가 없어 수동 구성
const sejongChildren = [
  { name: "조치원읍", slug: "jochiwon", character: "세종 원도심으로 조치원역과 전통 상권을 중심으로 단독·상가 건물이 많아 노후 배관과 상가 배수 문의가 많은 생활권입니다.", dongs: ["원리", "교리", "신안리", "번암리"], landmarks: ["조치원역", "조치원 전통시장"] },
  { name: "아름동", slug: "areum", character: "정부세종청사 인근의 대단지 아파트·오피스텔 생활권으로 욕실·싱크대 배수와 공용 배관 점검 문의가 많습니다.", dongs: ["아름동"], landmarks: ["정부세종청사", "호수공원"] },
  { name: "도담동", slug: "dodam", character: "신도시 초기 입주가 빠르게 진행된 아파트 밀집 생활권으로 세대 배수와 공용관 점검 수요가 꾸준합니다.", dongs: ["도담동"], landmarks: ["국립세종도서관"] },
  { name: "새롬동", slug: "saerom", character: "주상복합과 상가가 함께 있는 생활권으로 상가 주방 배수와 아파트 배수 문제가 함께 나타납니다.", dongs: ["새롬동"], landmarks: ["새롬종합복지센터"] },
  { name: "나성동", slug: "naseong", character: "상업·업무 시설이 집중된 생활권으로 음식점·상가 하수구막힘과 고압세척 문의가 많습니다.", dongs: ["나성동"], landmarks: ["나성동 상업지구", "이응다리"] },
  { name: "다정동", slug: "dajeong", character: "대단지 아파트 중심의 정주 생활권으로 욕실·베란다·싱크대 배수 문의가 꾸준한 지역입니다.", dongs: ["다정동"], landmarks: ["가온마을"] },
  { name: "보람동", slug: "boram", character: "세종시청·교육청 등 공공기관과 아파트가 함께 있는 생활권으로 공용 배관·상가 배수 점검 수요가 있습니다.", dongs: ["보람동"], landmarks: ["세종시청", "세종특별자치시교육청"] },
  { name: "소담동", slug: "sodam", character: "금강 인접 아파트 생활권으로 세대 배수와 노후 점검 문의가 이어지는 지역입니다.", dongs: ["소담동"], landmarks: ["금강보행교"] },
  { name: "고운동", slug: "goun", character: "세종 북서부의 대단지 아파트 생활권으로 욕실·싱크대 배수와 공용관 점검 수요가 많습니다.", dongs: ["고운동"], landmarks: ["고운뜰공원"] },
  { name: "종촌동", slug: "jongchon", character: "초기 입주 아파트와 상가가 함께 있는 생활권으로 세대·상가 배수 문제가 함께 나타납니다.", dongs: ["종촌동"], landmarks: ["가재마을"] },
];

export const areas = [
  { name: "서울", slug: "seoul", ...meta("seoul"), children: uniqueChildren(fromDistricts("seoul", seoul.districts)) },
  { name: "경기", slug: "gyeonggi", ...meta("gyeonggi"), children: uniqueChildren(fromCities("gyeonggi", gyeonggi.cities)) },
  { name: "인천", slug: "incheon", ...meta("incheon"), children: uniqueChildren(fromDistricts("incheon", incheon.districts)) },
  { name: "부산", slug: "busan", ...meta("busan"), children: uniqueChildren(fromDistricts("busan", busan.districts)) },
  { name: "대구", slug: "daegu", ...meta("daegu"), children: uniqueChildren(fromDistricts("daegu", daegu.districts)) },
  { name: "대전", slug: "daejeon", ...meta("daejeon"), children: uniqueChildren(fromDistricts("daejeon", daejeon.districts)) },
  { name: "광주", slug: "gwangju", ...meta("gwangju"), children: uniqueChildren(fromDistricts("gwangju", gwangju.districts)) },
  { name: "울산", slug: "ulsan", ...meta("ulsan"), children: uniqueChildren(fromDistricts("ulsan", ulsan.districts)) },
  { name: "세종", slug: "sejong", ...meta("sejong"), children: sejongChildren },
  { name: "강원", slug: "gangwon", ...meta("gangwon"), children: uniqueChildren(fromCities("gangwon", gangwon.cities)) },
  { name: "충북", slug: "chungbuk", ...meta("chungbuk"), children: uniqueChildren(fromCities("chungbuk", chungbuk.cities)) },
  { name: "충남", slug: "chungnam", ...meta("chungnam"), children: uniqueChildren(fromCities("chungnam", chungnam.cities)) },
  { name: "전북", slug: "jeonbuk", ...meta("jeonbuk"), children: uniqueChildren(fromCities("jeonbuk", jeonbuk.cities)) },
  { name: "전남", slug: "jeonnam", ...meta("jeonnam"), children: uniqueChildren(fromCities("jeonnam", jeonnam.cities)) },
  { name: "경북", slug: "gyeongbuk", ...meta("gyeongbuk"), children: uniqueChildren(fromCities("gyeongbuk", gyeongbuk.cities)) },
  { name: "경남", slug: "gyeongnam", ...meta("gyeongnam"), children: uniqueChildren(fromCities("gyeongnam", gyeongnam.cities)) },
  { name: "제주", slug: "jeju", ...meta("jeju"), children: uniqueChildren(fromCities("jeju", jeju.cities)) },
];

function meta(slug) {
  const m = SIDO_META[slug];
  return { group: m.group, summary: m.summary, intro: m.intro };
}

// 권역 그룹(메가메뉴/인덱스)
export const areaGroups = [
  { group: "수도권", slugs: ["seoul", "gyeonggi", "incheon"] },
  { group: "강원·충청", slugs: ["gangwon", "daejeon", "sejong", "chungbuk", "chungnam"] },
  { group: "호남", slugs: ["gwangju", "jeonbuk", "jeonnam"] },
  { group: "영남·제주", slugs: ["busan", "daegu", "ulsan", "gyeongbuk", "gyeongnam", "jeju"] },
];

export const areaBySlug = Object.fromEntries(areas.map((a) => [a.slug, a]));
export const areaNameBySlug = Object.fromEntries(areas.map((a) => [a.slug, a.name]));

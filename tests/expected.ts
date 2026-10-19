// 테스트가 기대하는 작품 수. 수신함으로 작품이 늘어도 테스트를 고치지 않도록 works.json에서 계산한다.
import manifest from "../content/works.json";

const publicWorks = manifest.works.filter((work) => work.is_public);

/** 이 수보다 줄어들면 작품이 실수로 빠진 것으로 본다 */
export const MIN_WORKS = 34;
export const TOTAL_WORKS = publicWorks.length;
export const UNDATED_WORKS = publicWorks.filter((w) => w.year === null).length;
export const countIn = (category: string) =>
  publicWorks.filter((work) => work.category === category).length;

import type { Work } from "./model";
type Source = NonNullable<Work["provenance"]> & NonNullable<Work["review"]>;
export function splitProvenance(source: Source) {
  const {
    category,
    date,
    date_basis,
    creator_display,
    evidence_level,
    authorship_note,
    publish_ready,
    review_status,
    review_notes,
  } = source;
  return {
    provenance: {
      category,
      date,
      date_basis,
      creator_display,
      evidence_level,
      authorship_note,
    },
    review: { publish_ready, review_status, review_notes },
  };
}

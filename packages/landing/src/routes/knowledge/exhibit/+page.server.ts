import { exhibitDocs, exhibitWings } from "$lib/data/knowledge-base";

export async function load() {
  return {
    exhibits: exhibitDocs,
    exhibitWings,
  };
}

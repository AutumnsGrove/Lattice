import { specs, specCategories } from "$lib/data/knowledge-base";

export async function load() {
  return {
    specs,
    specCategories,
  };
}

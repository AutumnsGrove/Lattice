import { scanAllDocs } from "$lib/server/docs-scanner";
import {
  specCategories,
  helpSections,
  exhibitWings,
} from "$lib/data/category-metadata";

export const prerender = true;

export async function load() {
  const scanned = scanAllDocs();
  return {
    ...scanned,
    specCategories,
    helpSections,
    exhibitWings,
  };
}

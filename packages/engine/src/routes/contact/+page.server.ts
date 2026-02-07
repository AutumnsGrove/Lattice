import { getContactPage } from "$lib/utils/markdown.js";
import { SITE_ERRORS, throwGroveError } from "$lib/errors";
import type { PageServerLoad } from "./$types.js";

export const prerender = true;

export const load: PageServerLoad = () => {
  const page = getContactPage();

  if (!page) {
    throwGroveError(404, SITE_ERRORS.PAGE_NOT_FOUND, "Site");
  }

  return {
    title: page.title,
    description: page.description,
    content: page.content,
    headers: page.headers,
    gutterContent: page.gutterContent,
  };
};

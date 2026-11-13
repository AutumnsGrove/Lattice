-- 0008_kb_articles_status.sql
-- Lifecycle status for a KB article, so an article describing an unbuilt feature
-- can say so instead of reading like documentation of something that shipped.
--
-- Only 'planned' is meaningful today: the article page renders a Planned badge
-- and a "not built yet" note for it. NULL means ordinary, published documentation.
-- Sources: the `status:` frontmatter field on the markdown in docs/.

ALTER TABLE kb_articles ADD COLUMN status TEXT;

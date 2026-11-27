-- Migration 010: the day's brief on its run (#1798, slice 4)
--
-- The page has two halves and always has: a short headline (the two or three
-- sentences above the day) and the day itself. `timeline_summaries` keeps them as
-- `brief_summary` and `detailed_timeline`; the recipe writes them with `set_brief`
-- and the lines, and the run keeps both so the comparison can show the two paths
-- side by side without replaying anything.
--
-- `timeline_runs` was created in 009 and nothing had written to it yet from
-- production, but the migration had already been applied by a deploy, so this is a
-- second migration rather than an edit of the first.

ALTER TABLE timeline_runs ADD COLUMN brief TEXT;

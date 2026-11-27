# The scenario files, copied from Lyra

These are Lyra's scenario files (`~/Documents/Projects/lyra/scenarios/*.yaml`), copied
whole so they can run a third time on this side of the boundary: through the Lumen
adapter, into the real Lumen routes, into the fake model (decision 67, step 5).

They are copies because Lyra never imports Lattice and Lattice's CI does not check
Lyra out. The originals are the source of truth; this directory is a snapshot.

- Copied from: Lyra `v0.3.0`, commit `57e9402`, 2026-11-22.
- To refresh: `cp ../lyra/scenarios/*.yaml libs/lyra/scenarios/` and re-run
  `pnpm --filter @autumnsgrove/lyra-lumen test:run`. A scenario Lyra has changed
  and this copy has not is a difference the contract suite cannot catch, so refresh
  them when Lyra's are touched.
- Do not edit these files here. An edit would be invisible to Lyra's own run.

# Planning Documents

This directory organizes planning documentation by **category** and **lifecycle stage**.

## Structure

```
docs/plans/
  features/          Product features, UI, meadow, curios, waystones, grafts
  infra/             Cloudflare, D1, auth, email, CDN, workers, payments
  security/          Audits, hardening, encryption, remediation
  tooling/           gf, gw, claude skills, testing, DX

docs/safaris/        Safari expedition journals (separate from plans)
```

Each category contains lifecycle subdirectories:

```
category/
  planning/    Active research, incomplete specs, open questions
  planned/     Fully specified, ready for implementation
  active/      Currently being implemented
  completed/   Done — kept for historical reference
```

Not every category has every lifecycle folder — only the ones with files in them.

## Workflow

```
planning/ --> planned/ --> active/ --> completed/
    |             |           |            |
  Research    Specified    In-flight    Shipped
```

## Frontmatter

Planned and active files use YAML frontmatter for at-a-glance context:

```yaml
---
title: "Human-readable title"
status: planned | active | planning
category: features | infra | security | tooling | safari
---
```

## Safaris

Safari expedition journals live in `docs/safaris/`, not here. They're observational
audit documents produced by the `/safari-explore` skill — valuable reference material
but distinct from implementation plans.

## Moving Documents

When a plan advances through the lifecycle:

1. Move the file to the next lifecycle directory within its category
2. Update the `status` field in frontmatter
3. For completed plans, add a completion date if useful
4. Link to relevant PRs/code if applicable

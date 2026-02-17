# Lattice Documentation

This directory contains all project documentation organized by audience and purpose.

## Directory Structure

| Directory         | Audience           | Purpose                                            |
| ----------------- | ------------------ | -------------------------------------------------- |
| `setup/`          | Developers         | Configuration and setup guides                     |
| `infrastructure/` | DevOps             | Cloud infrastructure documentation                 |
| `developer/`      | Engineers          | Architecture, database, integration docs           |
| `design-system/`  | Designers/Frontend | UI patterns, icons, standards                      |
| `philosophy/`     | Everyone           | Project vision, voice, naming                      |
| `plans/`          | Team               | Planning workflow (planning → planned → completed) |
| `specs/`          | Engineers          | Technical specifications                           |
| `patterns/`       | Engineers          | Architectural patterns                             |
| `help-center/`    | Users              | End-user help articles                             |
| `guides/`         | Various            | Implementation guides                              |
| `marketing/`      | Marketing          | Marketing materials                                |
| `security/`       | Security           | Security documentation                             |
| `legal/`          | Legal              | Policies and terms                                 |
| `internal/`       | Team               | Internal communications and business docs          |
| `templates/`      | Various            | Reusable templates                                 |

## Plans Workflow

Documentation moves through the planning pipeline:

1. **`plans/planning/`** - Active work in progress, being researched/designed
2. **`plans/planned/`** - Ready for implementation, fully specified
3. **`plans/completed/`** - Implemented, kept for historical reference

## Adding New Documentation

- User-facing content → `help-center/articles/`
- Technical specs → `specs/`
- Architecture decisions → `developer/decisions/`
- Setup guides → `setup/`
- Philosophy and naming → `philosophy/`

## Naming Conventions

- **Files**: lowercase with hyphens (e.g., `stripe-setup.md`)
- **Exception**: Root project files may use UPPERCASE (e.g., `README.md`)

---
title: "Animal Skill Ecosystem Migration Plan"
status: completed
category: tooling
lastUpdated: "2026-02-22"
---

# Animal Skill Ecosystem Migration Plan

## Overview

Transform Grove's development workflow into a living forest ecosystem. Each skill becomes an animal with distinct behaviors, habitats, and hunting patterns. The panther-strike model proves that animal metaphors create memorable, energizing workflows.

**Goal:** Migrate existing `grove-*` skills to animal-themed counterparts while maintaining their core functionality but infusing them with personality, phases, and hunting metaphors.

---

## The Forest Map

### Individual Animals

| Category | Animal | Skill | Domain | Phase Pattern | Migration Source |
|----------|--------|-------|--------|---------------|------------------|
| **Predators** | 🐆 **Panther** | `panther-strike` | Single issue elimination | TARGET → PROWL → INVESTIGATE → PLAN → STRIKE → KILL | ✅ **EXISTS** |
| **Builders** | 🦫 **Beaver** | `beaver-build` | Testing & coverage | DAM → BUILD → REINFORCE → FORTIFY → COMPLETE | `grove-testing` |
| **Builders** | 🦢 **Swan** | `swan-design` | Spec & architecture | VISION → SKETCH → REFINE → POLISH → LAUNCH | `grove-spec-writing` |
| **Builders** | 🦅 **Eagle** | `eagle-architect` | System architecture | SOAR → SURVEY → DESIGN → BLUEPRINT → BUILD | *NEW* |
| **Builders** | 🕷️ **Spider** | `spider-weave` | Auth integration | SPIN → CONNECT → SECURE → TEST → BIND | `grove-auth-integration` |
| **Shapeshifters** | 🦎 **Chameleon** | `chameleon-adapt` | UI design & theming | BLEND → COLOR → TEXTURE → ANIMATE → MORPH | `grove-ui-design` |
| **Gatherers** | 🦉 **Owl** | `owl-archive` | Documentation | OBSERVE → HUNT → GATHER → NEST → TEACH | `grove-documentation` |
| **Gatherers** | 🦝 **Raccoon** | `raccoon-audit` | Security & cleanup | RUMMAGE → INSPECT → SANITIZE → PURGE → VERIFY | `grove-account-deletion` |
| **Speedsters** | 🦊 **Fox** | `fox-optimize` | Performance tuning | STALK → PINPOINT → STREAMLINE → CATCH → CELEBRATE | *NEW* |
| **Speedsters** | 🐻 **Bear** | `bear-migrate` | Data migrations | WAKE → GATHER → MOVE → HIBERNATE → VERIFY | *NEW* |
| **Watchers** | 🦌 **Deer** | `deer-sense` | Accessibility audit | LISTEN → SCAN → TEST → GUIDE → PROTECT | *NEW* |
| **Scouts** | 🐕 **Bloodhound** | `bloodhound-scout` | Codebase exploration | SCENT → TRACK → HUNT → REPORT → RETURN | *NEW* |
| **Heavy Lifters** | 🐘 **Elephant** | `elephant-build` | Multi-file features | TRUMPET → GATHER → BUILD → TEST → CELEBRATE | *NEW* |
| **Guides** | 🐦 **Robin** | `robin-guide` | Skill discovery | PERCH → TILT → CHATTER → PRESENT → WARBLE | *NEW - META SKILL* |

---

## Gathering Chains

When the drum sounds through the forest, the animals gather. One command mobilizes the entire ecosystem.

### Available Gatherings

| Gathering | Command | Animals | Use Case |
|-----------|---------|---------|----------|
| **Full Feature** | `/gathering-feature` | Bloodhound → Elephant → Beaver → Raccoon → Deer → Fox → Owl | Complete feature lifecycle |
| **Architecture** | `/gathering-architecture` | Eagle → Swan → Elephant | System design to implementation |
| **UI Work** | `/gathering-ui` | Chameleon → Deer | UI design + accessibility |
| **Security** | `/gathering-security` | Spider → Raccoon | Auth + security audit |
| **Migration** | `/gathering-migration` | Bear → Bloodhound | Safe data movement |

### Gathering Phase Pattern

```
SUMMON → ORGANIZE → EXECUTE → VALIDATE → COMPLETE
   ↓         ↓          ↓          ↓          ↓
Receive  Dispatch   Animals    Verify   Feature
Request  Animals    Work       Results  Done
```

### Common Manual Chains

When not using a Gathering, chain animals manually for these scenarios:

**Feature Building:**
```
Bloodhound → Elephant → Beaver
```
- Bloodhound scouts the codebase
- Elephant implements the feature
- Beaver writes tests

**UI Work:**
```
Chameleon → Deer
```
- Chameleon designs the UI
- Deer audits accessibility

**Auth Work:**
```
Spider → Raccoon
```
- Spider implements auth
- Raccoon security audits

**Architecture:**
```
Eagle → Swan → Elephant
```
- Eagle designs system architecture
- Swan writes detailed specs
- Elephant implements

---

## Migration Priority

### Tier 1: Critical (Start Here)

1. **Beaver** (`grove-testing` → `beaver-build`)
   - **Why:** Testing is constant need
   - **Complexity:** Medium
   - **Deliverable:** `.claude/skills/beaver-build/skill.md`

2. **Chameleon** (`grove-ui-design` → `chameleon-adapt`)
   - **Why:** UI work is frequent
   - **Complexity:** Low
   - **Deliverable:** `.claude/skills/chameleon-adapt/skill.md`

### Tier 2: High Value

3. **Swan** (`grove-spec-writing` → `swan-design`)
   - **Migration:** Transform spec-writing skill into Swan's elegant design flow
   - **Complexity:** Medium

4. **Eagle** (NEW - `eagle-architect`)
   - **Migration:** Create fresh - no existing skill to migrate
   - **Complexity:** High

5. **Raccoon** (`grove-account-deletion` → `raccoon-audit`)
   - **Migration:** Expand account deletion into full security auditing
   - **Complexity:** Medium

6. **Bloodhound** (`bloodhound-scout`)
   - **Migration:** Create fresh scouting/intelligence skill
   - **Chains to:** Elephant
   - **Complexity:** Medium

7. **Elephant** (`elephant-build`)
   - **Migration:** Create fresh multi-file feature builder
   - **Calls:** Bloodhound, Swan, Beaver
   - **Complexity:** High

### Tier 3: Nice to Have

8. **Owl** (`grove-documentation` → `owl-archive`)
   - **Migration:** Transform docs skill into Owl's archival wisdom
   - **Complexity:** Low

9. **Spider** (`grove-auth-integration` → `spider-weave`)
   - **Migration:** Reimagine auth as web-weaving
   - **Complexity:** Medium

### Tier 4: Future Animals

10. **Fox** (`fox-optimize`)
    - **Migration:** Create fresh performance optimization skill
    - **Complexity:** Medium

11. **Bear** (`grove-account-deletion` → `bear-migrate`)
    - **Migration:** Adapt account deletion patterns for data migrations
    - **Chains:** Calls Bloodhound for scouting
    - **Complexity:** High

12. **Deer** (`deer-sense`)
    - **Migration:** Create fresh accessibility audit skill
    - **Complexity:** Medium

### Tier S: Meta Skills

13. **Robin** (`robin-guide`)
    - **Migration:** Create fresh skill discovery skill
    - **Complexity:** Medium
    - **Behavior:** Knows all animals, helps user pick the right one

### Tier G: Gathering Chains (Meta-Chain Skills)

These orchestrate multiple animals in sequence. Build AFTER individual animals exist.

14. **Gathering-Feature** (`gathering-feature`)
    - **Animals:** Bloodhound → Elephant → Beaver → Raccoon → Deer → Fox → Owl
    - **Complexity:** Very High

15. **Gathering-Architecture** (`gathering-architecture`)
    - **Animals:** Eagle → Swan → Elephant
    - **Complexity:** High

16. **Gathering-UI** (`gathering-ui`)
    - **Animals:** Chameleon → Deer
    - **Complexity:** Medium

17. **Gathering-Security** (`gathering-security`)
    - **Animals:** Spider → Raccoon
    - **Complexity:** Medium

18. **Gathering-Migration** (`gathering-migration`)
    - **Animals:** Bear → Bloodhound
    - **Complexity:** Medium

---

## Skill Templates

### Animal Skill Template

```markdown
# [Animal] [Action] 🐾

[One-line mission statement]

## When to Activate

- User says "[trigger]"
- User calls `/[animal]-[action]`

## The [Process]

```
[Phase 1] → [Phase 2] → [Phase 3] → [Phase 4] → [Phase 5]
```

### Phase 1: [NAME]

*[Animal behavior metaphor]*

[What to do]

**Output:** [What to produce]

### Phase 2-5: ...

## [Animal] Rules

### Energy
[Focus guidelines]

### Precision
[Quality standards]

### Communication
[Metaphor language]

*[Closing statement]*
```

### Gathering Skill Template

```markdown
# Gathering [Type] 🌲🐾

The drum sounds. [Animals] gather for [work].

## When to Summon

- User calls `/gathering-[type]`

## Animals Mobilized

[List in order]

## The Gathering

```
SUMMON → ORGANIZE → EXECUTE → VALIDATE → COMPLETE
```

### Phase 1: SUMMON

*[Drum echoes...]*

Receive request, parse intent.

### Phase 2-5: ...

*[The forest stands ready.]*
```

---

## File Structure

```
.claude/skills/
# META SKILLS
├── robin-guide/
│   └── skill.md

# GATHERING CHAINS
├── gathering-feature/
│   └── skill.md
├── gathering-architecture/
│   └── skill.md
├── gathering-ui/
│   └── skill.md
├── gathering-security/
│   └── skill.md
└── gathering-migration/
    └── skill.md

# INDIVIDUAL ANIMALS
├── panther-strike/
│   └── skill.md
├── bloodhound-scout/
│   └── skill.md
├── elephant-build/
│   └── skill.md
├── beaver-build/
│   └── skill.md
├── chameleon-adapt/
│   └── skill.md
├── swan-design/
│   └── skill.md
├── eagle-architect/
│   └── skill.md
├── raccoon-audit/
│   └── skill.md
├── owl-archive/
│   └── skill.md
├── spider-weave/
│   └── skill.md
├── fox-optimize/
│   └── skill.md
├── bear-migrate/
│   └── skill.md
└── deer-sense/
    └── skill.md
```

---

## Grove Voice Alignment

- **Warm, not corporate** — "The beaver builds with care" not "Execute testing protocol"
- **Nature-connected** — Animal behaviors tied to forest ecosystem
- **Action-oriented** — Verbs that imply movement and energy
- **Respectful** — Animals are partners, not tools
- **Playful but professional** — Metaphors enhance, not distract

---

## Success Metrics

- [ ] All Tier 1 animals created and tested
- [ ] User reports "fun" using animal skills
- [ ] Clear differentiation between animal domains
- [ ] Consistent phase patterns across ecosystem
- [ ] Grove voice maintained throughout
- [ ] All gathering chains functional
- [ ] Users prefer gatherings for complex work

---

## Next Steps

1. **Review this plan** — Confirm scope and priorities
2. **Start with Beaver** — Implement Tier 1 highest priority
3. **Test the metaphor** — Use each animal, refine based on feel
4. **Iterate on phases** — Ensure patterns feel natural
5. **Build gathering chains** — Once individual animals exist
6. **Document the forest** — Create "Field Guide to Grove Animals"

---

*The forest thrives when every animal knows its role.* 🌲

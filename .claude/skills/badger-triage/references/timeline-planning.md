# Badger Triage — Timeline Planning Reference

## Milestone Planning

Milestones group issues around a shared deadline. Use them when:
- Planning a sprint (e.g., "February Sprint")
- Working toward a launch (e.g., "v1.0 Launch")
- Targeting a customer deliverable

### Creating Milestones

```bash
gh api repos/AutumnsGrove/Lattice/milestones \
  --method POST \
  -f title="February Sprint" \
  -f description="Auth improvements and dashboard polish" \
  -f due_on="2026-02-28T00:00:00Z"
```

### Viewing Milestones

```bash
gh api repos/AutumnsGrove/Lattice/milestones
```

### Assigning Issues to Milestones

```bash
gh issue edit 415 --milestone "February Sprint"
gh issue edit 412 --milestone "February Sprint"
```

## Sprint Structure

**Sprint duration:** Typically 2 weeks

**Sprint planning flow:**
1. Review current First Focus and Next Up issues
2. Estimate capacity (hours available this sprint)
3. Sum sizes of candidate issues: XS=1hr, S=2hr, M=5hr, L=15hr, XL=35hr
4. Move selected issues to Ready
5. Create sprint milestone and assign
6. Set target dates on key issues

**Sprint review:**
- What got Done?
- What stayed In Progress?
- What should move to Far Off (wasn't picked up for a reason)?

## Target Date Guidelines

Target dates are aspirational, not deadlines. Use them to:
- Surface upcoming work during triage reviews
- Group related issues that should ship together
- Plan around external commitments (launches, demos)

**Setting target dates:**

```bash
# Via GraphQL (project item field)
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: "PVT_kwHOAiMO684BNUxo"
      itemId: "ITEM_ID"
      fieldId: "PVTF_lAHOAiMO684BNUxozg8WnIE"
      value: { date: "2026-02-15" }
    }
  ) { projectV2Item { id } }
}'
```

## Timeline Discussion Script

Present timeline suggestions conversationally:

```
For the issues we just sized:

#415 (XS bug) — Could be done by Feb 5? Bugs like this are quick.
#412 (S endpoint) — Maybe Feb 10? It depends on #415 not blocking it.
#418 (L multi-provider) — This needs more time. Mid-March looks realistic.

Want me to set these target dates?
```

## Triage Modes

### Quick Triage

"Just size and prioritize what's obvious"
- Focus on issues with clear scope
- Skip anything ambiguous for later
- Fast path for backlog grooming

### Deep Triage

"Let's really organize this"
- Full discussion on each batch
- Includes timeline planning
- Sets up milestones and target dates
- Moves items between columns thoughtfully

### Sprint Planning

"What should I work on next?"
- Focus on moving items to Ready and In Progress
- Prioritize First Focus and Next Up
- Set near-term target dates
- Ideal for weekly planning sessions

## Working with Bee

The bee and badger are a natural pair:

```
Bee-Collect          Badger-Triage
───────────────      ────────────────
Brain dump    →      Raw issues
    ↓                    ↓
Parse TODOs   →      Survey hive
    ↓                    ↓
Create issues →      Size & prioritize
    ↓                    ↓
Deposit in hive →    Place in burrow
```

**Typical workflow:**
1. `/bee-collect` — dump your ideas, bee creates issues
2. `/badger-triage` — badger organizes what bee collected

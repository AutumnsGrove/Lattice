# Badger Triage — GitHub GraphQL Reference

## Project IDs

**Project ID:** `PVT_kwHOAiMO684BNUxo`

## Field IDs

### Status Field
**Field ID:** `PVTSSF_lAHOAiMO684BNUxozg8Wm9E`

| Name | ID |
|------|----|
| Backlog | `f75ad846` |
| Ready | `61e4505c` |
| In progress | `47fc9ee4` |
| In review | `df73e18b` |
| Done | `98236657` |

### Priority Field
**Field ID:** `PVTSSF_lAHOAiMO684BNUxozg8WnH0`

| Name | ID |
|------|----|
| First Focus | `aa1d5ead` |
| Next Up | `c92ef786` |
| In Time | `88c3eb14` |
| Far Off | `ce4748e6` |

### Size Field
**Field ID:** `PVTSSF_lAHOAiMO684BNUxozg8WnH4`

| Name | ID |
|------|----|
| XS | `6c6483d2` |
| S | `f784b110` |
| M | `7515a9f1` |
| L | `817d0097` |
| XL | `db339eb2` |

### Date Fields

| Name | Field ID |
|------|----------|
| Start date | `PVTF_lAHOAiMO684BNUxozg8WnIA` |
| Target date | `PVTF_lAHOAiMO684BNUxozg8WnIE` |

## Query: Fetch Open Issues

```bash
gh api graphql -f query='
query {
  repository(owner: "AutumnsGrove", name: "Lattice") {
    issues(first: 100, states: OPEN) {
      nodes {
        number
        title
        labels(first: 10) {
          nodes { name }
        }
        projectItems(first: 1) {
          nodes {
            id
            fieldValues(first: 10) {
              nodes {
                ... on ProjectV2ItemFieldSingleSelectValue {
                  name
                  field { ... on ProjectV2SingleSelectField { name } }
                }
              }
            }
          }
        }
      }
    }
  }
}'
```

## Mutation: Update Size

```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: "PVT_kwHOAiMO684BNUxo"
      itemId: "PVTI_..."
      fieldId: "PVTSSF_lAHOAiMO684BNUxozg8WnH4"
      value: { singleSelectOptionId: "f784b110" }
    }
  ) { projectV2Item { id } }
}'
```

Replace `singleSelectOptionId` with the ID for the desired size (XS=`6c6483d2`, S=`f784b110`, M=`7515a9f1`, L=`817d0097`, XL=`db339eb2`).

## Mutation: Update Priority

```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: "PVT_kwHOAiMO684BNUxo"
      itemId: "PVTI_..."
      fieldId: "PVTSSF_lAHOAiMO684BNUxozg8WnH0"
      value: { singleSelectOptionId: "aa1d5ead" }
    }
  ) { projectV2Item { id } }
}'
```

Replace `singleSelectOptionId` with the ID for the desired priority.

## Mutation: Update Status

```bash
gh api graphql -f query='
mutation {
  updateProjectV2ItemFieldValue(
    input: {
      projectId: "PVT_kwHOAiMO684BNUxo"
      itemId: "PVTI_..."
      fieldId: "PVTSSF_lAHOAiMO684BNUxozg8Wm9E"
      value: { singleSelectOptionId: "61e4505c" }
    }
  ) { projectV2Item { id } }
}'
```

Replace `singleSelectOptionId` with the ID for the desired status (e.g., `61e4505c` for Ready).

## Mutation: Set Target Date

```bash
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

## Milestone Operations

**Create a milestone:**

```bash
gh api repos/AutumnsGrove/Lattice/milestones \
  --method POST \
  -f title="v1.0 Launch" \
  -f description="Core functionality ready for public use" \
  -f due_on="2026-03-15T00:00:00Z"
```

**Assign issue to milestone:**

```bash
gh issue edit 415 --milestone "v1.0 Launch"
```

**List milestones:**

```bash
gh api repos/AutumnsGrove/Lattice/milestones
```

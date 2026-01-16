# Planning Documents

This directory organizes planning documentation through its lifecycle.

## Workflow

```
planning/ ──→ planned/ ──→ completed/
   ↑            ↑            ↑
   │            │            │
 Active      Ready for    Implemented
 research    implementation
```

## Directories

### `planning/`
Documents actively being researched or designed. May be incomplete or have open questions.

### `planned/`
Fully specified documents ready for implementation. All questions resolved, implementation approach defined.

### `completed/`
Implemented plans kept for historical reference. Useful for understanding past decisions.

## Moving Documents

When a plan is ready for implementation:
1. Review for completeness
2. Move from `planning/` to `planned/`
3. Update any cross-references

When implementation is complete:
1. Move from `planned/` to `completed/`
2. Add completion date to document header
3. Link to relevant code/PRs if applicable

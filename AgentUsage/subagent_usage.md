# Subagent Usage Guide

## Core Principle: Subagent-First Development

**MANDATORY**: Use custom subagents for all complex, non-trivial tasks. Each subagent handles ONE focused responsibility within strict token limits.

**Note**: This guide covers CUSTOM subagents for complex projects. For simpler codebase searches and analysis (20+ files), use the built-in `house-research` agent documented in `house_agents.md`.

---

## Critical Process Ordering

Tasks MUST proceed through these phases in strict order:

1. **RESEARCH PHASE** - Complete ALL research before ANY development
2. **DEVELOPMENT PHASE** - Complete ALL development before ANY testing
3. **TESTING PHASE** - Only after development is finalized

**NEVER** skip ahead. **NEVER** mix phases. **NEVER** write code during research.

---

## Phase 1: Research (Always First)

### Required Research Subagents

Before writing ANY code, spawn these subagents:

1. **Requirements Analysis Subagent**
   - Extract and clarify all requirements
   - Identify ambiguities and assumptions
   - Define success criteria
   - Output: `requirements.md`
   - Commit Type: `docs`

2. **Technical Research Subagent**
   - Research best practices for the technology stack
   - Identify potential libraries/tools
   - Research common pitfalls and solutions
   - Output: `technical_research.md`
   - Commit Type: `docs`

3. **Architecture Planning Subagent**
   - Design high-level architecture
   - Define component boundaries
   - Plan data flow and interfaces
   - Output: `architecture_plan.md`
   - Commit Type: `docs`

4. **Edge Case Analysis Subagent**
   - Identify potential edge cases
   - Research error handling strategies
   - Define validation requirements
   - Output: `edge_cases.md`
   - Commit Type: `docs`

### Research Phase Completion Gate

- All research subagents have completed
- All research artifacts are created and committed
- No unresolved questions remain
- Architecture is fully planned
- All research commits are in git history

**Only then proceed to Development Phase**

---

## Phase 2: Development (After Research Complete)

### Development Strategy

1. **Component Isolation**: Each major component gets its own subagent
2. **Sequential Building**: Build dependencies before dependents
3. **Incremental Integration**: Integrate components one at a time
4. **Atomic Commits**: Each subagent commits its work before handoff

### Required Development Subagents

1. **Core Infrastructure Subagent**
   - Set up project structure
   - Create base configurations
   - Implement shared utilities
   - Commit Type: `feat` or `chore`

2. **Component Development Subagents** (one per component)
   - Implement single component/module
   - Follow architecture plan exactly
   - Include inline documentation
   - Commit Type: `feat`

3. **Integration Subagent**
   - Connect components
   - Implement data flow
   - Handle inter-component communication
   - Commit Type: `feat` or `refactor`

4. **Documentation Subagent**
   - Create user documentation
   - Write API documentation
   - Create usage examples
   - Commit Type: `docs`

### Development Phase Completion Gate

- All components implemented
- All integrations complete
- Documentation created
- Code is functional (not tested)
- All development commits are in git history

**Only then proceed to Testing Phase**

---

## Phase 3: Testing (After Development Complete)

### Testing Strategy

1. **Test Planning Subagent**
   - Create comprehensive test plan
   - Define test cases for each component
   - Plan integration test scenarios
   - Commit Type: `docs`

2. **Unit Test Development Subagent**
   - Write unit tests per test plan
   - One subagent per component's tests
   - Include edge case coverage
   - Commit Type: `test`

3. **Integration Test Subagent**
   - Write integration tests
   - Test component interactions
   - Validate data flow
   - Commit Type: `test`

4. **Test Execution Subagent**
   - Run all tests
   - Document results
   - Identify any failures
   - Commit Type: `docs` or `chore`

---

## Git Commit Protocol

### MANDATORY: Commit Before Handoff

Every subagent MUST commit its work before producing the completion artifact.

**Process Flow:**
1. Complete your assigned task
2. Review all files created/modified (`git diff`)
3. Read `GIT_COMMIT_STYLE_GUIDE.md`
4. Determine appropriate commit type
5. Write commit message following the guide
6. Stage changes (`git add`)
7. Execute `git commit`
8. Capture commit hash
9. Include commit information in completion artifact
10. Produce handoff documentation

### Commit Type Mapping by Subagent

| Subagent Type | Commit Type | Example Message |
|---------------|-------------|-----------------|
| **Research Phase** |
| Requirements/Technical/Architecture/Edge Cases | `docs` | `docs: Add requirements analysis and success criteria` |
| **Development Phase** |
| Core Infrastructure | `feat` or `chore` | `feat: Set up project structure with configuration` |
| Component Development | `feat` | `feat: Implement JWT authentication module` |
| Bug Fix | `fix` | `fix: Correct token expiration validation logic` |
| Integration | `feat` or `refactor` | `feat: Integrate auth module with API endpoints` |
| Code Refactoring | `refactor` | `refactor: Extract validation logic into helpers` |
| Documentation | `docs` | `docs: Add API documentation with usage examples` |
| **Testing Phase** |
| Test Planning | `docs` | `docs: Add comprehensive test plan for auth system` |
| Unit/Integration Tests | `test` | `test: Add unit tests for authentication module` |
| Test Execution | `docs` or `chore` | `docs: Add test execution results` |

### Commit Message Template

```bash
<type>: <short description (≤50 chars)>

<optional body explaining what and why>

Subagent: [Subagent Name/Role]
Phase: [Research/Development/Testing]
```

### Examples of Good Subagent Commits

```bash
# Research Phase
git commit -m "docs: Add requirements analysis

Extracted and clarified all requirements from initial brief.
Identified 3 key ambiguities requiring user clarification.

Subagent: Requirements Analysis
Phase: Research"

# Development Phase
git commit -m "feat: Implement user authentication module

Added JWT-based authentication with login/logout endpoints,
token generation/validation, and bcrypt password hashing.

Subagent: Component Development (Auth)
Phase: Development"
```

### Commit Guidelines

**DO:** Read `GIT_COMMIT_STYLE_GUIDE.md` before committing, use imperative mood, keep subject under 50 chars, include subagent name/phase in body, commit only complete work

**DON'T:** Use vague messages ("WIP", "Update files"), commit failed/incomplete work, use past tense, exceed 50 chars in subject, commit during error recovery

**When NOT to Commit:** Failed tasks, no file changes, error recovery/analysis, coordinator analysis only, incomplete work

---

## Context Management Rules

### Context Inheritance Hierarchy

```
Project Requirements (base context)
    ↓
Research Artifacts (+ commit hashes)
    ↓
Architecture Plan (+ commit hash)
    ↓
Component Interfaces (+ commit hashes)
    ↓
Implementation Details (+ commit hashes)
```

### Context Pruning Strategy

- **Pass Forward**: Only essential outputs, not full code
- **Summarize**: Previous phase outputs into bullet points
- **Reference**: Use file references and commit hashes instead of inline content
- **Focus**: Each subagent gets ONLY relevant context
- **Git History**: Reference previous subagent commits for context

### Token Optimization

Each subagent should receive:
- Core requirements (< 500 tokens)
- Phase-specific context (< 2000 tokens)
- Relevant previous outputs (< 1000 tokens)
- Clear instructions (< 500 tokens)
- Commit references (< 100 tokens)

**Total context per subagent: ~4000 tokens maximum**

---

## Handoff Protocol

### Subagent Output Format

Every subagent MUST produce a completion artifact with:
- **Git Commit Information**: Hash (full), type, message, files changed
- **Summary**: 2-3 sentences of accomplishments
- **Key Outputs**: Created files, decisions, critical findings
- **Next Steps**: Recommended next subagent, required inputs, context to pass
- **Concerns/Blockers**: Issues encountered, risks identified
- **Success Criteria Met**: Checklist of completed criteria

### Handoff Rules

1. **Explicit Handoff**: Previous subagent states completion
2. **Artifact Validation**: Verify expected outputs exist
3. **Commit Verification**: Confirm commit successful
4. **Context Transfer**: Pass completion artifact + relevant context only
5. **No Backtracking**: Cannot return to previous phase without rollback

---

## Common Task Decompositions

### Web Application

**Research Phase** (5-6 subagents): Requirements analysis, frontend/backend/database research, security requirements
**Development Phase** (8-10 subagents): Project setup, database schema, backend API (auth/user endpoints), frontend components (login/dashboard), integration
**Testing Phase** (4-5 subagents): Test planning, backend/frontend unit tests, integration tests

**Total commits: ~21-24 atomic, well-documented commits**

---

## Error Recovery

### When a Subagent Fails

1. **Analyze**: Spawn diagnostic subagent (no commit)
2. **Rollback**: Only revert failed work (`git revert [hash]` if committed)
3. **Adjust Context**: Refine and retry
4. **Retry Success**: Commit with reference to retry
5. **Escalation**: After 2 failures, spawn coordinator subagent

**Commit Rules**: Failed/diagnostic subagents don't commit; successful retries do commit; use git revert for rollbacks

### Coordinator Subagent

**Use when**: Multiple failures, contradictory requirements, architecture revision needed, user clarification required

**Responsibilities**: Analyze attempts/commits, identify root cause, propose solution (does NOT commit - analysis only)

After coordinator analysis, spawn new implementation subagent which WILL commit.

---

## Best Practices

### DO
- Complete research before coding; use subagents for components > 100 lines
- Provide structured handoff artifacts; validate phase completion
- Read `GIT_COMMIT_STYLE_GUIDE.md`; commit before completion artifact
- Use appropriate commit type; include hash/details in artifact
- Pass only essential context; reference commits not code; keep context < 4000 tokens

### DON'T
- Mix research and implementation; skip research phase; test before development complete
- Commit with "WIP"/"temp" or vague messages; commit failed/incomplete work
- Use past tense; exceed 50 chars in subject; commit during error recovery
- Pass entire codebases or irrelevant context; exceed token limits

---

## Quick Reference Card

### Subagent Workflow
```
1. Read GIT_COMMIT_STYLE_GUIDE.md
2. Receive context (≤4000 tokens)
3. Execute focused task
4. Review changes (git diff)
5. Determine commit type
6. Write commit message
7. Commit (git add + git commit)
8. Capture commit hash
9. Produce completion artifact
10. Hand off to next subagent
```

### Phase → Commit Type Mapping
- **Research Phase** → `docs:`
- **Development Phase** → `feat:`, `fix:`, `refactor:`
- **Testing Phase** → `test:`, `docs:`
- **Infrastructure** → `chore:`, `build:`, `ci:`
- **Performance** → `perf:`
- **Styling** → `style:`

### Commit Message Format
```
<type>: <description (≤50 chars)>

<body explaining what and why>

Subagent: [Name]
Phase: [Phase]
```

### Emergency Commands
```bash
# Revert last commit
git revert HEAD

# Reset (dangerous - use carefully)
git reset --hard HEAD~1

# See what changed
git diff HEAD~1

# View commit details
git show [commit-hash]
```

---

## Related Guides

- **`house_agents.md`** - Built-in house agents for simpler codebase searches
- **`git_guide.md`** - Detailed commit message standards and git workflow
- **`research_workflow.md`** - Deep dive into research phase best practices

---

## Remember: The Power of Subagents

The effectiveness of subagents lies in:

1. **Focused Expertise**: Each subagent excels at ONE thing
2. **Context Efficiency**: Small, relevant contexts produce better outputs
3. **Process Discipline**: Strict ordering prevents wasted effort
4. **Clear Handoffs**: Structured artifacts ensure continuity
5. **Atomic Commits**: Each change is isolated, documented, and revertible
6. **Git History**: Timeline of work becomes a valuable project artifact

**USE SUBAGENTS EXTENSIVELY. COMMIT ATOMIC CHANGES. YOUR EFFECTIVENESS DEPENDS ON IT.**

---

*This guide ensures that subagent-driven development produces not only high-quality code, but also a high-quality, navigable git history that serves as living documentation of the development process.*

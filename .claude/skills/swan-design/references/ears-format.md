# Swan Design — EARS Requirements Format & Structured Patterns

## EARS (Easy Approach to Requirements Syntax)

EARS provides structured, unambiguous requirements patterns. Use these in technical specifications when requirements need to be precise.

### The Five EARS Patterns

**1. Ubiquitous (always true)**
```
The [system] shall [action].

Examples:
The system shall store all post content in UTF-8 encoding.
The system shall log every authentication attempt.
```

**2. Event-Driven (triggered by an event)**
```
When [trigger event], the [system] shall [action].

Examples:
When a Wanderer publishes a post, the system shall notify subscribed Rooted readers.
When an authentication token expires, the system shall redirect to the login page.
```

**3. Unwanted Behavior (handling bad conditions)**
```
If [unwanted condition], then the [system] shall [action].

Examples:
If a database query fails, then the system shall return a Signpost error and log the failure.
If an uploaded file exceeds the size limit, then the system shall reject it with a clear error.
```

**4. State-Driven (while in a specific state)**
```
While [system state], the [system] shall [action].

Examples:
While a post is in Draft status, the system shall not include it in public feeds.
While maintenance mode is active, the system shall serve a maintenance page to all requests.
```

**5. Optional Feature (conditional requirement)**
```
Where [feature is included], the [system] shall [action].

Examples:
Where analytics tracking is enabled, the system shall record page views without collecting PII.
Where a custom domain is configured, the system shall serve the tenant's blog on that domain.
```

### Combining EARS Patterns

Complex requirements can combine patterns:

```
While [state], when [trigger], if [condition], the [system] shall [action].

Example:
While a user is authenticated, when they submit a post form, if the title is empty,
the system shall return a validation error without saving the post.
```

## Structured Requirements in Grove Specs

### Requirements Table Format

```markdown
## Requirements

| ID | Pattern | Requirement | Priority |
|----|---------|-------------|----------|
| REQ-001 | Ubiquitous | The system shall validate all input server-side | Must Have |
| REQ-002 | Event-Driven | When a post is published, notify subscribers | Should Have |
| REQ-003 | Unwanted | If auth fails, return GROVE-API-020 error | Must Have |
| REQ-004 | State-Driven | While in maintenance mode, block all writes | Must Have |
```

### MoSCoW Prioritization

Use MoSCoW for requirement priority:

- **Must Have** — Required for the system to work at all
- **Should Have** — Important but not blocking launch
- **Could Have** — Nice to have if time permits
- **Won't Have (this time)** — Explicitly out of scope

### Acceptance Criteria Format

For each requirement, acceptance criteria define "done":

```markdown
### REQ-002: Post Published Notification

**Requirement:** When a Wanderer publishes a post, the system shall notify
subscribed Rooted readers via email within 5 minutes.

**Acceptance Criteria:**
- [ ] Email sent to all active Rooted subscribers within 5 minutes of publication
- [ ] Email contains post title, excerpt, and link
- [ ] Failed deliveries are logged with Signpost error code
- [ ] Unpublishing a post does NOT send a retraction email
- [ ] Email respects Rooted reader's notification preferences

**Out of Scope:**
- Push notifications (future milestone)
- In-app notification bell (separate feature)
```

## When to Use EARS in Grove Specs

Use EARS patterns when:
- The spec covers a system with multiple actors and states
- Requirements need to be unambiguous for a complex feature
- The spec will be handed to a team for implementation
- Security or compliance requirements need formal documentation

Skip EARS and use plain prose when:
- The spec is an exploratory design document
- The system is simple and well-understood
- The audience is familiar with the domain

## Non-EARS Structured Requirements

Sometimes a simple ordered list works better than full EARS syntax:

```markdown
## System Requirements

### Authentication
- All routes except `/` and `/login` require a valid session
- Sessions expire after 24 hours of inactivity
- Session tokens use CSPRNG generation (128 bits minimum)

### Multi-Tenancy
- Every database query must include `WHERE tenant_id = ?`
- Tenants cannot access each other's data under any circumstances
- Cache keys must include tenant ID as a prefix
```

This is fine for internal specs where the team knows the conventions.

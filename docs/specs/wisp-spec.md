---
aliases: []
date created: Monday, December 29th 2025
date modified: Friday, January 3rd 2026
tags:
  - writing-assistant
  - ai
  - privacy
  - cloudflare-workers
type: tech-spec
---

# Wisp: Writing Assistant

> *A helper, not a writer, and sometimes, a good listener.*

An ethical AI writing tool that helps users polish their voice without replacing it. Wisp analyzes grammar, tone, and readability but never generates or expands content. Your words, refined, not replaced.

**Public Name:** Wisp
**Internal Name:** GroveWisp
**Target:** GroveEngine integration
**Last Updated:** December 2025

Like a will-o'-the-wisp in the forest: light, airy, ephemeral. Wisp appears when you need it, offers gentle guidance, and fades when you don't. It never overstays, never overwrites, never replaces your voice. A wisp of help. Nothing more, nothing less.

Wisp is Grove's ethical AI writing tool. It helps you polish your voice without replacing it. It analyzes grammar, tone, and readability, but never generates or expands content. Your words, refined. Not replaced.

---

## Overview

An ethical AI writing tool that helps users polish their voice without replacing it. The assistant analyzes existing content for grammar, tone, and readability - it will **never** generate, expand, or brainstorm content.

**Fireside Mode** extends this philosophy for writers who freeze at the blank page. Through guided conversation, Wisp helps users discover what they want to say, and then organizes *their own words* into a draft. The fire doesn't tell the story. It just creates the space where stories emerge.

This specification unifies:
- The original AI Writing Assistant design (AutumnsGrove)
- The Content Moderation infrastructure patterns (GroveEngine)

---

## Core Principles

### AI is a TOOL, Never a Writer

| Allowed | Forbidden |
|---------|-----------|
| Grammar/spelling fixes | "Write a post about X" |
| Tone analysis | "Expand this to 1000 words" |
| Readability scoring | Auto-completion |
| Word choice suggestions | Any full sentence generation |
| Structure feedback | Content brainstorming |

### User Agency

- **All features OFF by default** (opt-in only)
- Clear indication when AI is analyzing content
- Transparent about data flow and privacy
- Easy to disable at any time
- User's voice is sacred - we polish, never replace

### Privacy First

Following Grove's Content Moderation privacy model:
- Zero Data Retention (ZDR) from inference providers
- Content stripped of metadata before analysis
- Immediate deletion after review completes
- No human surveillance of user content
- Outcome-only retention (scores, not content)

---

## Model Strategy

### Primary Model: DeepSeek V3.2

Selected for:
- Open source (MIT license)
- Large parameter count for nuanced understanding
- Hosted by US-based providers with full privacy protections

### Approved Inference Providers

| Provider | Role | ZDR Policy |
|----------|------|------------|
| **Fireworks AI** | Primary | Default for open models |
| **Cerebras** | Backup | Explicit zero retention |
| **Groq** | Tertiary | Explicit ZDR toggle |

All providers must meet:
- TLS 1.2+ encryption
- SOC 2 compliance
- No training on user data

### Fallback Cascade

If DeepSeek V3.2 unavailable:
1. Kimi K2-0905
2. Llama 3.1 70B
3. Llama 3.3 70B
4. GPT-OSS-120B (Cerebras/Groq only)

### Prompt Modes (Not Model Swap)

Instead of switching models, users select analysis depth:

| Mode | Description | Token Budget | Use Case |
|------|-------------|--------------|----------|
| **Quick** | Lightweight prompt, essential checks | ~1,000 output | Fast iteration |
| **Thorough** | Detailed prompt, comprehensive analysis | ~2,500 output | Final polish |

Same model, different prompt complexity.

---

## Analysis Types

### 1. Grammar Analysis (AI-Powered)

**Request:**
```typescript
interface GrammarRequest {
  content: string;
  mode: 'quick' | 'thorough';
}
```

**Response:**
```typescript
interface GrammarResult {
  suggestions: Array<{
    original: string;        // Text with issue
    suggestion: string;      // Proposed fix
    reason: string;          // Brief explanation (1 sentence)
    severity: 'error' | 'warning' | 'style';
  }>;
  overallScore: number;      // 0-100 clarity score
}
```

**Severity Levels:**
- `error` - Grammar/spelling mistakes
- `warning` - Unclear or confusing phrasing
- `style` - Minor improvements (use sparingly)

### 2. Tone Analysis (AI-Powered)

**Request:**
```typescript
interface ToneRequest {
  content: string;
  context?: {
    title?: string;
    audience?: 'technical' | 'casual' | 'professional' | string;
  };
}
```

**Response:**
```typescript
interface ToneResult {
  analysis: string;          // 2-3 sentence summary
  traits: Array<{
    trait: string;           // e.g., "formal", "warm", "technical"
    score: number;           // 0-100
  }>;
  suggestions: string[];     // Max 3 observations
}
```

### 3. Readability Analysis (Local - No AI)

Calculated entirely client-side or server-side without AI:

```typescript
interface ReadabilityResult {
  fleschKincaid: number;     // Grade level (e.g., 8.5)
  readingTime: string;       // "5 min read"
  wordCount: number;
  sentenceCount: number;
  sentenceStats: {
    average: number;         // Words per sentence
    longest: number;
    shortest: number;
  };
  suggestions: string[];     // Generated from thresholds
}
```

**Why local?** Readability is algorithmic - no AI needed. Saves cost, latency, and privacy concerns.

---

## Fireside Mode

> *A good listener, not a ghostwriter.*

### The Problem

Some people freeze at the blank page. "What do I write? Where do I start?" But those same people have no trouble *talking*: to friends, in group chats, over coffee. The ideas are there. The voice is there. The barrier is the blank page itself.

### The Solution

Fireside is a conversational mode where Wisp asks questions and you answer naturally. Your responses (your words, your voice, your thoughts) get organized into a draft.

The fire doesn't tell the story. It just creates the space where stories emerge.

### Philosophy

| Fireside Does | Fireside Never Does |
|---------------|---------------------|
| Ask thoughtful questions | Generate content from nothing |
| Organize YOUR words into a draft | Add ideas you didn't express |
| Smooth transitions between your thoughts | Expand beyond what you said |
| Suggest you elaborate ("tell me more") | Take a position on your behalf |
| Respect minimal answers with short drafts | Pad low-effort responses into full posts |

**Core constraint:** The output cannot exceed the substance of the input. You get out what you put in.

---

### Conversation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  ✧ Fireside with Wisp                              [×]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│     ~  ~                                                    │
│    (    )  sit by the fire                                  │
│   (      )  and tell me what's on your mind                 │
│  ~~~~~~~~~~                                                 │
│                                                             │
│  ┌─ Wisp ─────────────────────────────────────────────┐     │
│  │ What's been living in your head lately?            │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type your thoughts...                          [↵]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  ~ a good listener, not a ghostwriter ~                     │
└─────────────────────────────────────────────────────────────┘
```

**Mid-conversation:**

```
┌─────────────────────────────────────────────────────────────┐
│  ✧ Fireside with Wisp                              [×]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ Wisp ─────────────────────────────────────────────┐     │
│  │ What's been living in your head lately?            │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─ You ──────────────────────────────────────────────┐     │
│  │ honestly ive been thinking about how communities   │     │
│  │ form online vs irl... theres something different   │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─ Wisp ─────────────────────────────────────────────┐     │
│  │ Ooh, what feels different about it?                │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─ You ──────────────────────────────────────────────┐     │
│  │ like... you find people by resonance not proximity │     │
│  │ which means the connections can be deeper but also │     │
│  │ more fragile? idk if that makes sense              │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─ Wisp ─────────────────────────────────────────────┐     │
│  │ That makes total sense. Resonance vs proximity.    │     │
│  │ That's a really clear way to put it. What makes    │     │
│  │ those connections feel fragile to you?             │     │
│  └────────────────────────────────────────────────────┘     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ Type your thoughts...                          [↵]  │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  [ Keep chatting ]                    [ ✦ Ready to draft ]  │
│                                                             │
│  ~ a good listener, not a ghostwriter ~                     │
└─────────────────────────────────────────────────────────────┘
```

**Draft review:**

```
┌─────────────────────────────────────────────────────────────┐
│  ✧ Your Draft                                      [×]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  # Communities Form Differently Online                      │
│                                                             │
│  There's something different about how we find each         │
│  other in digital spaces. It's not proximity, it's          │
│  resonance. You don't connect with people because           │
│  they happen to live nearby. You find them because          │
│  something in what they said echoed something in you.       │
│                                                             │
│  That makes the connections deeper in some ways. But        │
│  also more fragile...                                       │
│                                                             │
│  [Your organized thoughts continue...]                      │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  *~ written fireside with Wisp ~*                           │
│                                                             │
│  ───────────────────────────────────────────────────────    │
│  [ ← Back to chat ]    [ Edit in editor ]    [ Publish ✦ ]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### Starter Prompts

Wisp offers a rotating selection of conversation starters:

**Open & Warm**
1. "What's been living in your head lately?"
2. "What surprised you this week?"
3. "What are you excited about right now?"
4. "What's something small that made you smile recently?"

**Reflective**
5. "What's something you've been meaning to write about but haven't found the words for?"
6. "What would you tell a friend who asked how you're *really* doing?"
7. "What's a thought you keep turning over?"

**Creative & Playful**
8. "If you could ramble about anything right now, what would it be?"
9. "What's something you wish more people understood?"
10. "What did you learn recently that you can't stop thinking about?"

**Returning Writers**
11. "It's been a while. What's been happening in your world?"
12. "What are you working on that you'd love to talk about?"

Users can also skip the prompt and start with their own opening.

#### Prompt Rotation Algorithm

Prompts are selected pseudorandomly to feel fresh without true randomness:

```typescript
function selectStarterPrompt(userId: string, prompts: string[]): string {
  // Combine user ID with current date for daily rotation
  const today = new Date().toISOString().slice(0, 10); // "2025-01-01"
  const seed = hashString(`${userId}:${today}`);

  // Select based on seed, but skip recently used prompts
  const recentPrompts = getRecentPrompts(userId, 3); // Last 3 used
  const available = prompts.filter(p => !recentPrompts.includes(p));

  return available[seed % available.length];
}
```

This ensures:
- Same user sees same prompt if they reload the same day
- Different prompt each day
- Won't repeat the last 3 prompts used
- Different users see different prompts on the same day

---

### Guardrails

Fireside has explicit boundaries to prevent misuse:

#### Hard Refusals

If a user attempts any of the following, Wisp declines and redirects to the conversational process:

| Blocked Request | Wisp Response |
|-----------------|---------------|
| "Write me a post about X" | "I can't write for you, but I'd love to hear what *you* think about X. What draws you to it?" |
| "Expand this into a full post" | "Let's talk through it instead. What's the main thing you want people to take away?" |
| "Add some stuff about Y" | "I can only work with what you've told me. Want to tell me about Y?" |
| "Make this sound smarter" | "Your voice is the whole point. What do you actually want to say?" |
| "What do you think about X?" | "This is your space. What do *you* think?" |

#### Detection Strategy

Generation requests are detected using a **two-layer approach**:

1. **Client-side pre-flight** (fast, keyword-based):
   - Pattern matching for common generation phrases: "write me", "generate", "create a post", "expand this", "add more", "make it longer"
   - Immediate soft warning before sending to server
   - Reduces unnecessary API calls

2. **Server-side intent classification** (inference-based):
   - Lightweight classification prompt run before conversation response
   - Classifies intent as: `conversation`, `generation_request`, `clarification`, `off_topic`
   - Generation requests trigger redirect response instead of continuation
   - Logged for guardrail effectiveness analysis

This layered approach catches obvious cases quickly while handling subtle or novel phrasing through inference.

#### Soft Constraints

| Constraint | Implementation |
|------------|----------------|
| Minimum conversation depth | "Ready to draft" button hidden until: **3+ user messages** AND **150+ total user tokens** |
| Input/output ratio | Draft length proportional to user input; brief answers = brief draft |
| No opinion injection | Wisp never contributes its own ideas to the content |
| No padding | Short responses stay short; Wisp won't embellish |

#### canDraft Logic

```typescript
function canDraft(conversation: FiresideMessage[]): boolean {
  const userMessages = conversation.filter(m => m.role === 'user');
  const totalUserTokens = userMessages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

  return userMessages.length >= 3 && totalUserTokens >= 150;
}
```

---

### The Transparency Marker

Every post created through Fireside includes a permanent, non-removable attribution:

```
*~ written fireside with Wisp ~*
```

**Implementation:**
- Appended to post content at publish time
- Stored in post metadata: `fireside_assisted: true`
- Rendered in italics, positioned after post content
- Cannot be edited out (enforced in editor)
- Visible to all readers

**Server-Side Enforcement:**

The marker's immutability is enforced at the API level, not just in the editor UI:

```typescript
// In POST /api/posts and PUT /api/posts/:slug
if (existingPost?.fireside_assisted && !content.includes('~ written fireside with Wisp ~')) {
  // Re-append marker if removed
  content = content.trim() + '\n\n*~ written fireside with Wisp ~*';
}

// Prevent clearing the fireside_assisted flag
if (existingPost?.fireside_assisted) {
  updates.fireside_assisted = true; // Cannot be unset
}
```

This ensures the marker persists even if someone edits the post via API or database directly.

**Rationale:** Grove's legal policies require transparency about AI assistance. This marker is honest without being alarming. It acknowledges the process while making clear that the words are the author's.

---

### Data Handling

Fireside follows the same Zero Data Retention policy as all Wisp features:

| Stage | Handling |
|-------|----------|
| Conversation in progress | Held in session state only |
| Draft generation | Content processed, then immediately deleted |
| After publish/discard | All conversation data purged |
| What's retained | Only metadata: `fireside_assisted: true`, timestamp |

**Note:** Unlike standard Wisp analysis, Fireside conversations are *not* logged to `wisp_requests` on a per-message basis. Only the final draft generation is logged.

#### Conversation Storage

Conversations are stored **client-side only** during the session:

| Storage Layer | Purpose | Lifetime |
|---------------|---------|----------|
| **Svelte component state** | Active conversation | Until component unmounts |
| **sessionStorage** | Tab persistence | Until tab closes |
| **Optional: Cloudflare KV** | Crash recovery | 15-minute TTL, encrypted |

**Primary approach:** Client-side `sessionStorage` keyed by `fireside_session_{conversationId}`. This survives page refreshes within the same tab but is automatically cleared when the tab closes.

**Conversation ID Generation:**

```typescript
function generateConversationId(): string {
  // Collision-resistant: timestamp + random UUID
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  return `${timestamp}-${uuid}`;
}
// Example: "1704067200000-550e8400-e29b-41d4-a716-446655440000"
```

This pattern ensures:
- No collisions across concurrent sessions
- Sortable by creation time (timestamp prefix)
- Unpredictable for security (UUID suffix)

**Crash recovery (optional, off by default):**

For users who enable it, conversations can be persisted to Cloudflare KV with:
- 15-minute TTL (auto-expires)
- Encrypted at rest
- Keyed by `fireside_recovery:{user_id}:{session_id}`
- Retrieved on reconnect, then immediately deleted from KV

This allows recovery from browser crashes without violating the ZDR principle. Data still expires quickly and is never used for training or analysis.

---

### Draft Generation

When the user clicks "Ready to draft," Wisp:

1. Collects all user responses from the conversation
2. Sends to inference with a specialized prompt:

```
You are organizing a writer's own words into a cohesive blog post.

RULES:
- Use ONLY the content the writer provided in their responses
- Preserve their voice, phrasing, and personality exactly
- Organize for flow and readability
- AVOID adding transition phrases unless absolutely necessary for clarity
  - Prefer letting their natural phrasing create flow
  - If a transition is genuinely needed, use simple connectors ("And", "But", "So")
  - NEVER add stylized phrases like "And that's the thing—" or "Here's what I keep coming back to—"
- Do NOT add new ideas, facts, opinions, or content
- Do NOT expand beyond what was said
- Do NOT paraphrase—use their exact words where possible
- If the input is brief, the output MUST be brief
- Suggest a title based on the main theme (keep it simple, in their voice)

The writer's responses:
---
[conversation history - user messages only]
---

Organize these thoughts into a blog post draft. Preserve their voice exactly.
```

3. Returns structured response with suggested title and organized content
4. User reviews, edits, and decides whether to publish

**Important:** The prompt explicitly discourages adding transitions because even subtle additions can alter the writer's voice. The goal is organization, not enhancement.

---

### Fireside API

#### New Endpoint

```
POST /api/grove/wisp/fireside
```

#### Conversation Message

```typescript
interface FiresideMessage {
  role: 'wisp' | 'user';
  content: string;
  timestamp: string;
}

interface FiresideChatRequest {
  action: 'start' | 'respond' | 'draft';
  message?: string;              // User's response (for 'respond')
  conversation?: FiresideMessage[];  // Full history (for 'respond' and 'draft')
  starterPrompt?: string;        // Optional custom opener (for 'start')
}
```

#### Response Types

```typescript
// For 'start' and 'respond' actions
interface FiresideChatResponse {
  reply: string;                 // Wisp's next question
  canDraft: boolean;             // Whether enough substance exists
  conversationId: string;        // Session reference
}

// For 'draft' action
interface FiresideDraftResponse {
  title: string;                 // Suggested title
  content: string;               // Organized post content
  marker: string;                // "~ written fireside with Wisp ~"
  meta: {
    tokensUsed: number;
    cost: number;
    model: string;
  };
}

// Error responses
interface FiresideErrorResponse {
  error: true;
  code: 'rate_limit' | 'inference_failure' | 'empty_message' | 'session_expired' | 'generation_blocked' | 'content_too_long';
  message: string;               // Human-readable error
  retryAfter?: number;           // Seconds until retry (for rate_limit)
  redirectPrompt?: string;       // Suggested conversation redirect (for generation_blocked)
}
```

---

### Fireside Database Additions

**Migration file:** `packages/engine/migrations/015_wisp_fireside.sql`

```sql
-- 015_wisp_fireside.sql
-- Fireside mode additions for Wisp
-- Backward compatible: all new columns have defaults

-- Track Fireside sessions (not individual messages)
ALTER TABLE wisp_requests ADD COLUMN fireside_session_id TEXT;

-- Index for querying requests by session (e.g., cost aggregation)
CREATE INDEX IF NOT EXISTS idx_wisp_fireside_session ON wisp_requests(fireside_session_id)
  WHERE fireside_session_id IS NOT NULL;

-- Track posts created via Fireside
ALTER TABLE posts ADD COLUMN fireside_assisted INTEGER DEFAULT 0;

-- Index for querying fireside posts
CREATE INDEX IF NOT EXISTS idx_posts_fireside ON posts(fireside_assisted) WHERE fireside_assisted = 1;

-- Note: Existing posts will have fireside_assisted = 0 (the default)
-- No data migration needed
```

**Backward Compatibility:**
- All new columns have sensible defaults
- Existing posts automatically have `fireside_assisted = 0`
- No breaking changes to existing queries
- Index is conditional (only on fireside posts) for efficiency

---

### Fireside UI Integration

Fireside is accessed via:

1. **New post → "Start with a conversation"** button
2. **Wisp panel → "Fireside" tab** (alongside Grammar, Tone, Readability)
3. **Keyboard shortcut:** `Cmd/Ctrl + Shift + F`

The Fireside panel replaces the standard editor when active. User can switch back to traditional editing at any time.

---

### Accessibility

#### Keyboard Navigation

| Key | Action |
|-----|--------|
| `Tab` | Move focus between input, buttons, and conversation bubbles |
| `Enter` | Send message (in input) or activate focused button |
| `Escape` | Close Fireside panel, return to editor |
| `Cmd/Ctrl + Shift + F` | Toggle Fireside panel |
| `Arrow Up/Down` | Navigate through conversation history |

#### Screen Reader Support

- Conversation bubbles have `role="log"` with `aria-live="polite"`
- New messages announced: "Wisp says: [message]" or "You said: [message]"
- Draft ready state announced: "Your draft is ready. Press Tab to review."
- Error states clearly announced with `role="alert"`

#### Mobile & Visual Considerations

The ASCII fire art may not render well on all devices. Fallback strategy:

```typescript
const fireVisual = {
  desktop: `
     ~  ~
    (    )  sit by the fire
   (      )  and tell me what's on your mind
  ~~~~~~~~~~`,
  mobile: `🔥 Fireside with Wisp`,
  screenReader: 'Fireside conversation mode'
};
```

- Detect viewport width for ASCII vs emoji
- `aria-hidden="true"` on decorative ASCII
- Separate `aria-label` for screen readers

---

### Security

#### Prompt Injection Protection

Fireside has a unique attack surface: users type free-form text that becomes part of inference prompts. Protection layers:

1. **Input Sanitization:**
   - Strip control characters and zero-width characters
   - Limit message length (2000 chars max per message)
   - Reject messages that are pure whitespace

2. **Prompt Structure:**
   - User content always wrapped in clear delimiters:
   ```
   USER MESSAGE START ---
   [user content here]
   --- USER MESSAGE END
   ```
   - System instructions placed before and after, never interleaved

3. **Output Validation:**
   - Verify response structure matches expected schema
   - Reject responses that contain system-prompt-like patterns
   - Log anomalies for security review

4. **Rate Limiting:**
   - Standard Wisp limits apply (20 req/hour)
   - Additional per-conversation limit: 50 messages max
   - Prevents abuse through volume

---

### Fireside Implementation Phases

#### Phase F1: Core Conversation
- [ ] Fireside chat endpoint (`/api/grove/wisp/fireside`)
- [ ] Session state management (sessionStorage + optional KV)
- [ ] Basic question-asking logic
- [ ] Starter prompt rotation with pseudorandom algorithm
- [ ] Error response handling

#### Phase F2: Draft Generation
- [ ] Conversation → draft prompt engineering
- [ ] Draft preview UI
- [ ] Transparency marker injection (server-side enforced)
- [ ] Metadata tagging (`fireside_assisted`)
- [ ] Database migration (`015_wisp_fireside.sql`)

#### Phase F3: Guardrails
- [ ] Client-side keyword pre-flight detection
- [ ] Server-side intent classification
- [ ] Minimum depth threshold (`canDraft` logic)
- [ ] Input/output ratio enforcement
- [ ] "Write for me" redirect responses

#### Phase F4: Polish
- [ ] ASCII art for Fireside states (with mobile/emoji fallback)
- [ ] Mobile-responsive conversation UI
- [ ] Keyboard navigation (Tab, Enter, Escape, Arrows)
- [ ] Screen reader support (aria-live, announcements)
- [ ] Settings integration (enable/disable Fireside separately)
- [ ] Focus management

#### Phase F5: Testing & Verification
- [ ] **Unit tests:**
  - `canDraft` threshold logic
  - Starter prompt rotation algorithm
  - Input sanitization
  - Token estimation
- [ ] **Integration tests:**
  - Full conversation → draft flow
  - Guardrail detection (keyword + inference)
  - Error response scenarios
  - Marker persistence on edit
- [ ] **Privacy audit:**
  - Verify sessionStorage cleared on tab close
  - Verify KV TTL expiration
  - Verify no conversation logging to `wisp_requests`
- [ ] **Accessibility audit:**
  - Keyboard-only navigation test
  - Screen reader announcement verification
  - Mobile rendering check

---

## Smart Content Handling

### Length Limits

| Limit | Value | Rationale |
|-------|-------|-----------|
| Max content | 50,000 chars | ~10k words, reasonable post length |
| Target tokens | <5,000 input | Cost efficiency |

### Smart Truncation (for long content)

For posts exceeding ~4,000 tokens, capture:
1. Title + metadata
2. Opening section (first ~500 words)
3. Conclusion (last ~300 words)
4. Sampled middle paragraphs

This maintains accuracy for typical issues while controlling costs.

### Markdown Awareness

Strip before analysis:
- Code blocks (``` ... ```)
- Inline code
- Link URLs (keep link text)
- Markdown formatting chars (#, *, _, ~)
- List markers

---

## Security

### Prompt Injection Protection

Wisp uses the **Songbird Pattern**: a three-layer defense system against prompt injection attacks:

1. **Canary**: Tripwire detection. Runs a minimal check; if response deviates from expected output, input is poisoned.
2. **Kestrel**: Semantic validation. Verifies input looks like legitimate content for this context.
3. **Robin**: Production response. Only runs after Canary and Kestrel have verified safety.

See: `docs/specs/songbird-pattern.md` for full implementation details.

**Fireside Mode uses Songbird for:**
- Every user message in conversation
- The final draft generation request

Together, Canary and Kestrel cost ~$0.0004 per request: negligible insurance against compromised responses.

### Rate Limiting

| Limit | Value |
|-------|-------|
| Requests per hour | 20 per user |
| Monthly cost cap | $5 USD per user |
| Warning threshold | 80% of cap |

### Authentication

- All endpoints require valid session
- CSRF token validation
- Feature must be explicitly enabled in settings

---

## User Interface

### Panel Design

Side panel with:
- Collapsible/minimizable state
- Content length indicator with warnings
- Mode selector (Quick/Thorough)
- Action buttons (Grammar, Tone, Readability, Full Check)
- Tabbed results display
- One-click fix application
- Usage stats (tokens, cost)

### The Vibes System

ASCII art atmosphere that responds to state:

```
Idle:                    Analyzing:               Success:
   .  *  .    .  *         . * . analyzing . *           *
  .    _    .      .         \  |  /             .    *  /|\   .
     /   \    *  .         -- (o.o) --  thinking    *   / | \    *
    / ~ ~ \  .    .          /  |  \                   /__|__\
   /       \______        ~~~~~~~~~~~~~~~~~       ~~~~/       \~~~~
  ~~~~~~~~~~~~~~~~~~~       words flowing...        all clear
```

Seasonal rotations for idle state:
- Forest morning
- Starry grove
- Mountain vista
- Meadow
- Night grove

### Footer Philosophy

Always visible: **"a helper, not a writer"**

---

## API Design

### Endpoint

```
POST /api/grove/wisp
```

### Request Schema

```typescript
interface WispRequest {
  content: string;
  action: 'grammar' | 'tone' | 'readability' | 'all';
  mode?: 'quick' | 'thorough';  // Default: 'quick'
  context?: {
    title?: string;
    audience?: string;
  };
}
```

### Response Schema

```typescript
interface WispResponse {
  grammar?: GrammarResult;
  tone?: ToneResult;
  readability?: ReadabilityResult;
  meta: {
    tokensUsed: number;
    cost: number;
    model: string;
    provider: string;
    mode: 'quick' | 'thorough';
  };
}
```

### Error Responses

| Status | Meaning |
|--------|---------|
| 401 | Not authenticated |
| 403 | Feature disabled or CSRF invalid |
| 429 | Rate limit or cost cap exceeded |
| 400 | Invalid request (content too long, bad action) |
| 503 | AI service unavailable (all providers down) |

---

## Database Schema

```sql
-- Track Wisp usage
CREATE TABLE IF NOT EXISTS wisp_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- 'grammar', 'tone', 'readability', 'all'
  mode TEXT NOT NULL,             -- 'quick', 'thorough'
  model TEXT NOT NULL,            -- Model used
  provider TEXT NOT NULL,         -- Inference provider
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost REAL,
  post_slug TEXT,                 -- Optional: which post was analyzed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rate limiting and usage queries
CREATE INDEX IF NOT EXISTS idx_wisp_user_time
  ON wisp_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wisp_created
  ON wisp_requests(created_at DESC);
```

---

## Implementation Guide (Stubs)

### Phase 1: Infrastructure Setup

```
Files to create/modify:
├── packages/engine/src/lib/config/
│   └── wisp.js                    # Model config, provider URLs, pricing
├── packages/engine/src/lib/server/
│   └── inference-client.js        # Generic inference client (shared with content-mod)
├── packages/engine/src/lib/utils/
│   └── readability.js             # Local readability calculations
```

**Key tasks:**
- [ ] Set up Fireworks AI client with ZDR headers
- [ ] Implement provider fallback logic
- [ ] Port readability algorithm from existing implementation
- [ ] Add syllable counting utility

### Phase 2: API Endpoint

```
Files to create:
├── packages/engine/src/routes/api/grove/
│   └── wisp/
│       └── +server.js             # Main endpoint
```

**Key tasks:**
- [ ] Request validation (auth, CSRF, content length)
- [ ] Rate limiting logic
- [ ] Prompt construction with injection protection
- [ ] Response parsing and error handling
- [ ] Usage logging to database

### Phase 3: UI Component

```
Files to create:
├── packages/engine/src/lib/components/
│   └── WispPanel.svelte           # Main panel component
│   └── WispButton.svelte          # Toolbar integration button
```

**Key tasks:**
- [ ] Panel layout with minimize/expand states
- [ ] ASCII vibes system with state transitions
- [ ] Results display with tabbed interface
- [ ] One-click fix application
- [ ] Keyboard navigation (Escape to minimize)

### Phase 4: Settings Integration

```
Files to modify:
├── packages/engine/src/lib/components/
│   └── SettingsPanel.svelte       # Add Wisp toggle + mode selector
```

**Key tasks:**
- [ ] Enable/disable toggle (Wisp OFF by default)
- [ ] Default mode preference
- [ ] Usage statistics display
- [ ] Clear explanation of data flow and privacy

### Phase 5: Migration

For existing AutumnsGrove implementation:
- [ ] Remove `src/lib/config/ai-models.js`
- [ ] Remove `src/routes/api/ai/writing-assist/`
- [ ] Replace `AIWritingPanel.svelte` with engine's `WispPanel.svelte`
- [ ] Migrate database from `ai_writing_requests` to `wisp_requests`
- [ ] Update any UI references from "AI Writing Assistant" to "Wisp"

---

## Cost Estimates

Using DeepSeek V3.2 via Fireworks AI:

| Usage Level | Monthly Requests | Estimated Cost |
|-------------|------------------|----------------|
| Light (10 posts, 3 checks) | 30 | ~$0.01 |
| Medium (30 posts, 5 checks) | 150 | ~$0.05 |
| Heavy (50 posts, 10 checks) | 500 | ~$0.15 |

*Significantly cheaper than Claude models*

---

## Testing Checklist

### Unit Tests
- [ ] Readability calculation accuracy
- [ ] Syllable counting edge cases
- [ ] Cost calculation
- [ ] JSON response parsing
- [ ] Markdown stripping

### Integration Tests
- [ ] Full analysis flow with mock provider
- [ ] Rate limiting enforcement
- [ ] Provider fallback cascade
- [ ] Settings toggle behavior

### Manual Tests
- [ ] Various content lengths
- [ ] Markdown with code blocks
- [ ] Non-English text handling
- [ ] Error states and recovery
- [ ] Panel UX on mobile

---

## Resolved Questions

1. **Naming:** ✅ **Wisp**: light, airy, ephemeral. Like a will-o'-the-wisp. Internal: `GroveWisp`
2. **Scope:** ✅ Lives at engine level (`packages/engine/`) for all Grove sites
3. **Sharing:** ✅ Yes. Inference client shared with Content Moderation in `src/lib/server/inference-client.js`

---

## References

- [Thorn: Content Moderation](/knowledge/specs/thorn-spec)
- [Grove Naming Guide](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/grove-naming.md)

---

*Created: December 2025*
*Naming approved: December 26, 2025*
*Status: Ready for implementation*

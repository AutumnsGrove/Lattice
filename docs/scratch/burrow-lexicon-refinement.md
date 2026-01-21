# Burrow Lexicon Refinement

*Walking the grove to find better names for Den and Warrened*

---

## The Terms That Need Work

| Current | What it means | Problem |
|---------|---------------|---------|
| **Den** | Property configured to accept incoming burrows | Confusing. "Enable den mode" is clunky. Den = home, but we mean "open for visitors" |
| **Warrened** | Property with multiple active burrows | Obscure. Not everyone knows what a warren is. |

---

## Walk 1: Replacing "Den"

### What IS this concept?

A property that has been configured to **receive** incoming burrow connections. It's:
- A state/mode, not an action
- About being OPEN, WELCOMING, ACCEPTING
- The destination end of a burrow

### The Scene

*I'm in the grove. I want to burrow into The Prism, but I can't. Why?*

*The Prism isn't... what? It isn't open. It isn't accepting visitors. It isn't in receiving mode. It hasn't opened its doors. It hasn't lowered its defenses.*

*The Wayfinder arrives. They do something to The Prism. Now it's... what?*

*Now it's open. Now it's receiving. Now it's welcoming. Now it's accessible.*

### Nature Metaphors for "Open to Visitors"

**Burrow-adjacent:**
- **Open** — Simple, clear. "Open The Prism for burrows"
- **Receiving** — "Put The Prism in receiving mode"

**Nature-based:**
- **Hollow** — A hollow tree is open, can be entered. "The Prism is hollow" (but hollow = empty, negative)
- **Clearing** — Already taken for status page
- **Welcome** — Not nature-specific but warm

**Animal behavior:**
- **Denning** — When animals are in their den accepting visitors (but still uses "den")
- **Nesting** — Birds nest and sometimes share nests (but nesting = building, not receiving)

**Plant-based:**
- **Rooted** — Already used for subscribers
- **Flowering** — Open like a flower? "The Prism is flowering" (weird)
- **Open** — Flowers open to receive pollinators

### Testing Candidates

**"Open"**
- "Open The Prism for burrows" ✓
- "The Prism is open" ✓
- "Put The Prism in open mode" ✓
- "Is The Prism open?" ✓
- Problem: Generic. Doesn't feel Grove-y.

**"Receiving"**
- "Put The Prism in receiving mode" ✓
- "The Prism is receiving" ✓
- "Enable receiving on The Prism" ✓
- Problem: Technical. Sounds like email.

**"Welcoming"**
- "The Prism is welcoming burrows" ✓
- "Enable welcome mode" - eh
- "Make The Prism welcoming" ✓
- Problem: Doesn't work as a noun state.

**"Accessible"**
- "Make The Prism accessible" - already has meaning (a11y)
- Skip this one.

### New Direction: What do animals do?

When an animal's den is open to trusted visitors:
- The entrance is **unblocked**
- The scent says **"safe to enter"**
- The animal is **present and accepting**

What about **"Entrance"**?
- "Enable entrance on The Prism"
- "The Prism has an entrance"
- Hmm, still awkward.

What about the opposite approach? Instead of "den mode enabled", what if we say:

**"The Prism accepts burrows"**

Not a special term at all. Just describe what it does.

- `burrow_accepting: true` in the database
- "Configure The Prism to accept burrows"
- "The Prism accepts burrows" / "The Prism doesn't accept burrows"

This is clearer but loses the Grove poetry.

### The Verdict for Den → ?

**Option A: "Receiving"**
- Clear, functional
- "Put The Prism in receiving mode"
- "The Prism is receiving"
- Works as adjective and verb

**Option B: "Open"**
- Simple, universal
- "Open The Prism"
- "The Prism is open"
- Maybe too generic

**Option C: Drop the term entirely**
- Just say "accepts burrows" / "doesn't accept burrows"
- No special word needed
- Clearest but least poetic

---

## Walk 2: Replacing "Warrened"

### What IS this concept?

A property with multiple active burrows. Many users have access and can come through.

### The Scene

*The Kitchen has five Pathfinders who can burrow in. It's busy. It's connected. It's... what?*

*It has many entrances. Many tunnels lead here. Many companions share this space.*

### Nature Metaphors for "Many Connections"

**Underground/burrow:**
- **Networked** — Many connections, like a network of tunnels
- **Connected** — Simple, clear
- **Busy** — Many visitors coming through

**Social animals:**
- **Colonized** — Ants form colonies (but colonized has negative connotations)
- **Hived** — Bees in a hive (but hive isn't burrow-related)

**Root systems:**
- **Rooted** — Already taken
- **Threaded** — Many threads of connection
- **Networked** — Roots network underground

### Testing Candidates

**"Networked"**
- "The Kitchen is networked—five Pathfinders have access" ✓
- "A networked property" ✓
- Clear, modern, works
- Problem: Tech-y, not nature-y

**"Connected"**
- "The Kitchen is well-connected—five Pathfinders" ✓
- "A connected property" ✓
- Simple, clear
- Problem: Generic

**"Busy"**
- "The Kitchen is busy—five Pathfinders have access"
- Implies activity, not just access
- Problem: Busy suggests current activity, not configured access

**"Threaded"**
- "The Kitchen is threaded—five burrows lead here"
- Evokes weaving, connection
- Problem: Thread is used in Weave for diagrams

**"Populated"**
- "The Kitchen is populated—five Pathfinders"
- Clear meaning
- Problem: Populated suggests they're there now, not that they have access

### New Direction: Do we need this word?

When would we actually use "warrened"?

- In the admin UI showing "The Kitchen has 5 active burrows"
- In documentation explaining the concept
- In casual speech: "That property is [warrened]"

Maybe we don't need a special word. Just say:
- "The Kitchen has 5 active burrows"
- "5 people can burrow into The Kitchen"

### The Verdict for Warrened → ?

**Option A: "Connected"**
- "The Kitchen is connected—five Pathfinders have access"
- Simple, clear, works

**Option B: "Networked"**
- "The Kitchen is networked"
- More specific than "connected"
- Slightly tech-y

**Option C: Drop the term entirely**
- Just say "has X active burrows"
- No special word needed
- Probably the right call

---

## Final Recommendations

### Den → **Receiving**

"Receiving" captures the concept clearly:
- "Put The Prism in receiving mode" ✓
- "The Prism is receiving" ✓
- "Is this property receiving?" ✓
- "Enable receiving" ✓

It's functional, clear, and works as both adjective and state.

**Usage:**
- "The Prism is receiving burrows"
- "Configure receiving for The Prism"
- `receiving_enabled: true` in the database

### Warrened → **(Drop it)**

We probably don't need a special word for "has multiple burrows." Just describe it:
- "The Kitchen has 5 active burrows"
- "5 Pathfinders can access The Kitchen"

If we DO want a word: **"Connected"** is simple and works.

---

## Updated Lexicon

| Term | Meaning |
|------|---------|
| **Burrow** | A trusted connection between two greenhouse properties |
| **Dig** | Create a burrow (grant access) |
| **Fill** | Close a burrow (revoke access) |
| **Receiving** | Property state where it accepts incoming burrows |
| **Surface** | Exit a burrowed session, return to origin |

*Dropped: "Den" (replaced by Receiving), "Warrened" (just describe it)*

---

*Journey completed: January 21, 2026*

---
title: "Cross-Property Access (Tunneling)"
description: "Finding the name for cross-property access and tunneling functionality"
category: philosophy
subcategory: naming-research
lastUpdated: "2026-03-12"
---

# Naming Journey: Cross-Property Access ("Tunneling")

*A walk through the grove to find the right name*

---

## The Problem

We need a name for a system that allows:
- One-click access from your arbor into another Grove property
- Properties that don't have traditional accounts (Forests, test tenants, etc.)
- Greenhouse-to-greenhouse trusted connections
- Role-constrained permissions (Wanderer < Rooted < Pathfinder < Wayfinder)
- Configurable duration (1 day, 7 days, 30 days, forever)
- Full audit logging

The working name is "tunneling" but that's technical, not Grove.

---

## Visualizing the Grove

```
                              [sun/moon]
                                  |
                           ~~~~~~sky~~~~~~

              🌲    🌳    🌲    🌳    🌲    🌳    🌲
           (trees = individual groves / blogs)

    ═══════════════════════════════════════════════════════════
                        GROUND LEVEL
    ═══════════════════════════════════════════════════════════

                    BENEATH THE SURFACE

         [Arbor]                              [The Prism]
            |                                     |
            |___________????_____________________|
                    (the connection)

                  Hidden. Protected. Intentional.
```

Where existing services live:
- **Meadow** — above ground, open, social (the clearing where people gather)
- **Heartwood** — at the core (identity, authentication)
- **Mycelium** — underground, invisible (the network connecting everything)
- **Grafts** — at the branches (features attached to trees)
- **Greenhouse** — glass-enclosed space (testing, early access)

The tunneling concept is:
- **Underground** — not visible to outsiders
- **Between two specific points** — your property and the target
- **Protected** — requires greenhouse mode on both ends
- **Intentional** — both sides must agree

---

## What IS This Thing?

**Fundamentally:** A passage. A connection between two protected spaces.

**What it does:** Lets you cross from your territory into another's, with permission.

**Emotion it should evoke:**
- Security (you're protected the whole way)
- Trust (both sides agreed to this)
- Belonging (you're welcomed into their space)
- Ease (one click, you're there)

**It's NOT:**
- A network (that's Mycelium)
- A merge (the properties stay separate)
- A login (you don't create a new account)
- A bridge (too structural, too visible)

---

## Walking Through the Forest

*I enter the grove. I find my tree—autumn's grove. I've been writing here for months.*

*There's a community called The Prism. It's a Forest, a gathering place. I want to help moderate it, but The Prism doesn't have accounts the way my blog does. How do I get there?*

*I go to my arbor (admin panel). I see something new...*

*Not a door—doors are above ground, visible. This is... lower. Private. A passage that only exists because both my tree and The Prism are in the greenhouse together, under the same glass, trusting each other.*

*I click once. And I'm there. I didn't log in. I didn't create an account. I just... arrived. Because I was already trusted.*

*Later, Dave wants to help too. I open the same kind of passage for him. He comes through. He can do what Pathfinders can do, because that's what he is. The passage knows.*

---

## What Do Animals Do?

In the forest, when animals need to move between safe spaces without being exposed:

- **Rabbits** create **burrows** — underground tunnels connecting dens
- **Moles** create **tunnels** — passages through the earth
- **Squirrels** use **tree highways** — connected branches above
- **Badgers** have **setts** — complex underground homes with multiple entrances

The closest analogy: **Burrows**

A burrow is:
- Underground (hidden, private)
- Intentional (someone dug it)
- Connecting (links two or more locations)
- Shared with trusted companions (family, allies)
- Protective (safe from predators above)

---

## Testing "Burrow"

**As a verb:**
- "I burrowed into The Prism" ✓
- "Dave can burrow into The Kitchen" ✓
- "Burrow me into the forest settings" ✓

**As a noun:**
- "Dave has a burrow to The Prism" ✓
- "Check your burrows in the arbor" ✓
- "This burrow expires in 7 days" ✓

**In context:**
- "Your burrow to The Terminal has been revoked" ✓
- "Open a burrow for Dave" ✓
- "Close this burrow" ✓

**The feeling:**
- Protected ✓ (underground = hidden from view)
- Intentional ✓ (burrows are dug on purpose)
- Trusted ✓ (animals share burrows with family)
- Cozy ✓ (burrows are warm, safe spaces)

---

## Alternative Candidates

| Name | Pros | Cons |
|------|------|------|
| **Burrow** | Perfect metaphor, works as verb + noun, feels protected | Could sound like "borrowing in" uninvited? |
| **Passage** | Clear meaning | Too generic, not nature-specific |
| **Delve** | Evokes exploration | More about searching than connecting |
| **Warren** | Network of connections | Better for the whole system, not individual connections |
| **Hollow** | Natural opening | "Hollow" also means empty |
| **Rootway** | Underground path | Feels compound/forced |
| **Den** | Safe space | Doesn't capture the passage aspect |

---

## The Verdict: Burrow

A burrow is a protected passage beneath the earth. Animals create burrows to move safely between dens, sharing them with family and trusted companions. The passage is invisible from above—you have to know it's there.

**Burrow** is Grove's system for trusted cross-property access.

---

## The Entry (for grove-naming.md)

### Burrow
**Cross-Property Access** · *Integrated into Arbor*

In the forest, a burrow is a protected passage beneath the earth. Animals create burrows to move safely between dens, sharing them with family and trusted companions. The passage is invisible from above—you have to know it's there.

Burrow is how you access Grove properties without creating a separate account. When your property and the target are both in greenhouse mode, with matching permissions, you can burrow through with a single click. The connection respects your existing role—Pathfinders get admin access, Rooted Wanderers can contribute, the Wayfinder gets everything. Configure duration from a single day to forever. Full audit trail of who burrowed where.

Dave wants to help moderate The Prism? Burrow him in. The passage opens. He arrives with his permissions intact. When the work is done, close the burrow—or let it stay open for next time.

*A protected way through.*

---

## The Lexicon (additions for Grafts)

| Term | Meaning |
|------|---------|
| **Burrow** | A trusted connection between two greenhouse properties |
| **Dig** | Create a burrow (open access) |
| **Fill** | Close a burrow (revoke access) |
| **Den** | A property that accepts incoming burrows |
| **Warrened** | A property with multiple active burrows |

**Example usage:**
- "I'll dig a burrow to The Prism for you."
- "Dave's burrow expires next Tuesday."
- "The Kitchen is warrened—five Pathfinders have access."
- "Fill that burrow, his moderation privileges have been revoked."

---

## Implementation Notes

**Internal name:** `GroveBurrow` (following convention)

**Database tables:**
- `burrow_endpoints` — properties that can send/receive burrows
- `burrow_sessions` — active burrow connections

**Key files to create/modify:**
- `libs/engine/src/lib/burrow/` — core burrow logic
- `docs/specs/burrow-spec.md` — full specification
- `docs/philosophy/grove-naming.md` — add entry

---

*Journey completed: January 21, 2026*
*The name was waiting. We just had to dig for it.*

# Tenant Extensions Naming Journey

> *Finding the name for operator-configured, tenant-specific features.*

---

## The Problem

We have **Curios**—the cabinet of wonders that any tenant can enable. Timeline, Gallery, Journey. Fun, opt-in, shared.

But what about features that are:
- **Tenant-specific** (only certain sites get them)
- **Operator-configured** (not user-uploaded plugins)
- **Custom code** (beyond what Curios provide)
- **For self-hosters AND the Wayfinder**

This isn't a plugin system. Tenants don't upload code. The *operator* (whoever deployed the Engine) decides what special features specific tenants get.

---

## What IS This Thing?

**Fundamentally:**
- It's custom functionality added to specific trees (blogs)
- It's a deliberate act by the operator (not random, not user-driven)
- It becomes part of that tenant's experience
- It's trusted code (same trust level as the Engine itself)

**What does it DO?**
- Extends a tenant's capabilities beyond standard Curios
- Allows experimentation without affecting the platform
- Gives operators control over per-tenant customization
- Enables unique features for specific use cases

**Emotion:**
- Personal. Unique. Crafted with intention.
- "This tree is different from all the others."

---

## Walking Through the Grove

```
I enter the grove. The forest stretches before me.

I see the Meadow where others gather.
I pass Clearing, where the status glows.
I find my tree—my blog, my space.

I've decorated it with Curios: Timeline shows my journey,
the Gallery displays my photos. These are wonderful.
Any tree can have them.

But I want something MORE.
Something that makes MY tree different.
Not a Curio everyone can opt into.
Something... unique to this tree alone.

I look at my tree. What would I add?
Not a decoration hanging from a branch.
Not something sitting at the base.
Something that becomes PART of the tree itself.

In an orchard, when they want a tree to bear
a specific kind of fruit, they don't plant a new tree.
They GRAFT a branch onto existing rootstock.
The branch becomes one with the tree.
It grows. It bears fruit. But it came from elsewhere.

My tree has been grafted.
This branch makes it unique.
```

---

## Candidate Names

### 1. Graft
**A branch joined onto existing rootstock to create unique growth.**

In horticulture, grafting is how you get specific varieties. You take a cutting (scion) from one tree and join it to the rootstock of another. The graft becomes part of the tree but retains its distinct DNA.

**Why it fits:**
- Grafting is a deliberate, skilled operation (operator-configured)
- The grafted branch becomes ONE with the tree
- Each graft makes that tree unique
- It's how orchards create specialty varieties

**Tagline:** *"A graft makes your tree bear fruit no other can."*

**Vibe:** Personal. Intentional. Organic but crafted.

### 2. Burl
**A unique growth on a tree with one-of-a-kind patterns.**

Burls are prized by woodworkers for their distinctive swirling grain. Each one is different. They're caused by stress or unusual growth.

**Why it fits:**
- Each burl is unique
- They're valued for distinctiveness
- Natural but unexpected

**Why it might NOT fit:**
- Burls are caused by stress/injury (negative connotation?)
- They're a side effect, not intentional

### 3. Scion
**The cutting that's grafted onto rootstock.**

In botany, the scion is the branch being joined. It brings new characteristics.

**Why it fits:**
- Technical term for what's being grafted
- Implies bringing new capabilities

**Why it might NOT fit:**
- "Scion" has other connotations (heir, descendant)
- Might be too technical

### 4. Hollow
**A secret space within a tree.**

Some trees have hollows—natural cavities that become homes, hiding spots, private spaces.

**Why it fits:**
- Private, custom, just for this tree
- Secret functionality

**Why it might NOT fit:**
- Sounds empty, like missing functionality
- Hollows are natural, not added

### 5. Bower
**A shelter made of branches, constructed within nature.**

A bower is an arbor-like structure, often a private retreat.

**Why it fits:**
- Constructed with intention
- A custom space within the grove

**Why it might NOT fit:**
- We already have Arbor (admin panel)
- Might confuse the two

### 6. Tendril
**A specialized stem that reaches out and attaches.**

Vines and ivies use tendrils to climb and connect.

**Why it fits:**
- Reaches out, extends functionality
- Connects to things

**Why it might NOT fit:**
- We have Ivy already (email)
- Tendrils feel fragile, temporary

---

## Testing the Tagline

> "**Graft** is where you add something that becomes part of your tree."
> *A graft makes your tree bear fruit no other can.*

> "**Burl** is a unique growth that makes your tree one-of-a-kind."
> *Every burl tells a different story.*

> "**Scion** is what you bring to make your tree yours."
> *Your scion, your tree, your way.*

---

## The Decision: Graft

**Graft** feels *inevitable*.

- It's a real horticultural term with exactly the right meaning
- It implies deliberate action by someone skilled (the operator)
- The grafted branch becomes PART of the tree, not a decoration
- It's how you make one tree different from all the others
- "Grafts" as a plural works naturally

**Usage examples:**
- "The autumn.grove.place tree has a custom graft for the Git Dashboard."
- "Self-hosters can add their own grafts."
- "This graft adds recipe functionality to the blog."

**The entry:**

### Graft
**Tenant-Specific Extensions** · *Operator-configured*

A graft is a branch joined onto rootstock, a deliberate act that makes one tree bear fruit no other can. Orchardists use grafts to create unique varieties: the cutting grows, becomes one with the tree, yet retains what makes it special.

Grafts are custom features that operators add to specific tenants. Not plugins users upload—trusted code the operator configures for particular trees. For grove.place, the Wayfinder decides which groves get which grafts. For self-hosters, you control your own orchard.

*A graft makes your tree bear fruit no other can.*

---

## Security Considerations

**Grafts are OPERATOR-trusted, not USER-trusted.**

This is the key insight. Grafts aren't a plugin system. There's no sandboxing because:

1. The operator controls the deployment
2. The operator IS the trusted party
3. If you can deploy the Engine, you can add Grafts

**Safe patterns:**
- Grafts registered in configuration (database or files)
- Defined interfaces for what Grafts can access
- Grafts run server-side in the same trust context as Engine
- Operator reviews/approves all Grafts

**Unsafe patterns (avoid):**
- Arbitrary code upload by tenants ❌
- Grafts accessing other tenants' data ❌
- Grafts bypassing authentication ❌
- Grafts modifying core Engine behavior ❌

**For grove.place (hosted):**
- Only the Wayfinder (Autumn) can add Grafts
- Tenants can REQUEST features
- Wayfinder decides what to graft and where

**For self-hosters:**
- Operator has full control over Grafts
- They're trusted because they control the deployment
- Same trust model as the Engine code itself

---

## Technical Concepts to Explore

*Not implementing today—just mapping the territory.*

### What a Graft COULD Be:

1. **Route Grafts** - Additional routes only for specific tenants
   ```
   /api/grafts/my-feature → tenant-specific endpoint
   ```

2. **Component Grafts** - UI components injected into pages
   ```
   Graft: GitDashboardWidget → renders on homepage for autumn.grove.place
   ```

3. **Hook Grafts** - Functions that run on specific events
   ```
   onPostPublish → custom notification for this tenant
   ```

### What a Graft CAN Access:

- ✅ Tenant's own data (posts, pages, config)
- ✅ Public APIs (GitHub, external services)
- ✅ Tenant's storage (R2, KV with tenant prefix)
- ❌ Other tenants' data (NEVER)
- ❌ Platform secrets (only their own)
- ❌ Admin operations for other tenants

### How Grafts Would Be Registered:

```sql
-- Option A: Database table
CREATE TABLE grafts (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    graft_type TEXT NOT NULL,  -- 'route', 'component', 'hook'
    name TEXT NOT NULL,
    config TEXT,  -- JSON configuration
    enabled INTEGER DEFAULT 1,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);
```

```typescript
// Option B: Config file per deployment
// grafts/autumn-primary/git-dashboard.ts
export const graft: Graft = {
  tenant: 'autumn-primary',
  type: 'component',
  slot: 'homepage-widgets',
  component: GitDashboardWidget,
};
```

---

## Open Questions

1. **Should Grafts be code files or database config?**
   - Code files: More powerful, requires redeployment
   - Database: More dynamic, limited to predefined patterns

2. **How do Grafts compose with Curios?**
   - Are Grafts just "private Curios"?
   - Or are they fundamentally different?

3. **What's the migration path?**
   - If a Graft becomes popular, does it become a Curio?
   - "This started as Autumn's graft, now it's a Curio for everyone."

4. **How does the admin UI show Grafts?**
   - Separate section? "Your Grafts"
   - Or hidden from tenant admin? (operator-only)

---

## The Walk Continues

The name is found: **Graft**.

The concepts are mapped. The security model is clear.

Implementation can wait. The groundwork is laid.

*A graft makes your tree bear fruit no other can.*

---

*Naming journey by Autumn & Claude, January 2026*

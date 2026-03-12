---
title: "Email Gateway Naming Journey"
description: "Internal naming research documenting the journey to naming the centralized email delivery worker"
category: "philosophy"
lastUpdated: "2026-02-01"
published: false
---

# Email Gateway Naming Journey

> *Finding the name for Grove's centralized email delivery infrastructure*

---

## The Concept

A dedicated Cloudflare Worker whose ONLY job is sending emails:
- Centralizes all Resend API calls
- Handles retries, fallbacks, rate limiting
- Manages templating and personalization
- Logs delivery status and analytics
- Every Grove service calls this worker instead of calling Resend directly

**Like Lumen for AI, but for email.**

This is infrastructure, not a feature. Users never see it. Services rely on it.

---

## Visualization: Where Does This Live?

```
                              (user-facing services)

                   Ivy       Plant      Arbor      Meadow
                 (email)   (onboard)   (admin)   (social)
                    |          |          |          |
                    |   "send welcome"    |          |
                    |   "send magic link" |          |
                    |   "send digest"     |          |
                    |          |          |          |
    ================|==========|==========|==========|================
                    |          |          |          |
                    +----------+----------+----------+
                               |
                        +------+------+
                        |  ??? HERE   |  <-- The Email Gateway
                        |  (sending)  |
                        +------+------+
                               |
                    +----------+----------+
                    |                     |
               +---------+           +---------+
               | Resend  |           |(backup) |
               |   API   |           | provider|
               +---------+           +---------+

    ==============================================================

            ~~~~~~~~~~~~ Mycelium (MCP network) ~~~~~~~~~~~~
```

**Key observations:**
- This layer is **underground** - users never see it
- It sits **between** Grove services and external email providers
- It's a **conduit** - messages flow through it
- It **delivers** - it doesn't create content, it carries it
- It's **infrastructure** - like plumbing or postal routes

---

## What IS This Thing?

### From the Requirements:
- A **hollow tube** through which notifications flow
- The **delivery mechanism**, not the message itself
- Like Lumen (the void AI flows through), but for messages
- NOT Ivy (which is the email client/feature itself)

### What Does It DO?
- **Carries** messages from services to recipients
- **Routes** to the right provider (Resend, fallback)
- **Transforms** templates into personalized emails
- **Retries** when delivery fails
- **Logs** for observability

### What Nature Metaphor Fits?

Things that **carry** or **deliver** in nature:
- Wind carrying seeds
- Rivers carrying water to the sea
- Birds carrying messages (homing pigeons)
- Streams flowing to destinations
- Veins carrying blood
- Xylem/phloem carrying nutrients

Things that are **conduits** in nature:
- The hollow of a reed
- The channel of a stream
- The passage through a canyon
- The throat of a flower

---

## The Walk Through the Grove

*A service needs to send an email.*

*Plant wants to welcome a new Wanderer. Arbor wants to send a password reset. Meadow wants to notify someone of a reply.*

*They don't call Resend directly. They don't manage retries. They don't worry about rate limits.*

*They hand the message to... something. A channel. A conduit. A hollow passage.*

*The message flows through. It arrives in someone's inbox. The service never knew the complexity beneath.*

*What carries the message through the dark? What delivers it to the light?*

---

## Exploring the Metaphor Space

### Category: Channels and Conduits

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Rill** | A tiny stream channel | Messages flow like water | Delicate, persistent | Too small, unfamiliar |
| **Flume** | Natural water channel | Directed flow, purposeful | Industrial, efficient | Logging associations |
| **Channel** | A water passage | Perfect conduit metaphor | Generic, too technical | Overused |
| **Gully** | A narrow channel | Messages flow through | Erosion, drainage | Slightly negative |
| **Brook** | A small stream | Gentle, constant flow | Pleasant, natural | Too pastoral |

### Category: Hollow Structures

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Reed** | Hollow grass stem | The hollow that carries | Musical, natural | Great potential! |
| **Quill** | Hollow feather shaft | Writing implement, carries ink | Historic, elegant | Writing-focused |
| **Stalk** | Plant stem, often hollow | Infrastructure of a plant | Structural | Might imply watching |
| **Stem** | The delivery system of plants | Carries nutrients | Foundational | Too generic |
| **Cane** | Hollow bamboo-like stem | Strong, hollow, carries | Sturdy, reliable | Walking cane confusion |

### Category: Delivery and Carrying

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Ferry** | Carries across water | Transporting messages | Journey, reliability | Too nautical |
| **Draft** | Air current carrying things | Invisible force | Movement | Beer/document meanings |
| **Courier** | One who carries messages | Perfect metaphor | Official, trusted | Too human |
| **Herald** | Messenger, announcer | Delivers news | Noble, announcing | Too grand |
| **Swift** | Fast bird, carries messages | Speed, reliability | Dynamic | Twitter association |

### Category: Wind and Air

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Zephyr** | Gentle west wind | Soft, carrying wind | Gentle, classical | Pretentious |
| **Gust** | Brief strong wind | Quick delivery | Forceful | Too aggressive |
| **Wisp** | Light movement of air | Ethereal carrying | Delicate | Already taken! |
| **Breeze** | Gentle wind | Soft delivery | Pleasant | Mode in Weave |
| **Drift** | Slow, carried movement | Messages drift through | Passive, natural | Too passive |

### Category: Bird Messengers

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Wren** | Small, hardy bird | Tiny but reliable messenger | Diminutive, capable | Just a bird name |
| **Finch** | Small songbird | Carries songs (messages) | Musical, light | Just a bird name |
| **Kestrel** | Small falcon, hovers | Swift, precise delivery | Sharp, focused | Too predatory |
| **Sparrow** | Common, reliable bird | Everyday messenger | Humble, ubiquitous | Too common |
| **Lark** | Dawn bird, rising | Morning messages | Joyful | "On a lark" |

### Category: Plant Delivery Systems

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Vein** | Carries fluids in plants/animals | Circulatory | Essential, living | Anatomical |
| **Xylem** | Water transport in plants | Upward delivery | Scientific | Too technical |
| **Phloem** | Sugar transport in plants | Nutrient delivery | Scientific | Hard to spell |
| **Tendril** | Reaching, connecting | Extending to deliver | Organic | More about reaching |

---

## Deep Dive: The Most Promising Candidates

### 1. Reed

A reed is the hollow grass by the water. Cut a reed and you have a tube. Shepherds made flutes from reeds. Messages were once written on reed paper.

**The insight:**
- A reed is **hollow** - like Lumen, the void things flow through
- A reed is **natural** - fits Grove's aesthetic
- A reed **makes sound** when wind passes through - messages traveling
- A reed is **simple** - infrastructure shouldn't be complex
- Reeds grow at the **water's edge** - where things transition

**Testing the tagline:**
> "Reed carries your messages."
> "Through the Reed, to the world."
> *"The hollow that carries your voice."*

**Concern:** We already have **Reeds** for the comment system! Collision!

### 2. Quill

A quill is the hollow shaft of a feather, historically used for writing. Messages were written with quills. The quill IS the writing instrument.

**The insight:**
- A quill is **hollow** - ink flows through it
- A quill is **connected to communication** - writing, letters
- A quill is **elegant** - has gravitas
- A quill comes from a **bird** - natural, can "fly" to recipients

**Testing the tagline:**
> "Quill delivers your words."
> "Through the Quill, ink becomes message."
> *"The instrument of connection."*

**Concern:** Quill is strongly associated with writing, not delivering. It's the tool that creates, not the channel that carries.

### 3. Flume

A flume is a human-made or natural channel for water. Log flumes carry lumber. Water flumes power mills.

**The insight:**
- A flume is a **channel** - perfect for message routing
- A flume has **purpose** - directed flow
- A flume is **efficient** - designed for delivery
- Flumes can have **multiple destinations** - routing!

**Testing the tagline:**
> "Flume carries messages downstream."
> "Through the Flume, to your inbox."
> *"The channel that delivers."*

**Concern:** Flume feels too industrial. Logging flumes, theme park rides. Not quite Grove's organic vibe.

### 4. Courier

In forests, animals carry seeds. Squirrels, birds, wind. They're nature's couriers.

**The insight:**
- A courier **delivers** - that's the whole job
- A courier is **trusted** - carries important things
- A courier is **reliable** - makes sure it arrives
- A courier **knows the way** - routing intelligence

**Testing the tagline:**
> "Courier delivers, reliably."
> "Trust the Courier with your message."
> *"The trusted carrier."*

**Concern:** Too human. Courier feels like a person in a uniform, not a nature metaphor.

### 5. Zephyr

The zephyr is the gentle west wind. In mythology, Zephyrus was the god of the west wind, bringer of spring.

**The insight:**
- A zephyr **carries** - wind carries seeds, pollen, scents
- A zephyr is **gentle** - not forceful, not aggressive
- A zephyr is **invisible** - infrastructure you don't see
- A zephyr is **seasonal** - brings change (messages are events)

**Testing the tagline:**
> "Zephyr carries your words on the wind."
> "A gentle Zephyr delivers."
> *"The wind that carries messages."*

**Concern:** Too pretentious? Classical references might feel heavy.

---

## A New Direction: The Anatomical Parallel

Lumen is named for the **hollow center of a tube** - the anatomical void through which things flow.

What's the anatomical equivalent for delivery?

- **Duct** - A tube that delivers fluids (tear duct, bile duct)
- **Tract** - A pathway for delivery (digestive tract)
- **Vessel** - A tube carrying blood (blood vessel)

**Duct** is interesting:

> "In anatomy, a duct is a tube that conveys secretions from one part of the body to another."

The email gateway is exactly this - it conveys messages from services to recipients.

**Testing the tagline:**
> "Duct delivers messages to where they need to go."
> "Through the Duct, to the world."
> *"The pathway that delivers."*

**Concern:** "Duct" sounds too clinical. Duct tape. Air ducts. Not warm.

---

## The Hollow Reed: Deeper Exploration

Wait - let me revisit the **Reed** problem.

**Reeds** (plural) = Comment system. *Whispers at the water's edge.*

But what about **singular alternatives**?

### Cane
Like sugar cane - hollow, carries sweetness.
> "Cane delivers the sweetness of your words."

Too walking-stick, too sugar.

### Rush
A type of reed-like plant. Grows in wetlands.
> "Rush delivers your messages swiftly."

Has the speed connotation! "In a rush." But also messy/hurried.

### Straw
Originally: a dried hollow stem. Messages sent by straw man.
> "Through the Straw, to the world."

Too drinking-straw, too "grasping at straws."

### Calamus
The botanical term for reed. Also called "sweet flag."

> "Calamus is the hollow that carries."
> *"Through the Calamus, your voice travels."*

Beautiful, but obscure. Nobody knows this word.

---

## Returning to Wind: A Different Angle

What if instead of the **wind itself**, we name the **pathway** wind creates?

### Updraft
A rising current of air.
> "Updraft lifts your messages to where they need to go."

Nice! But implies upward, not outward.

### Slipstream
The area of reduced pressure behind a moving object.
> "Slipstream carries your messages effortlessly."

Good! Invisible, efficient, following the path of least resistance.
Concern: Racing/aviation associations.

### Jet Stream
High-altitude wind current.
> "Jet Stream carries messages at speed."

Too aviation, too corporate.

---

## A Completely Different Direction: The Voice That Carries

What if the metaphor isn't about the channel, but about the **carrying itself**?

In nature, sound carries through:
- Air (voice)
- Water (whale songs)
- Solid ground (elephants stomping)

### Echo
Sound bouncing, traveling, arriving.
> "Echo carries your voice to distant ears."

Beautiful! But implies repetition, not delivery.

### Resonance
Sound continuing through a medium.
> "Resonance carries your message."

Too abstract, too physics-y.

### Call
A bird's call carries through the forest.
> "Call delivers your message."

Simple! But "Call" sounds like phone calls, not email.

---

## The Walk Through the Forest: Take Two

*I'm Arbor. I need to send a password reset email.*

*I don't want to think about Resend. I don't want to manage retries. I just want to say: "deliver this message to this person."*

*I hand it to... something. Something that knows how to get it there.*

*What do I call that something?*

*In the forest, what carries things invisibly from one place to another?*

*The wind carries seeds.*
*Streams carry leaves.*
*Roots carry water.*
*Tunnels carry travelers.*

*But specifically for messages...*

*Birds carry messages in folklore. Homing pigeons. Ravens. Swifts.*

*What about the FLIGHT? The ACT of carrying?*

---

## Exploring Flight/Carrying Actions

| Name | Meaning | Fit | Feel | Issues |
|------|---------|-----|------|--------|
| **Wing** | What carries a bird | The mechanism of delivery | Flight, freedom | Too body-part |
| **Flight** | The act of flying | Messages taking flight | Movement | Too abstract |
| **Glide** | Effortless flight | Smooth delivery | Elegant, easy | Might feel passive |
| **Soar** | Rising flight | Messages rising | Uplifting | Upward, not outward |
| **Swoop** | Quick descent | Fast delivery | Dynamic | Too predatory |
| **Flit** | Quick, light movement | Quick message delivery | Light, fast | Maybe too flighty |

---

## Emerging Favorites

After this exploration, my top candidates are:

### 1. **Flume** - "The channel that delivers"
Directed flow, purposeful, efficient. Concern: Industrial feel.

### 2. **Zephyr** - "The wind that carries"
Gentle, invisible, carries. Concern: Pretentious.

### 3. **Slipstream** - "The path of least resistance"
Efficient, invisible, behind-the-scenes. Concern: Aviation vibes.

### 4. **Flit** - "Quick, light delivery"
Fast, natural, bird-like. Concern: Maybe too casual.

### 5. **Rush** - "Swift delivery"
Speed connotation, reed-like. Concern: "In a rush" is hurried.

---

## A Final Direction: Going Back to Basics

What if I'm overcomplicating this?

Lumen works because:
1. It's a real word with a specific meaning
2. It has a beautiful paradox (hollow + light)
3. It's simple and memorable
4. It fits the function (void through which AI flows)

For email delivery, what's the equivalent?

**What's a simple, natural word for "the thing that carries messages"?**

### Carrier
> "Carrier delivers your messages."

Too literal, too postal.

### Vessel
> "Vessel carries your words."

Ships carry things. Blood vessels. Drinking vessels.
Actually... **Vessel** has something:
- A vessel **contains and carries**
- A vessel **delivers** - cargo ships
- Vessels are **hollow** - like Lumen!
- In plants, vessels carry water (xylem vessels)

But "Vessel" is overused. Every startup has a "Vessel" for something.

### Conduit
> "Conduit channels your messages."

A conduit is a channel for conveying. Perfect function.
But... too technical? Too plumbing?

Actually, wait. Let me reconsider **Conduit**:
- Technically accurate
- Not overused in Grove (checked the naming doc)
- Simple, clear
- **Con-duct** = "lead together" from Latin

Hmm. But it doesn't feel *Grove*.

---

## The Nature of Carrying: Final Push

What in nature is:
1. **Hollow** (like Lumen)
2. **Carries things** (messages)
3. **Invisible/infrastructure** (not user-facing)
4. **Reliable** (retries, fallbacks)
5. **Simple** (one word, memorable)

---

## The Revelation: Stem

Wait. What about **Stem**?

In botany, the stem is the main structural support of a plant. It:
- **Carries water and nutrients** from roots to leaves
- **Carries sugars** from leaves to roots
- Is the **central infrastructure** of the plant
- Is **hollow** in many plants (wheat, bamboo)
- Is **invisible in function** - you see it but don't think about what it does

**The stem is the plant's email system.**

Nutrients need to get from here to there. The stem carries them. You don't think about it. It just works.

**Testing the tagline:**
> "Stem carries your messages to where they need to grow."
> "Through the Stem, from service to inbox."
> *"The infrastructure that delivers."*

**But:** "Stem" is SO generic. STEM education. Stem cells. Wine stems.

---

## Variation: Stipe

The botanical term for a stem-like structure, especially in fungi (mushroom stipe).

> "Stipe is the structure that delivers."

Too obscure. Nobody knows "stipe."

---

## What About: Wick

A wick **draws** liquid through capillary action. Like a candle wick drawing wax, or a plant wick drawing water.

**The insight:**
- A wick **pulls things through** - messages get pulled to their destination
- A wick is **simple** - just a fiber, nothing complex
- A wick **lights things up** - the message "lights" when it arrives
- A wick is the **connection** between source and flame

**Testing the tagline:**
> "Wick draws your message through."
> "Through the Wick, to the inbox."
> *"The fiber that lights the way."*

**This is interesting!** Wick has:
- Capillary action (passive delivery)
- Simplicity
- Connection to light/warmth
- Natural origin (plant fibers)

**Concern:** Candle associations might be too strong. "John Wick."

---

## The Final Candidates

After this journey, here are my top 7:

### 1. Wick
*"The fiber that draws messages through."*
Capillary action, pulling messages to their destination. Simple, natural, lights up the recipient's inbox.

### 2. Flume
*"The channel that delivers."*
Directed water channel, efficient flow. Clear infrastructure metaphor.

### 3. Rush
*"Swift delivery through hollow stems."*
Reed-like plant, speed connotation, grows at water's edge.

### 4. Zephyr
*"The gentle wind that carries."*
Classical, invisible, carries seeds and messages alike.

### 5. Flit
*"Quick, light delivery."*
Bird-like movement, natural, fast.

### 6. Slipstream
*"The path of least resistance."*
Effortless, invisible, follows behind.

### 7. Stem
*"The infrastructure that delivers."*
Central delivery system of plants. Too generic?

---

## Testing the Top Three

### Wick

**In the ecosystem:**
- Arbor calls `wick.send(email)` to deliver
- "The Wick pulled that message through overnight"
- "Check Wick logs for delivery status"

**The entry:**
> A wick is the fiber that draws liquid upward through capillary action. In a candle, the wick pulls wax to the flame. In a plant, fibers wick water from roots to leaves. It doesn't push. It pulls. The destination draws the message through.
>
> Wick is Grove's email delivery infrastructure. When a service needs to send a message, Wick draws it through: templating, retries, fallbacks, logging. The message travels not because it's pushed, but because it's pulled—toward its destination, through the simplest path. You call one function. Wick lights up someone's inbox.
>
> *Drawing messages to the light.*

**Rating:**
- Nature fit: Great (plant fibers, capillary action)
- Grove voice: Good (warm, simple)
- Uniqueness: High (nobody names infrastructure "Wick")
- Issues: Candle/John Wick associations

### Flume

**In the ecosystem:**
- Arbor calls `flume.send(email)` to deliver
- "Send it down the Flume"
- "Flume handled the retry automatically"

**The entry:**
> A flume is a channel for directed water flow. In forests, natural flumes carve through rock, carrying water downhill. Loggers once used flumes to transport timber. The water does the work. The flume just provides the path.
>
> Flume is Grove's email delivery channel. Every message from every service flows through the same carved path: Flume handles templating, routing, retries, and logging. Services don't think about delivery. They drop messages into the Flume, and the current carries them home.
>
> *The channel carries everything downstream.*

**Rating:**
- Nature fit: Medium (exists in nature, but also industrial)
- Grove voice: Medium (functional, less warm)
- Uniqueness: High
- Issues: Industrial/theme park associations

### Rush

**In the ecosystem:**
- Arbor calls `rush.send(email)` to deliver
- "Rush that notification through"
- "Delivery status in Rush logs"

**The entry:**
> A rush is a reed-like plant that grows at the water's edge. Its stems are hollow, perfect conduits. Before paper, messages were woven into rushes. The hollow stem carries water to the leaves. The rush doesn't ask why. It just delivers.
>
> Rush is Grove's email delivery infrastructure. Every notification, every magic link, every welcome message passes through Rush's hollow stems: templated, retried, logged, delivered. Fast by nature, reliable by design. You call one function. Rush carries it through.
>
> *Through the hollow stems, swiftly.*

**Rating:**
- Nature fit: Excellent (wetland plant, hollow stems)
- Grove voice: Good (natural, swift)
- Uniqueness: Medium (hurrying connotation)
- Issues: "In a rush" = hurried, sloppy

---

## The Decision

After walking through the grove, **Zephyr** is the final choice.

~~Wick was initially selected but rejected—too much candle/John Wick baggage.~~

**Zephyr** wins because:

**Why Wick wins:**

1. **The hollow/void parallel with Lumen**: Lumen is the hollow center through which AI flows. Wick is the fiber through which messages are drawn. Both are invisible infrastructure enabling flow.

2. **The "drawing" metaphor is perfect**: Wick doesn't push messages. It draws them toward their destination. The recipient's inbox pulls the message through. Capillary action. Passive, reliable, elegant.

3. **Simple and memorable**: One syllable. Easy to say: "wick.send()" / "Wick delivered it" / "Check the Wick logs."

4. **Warm connotations**: Wicks bring light. A wick lights a candle. A message "lights up" someone's inbox. There's warmth in the metaphor.

5. **Unexpected**: Nobody names email infrastructure "Wick." It's fresh.

6. **Nature-grounded**: Plant fibers. Capillary action. The way water moves through cellulose. It's botanical without being obvious.

---

## The Final Entry

### Wick
**Email Delivery** - *Internal service*
**Internal Name:** GroveWick

A wick is what draws liquid upward. In a candle, the wick pulls wax to the flame. In plants, fibers wick water through capillary action, from roots to leaves. The wick doesn't push. It doesn't force. It simply creates the path, and the destination draws the substance through.

Wick is Grove's email delivery infrastructure. Every message from every service passes through Wick: templating, personalization, retries, fallbacks, logging. Services don't call Resend directly. They hand messages to Wick, and Wick draws them through, toward their destination. One function call. One hollow fiber. One lit inbox.

Like Lumen routes AI through its hollow center, Wick draws messages through its invisible fiber. The infrastructure you never see. The capillary action you never think about. Until the light arrives.

*Drawing messages to the light.*

---

## Alternatives Preserved

**Runner-up:** Rush (hollow stems, swift) - saved for a service that needs speed connotations.

**Honorable mention:** Flume (directed channel) - if we need something more industrial/functional.

---

## Ecosystem Visualization (Final)

```
                              (user-facing services)

                   Ivy       Plant      Arbor      Meadow
                 (email)   (onboard)   (admin)   (social)
                    |          |          |          |
                    |   "send welcome"    |          |
                    |   "send magic link" |          |
                    |   "send digest"     |          |
                    |          |          |          |
    ================|==========|==========|==========|================
                    |          |          |          |
                    +----------+----------+----------+
                               |
                        +------+------+
                        |    WICK     |  <-- Email Delivery
                        |  (drawing)  |
                        +------+------+
                               |
                    +----------+----------+
                    |                     |
               +---------+           +---------+
               | Resend  |           |(backup) |
               |   API   |           | provider|
               +---------+           +---------+

    ==============================================================

     Lumen (AI)                    Wick (Email)
   "Light from the void"      "Drawing to the light"
         |                            |
    The hollow                   The fiber
    through which               through which
    AI flows                    messages are drawn
```

---

## Implementation Notes

- **Public Name:** Wick
- **Internal Name:** GroveWick
- **Domain:** *(internal service, no public domain)*
- **Tagline:** *Drawing messages to the light.*

Usage patterns:
```typescript
// Services call Wick to send emails
await wick.send({
  to: 'wanderer@example.com',
  template: 'welcome',
  data: { name: 'Alex' }
});

// Wick handles: templating, retries, provider routing, logging
```

---

*Journey completed: 2026-02-01*
*Decision: **Wick** - the fiber that draws messages through*

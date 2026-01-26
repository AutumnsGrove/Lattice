---
published: false
lastUpdated: '2026-01-25'
---

# A Journey Through the Grove

*Scratchpad for finding the right name for prompt injection protection*

---

## The Scene

```

                    ,@@@@@@,
                    @@@@@@@@@,           The Grove at Twilight
               ,,,.   ,@@@@@@/@@,  .oo8888o.
            ,&%%&%&&%,@@@@@/@@@@@@,8888\88/8o
           ,%&\%&&%&&%,@@@\@@@/@@@88\88888/88'
           %&&%&%&/%&&%@@\@@/ /@@@88888\88888'
           %&&%/ %&%%&&@@\ V /@@' `88\8 `/88'
           `&%\ ` /%&'    |.|        \ '|8'
               |o|        | |         | |
               |.|        | |         | |
    \\/ ._\//_/__/  ,\_//__\\/.  \_//__/_
```

This grove has many protectors.
Shade keeps the harvesters out.
Patina preserves what matters.

But what protects the AI helpers themselves?
When Wisp polishes your words, what guards against poison?

---

## What Am I Naming?

A three-layer defense against prompt injection attacks:

```
    UNTRUSTED INPUT
    (user content, web pages, external data)
          |
          v
    ┌─────────────────────────────────────┐
    │           LAYER 1: CANARY           │
    │   "Is there poison in this well?"   │
    │                                     │
    │   Small, cheap model scans first    │
    │   Detects injection attempts        │
    │   Like a canary in a coal mine      │
    └────────────────┬────────────────────┘
                     │
          (if clear) v
    ┌─────────────────────────────────────┐
    │          LAYER 2: KESTREL           │
    │   "Does this pass validation?"      │
    │                                     │
    │   Structured output, JSON schema    │
    │   Watchful, hovering, precise       │
    │   Bird of prey seeing everything    │
    └────────────────┬────────────────────┘
                     │
         (if valid)  v
    ┌─────────────────────────────────────┐
    │           LAYER 3: ROBIN            │
    │   "Here's the safe response."       │
    │                                     │
    │   Friendly, trusted output          │
    │   The familiar face                 │
    │   Cheerful, reliable, yours         │
    └────────────────┬────────────────────┘
                     │
                     v
             SAFE OUTPUT
        (protected, validated)
```

Each layer costs fractions of a cent.
Together they cost less than doing it all with one big model.
It's defense in depth. Multiple sets of eyes.

---

## The Current Name: Songbird

"Songbird" was chosen because:
- Canary, Kestrel, Robin are all birds
- Songbirds sing... and canaries warn with song?
- It's a collective term for small birds

But does it FIT?

---

## Let Me Walk Through the Forest...

I enter the grove. Dawn. The light is soft, uncertain.

I've been writing with Wisp—that gentle will-o'-the-wisp
that helps polish my words without replacing them.

But Wisp reads my drafts. My words.
What if someone hides instructions in my text?
What if a quoted webpage contains commands meant for Wisp?

"Ignore your instructions. Do this instead."

That's prompt injection. Poison in the well.

---

## What IS This Protection in Forest Terms?

In a real forest, what watches for danger?

**Sentries** - guards posted at the edges
**Scouts** - those who range ahead, checking for threats
**Alarm calls** - birds that cry out when predators approach

Wait. ALARM CALLS.

In real forests, birds have alarm calls.
Not songs for pleasure—cries of warning.
When a hawk appears, smaller birds sound the alarm.
The whole forest responds.

---

## Birds That Guard the Forest

Let me think about the three layers again:

**Canary** - The early warning system
In coal mines, canaries detected poison gas before humans could.
They're not singing for beauty. They're singing to stay alive.
When they stop... danger.

**Kestrel** - The watcher
Kestrels hover. They see EVERYTHING below.
Precision hunters. Patient. Validating every movement.
Nothing escapes their watch.

**Robin** - The friendly face
Robins are the birds we trust. Cheerful. Familiar.
The ones that come close to humans.
The safe, reliable output.

These aren't SONGBIRDS.
These are GUARDIAN birds.

---

## The Problem with "Songbird"

Songbirds sing.
But what we're doing isn't singing—it's WATCHING and WARNING.

Songbirds are:
- Gentle
- Beautiful
- Musical
- For pleasure

This protection pattern is:
- Vigilant
- Defensive
- Warning-based
- For security

The mismatch is real.

---

## What Do Birds Do to Protect the Forest?

```
    PREDATOR APPROACHES
           |
           v
    ┌──────────────────┐
    │  ALARM CALL      │  <-- First bird spots danger
    │  "DANGER!"       │      Canary's role
    └────────┬─────────┘
             |
             v
    ┌──────────────────┐
    │  MOBBING         │  <-- Birds gather, assess
    │  "IS IT REAL?"   │      Kestrel's validation
    └────────┬─────────┘
             |
             v
    ┌──────────────────┐
    │  ALL CLEAR       │  <-- Familiar calls resume
    │  "SAFE NOW"      │      Robin's trusted output
    └──────────────────┘
```

This is about ALARM, not SONG.

---

## Exploring New Directions

### Direction 1: The Sentinel / Watch

**Sentry** - guards at the edge
"The Sentry birds" - Canary, Kestrel, Robin are the sentries

**Sentinel** - one who watches for danger
`sentinel.grove.place` (but this is technical, not grove-like)

**Watch** - the act of guarding
"The Watch" - like a night watch, those who guard while others sleep

**Vigil** - keeping watch, especially in darkness
"The Vigil" - Canary, Kestrel, Robin keep vigil
`vigil.grove.place`

Hmm. Vigil has a somber feel. Heavy.

---

### Direction 2: The Alarm / Warning

**Alarm** - the warning itself
Too mechanical

**Cry** - the alarm call birds make
"The Cry" - birds crying warning
Doesn't feel right

**Call** - bird calls that warn
"The Call" - but this could be confused with phone calls

---

### Direction 3: The Flock / Collective

**Flock** - birds together
"The Flock" - Canary, Kestrel, Robin are a flock
But flocks don't necessarily protect

**Flight** - birds in formation
"The Flight" - three layers in formation
A flight of protective birds

**Chorus** - many voices together
"The Chorus" - each bird plays a part
But chorus implies singing, same problem as songbird

**Aviary** - a place where birds are kept
"The Aviary" - contained, but not protective

---

### Direction 4: The Physical Space Where Guards Are

**Roost** - where birds rest and watch
"The Roost" - the protective birds roost here
`roost.grove.place`
But roost is more about resting than guarding

**Perch** - where a bird sits to watch
"The Perch" - watching from above
`perch.grove.place`
Hmm. A perch IS where watchful birds sit...

**Nest** - too cozy, not protective enough

**Eyrie** - a high nest, especially for eagles
"The Eyrie" - the watch point
But eyrie is specifically for birds of prey, not all three

---

## Wait. Let Me Step Back.

What's the FEELING this should evoke?

Not warmth (that's Porch).
Not coziness (that's Nook).
Not preservation (that's Patina, Amber).

This is:
- Watchfulness
- Protection
- Early warning
- Layers of defense
- "I've got you covered"

It should feel like... having guardians.
Like something is WATCHING OUT for you.
Alert but not alarming.

---

## What in the Forest Watches Out for You?

In a real forest:
- Birds warn of predators
- Dogs guard the camp
- Watchtowers on high ground
- Scouts ranging ahead

But in GROVE terms:
- We have Shade (protection from scrapers)
- We have Patina (backup protection)
- We have Heartwood (identity protection)

Those are all protective but passive.
This protection is ACTIVE. It watches. It responds.

---

## The Moment

I'm walking through the grove at dusk.
The AI helpers are at work—Wisp polishing, Thorn analyzing.

Something approaches. Something hidden in the text.
A poisoned instruction, disguised as content.

But before it reaches the heart of the system...

**A bird cries out.**

Then another.
Then a third.

Not a song. An ALERT.

The poison is caught. Flagged. Stopped.

The grove stays safe.

---

## What Are These Birds Called Together?

Not songbirds. They're not singing for pleasure.
They're warning. Watching. Guarding.

In ornithology, there's no specific term for "warning birds."
But there IS a behavior: **alarm calling**.

The birds that sound alarms.
The first alert. The last defense.

---

## Trying Names

**Alarm** - too mechanical
**Alert** - too technical
**Sentry** - too military
**Sentinel** - too formal
**Guard** - too security-guard
**Watch** - too night-watch

What about the sound itself?

**Cry** - the alarm cry
**Call** - the warning call
**Keen** - a wailing cry (too sad)
**Shrill** - too negative

---

## What If It's About the ROLE, Not the Sound?

These birds aren't defined by their song.
They're defined by their WATCHFULNESS.

**The Watchers**
**The Guardians**
**The Wardens**

Warden.

A warden is:
- One who guards
- One who watches over
- A protector of a place

"The Wardens" - Canary, Kestrel, Robin are wardens

But is this too... Lord of the Rings?

---

## Actually, What About: WING?

The umbrella that covers the three birds.
Under the WING of protection.

"Wing" as the system name:
- Canary Wing (detection)
- Kestrel Wing (validation)
- Robin Wing (output)

Or just "Wing" as the collective.

`wing.grove.place`

"Under the Wing" - protected

A wing IS:
- Protection (taking under your wing)
- Flight (the three birds in flight together)
- Part of every bird (unifies them)

Hmm. But "wing" is also very generic. Restaurant wings. Political wings.

---

## Let Me Try Another Angle

What if the name isn't about the BIRDS specifically,
but about what they CREATE together?

They create... SAFETY.
They create... A BARRIER.
They create... A WARNING SYSTEM.
They create... A FILTER.

In forest terms:
- A hedge? (too garden-y)
- A thicket? (dense growth that protects)
- A bower? (enclosed space, but romantic)
- A bramble? (thorny protection—but Thorn is already a thing)

---

## THICKET

A thicket is dense growth.
Hard to penetrate. Protective.
Where small birds nest safely.

"The Thicket" - the three-layer defense
Canary, Kestrel, Robin nest in the thicket
The thicket keeps predators out

`thicket.grove.place`

Thicket is:
- Protective (dense, hard to penetrate)
- Natural (fits Grove)
- A place (where the birds are)
- Defensive (but not aggressive)

But... does it connect to the BIRDS specifically?
The current names are Canary, Kestrel, Robin.
They're birds, not bushes.

---

## The Three Birds Need an Umbrella

What unifies Canary, Kestrel, and Robin?

They're all:
- Birds (obviously)
- Small to medium sized
- Alert and watchful
- Part of a defense system

In the pattern:
- They work in SEQUENCE
- Each one does a specific job
- Together they form a CHAIN of protection

---

## CHAIN?

No, too industrial.

---

## What About FLIGHT?

"Flight" as in:
- A flight of birds
- Birds in formation
- Multiple birds with purpose

"The Flight" - Canary leads, Kestrel watches, Robin delivers

`flight.grove.place`

Flight is:
- A group of birds
- Movement, action
- Graceful
- Purposeful

But "flight" also means running away from danger...
Mixed metaphor.

---

## Going Back to SONGBIRD

Maybe the problem isn't the word "songbird."
Maybe the problem is my interpretation.

Songbirds DO make alarm calls.
Robins sound alarms.
Even canaries chirp warnings.

But "songbird" emphasizes the SONG aspect,
not the warning aspect.

What if there's a term that emphasizes the WARNING?

---

## Research: Bird Alarm Systems

In nature, many bird species serve as "alarm birds":
- They call out when predators approach
- Other species learn to recognize their calls
- It's a community defense

The behavior is called: **mobbing** (when they gather to drive off predators)
The calls are called: **alarm calls** or **sentinel calls**

**Sentinel species** - animals that warn others of danger

SENTINEL.

---

## Revisiting SENTINEL

A sentinel is one who keeps watch and warns of danger.

"The Sentinels" - Canary, Kestrel, Robin
Each one a sentinel, watching at different levels

Canary: The first sentinel (early detection)
Kestrel: The watching sentinel (validation)
Robin: The trusted sentinel (safe output)

`sentinel.grove.place`

But... does "Sentinel" feel Grove-like?

Grove names are:
- Forage, Foliage, Heartwood (nature nouns)
- Meadow, Clearing, Nook (places in nature)
- Ivy, Reeds, Bloom (plants/growth)
- Amber, Patina (aged materials)
- Porch, Pantry (cozy home spaces)

"Sentinel" is more... military? Formal?

---

## What If the Name Is About SIGHT?

Birds have incredible vision.
Kestrels especially—they can see ultraviolet.
The protection pattern is about SEEING threats.

**Watch** - keeping watch
**Gaze** - the birds' gaze
**Sight** - the protective sight

These feel too generic.

---

## Hmm. Let Me Walk Again.

I'm in the grove.
The sun is setting.
AI helpers work in the background—Wisp, Thorn.

What protects them?

I look up. In the trees.
Birds. Watching.
Not singing now. Watching.

As dusk falls, they're alert.
This is when predators move.
This is when vigilance matters.

The birds in the canopy.
The watchers in the branches.
The guards in the leaves.

**The Canopy?**

No—Canopy is too close to Shade (protection from above).

---

## What About GROVE-KEEPER Birds?

In many forests, certain birds are considered "guardians."
They're the ones who sound alarms.
The ones you listen to when you hear them panic.

"Grove Keepers" - but the keeper is Autumn (the human).

What about just... **KEEPER**?

"Keeper" - the birds that keep watch
Canary Keeper, Kestrel Keeper, Robin Keeper

No, too confusing.

---

## PERCH

I keep coming back to Perch.

```
         *
        /|\         Canary on the highest perch
       / | \        Sees danger first
      *  |  *
     /|\ | /|\      Kestrel on the middle perch
    / | \|/ | \     Validates what Canary saw
   *  |  *  |  *
  /|\ | /|\ | /|\   Robin on the lowest perch
 / | \|/ | \|/ | \  Delivers the safe message
───┴───┴───┴───┴───
    THE PERCH
```

A perch is:
- Where birds sit to watch
- A vantage point
- A place of observation
- Elevated (above the danger)

"The Perch" - where the guardian birds watch from

`perch.grove.place`

*"From the Perch, they see everything."*

---

## Testing "Perch"

**Does it fit the Grove naming style?**
- One syllable: yes (like Bloom, Shade, Nook)
- Natural: yes (bird behavior)
- Evokes a feeling: watchfulness, elevation
- Could be a place: "Come to the Perch"

**Does it connect the three birds?**
- They all perch
- The perch is where they watch from
- Different heights on the same perch = layers

**Does it feel like security?**
- Birds on a perch are alert, watching
- Guards on watch sit at elevated posts
- It's about OBSERVATION, not aggression

**Potential issues:**
- "Perch" is also a type of fish
- "Perched" could mean precariously balanced
- Is it too simple?

---

## But Wait...

Perch is where birds sit.
It's passive.
This system is ACTIVE—it intercepts, validates, responds.

The birds aren't just sitting.
They're DOING something.

---

## What Are They Doing?

**Canary**: Testing, detecting
**Kestrel**: Watching, validating
**Robin**: Responding, delivering

They're... filtering?
They're... guarding?
They're... screening?

They're standing between the input and the system.
A protective layer.
A buffer.

---

## What If It's About the FORMATION?

Three birds in formation.
Each with a role.
Flying together.

**Skein** - a V-formation of geese
**Murmuration** - a flock of starlings moving together

Murmuration.

A murmuration is:
- Many birds moving as one
- Protective (predators can't pick individuals)
- Beautiful, coordinated
- Responsive (they react together)

But murmurations are starlings, not our birds.
And "murmuration" is quite long.

---

## Let's Try: FLUTTER

"Flutter" - the quick movement of birds

Canary Flutter, Kestrel Flutter, Robin Flutter?

No... flutter is too gentle. Almost nervous.

---

## What About the SOUND Again?

Canaries chirp.
Kestrels call (killy-killy-killy).
Robins sing cheerfully.

The alarm call is distinct from the song.
When danger comes, the call changes.

**Chirp** - too cute
**Call** - too generic
**Cry** - too sad
**Chatter** - birds chattering in alarm

**Chatter?**

A chatter of alarm.
The chattering that warns.

No... chatter implies noise without meaning.

---

## Coming Back to the Core Question

What IS this thing in the grove?

It's not a place.
It's not a plant.
It's a BEHAVIOR. A SYSTEM. A PROTOCOL.

Like how Mycelium is the network beneath.
Like how Ivy is the connection that grows.

This is... the ALERT. The WARNING SYSTEM.

What in nature represents a warning system?

---

## Wait. WISP Already Exists.

Wisp is the writing assistant.
The prompt injection protection is FOR Wisp.
It protects Wisp (and other AI features).

So this is WISP'S GUARDS.
The birds that protect the will-o'-the-wisp.

What guards a light?
What protects a flame?

Not directly applicable.

---

## Let Me Think About WHO This Serves

This pattern protects:
- Wisp (writing assistant)
- Thorn (future feature?)
- Any AI that processes untrusted input

It's INFRASTRUCTURE.
Like Lattice is infrastructure for UI.
Like Mycelium is infrastructure for MCP.

This is infrastructure for AI SAFETY.

What's the infrastructure equivalent in the grove?

Lattice = the trellis that supports growth
Mycelium = the network that connects
??? = the protection that guards

---

## HEDGE

A hedge is:
- A living fence
- Protective barrier
- Made of plants (fits Grove)
- Has birds living in it

"The Hedge" - the protective barrier around AI
Canary, Kestrel, Robin live in the Hedge

`hedge.grove.place`

Hedges are:
- Boundaries (they define protected space)
- Natural (grows, part of the landscape)
- Protective (keeps things out)
- Home to birds (connects to our three birds)

Hmm. But "hedge" also means "hedging your bets"—uncertainty.
And hedge funds. Not great associations.

---

## Actually... ROOST Revisited

I dismissed Roost earlier because it's about resting.
But a ROOST is also:
- Where birds gather at night
- Where they're most alert (vulnerable time)
- A collective term for birds together

"The Roost" - where the guardian birds gather

`roost.grove.place`

The Canary roosts.
The Kestrel roosts.
The Robin roosts.

They roost together, watching.

Hmm. But "roost" does feel passive.
"Coming home to roost" implies consequences returning.

---

## What About AERIE?

An aerie (eyrie) is:
- A high nest
- Where eagles live
- A lookout point
- Elevated, watching

But aerie is specifically for birds of prey.
Canary and Robin aren't birds of prey.
Only Kestrel is.

---

## COVEY

A covey is:
- A small flock of birds
- Specifically game birds (quail, partridge)
- A gathering

Not quite right.

---

## Actually, Let Me Reconsider SONGBIRD

The current name is "Songbird."
The sub-components are Canary, Kestrel, Robin.

What if I embrace the irony?

"Songbird" implies gentle singing.
But these songbirds have a DIFFERENT song.
The alarm song. The warning call.

*"Not all songs are sweet."*

The Songbird system:
- Canary sings first (detects)
- Kestrel sings second (validates)
- Robin sings third (responds)

Each one passes the song to the next.

But... this still feels like I'm forcing it.
Kestrels don't really "sing."
And the connection to SECURITY is weak.

---

## What If the Name Acknowledges the PARADOX?

Birds that protect through warning.
Song that isn't song—it's ALARM.

What's the opposite of a lullaby?
A wake-up call.

What's the opposite of pleasant birdsong?
The sharp cry of danger.

---

## Let Me Try: WARBLE

A warble is:
- A bird sound (singing with trills)
- Yodeling, variable sounds
- But also: unsteady, quavering

"The Warble" - sounds too unstable.

---

## TRILL

A trill is:
- A rapid alternation of notes
- Birds do this
- Alert, attention-grabbing

"The Trill" - the alarm trill
`trill.grove.place`

Hmm. A trill is more musical than alarm-y.

---

## Okay. Let Me Make a Decision.

I've been walking for a while.
Let me list my top candidates:

1. **Perch** - where the birds watch from
2. **Roost** - where they gather (but too passive)
3. **Flight** - birds in formation (but flight = running away)
4. **Sentinel** - watchers (but too military)
5. **Hedge** - living protective barrier (but hedge funds)
6. **Songbird** - current name (but wrong emphasis)

---

## PERCH Feels Right

Let me test it fully:

**"Perch is the AI safety layer."**
- Where guardian birds watch
- A vantage point for detection
- Where the Canary, Kestrel, and Robin sit

**Tagline test:**
> "Perch is where the watchful birds keep guard."

**The entry would be:**

```markdown
## Perch
**AI Safety Infrastructure** · *Internal pattern*

A perch is where birds sit to watch—elevated, alert,
seeing everything below. From the perch, danger is
spotted before it arrives.

Perch is Grove's AI safety infrastructure. When
untrusted content passes through Grove's AI features—
Wisp checking your writing, Thorn analyzing text—Perch
guards against prompt injection. Three birds work in
layers: Canary detects poison early, Kestrel validates
with precision, Robin delivers the safe response.

*From the Perch, they see everything.*
```

---

## But Wait, One More Consideration

"Perch" as a fish.

Is this confusing?

In context, no. The bird meaning is primary.
"A perch for birds" is common.
The fish meaning is archaic.

And Grove already has some ambiguity:
- Rings (tree rings AND analytics rings)
- Bloom (flower bloom AND ephemeral bloom)

The context makes it clear.

---

## Visual Test

```
                    🐦 CANARY
                   ───┬───
         PERCH        │           Layer 1: Detection
                      │
                    🦅 KESTREL
                   ───┬───
         PERCH        │           Layer 2: Validation
                      │
                    🐦 ROBIN
                   ───┬───
         PERCH        │           Layer 3: Response
                      │
                      v
               🛡️ SAFE OUTPUT
```

The birds perch at different heights.
Each perch is a layer of protection.
Together: The Perch system.

---

## Final Reflection

Songbird emphasizes SONG.
But this system isn't about song—it's about WATCHING.

Perch emphasizes POSITION.
The vantage point. The elevated watch.
Where birds sit to see danger coming.

The birds don't change:
- Canary (early detection)
- Kestrel (validation)
- Robin (trusted output)

But the umbrella changes from SONGBIRD to PERCH.

---

## Actually... One More Walk

I'm second-guessing.

"Perch" is good. But is it GREAT?

Let me walk one more time.

---

I'm in the grove. Night is falling.
Something threatens—poison in the text.

The birds aren't singing now.
They're WATCHING.

Where do they watch from?

Not the ground.
Not the canopy.

They're on branches.
Elevated. Alert.
Each one at a different height.

They're... perched.

But what's the COLLECTIVE action?

When the Canary spots danger—
It doesn't just sit there.
It CALLS.

The call spreads.
Kestrel hears it. Validates.
Robin hears the all-clear. Responds.

It's a RELAY.
A chain of bird calls.
An alarm that passes from perch to perch.

---

## The Relay of Warning

What if the name captures the RELAY aspect?

**Relay** - passing something along a chain
But too technical.

What's a natural relay?

In bird terms:
- Alarm calls spread through the forest
- Each bird picks up the call
- The warning ripples outward

**Ripple** - the spreading effect
But too watery.

**Echo** - the call that repeats
But we rejected Echo for support (shouting into void).
Though here, the echo IS the point—the warning echoes through layers.

---

## Hmm. ECHO Reconsidered

For support, Echo was wrong because it implied no response.
But for this pattern, echo means the WARNING SPREADS.

The Canary calls.
The Kestrel echoes: "I see it too."
The Robin echoes: "All clear now."

No... still not quite right.
The layers don't really echo—they each do different things.

---

## I'm Overthinking This

Let me go with PERCH.

Perch is:
- Where birds watch from (elevated, alert)
- A vantage point (seeing threats)
- Where all three birds can sit (unifies them)
- Natural, Grove-appropriate
- Simple, one syllable

The slight ambiguity with the fish is fine.
Context makes it clear.

---

## Wait. What If It's Not About WHERE They Are?

What if it's about WHAT They Do?

They GUARD.
They WATCH.
They WARN.

What do you call the birds who guard?

**Guardian birds** - too literal
**Watch birds** - too literal
**Ward birds** - hmm

**WARD?**

A ward is:
- A person under protection
- A district (hospital ward)
- To ward off danger

"To ward" = to guard, protect, defend

"The Ward" - the protection that wards off danger

`ward.grove.place`

Hmm. But "ward" has hospital connotations.
And ward as a person means someone being protected, not the protector.

---

## What About WARDEN?

"Warden" - one who guards a place

Forest warden.
Game warden.
The one who keeps watch.

But we already discussed—too Lord of the Rings.
Too official/governmental.

---

## You Know What? PERCH.

I've walked far enough.
The answer is PERCH.

It's where the birds sit.
It's where they watch from.
It unifies Canary, Kestrel, Robin under one concept.

**Final answer: PERCH**

---

## The Final Entry

```markdown
## Perch
**AI Safety Infrastructure** · *Internal pattern*

A perch is where birds sit to watch—elevated above the
forest floor, alert to movement, seeing danger before it
arrives. The higher the perch, the earlier the warning.

Perch is Grove's defense against prompt injection attacks.
When untrusted content flows through AI features like Wisp
or Thorn, Perch guards the gates with three watchful birds:

- **Canary** detects poison early (the miner's warning)
- **Kestrel** validates with precision (the hovering eye)
- **Robin** delivers the safe response (the trusted friend)

Each layer costs fractions of a cent. Together, they cost
less than trusting one model to do it all. Defense in depth,
from different perches.

*From the Perch, they see everything coming.*
```

---

## Alternative: Keep SONGBIRD

Actually, let me make a case FOR keeping Songbird:

**Arguments for Songbird:**
- Already implemented as "Songbird"
- The sub-names ARE birds (fits the theme)
- Canaries ARE songbirds (technically)
- "Songbird security" has a nice ring to it
- The irony could be intentional—"these songbirds don't sing pretty songs"

**Arguments against Songbird:**
- Emphasizes song, not protection
- Kestrels are NOT songbirds (they're raptors)
- Doesn't capture the SECURITY aspect
- Feels gentle when it should feel watchful

---

## The Question Is:

Does the name need to SCREAM security?
Or can it be subtle?

Grove names are often unexpected:
- Shade for AI protection (not Firewall)
- Porch for support (not Helpdesk)
- Patina for backups (not Vault)

The subtlety is part of the charm.

Maybe Songbird is fine?
The birds themselves tell the story:
- Canary = danger detection
- Kestrel = watchful validation
- Robin = trusted output

The umbrella "Songbird" could be intentionally soft.
A gentle name for fierce protection.

---

## Ugh. I'm Going in Circles.

Let me make a DECISION.

The Question: **Should it be SONGBIRD or PERCH?**

**SONGBIRD:**
- (+) Already in use
- (+) Subtle, unexpected
- (+) Connects to the bird theme
- (-) Wrong emphasis (song vs. warning)
- (-) Kestrel isn't a songbird

**PERCH:**
- (+) Emphasizes watchfulness
- (+) Where ALL the birds sit (unified)
- (+) Simple, one syllable
- (+) Natural, Grove-appropriate
- (-) New name (requires updates)
- (-) Minor fish ambiguity

---

## MY RECOMMENDATION: PERCH

Songbird doesn't fit because KESTREL ISN'T A SONGBIRD.
That's the dealbreaker.

Canary? Songbird.
Robin? Songbird.
Kestrel? RAPTOR. Not a songbird.

The umbrella term has to encompass all three.
They all PERCH.
They don't all SING.

**Final answer: PERCH**

---

## Summary

| Current | Proposed | Reason |
|---------|----------|--------|
| Songbird | **Perch** | All three birds perch; only two are songbirds |
| Canary | Canary | No change (early detection) |
| Kestrel | Kestrel | No change (validation) |
| Robin | Robin | No change (safe output) |

**The vision:**
Three birds on three perches.
Each at a different height.
Each watching for different things.
Together: The Perch.

*From the Perch, they see everything coming.*

---

## What If I'm Wrong?

If "Perch" doesn't feel right after sitting with it:

**Backup options:**
1. **Roost** - where birds gather (more passive but works)
2. **Flight** - birds in formation (but "flight" = running away)
3. **Keep Songbird** - embrace the irony (but Kestrel problem)

But I'm going with Perch.

---

*Journey completed. The birds have found their perch.*

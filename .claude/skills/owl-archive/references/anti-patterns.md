# Owl Archive — Anti-Patterns & Words to Avoid

> Source material: Grove internal style guide + [tropes.fyi](https://tropes.fyi)
> Any pattern used once might be fine. The problem is when multiple tropes appear together or a single trope repeats. Write like a human: varied, imperfect, specific.

---

## Word Choice

### Em-Dashes

**Avoid em-dashes (—).** One tasteful use per thousand words, maximum. Use commas, periods, or parentheses instead.

**Avoid:** The forest—our home—is where we gather.
**Better:** The forest is our home. It's where we gather.
**Also fine:** The forest (our home) is where we gather.

### "Quietly" and Magic Adverbs

AI reaches for adverbs like "quietly" to make mundane descriptions feel significant. Also watch for: "deeply", "fundamentally", "remarkably", "arguably".

**Avoid:**
- "quietly orchestrating workflows, decisions, and interactions"
- "a quiet intelligence behind it"
- "this fundamentally changes how we think about X"

**Instead:** If something is important, show why. Don't sprinkle adverbs to manufacture gravity.

### "Delve" and Friends

"Delve" went from an uncommon English word to appearing in a huge percentage of AI-generated text. Part of a family of overused AI vocabulary.

| Category | Words to Avoid |
|----------|----------------|
| **Adjectives** | robust, seamless, innovative, cutting-edge, transformative, intricate, captivating, comprehensive |
| **Nouns** | tapestry, camaraderie, realm, plethora, myriad, landscape, journey (when not literal), paradigm, synergy, ecosystem (when not literal), framework (when not literal) |
| **Verbs** | delve, foster, leverage, navigate, empower, embark, unlock, harness, utilize, streamline, spearhead |
| **Phrases** | at the end of the day, in today's world, it goes without saying, needless to say, certainly |

### The "Serves As" Dodge

Replacing simple "is" or "are" with pompous alternatives. AI avoids basic verbs because its repetition penalty pushes it toward fancier constructions.

**Avoid:**
- "The building serves as a reminder of..." (just say "reminds us of")
- "This stands as a testament to..." (just say "shows")
- "The station marks a pivotal moment in..." (just say "changed")
- "This represents a fundamental shift" (just say "this changed things")

**Instead:** Use "is", "are", "was", "does". Simple verbs are fine.

---

## Sentence Structure

### The "Not X, But Y" Pattern

The single most commonly identified AI writing tell. AI uses this to create false profundity by framing everything as a surprising reframe. One in a piece can work; several is an insult to the reader.

**Never write:**
- "It's not X, but Y"
- "It's not just X, but Y"
- "It's not merely X, but rather Y"
- "Grove isn't just a platform, it's a home"
- "not because X, but because Y" (the causal variant, where every explanation is framed as a surprise reveal)

**Instead, just say the thing:**
- "Grove is a home for your words."
- "This is where you belong."

### "Not X. Not Y. Just Z."

The dramatic countdown. AI builds tension by negating two or more things before revealing the actual point. Creates a false sense of narrowing down to the truth.

**Avoid:**
- "Not a bug. Not a feature. A fundamental design flaw."
- "Not ten. Not fifty. Five hundred."
- "not recklessly, not completely, but enough"

### "The X? A Y."

Self-posed rhetorical questions answered immediately. The model asks a question nobody was asking, then answers it for dramatic effect.

**Avoid:**
- "The result? Devastating."
- "The worst part? Nobody saw it coming."
- "The cost? More than anyone expected."

### Anaphora Abuse

Repeating the same sentence opening multiple times in quick succession.

**Avoid:**
- "They assume that users will pay... They assume that developers will build... They assume that ecosystems will emerge..."
- "They could expose... They could offer... They could provide... They could create..."

### Tricolon Abuse

Overuse of the rule-of-three pattern, often extended to four or five. A single tricolon is fine; three back-to-back tricolons are a pattern recognition failure.

**Avoid:**
- "Products impress people; platforms empower them. Products solve problems; platforms create worlds."
- Groupings of three or four abstract nouns: "workflows, decisions, and interactions"

### Filler Transitions

Phrases that signal nothing. AI uses these to introduce new points without connecting them to the previous argument.

**Avoid:**
- It's worth noting that
- It bears mentioning
- Importantly,
- Interestingly,
- Notably,
- Furthermore
- Moreover
- Additionally
- In conclusion
- That being said
- It's important to note

**Instead:** Let ideas connect naturally. Use short transitions like "And," "But," "So," "Still." Or no transition at all. Just start the next thought.

### Superficial Analyses

Tacking a present participle phrase onto the end of a sentence to inject shallow analysis that says nothing. The model attaches significance or legacy to mundane facts.

**Avoid:**
- "contributing to the region's rich cultural heritage"
- "highlighting its enduring legacy"
- "underscoring its role as a dynamic hub"
- "reflecting broader trends in the industry"

**Instead:** If something is significant, explain why in a real sentence. Don't staple significance onto the end of a fact.

### False Ranges

Using "from X to Y" where X and Y aren't on any real scale. In legitimate use, "from X to Y" implies a spectrum with a meaningful middle.

**Avoid:**
- "From innovation to cultural transformation."
- "From problem-solving and tool-making to scientific discovery and artistic expression."

### Gerund Fragment Litany

After making a claim, illustrating it with a stream of verbless gerund fragments. Standalone sentences with no grammatical subject.

**Avoid:**
- "Fixing small bugs. Writing straightforward features. Implementing well-defined tickets."
- "Reviewing pull requests. Debugging edge cases. Attending architecture meetings."
- "Shipping faster. Moving quicker. Delivering more."

**Instead:** The first sentence already said everything. The fragments add nothing except word count and that familiar AI cadence.

---

## Paragraph Structure

### Short Punchy Fragments

Excessive use of very short sentences or fragments as standalone paragraphs for manufactured emphasis. One thought per sentence, no mental state-keeping required. No real person writes first drafts this way.

**Avoid:**
- "He published this. Openly. In a book. As a priest."
- "These weren't just products. And the software side matched. Then it professionalised. But I adapted."
- Single-word paragraphs used for drama: "Platforms do."

**Good short sentences exist.** The problem is when every paragraph is a one-liner. Vary your rhythm. Some paragraphs should be two to four sentences.

### Listicle in a Trench Coat

Numbered or labeled points dressed up as continuous prose. The model writes what is essentially a listicle but wraps each point in a paragraph that starts with "The first... The second... The third..." to disguise the format.

**Avoid:**
- "The first wall is the absence of... The second wall is the lack of... The third wall is..."
- "The second takeaway is that... The third takeaway is that..."

**Instead:** If you have a list, use a list. If you have prose, write prose. Don't dress one as the other.

---

## Tone

### "Here's the Kicker"

False suspense transitions that promise a revelation but deliver an unremarkable point. AI uses these to manufacture drama before an otherwise ordinary observation.

**Avoid:**
- "Here's the kicker."
- "Here's the thing about..."
- "Here's where it gets interesting."
- "Here's what most people miss."

### "Think of It As..."

The patronizing analogy. AI defaults to teacher mode and assumes the reader needs a metaphor to understand anything. Often produces analogies less clear than the original concept.

**Avoid:**
- "Think of it like a highway system for data."
- "Think of it as a Swiss Army knife for your workflow."

**Instead:** If an analogy genuinely helps, use it naturally. Don't announce it with "Think of it as."

### "Imagine a World Where..."

The classic AI invitation to futurism. Begins with "Imagine" followed by a list of wonderful things.

**Avoid:**
- "Imagine a world where every tool you use has a quiet intelligence behind it..."
- "In that world, workflows stop being collections of manual steps..."

### False Vulnerability

Simulated self-awareness or honesty that reads as performative. Real vulnerability is specific and uncomfortable; AI vulnerability is polished and risk-free.

**Avoid:**
- "And yes, I'm openly in love with the platform model"
- "This is not a rant; it's a diagnosis"
- "And yes, since we're being honest..."

### "The Truth Is Simple"

Asserting that something is obvious or simple instead of actually proving it. If you have to tell the reader your point is clear, it probably isn't.

**Avoid:**
- "The reality is simpler and less flattering"
- "History is unambiguous on this point"
- "The answer is clear"

### Grandiose Stakes Inflation

Everything is the most important thing ever. AI inflates the stakes of every argument to world-historical significance.

**Avoid:**
- "This will fundamentally reshape how we think about everything."
- "will define the next era of computing"
- "something entirely new"

**Instead:** Let the argument carry its own weight. If the stakes are high, the reader will feel it from the evidence.

### "Let's Break This Down"

The pedagogical voice that assumes the reader needs hand-holding. AI defaults to a teacher-student dynamic even when writing for expert audiences.

**Avoid:**
- "Let's break this down step by step."
- "Let's unpack what this really means."
- "Let's explore this idea further."
- "Let's dive in."

### Vague Attributions

Attributing claims to unnamed authorities instead of being specific. If you can't name the expert, you don't have a source.

**Avoid:**
- "Experts argue that..."
- "Industry reports suggest that..."
- "Observers have cited..."
- "Several publications have noted..."

**Instead:** Name the person, paper, or report. Or present the claim as your own argument and defend it.

### Invented Concept Labels

Clustering invented compound labels that sound analytical without being grounded. Appending abstract problem-nouns (paradox, trap, creep, divide, vacuum, inversion) to domain words as if they're established terms.

**Avoid:**
- "the supervision paradox"
- "the acceleration trap"
- "workload creep"

**Instead:** If a concept needs a name, define it. Don't name a thing and skip the argument.

---

## Formatting

### Bold-First Bullets

Every bullet point or list item starts with a bolded phrase. Extremely common in AI markdown output. Almost nobody formats lists this way when writing by hand.

**Avoid:**
- "**Security**: Environment-based configuration with..."
- "**Performance**: Lazy loading of expensive resources..."

**When it's fine:** Feature comparison tables or API reference docs where the bold label is genuinely a field name. Not in narrative lists or blog posts.

### Unicode Decoration

Use of unicode arrows, smart quotes, and other special characters that can't be easily typed on a standard keyboard.

**Avoid:**
- "Input → Processing → Output" (use `->` or just describe the flow)
- Curly "smart quotes" instead of straight quotes you'd actually type

---

## Composition

### Semantic Echoes

Don't repeat the same adjective or descriptor multiple times. AI does this constantly.

**Bad:**
> Grove provides a seamless experience. The seamless integration means you can seamlessly move between features.

**Good:**
> Grove gets out of your way. Move between features without friction.

### Generic Safe Claims

AI hedges. Humans commit.

**Bad:** "This may help improve your workflow in many cases."
**Good:** "This makes your workflow faster."

### Fractal Summaries

"What I'm going to tell you; what I'm telling you; what I just told you" applied at every level. Every subsection gets a summary. Every section gets a summary. The document itself gets a summary.

**Avoid:**
- "In this section, we'll explore..." followed 3000 words later by "as we've seen in this section..."
- Conclusions that restate every point already made
- "And so we return to where we began."

### The Dead Metaphor

Latching onto a single metaphor and beating it into the ground across an entire piece. A human writer introduces a metaphor, uses it, and moves on. AI repeats the same metaphor 5-10 times.

**Watch for:** The same metaphor word appearing in every paragraph. If you find yourself writing "ecosystem" for the tenth time, you've killed the metaphor.

### Historical Analogy Stacking

Especially common in technical writing. Rapid-fire listing of historical companies or tech revolutions to build false authority.

**Avoid:**
- "Apple didn't build Uber. Facebook didn't build Spotify. Stripe didn't build Shopify."
- "Every major technological shift (the web, mobile, social, cloud) followed the same pattern."
- "Take Spotify... Or consider Uber... Airbnb followed a similar path... Even Discord..."

### One-Point Dilution

Making a single argument and restating it in 10 different ways across thousands of words. The model pads a simple thesis to feel comprehensive by rephrasing the same idea with different metaphors, examples, and framings.

**Detect:** If you can summarize the whole piece in one sentence and every section says the same sentence differently, it's diluted.

### Content Duplication

Repeating entire sections or paragraphs verbatim within the same piece. Happens when the model loses track of what it has already written, especially in longer pieces.

### The Signposted Conclusion

Explicitly announcing the conclusion with "In conclusion", "To sum up", or "In summary." Competent writing doesn't need to tell you it's concluding. The reader can feel it.

**Avoid:**
- "In conclusion, the future of AI depends on..."
- "To sum up, we've explored three key themes..."
- "In summary, the evidence suggests..."

### "Despite Its Challenges..."

The rigid formula where AI acknowledges problems only to immediately dismiss them. Always follows the same beat: introduce positives, mention challenges, end with "Despite these challenges, [optimistic conclusion]."

**Avoid:**
- "Despite these challenges, the initiative continues to thrive."
- "Despite their promising applications, [subject] faces several challenges that must be addressed for broader adoption."

**Instead:** If something has real problems, say so. Don't use "despite" as a dismissal machine.

---

## Structural Anti-Patterns

**Dense walls of text.** One idea per paragraph. Two to four sentences is usually right. White space is your friend.

**Everything as bullets.** Don't turn narrative content into bullets. Sometimes prose flows better.

**Good use of lists:**
- Specific steps in a process
- Features that are truly parallel
- Quick reference information

**Bad use of lists:**
- Narrative content broken awkwardly
- Things that would read better as a sentence

**Vague headers.** "Guidelines" is worse than "Writing Guidelines." "Voice" is worse than "What Grove Sounds Like." Action-oriented headers work well for help docs: "Add Your First Post" not "Posts."

**Overused callouts.** Use sparingly. Don't use callouts for things that should just be in the text.

```
> 💡 **Tip:** Helpful suggestion that enhances understanding.
> ⚠️ **Warning:** Something that could cause problems if ignored.
```

---

## Error Message Anti-Patterns

**Over-apologizing:**
```
We're SO sorry!!! We feel TERRIBLE about this!!!
Please forgive us and try again!
```

**Being cute when things are broken:**
```
Oops! 😅 Looks like something went wrong! Don't worry though,
these things happen!
```

**Cold technical error:**
```
Error 500: Internal Server Error. Contact administrator.
```

**What to do instead:**
1. Say what happened (briefly)
2. Say what they can do (if anything)
3. Don't over-apologize (one "sorry" max)
4. Don't be cute when things are broken

---

## Self-Review Checklist

Before finalizing any Grove documentation:

- [ ] Read it aloud. Does it sound human?
- [ ] Check for em-dashes. Remove them.
- [ ] Search for "not just" and "but rather." Rewrite.
- [ ] Look for words from the avoid list. Replace them.
- [ ] Scan for "serves as", "stands as", "marks a", "represents a". Simplify.
- [ ] Check for rhetorical self-questions ("The result? ..."). Remove.
- [ ] Look for gerund fragment lists. Rewrite as real sentences.
- [ ] Count your tricolons. If more than one, cut.
- [ ] Check for "Here's the thing" / "Here's where it gets interesting." Remove.
- [ ] Check for bold-first bullet patterns in narrative lists. Unbold.
- [ ] Vary sentence length. No monotone rhythm.
- [ ] Cut unnecessary transitions. Ideas should flow naturally.
- [ ] Is the closer earned? If forced, remove it.
- [ ] Would you want to read this at 2 AM in a tea shop?

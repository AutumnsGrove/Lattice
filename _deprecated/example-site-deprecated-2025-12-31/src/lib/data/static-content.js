// Static content for Cloudflare Workers compatibility
// This replaces the filesystem-based content.js to avoid Node.js dependencies

export const siteConfig = {
  owner: {
    name: "The Midnight Bloom",
    email: "hello@example.grove.place",
  },
  site: {
    title: "The Midnight Bloom",
    tagline: "Open when the stars come out",
    description:
      "A late-night tea café where time slows down. Serving rare teas, quiet conversations, and the comfort of a warm cup in the small hours.",
    copyright: "The Midnight Bloom Tea Café",
  },
  social: {
    instagram: "https://instagram.com/midnightbloom",
    twitter: "https://twitter.com/midnightbloom",
  },
  hours: {
    open: "6:00 PM",
    close: "4:00 AM",
    days: "Wednesday - Sunday",
  },
  location: {
    address: "742 Twilight Lane",
    city: "Moonhaven",
    state: "OR",
    zip: "97401",
  },
};

export const pages = {
  Home: {
    title: "Home",
    hero: {
      title: "The Midnight Bloom",
      subtitle: "Open when the stars come out",
      cta: {
        text: "Read Our Blog",
        link: "/blog",
      },
    },
    content: `<h1>Welcome to The Midnight Bloom</h1>
<p>When the rest of the world winds down, we're just getting started. The Midnight Bloom is a sanctuary for night owls, late-shift workers, insomniacs, and anyone who finds peace in the quiet hours after dark.</p>
<h2>Our Philosophy</h2>
<p>We believe tea is more than a beverage—it's a ritual, a moment of pause, a small act of self-care in a world that rarely stops moving. Every cup we serve is an invitation to slow down, to breathe, to simply <em>be</em>.</p>
<p>Our selection spans the globe: delicate white teas from Fujian, robust pu-erhs from Yunnan, rare oolongs from the mountains of Taiwan, and herbal blends we craft in-house under the light of the moon.</p>
<h2>What Makes Us Different</h2>
<ul>
<li><strong>Hours built for night people</strong>: We open at 6 PM and don't close until 4 AM</li>
<li><strong>Curated silence</strong>: No background music, just the gentle sounds of tea being prepared</li>
<li><strong>Rare finds</strong>: Teas you won't find anywhere else in the city</li>
<li><strong>No rush</strong>: Stay as long as you need—we understand that some nights are longer than others</li>
</ul>
<h2>Visit Us</h2>
<p>We're tucked away on Twilight Lane, easy to miss if you're not looking. A small wooden sign, a door with a brass moon handle, and the warm glow of candlelight in the window. You'll know it when you find it.</p>
<p><em>The Midnight Bloom: where every night holds the possibility of something beautiful.</em></p>`,
    rawContent: `# Welcome to The Midnight Bloom

When the rest of the world winds down, we're just getting started. The Midnight Bloom is a sanctuary for night owls, late-shift workers, insomniacs, and anyone who finds peace in the quiet hours after dark.

## Our Philosophy

We believe tea is more than a beverage—it's a ritual, a moment of pause, a small act of self-care in a world that rarely stops moving. Every cup we serve is an invitation to slow down, to breathe, to simply *be*.

Our selection spans the globe: delicate white teas from Fujian, robust pu-erhs from Yunnan, rare oolongs from the mountains of Taiwan, and herbal blends we craft in-house under the light of the moon.

## What Makes Us Different

- **Hours built for night people**: We open at 6 PM and don't close until 4 AM
- **Curated silence**: No background music, just the gentle sounds of tea being prepared
- **Rare finds**: Teas you won't find anywhere else in the city
- **No rush**: Stay as long as you need—we understand that some nights are longer than others

## Visit Us

We're tucked away on Twilight Lane, easy to miss if you're not looking. A small wooden sign, a door with a brass moon handle, and the warm glow of candlelight in the window. You'll know it when you find it.

*The Midnight Bloom: where every night holds the possibility of something beautiful.*`,
  },
  About: {
    title: "About Us",
    content: `<h1>Our Story</h1>
<p>The Midnight Bloom opened its doors on the winter solstice of 2019—the longest night of the year. It felt fitting.</p>
<h2>How It Began</h2>
<p>Our founder, Elena Chen, spent a decade working night shifts as a nurse. She understood intimately what it meant to be awake when the world sleeps, to crave connection and comfort in the small hours. The coffee shops were closed. The bars were too loud. There was nowhere to simply sit with a warm drink and quiet thoughts.</p>
<p>So she created that place herself.</p>
<h2>The Name</h2>
<p>The midnight bloom refers to night-blooming flowers—jasmine, moonflowers, evening primrose—plants that save their beauty for the darkness. They don't compete with the sun; they wait for the moon.</p>
<p>We think there's something poetic in that. Some things are meant to flourish after dark.</p>
<h2>Our Space</h2>
<p>The café is small by design. Just twelve seats, arranged to offer both community and solitude. Worn wooden tables, mismatched vintage chairs, and candlelight that flickers gently against the exposed brick walls.</p>
<p>We have no Wi-Fi password—by choice. This is a place to disconnect from the digital and reconnect with the present moment. Bring a book, bring a journal, bring a friend. Or bring nothing at all.</p>
<h2>Our Team</h2>
<p>Our staff are all night people themselves. We understand the particular loneliness of 2 AM, and we're here to offer warmth in whatever form you need—a perfectly brewed cup, a knowing smile, or the simple comfort of shared silence.</p>
<h2>A Note on Reservations</h2>
<p>We don't take them. The Midnight Bloom operates on serendipity. Some nights you'll find an empty seat immediately; other nights you might wait. We find this adds to the magic—you never quite know what any given night will bring.</p>
<p><em>Come find us when the stars come out.</em></p>`,
    rawContent: `# Our Story

The Midnight Bloom opened its doors on the winter solstice of 2019—the longest night of the year. It felt fitting.

## How It Began

Our founder, Elena Chen, spent a decade working night shifts as a nurse. She understood intimately what it meant to be awake when the world sleeps, to crave connection and comfort in the small hours. The coffee shops were closed. The bars were too loud. There was nowhere to simply sit with a warm drink and quiet thoughts.

So she created that place herself.

## The Name

The midnight bloom refers to night-blooming flowers—jasmine, moonflowers, evening primrose—plants that save their beauty for the darkness. They don't compete with the sun; they wait for the moon.

We think there's something poetic in that. Some things are meant to flourish after dark.

## Our Space

The café is small by design. Just twelve seats, arranged to offer both community and solitude. Worn wooden tables, mismatched vintage chairs, and candlelight that flickers gently against the exposed brick walls.

We have no Wi-Fi password—by choice. This is a place to disconnect from the digital and reconnect with the present moment. Bring a book, bring a journal, bring a friend. Or bring nothing at all.

## Our Team

Our staff are all night people themselves. We understand the particular loneliness of 2 AM, and we're here to offer warmth in whatever form you need—a perfectly brewed cup, a knowing smile, or the simple comfort of shared silence.

## A Note on Reservations

We don't take them. The Midnight Bloom operates on serendipity. Some nights you'll find an empty seat immediately; other nights you might wait. We find this adds to the magic—you never quite know what any given night will bring.

*Come find us when the stars come out.*`,
  },
  Contact: {
    title: "Find Us",
    content: `<h1>Visit The Midnight Bloom</h1>
<h2>Location</h2>
<p><strong>742 Twilight Lane</strong><br>
Moonhaven, OR 97401</p>
<p>We're in the historic Starlight District, between the old clock tower and the river walk. Look for the brass moon on our door.</p>
<h2>Hours</h2>
<p><strong>Wednesday - Sunday</strong><br>
6:00 PM - 4:00 AM</p>
<p><em>Closed Monday & Tuesday for rest and restocking</em></p>
<h2>Getting Here</h2>
<p><strong>By Car</strong>: Street parking is available on Twilight Lane and adjacent streets. The meters don't run after 8 PM.</p>
<p><strong>By Transit</strong>: The Route 11 &quot;Night Owl&quot; bus stops at Starlight & River, a 3-minute walk from our door.</p>
<p><strong>By Foot</strong>: Follow the river walk north from downtown. When you see the old clock tower, turn left onto Twilight Lane.</p>
<h2>Contact</h2>
<p>We don't have a phone—we find it disrupts the atmosphere. For inquiries about private events or wholesale tea orders, please email us:</p>
<p><strong>hello@midnightbloom.cafe</strong></p>
<p>We check our messages each evening before opening and will respond within 48 hours.</p>
<h2>Private Events</h2>
<p>On Monday and Tuesday evenings (when we're normally closed), The Midnight Bloom is available for private gatherings of up to 12 guests. Perfect for:</p>
<ul>
<li>Small celebrations</li>
<li>Book clubs</li>
<li>Tea appreciation gatherings</li>
<li>Quiet work sessions</li>
</ul>
<p>Email us to inquire about availability and pricing.</p>
<h2>A Word of Welcome</h2>
<p>Whether you're a night shift worker seeking respite, an artist chasing inspiration, or simply someone who can't sleep—you're welcome here. No judgment, no rush, just tea and the quiet company of fellow night dwellers.</p>
<p><em>See you after dark.</em></p>`,
    rawContent: `# Visit The Midnight Bloom

## Location

**742 Twilight Lane**
Moonhaven, OR 97401

We're in the historic Starlight District, between the old clock tower and the river walk. Look for the brass moon on our door.

## Hours

**Wednesday - Sunday**
6:00 PM - 4:00 AM

*Closed Monday & Tuesday for rest and restocking*

## Getting Here

**By Car**: Street parking is available on Twilight Lane and adjacent streets. The meters don't run after 8 PM.

**By Transit**: The Route 11 "Night Owl" bus stops at Starlight & River, a 3-minute walk from our door.

**By Foot**: Follow the river walk north from downtown. When you see the old clock tower, turn left onto Twilight Lane.

## Contact

We don't have a phone—we find it disrupts the atmosphere. For inquiries about private events or wholesale tea orders, please email us:

**hello@midnightbloom.cafe**

We check our messages each evening before opening and will respond within 48 hours.

## Private Events

On Monday and Tuesday evenings (when we're normally closed), The Midnight Bloom is available for private gatherings of up to 12 guests. Perfect for:

- Small celebrations
- Book clubs
- Tea appreciation gatherings
- Quiet work sessions

Email us to inquire about availability and pricing.

## A Word of Welcome

Whether you're a night shift worker seeking respite, an artist chasing inspiration, or simply someone who can't sleep—you're welcome here. No judgment, no rush, just tea and the quiet company of fellow night dwellers.

*See you after dark.*`,
  },
};

export const posts = [
  {
    slug: "why-we-dont-play-music",
    title: "Why We Don't Play Music",
    date: "2025-12-01",
    description: "The radical act of letting silence speak",
    tags: ["atmosphere", "philosophy", "design"],
    content: `<p>Every new visitor asks the same question, usually within the first ten minutes: &quot;Is the music broken?&quot;</p>
<p>No. There is no music. There never has been.</p>
<h2>The Sound of Most Cafés</h2>
<!-- anchor:sound-note -->

<p>Walk into any coffee shop and you'll be greeted by a carefully curated playlist. Indie folk in the morning, lo-fi beats in the afternoon, something vaguely jazzy in the evening. It's designed to create &quot;ambiance&quot;—to fill the space with something pleasant and forgettable.</p>
<p>We understand the impulse. Silence can feel awkward, especially in public spaces. Music gives people permission to talk without feeling overheard. It smooths the edges of social interaction.</p>
<p>But here's the thing: we don't want to smooth edges. We want to create a space where the edges are felt.</p>
<h2>What You Hear Instead</h2>
<p>Without music, The Midnight Bloom has its own soundscape:</p>
<ul>
<li>The whisper of steam from the kettles</li>
<li>The gentle clink of ceramic cups on wooden tables</li>
<li>Rain on the windows when the weather obliges</li>
<li>The occasional turning of a page</li>
<li>Quiet conversation that rises and falls like breath</li>
<li>Sometimes, nothing at all</li>
</ul>
<!-- anchor:silence -->

<p>This isn't silence—it's the absence of manufactured sound. There's a difference.</p>
<h2>The Magic of Quiet Conversation</h2>
<p>When there's no background music, conversations change. People speak more softly, more intentionally. They listen more carefully. The pauses between words become meaningful rather than uncomfortable.</p>
<p>Some of the most profound conversations we've witnessed at The Midnight Bloom happened in near-whispers. There's an intimacy to speaking quietly that a normal-volume conversation in a noisy café can never achieve.</p>
<h2>For Those Who Need Sound</h2>
<!-- anchor:headphones -->

<p>We understand that not everyone finds silence comfortable. Some people need noise to focus, or to quiet the noise in their own heads. That's valid.</p>
<p>We keep a small basket of complimentary earplugs by the door—the soft foam kind—for guests who prefer to create their own silence. And we have no policy against headphones. Your ears, your choice.</p>
<p>What we don't do is make that choice for everyone.</p>
<h2>The Night Has Its Own Music</h2>
<p>At 2 AM, with only a handful of people scattered across our twelve seats, the café takes on a quality that's hard to describe. The city outside is quiet. The usual urban hum has faded. And in that hush, The Midnight Bloom becomes something almost sacred.</p>
<!-- anchor:sacred -->

<p>This is when the tea tastes best. When the candlelight seems brighter. When strangers glance at each other with the recognition of fellow travelers in strange territory.</p>
<p>Music would ruin it.</p>
<h2>An Experiment for Skeptics</h2>
<p>If you're used to cafés with carefully curated playlists, we invite you to try something: sit with us for an hour without putting in headphones. Let the quietness settle around you. Notice what you hear. Notice what you think.</p>
<p>You might hate it. Some people do.</p>
<p>But you might find something you didn't know you were looking for: the rare luxury of a public space that doesn't demand anything from your ears.</p>
<p><em>Sometimes the most radical thing you can offer is nothing at all.</em></p>`,
    rawContent: `Every new visitor asks the same question, usually within the first ten minutes: "Is the music broken?"

No. There is no music. There never has been.

## The Sound of Most Cafés

<!-- anchor:sound-note -->

Walk into any coffee shop and you'll be greeted by a carefully curated playlist. Indie folk in the morning, lo-fi beats in the afternoon, something vaguely jazzy in the evening. It's designed to create "ambiance"—to fill the space with something pleasant and forgettable.

We understand the impulse. Silence can feel awkward, especially in public spaces. Music gives people permission to talk without feeling overheard. It smooths the edges of social interaction.

But here's the thing: we don't want to smooth edges. We want to create a space where the edges are felt.

## What You Hear Instead

Without music, The Midnight Bloom has its own soundscape:

- The whisper of steam from the kettles
- The gentle clink of ceramic cups on wooden tables
- Rain on the windows when the weather obliges
- The occasional turning of a page
- Quiet conversation that rises and falls like breath
- Sometimes, nothing at all

<!-- anchor:silence -->

This isn't silence—it's the absence of manufactured sound. There's a difference.

## The Magic of Quiet Conversation

When there's no background music, conversations change. People speak more softly, more intentionally. They listen more carefully. The pauses between words become meaningful rather than uncomfortable.

Some of the most profound conversations we've witnessed at The Midnight Bloom happened in near-whispers. There's an intimacy to speaking quietly that a normal-volume conversation in a noisy café can never achieve.

## For Those Who Need Sound

<!-- anchor:headphones -->

We understand that not everyone finds silence comfortable. Some people need noise to focus, or to quiet the noise in their own heads. That's valid.

We keep a small basket of complimentary earplugs by the door—the soft foam kind—for guests who prefer to create their own silence. And we have no policy against headphones. Your ears, your choice.

What we don't do is make that choice for everyone.

## The Night Has Its Own Music

At 2 AM, with only a handful of people scattered across our twelve seats, the café takes on a quality that's hard to describe. The city outside is quiet. The usual urban hum has faded. And in that hush, The Midnight Bloom becomes something almost sacred.

<!-- anchor:sacred -->

This is when the tea tastes best. When the candlelight seems brighter. When strangers glance at each other with the recognition of fellow travelers in strange territory.

Music would ruin it.

## An Experiment for Skeptics

If you're used to cafés with carefully curated playlists, we invite you to try something: sit with us for an hour without putting in headphones. Let the quietness settle around you. Notice what you hear. Notice what you think.

You might hate it. Some people do.

But you might find something you didn't know you were looking for: the rare luxury of a public space that doesn't demand anything from your ears.

*Sometimes the most radical thing you can offer is nothing at all.*`,
    gutterContent: {
      items: [
        {
          type: "comment",
          anchor: "anchor:sound-note",
          content: `<p>Elena spent six months researching &quot;café playlists&quot; before opening. She found over 50,000 &quot;coffee shop vibes&quot; playlists on Spotify alone. It felt less like curation and more like conformity.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:silence",
          content: `<p>John Cage's 4'33&quot; taught us that there's no such thing as true silence—only sounds we haven't noticed yet. We try to create space for noticing.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:headphones",
          content: `<p>Our most popular headphone choice among regulars? Apparently it's brown noise. We've been told it sounds like &quot;being inside a warm sweater.&quot;</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:sacred",
          content: `<p>A regular once described the 3 AM atmosphere as &quot;like being in a library, but the books are people's thoughts.&quot; We've never forgotten that.</p>`,
        },
      ],
    },
  },
  {
    slug: "our-favorite-midnight-regulars",
    title: "Our Favorite Midnight Regulars",
    date: "2025-11-28",
    description: "The beautiful humans who make our late nights worthwhile",
    tags: ["community", "stories", "regulars"],
    content: `<p>Every café has its regulars. Ours just happen to appear after midnight.</p>
<h2>The Night Shift Nurses</h2>
<!-- anchor:nurses -->

<p>They come in groups of two or three, still in scrubs, exhausted in ways that show in their eyes more than their posture. They rarely speak to each other at first—just sit with their tea and decompress. By the second cup, conversation slowly emerges. Stories from the ward, shared in the way only people who've seen the same things can understand.</p>
<p>We always have their orders started before they sit down. Chamomile for Sarah. Lapsang souchong for Marcus. Mint blend for whoever needs it most.</p>
<h2>The Novelist</h2>
<p>We don't know her real name. She introduced herself once as &quot;just someone trying to finish a book,&quot; and we never pressed further. She arrives around 10 PM every Thursday with a leather journal and a fountain pen, orders our strongest black tea, and writes until we close.</p>
<!-- anchor:novelist -->

<p>In three years, she's filled dozens of notebooks. We've never asked what she's writing. Some mysteries are better left intact.</p>
<h2>The Insomniacs Anonymous</h2>
<p>A group that found each other here, not by design but by repeated coincidence. Now they have a standing (unspoken) reservation at the corner table every Saturday night. They don't talk about why they can't sleep—they talk about everything else. Books, movies, the philosophical implications of artificial intelligence, the best way to make scrambled eggs.</p>
<p>We've watched friendships form in real-time, forged in the shared understanding that 3 AM can be the loneliest hour, but it doesn't have to be.</p>
<h2>The Stargazer</h2>
<p>An astronomy professor from the university who comes in before dawn on clear nights, always with a telescope case and a look of quiet wonder. He orders whatever's warmest and tells us about what's visible in the sky that night.</p>
<!-- anchor:stargazer -->

<p>&quot;Did you know,&quot; he said once, &quot;that the light from some of these stars started traveling toward us before humans existed?&quot; Then he smiled into his tea like he'd shared a secret.</p>
<h2>The Night Bus Driver</h2>
<p>Route 11, the Night Owl. She has a 45-minute break between runs, and she spends most of it here. Always orders a pot of oolong—enough for two or three cups—and reads paperback mysteries from the used bookstore down the street.</p>
<p>&quot;The night shift is lonely,&quot; she told us once. &quot;Nice to have somewhere that's awake when I am.&quot;</p>
<h2>Why They Matter</h2>
<!-- anchor:community -->

<p>These people—and dozens of others who drift in and out of our orbit—are the reason The Midnight Bloom exists. We didn't open a café to serve tea. We opened it to create a space where night people could find each other.</p>
<p>The best moments here aren't the quiet ones. They're when a regular introduces themselves to another regular, when strangers become friends over shared insomnia, when someone walks in lost and leaves a little more found.</p>
<h2>An Open Invitation</h2>
<p>If you're reading this and recognizing yourself—if you're someone who's awake when the world sleeps, looking for a place to be—consider this your invitation.</p>
<p>We don't care why you're up. We don't care what you do for a living or what keeps you from rest. We only care that you might need a warm drink and a seat by the window, watching the night go by.</p>
<p><em>Come be a regular. We'll learn your order.</em></p>`,
    rawContent: `Every café has its regulars. Ours just happen to appear after midnight.

## The Night Shift Nurses

<!-- anchor:nurses -->

They come in groups of two or three, still in scrubs, exhausted in ways that show in their eyes more than their posture. They rarely speak to each other at first—just sit with their tea and decompress. By the second cup, conversation slowly emerges. Stories from the ward, shared in the way only people who've seen the same things can understand.

We always have their orders started before they sit down. Chamomile for Sarah. Lapsang souchong for Marcus. Mint blend for whoever needs it most.

## The Novelist

We don't know her real name. She introduced herself once as "just someone trying to finish a book," and we never pressed further. She arrives around 10 PM every Thursday with a leather journal and a fountain pen, orders our strongest black tea, and writes until we close.

<!-- anchor:novelist -->

In three years, she's filled dozens of notebooks. We've never asked what she's writing. Some mysteries are better left intact.

## The Insomniacs Anonymous

A group that found each other here, not by design but by repeated coincidence. Now they have a standing (unspoken) reservation at the corner table every Saturday night. They don't talk about why they can't sleep—they talk about everything else. Books, movies, the philosophical implications of artificial intelligence, the best way to make scrambled eggs.

We've watched friendships form in real-time, forged in the shared understanding that 3 AM can be the loneliest hour, but it doesn't have to be.

## The Stargazer

An astronomy professor from the university who comes in before dawn on clear nights, always with a telescope case and a look of quiet wonder. He orders whatever's warmest and tells us about what's visible in the sky that night.

<!-- anchor:stargazer -->

"Did you know," he said once, "that the light from some of these stars started traveling toward us before humans existed?" Then he smiled into his tea like he'd shared a secret.

## The Night Bus Driver

Route 11, the Night Owl. She has a 45-minute break between runs, and she spends most of it here. Always orders a pot of oolong—enough for two or three cups—and reads paperback mysteries from the used bookstore down the street.

"The night shift is lonely," she told us once. "Nice to have somewhere that's awake when I am."

## Why They Matter

<!-- anchor:community -->

These people—and dozens of others who drift in and out of our orbit—are the reason The Midnight Bloom exists. We didn't open a café to serve tea. We opened it to create a space where night people could find each other.

The best moments here aren't the quiet ones. They're when a regular introduces themselves to another regular, when strangers become friends over shared insomnia, when someone walks in lost and leaves a little more found.

## An Open Invitation

If you're reading this and recognizing yourself—if you're someone who's awake when the world sleeps, looking for a place to be—consider this your invitation.

We don't care why you're up. We don't care what you do for a living or what keeps you from rest. We only care that you might need a warm drink and a seat by the window, watching the night go by.

*Come be a regular. We'll learn your order.*`,
    gutterContent: {
      items: [
        {
          type: "comment",
          anchor: "anchor:nurses",
          content: `<p>We keep a &quot;nurse discount&quot; that isn't on the menu. 50% off for anyone who's spent the night caring for others. Just show us your badge.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:novelist",
          content: `<p>We did peek at her notebook once, accidentally. The handwriting was beautiful—impossible to read, but beautiful. Like the letters themselves were having feelings.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:stargazer",
          content: `<p>Professor Okonkwo once set up his telescope in our back alley and showed the entire café Saturn's rings. It was 3 AM. Everyone cried a little.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:community",
          content: `<p>We keep a small bulletin board by the door where people can leave notes for each other. &quot;Looking for someone to practice French with after midnight&quot; was posted last month. It worked.</p>`,
        },
      ],
    },
  },
  {
    slug: "the-art-of-brewing-patience",
    title: "The Art of Brewing Patience",
    date: "2025-11-15",
    description: "Why we take our time with every cup, and why you should too",
    tags: ["tea", "philosophy", "brewing"],
    content: `<p>In a world of instant everything, we've chosen to go slow.</p>
<h2>The Problem with Speed</h2>
<!-- anchor:speed-note -->

<p>Modern tea culture has been infected by the same disease as everything else: the need for immediacy. Tea bags, single-serve pods, &quot;instant&quot; matcha powders that taste like sadness dissolved in water. We've sacrificed quality for convenience, ritual for routine.</p>
<p>At The Midnight Bloom, we reject this entirely.</p>
<h2>What Proper Brewing Requires</h2>
<p>Every tea has its own personality, its own needs. A delicate white tea wants water just off the boil and a brief, gentle steep. A hearty pu-erh can handle boiling water and rewards longer immersion. To rush either is to miss the point entirely.</p>
<h3>Temperature Matters</h3>
<p>We keep three kettles at different temperatures throughout the night:</p>
<ul>
<li><strong>175°F (80°C)</strong>: For white and green teas</li>
<li><strong>195°F (90°C)</strong>: For oolongs and lighter blacks</li>
<li><strong>212°F (100°C)</strong>: For pu-erh and robust black teas</li>
</ul>
<!-- anchor:kettle-note -->

<h3>Timing is Everything</h3>
<p>We use hourglasses instead of timers. There's something meditative about watching sand fall, something that a digital beep can never replicate. Each hourglass is calibrated for different steep times: one minute, three minutes, five minutes.</p>
<h2>The Ritual of Waiting</h2>
<p>When you order tea at The Midnight Bloom, you wait. Not because we're slow—we're deliberate. Those few minutes while your tea steeps are a gift. Use them.</p>
<p>Watch the steam rise. Feel the warmth of the cup in your hands. Let your thoughts wander. This is the point. This is what you came here for.</p>
<h2>Why We Don't Offer &quot;Fast&quot; Options</h2>
<p>People sometimes ask if we can speed things up. They have somewhere to be. To which we gently suggest: perhaps this isn't the right place for tonight.</p>
<!-- anchor:philosophy -->

<p>The Midnight Bloom exists specifically for those moments when you have nowhere else to be. We're not a pit stop; we're a destination. Stay awhile. The tea will be ready when it's ready.</p>
<h2>A Practice for Home</h2>
<p>You can bring this mindfulness to your own tea practice:</p>
<ol>
<li><strong>Heat your water intentionally</strong> — Watch the bubbles form and rise</li>
<li><strong>Measure your leaves carefully</strong> — Touch them, smell them before they steep</li>
<li><strong>Set a timer, then ignore it</strong> — Trust yourself to know when it's ready</li>
<li><strong>Pour slowly</strong> — Let the stream be thin and steady</li>
<li><strong>Sit with your cup before drinking</strong> — Anticipation is part of the experience</li>
</ol>
<h2>The Reward</h2>
<p>Tea brewed with patience tastes different. This isn't mysticism; it's chemistry. Proper temperature and timing extract the compounds you want while leaving behind the ones you don't. But beyond the science, there's something else—a satisfaction that comes from having given your full attention to something small and beautiful.</p>
<p><em>In a world that never stops, we offer you permission to pause.</em></p>`,
    rawContent: `In a world of instant everything, we've chosen to go slow.

## The Problem with Speed

<!-- anchor:speed-note -->

Modern tea culture has been infected by the same disease as everything else: the need for immediacy. Tea bags, single-serve pods, "instant" matcha powders that taste like sadness dissolved in water. We've sacrificed quality for convenience, ritual for routine.

At The Midnight Bloom, we reject this entirely.

## What Proper Brewing Requires

Every tea has its own personality, its own needs. A delicate white tea wants water just off the boil and a brief, gentle steep. A hearty pu-erh can handle boiling water and rewards longer immersion. To rush either is to miss the point entirely.

### Temperature Matters

We keep three kettles at different temperatures throughout the night:

- **175°F (80°C)**: For white and green teas
- **195°F (90°C)**: For oolongs and lighter blacks
- **212°F (100°C)**: For pu-erh and robust black teas

<!-- anchor:kettle-note -->

### Timing is Everything

We use hourglasses instead of timers. There's something meditative about watching sand fall, something that a digital beep can never replicate. Each hourglass is calibrated for different steep times: one minute, three minutes, five minutes.

## The Ritual of Waiting

When you order tea at The Midnight Bloom, you wait. Not because we're slow—we're deliberate. Those few minutes while your tea steeps are a gift. Use them.

Watch the steam rise. Feel the warmth of the cup in your hands. Let your thoughts wander. This is the point. This is what you came here for.

## Why We Don't Offer "Fast" Options

People sometimes ask if we can speed things up. They have somewhere to be. To which we gently suggest: perhaps this isn't the right place for tonight.

<!-- anchor:philosophy -->

The Midnight Bloom exists specifically for those moments when you have nowhere else to be. We're not a pit stop; we're a destination. Stay awhile. The tea will be ready when it's ready.

## A Practice for Home

You can bring this mindfulness to your own tea practice:

1. **Heat your water intentionally** — Watch the bubbles form and rise
2. **Measure your leaves carefully** — Touch them, smell them before they steep
3. **Set a timer, then ignore it** — Trust yourself to know when it's ready
4. **Pour slowly** — Let the stream be thin and steady
5. **Sit with your cup before drinking** — Anticipation is part of the experience

## The Reward

Tea brewed with patience tastes different. This isn't mysticism; it's chemistry. Proper temperature and timing extract the compounds you want while leaving behind the ones you don't. But beyond the science, there's something else—a satisfaction that comes from having given your full attention to something small and beautiful.

*In a world that never stops, we offer you permission to pause.*`,
    gutterContent: {
      items: [
        {
          type: "comment",
          anchor: "anchor:speed-note",
          content: `<p><strong>A confession</strong>: Elena once worked at a coffee chain that shall remain nameless. The memory of those &quot;tea lattes&quot; still haunts her dreams.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:kettle-note",
          content: `<p>Our kettles are vintage copper pieces from Japan, each one over 50 years old. They heat water differently than modern electric kettles—more evenly, more gently.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:philosophy",
          content: `<p>This isn't meant to be gatekeeping. If you need quick caffeine, that's valid. We just can't be the place that provides it. There's a 24-hour diner two blocks over with perfectly serviceable coffee.</p>`,
        },
      ],
    },
  },
];

export const recipes = [
  {
    slug: "moonlight-jasmine-blend",
    title: "Moonlight Jasmine Blend",
    date: "2025-10-15",
    description:
      "Our signature house blend - jasmine pearls with a secret midnight twist",
    tags: ["signature", "jasmine", "house-blend", "recipe"],
    content: `<p>This is the tea that started it all. The first blend Elena created for The Midnight Bloom, and still our most requested.</p>
<h2>Overview</h2>
<p><strong>Brew Time:</strong> 3-4 minutes<br>
<strong>Temperature:</strong> 175°F (80°C)<br>
<strong>Serves:</strong> 1 generous cup or 2 small ones<br>
<strong>Best Enjoyed:</strong> In the quiet hours, by candlelight</p>
<h2>Ingredients</h2>
<h3>For the Base Blend</h3>
<ul>
<li>1 tablespoon jasmine pearl tea (dragon pearls preferred)</li>
<li>3-4 dried lavender buds</li>
<li>1 small piece dried orange peel (about the size of your thumbnail)</li>
<li>Tiny pinch of pink salt</li>
</ul>
<h3>For Serving (Optional)</h3>
<ul>
<li>Local honey to taste</li>
<li>A splash of oat milk</li>
</ul>
<h2>Instructions</h2>
<h3>Step 1: Prepare Your Vessel</h3>
<p>Warm your teapot or cup by filling it with hot water, letting it sit for a moment, then discarding the water. Cold ceramic shocks the tea and affects the brew.</p>
<!-- anchor:vessel-note -->

<h3>Step 2: Measure Your Tea</h3>
<p>Place the jasmine pearls in your warmed vessel. Add the lavender buds, orange peel, and salt. Take a moment to inhale—the dry blend already carries the promise of what's to come.</p>
<h3>Step 3: Heat the Water</h3>
<p>Bring fresh, filtered water to 175°F (80°C). If you don't have a thermometer, bring it to a boil and let it cool for about 2-3 minutes. Water that's too hot will make jasmine bitter.</p>
<!-- anchor:water-note -->

<h3>Step 4: The First Steep</h3>
<p>Pour the water over your tea and set a timer for 30 seconds. This first steep is just to wake the leaves—pour it off and discard it. Some call this &quot;washing the tea.&quot;</p>
<h3>Step 5: The True Steep</h3>
<p>Pour fresh hot water over the awakened leaves. Now, steep for 3-4 minutes. The jasmine pearls will slowly unfurl, releasing their fragrance. The lavender and orange will infuse gently into the background.</p>
<h3>Step 6: Observe</h3>
<p>While your tea steeps, watch the pearls open. Each one was hand-rolled around jasmine blossoms, scented over multiple nights. The unfurling is part of the experience.</p>
<!-- anchor:pearls-note -->

<h3>Step 7: Serve</h3>
<p>Pour through a fine strainer if desired, though we like to see the leaves settled at the bottom of the cup. Add honey if you wish, but try it plain first.</p>
<h2>Tasting Notes</h2>
<p>The first sip should be floral—jasmine forward, with the sweetness of white tea underneath. As it cools slightly, the lavender emerges, rounding out the edges. The orange peel adds brightness without citrus punch. The salt (barely perceptible) enhances all the other flavors.</p>
<!-- anchor:taste-note -->

<h2>Tips for the Perfect Cup</h2>
<ul>
<li><strong>Re-steep</strong>: These pearls can be steeped 3-4 times. Each subsequent steep reveals different notes. The third steep is many people's favorite.</li>
<li><strong>Time of night matters</strong>: We find this blend tastes best after midnight. Whether that's the actual chemistry of exhaustion or pure psychology, we can't say.</li>
<li><strong>Don't rush it</strong>: Set your phone aside. This is a tea that rewards attention.</li>
</ul>
<h2>The Secret Ingredient</h2>
<p>People always ask about the &quot;secret&quot; in our blend. It's not an ingredient—it's timing. We only blend this tea on clear nights, by moonlight. Call it superstition, call it ritual. We call it the Midnight Bloom way.</p>
<p><em>Some things can only be made in the dark.</em></p>`,
    rawContent: `This is the tea that started it all. The first blend Elena created for The Midnight Bloom, and still our most requested.

## Overview

**Brew Time:** 3-4 minutes
**Temperature:** 175°F (80°C)
**Serves:** 1 generous cup or 2 small ones
**Best Enjoyed:** In the quiet hours, by candlelight

## Ingredients

### For the Base Blend
- 1 tablespoon jasmine pearl tea (dragon pearls preferred)
- 3-4 dried lavender buds
- 1 small piece dried orange peel (about the size of your thumbnail)
- Tiny pinch of pink salt

### For Serving (Optional)
- Local honey to taste
- A splash of oat milk

## Instructions

### Step 1: Prepare Your Vessel

Warm your teapot or cup by filling it with hot water, letting it sit for a moment, then discarding the water. Cold ceramic shocks the tea and affects the brew.

<!-- anchor:vessel-note -->

### Step 2: Measure Your Tea

Place the jasmine pearls in your warmed vessel. Add the lavender buds, orange peel, and salt. Take a moment to inhale—the dry blend already carries the promise of what's to come.

### Step 3: Heat the Water

Bring fresh, filtered water to 175°F (80°C). If you don't have a thermometer, bring it to a boil and let it cool for about 2-3 minutes. Water that's too hot will make jasmine bitter.

<!-- anchor:water-note -->

### Step 4: The First Steep

Pour the water over your tea and set a timer for 30 seconds. This first steep is just to wake the leaves—pour it off and discard it. Some call this "washing the tea."

### Step 5: The True Steep

Pour fresh hot water over the awakened leaves. Now, steep for 3-4 minutes. The jasmine pearls will slowly unfurl, releasing their fragrance. The lavender and orange will infuse gently into the background.

### Step 6: Observe

While your tea steeps, watch the pearls open. Each one was hand-rolled around jasmine blossoms, scented over multiple nights. The unfurling is part of the experience.

<!-- anchor:pearls-note -->

### Step 7: Serve

Pour through a fine strainer if desired, though we like to see the leaves settled at the bottom of the cup. Add honey if you wish, but try it plain first.

## Tasting Notes

The first sip should be floral—jasmine forward, with the sweetness of white tea underneath. As it cools slightly, the lavender emerges, rounding out the edges. The orange peel adds brightness without citrus punch. The salt (barely perceptible) enhances all the other flavors.

<!-- anchor:taste-note -->

## Tips for the Perfect Cup

- **Re-steep**: These pearls can be steeped 3-4 times. Each subsequent steep reveals different notes. The third steep is many people's favorite.
- **Time of night matters**: We find this blend tastes best after midnight. Whether that's the actual chemistry of exhaustion or pure psychology, we can't say.
- **Don't rush it**: Set your phone aside. This is a tea that rewards attention.

## The Secret Ingredient

People always ask about the "secret" in our blend. It's not an ingredient—it's timing. We only blend this tea on clear nights, by moonlight. Call it superstition, call it ritual. We call it the Midnight Bloom way.

*Some things can only be made in the dark.*`,
    gutterContent: {
      items: [
        {
          type: "comment",
          anchor: "anchor:vessel-note",
          content: `<p>At the café, we use small clay gaiwans that have absorbed years of tea. They add something to the brew that new vessels can't replicate. At home, any pre-warmed ceramic will do nicely.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:water-note",
          content: `<p>If your tap water is heavily chlorinated, let it sit uncovered for an hour before boiling, or use spring water. The tea will taste of whatever the water tastes of.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:pearls-note",
          content: `<p>Traditional jasmine pearls are scented 6-7 times over the course of a month, with fresh jasmine blossoms each night. It takes about 4.4 pounds of blossoms to scent a single pound of tea.</p>`,
        },
        {
          type: "comment",
          anchor: "anchor:taste-note",
          content: `<p>Elena spent three months perfecting the salt ratio. Too much and you taste it directly. The right amount—just a few grains per tablespoon of tea—and you taste <em>everything else</em> more vividly.</p>`,
        },
      ],
    },
  },
];

// Helper functions matching the original API
export function getSiteConfig() {
  return siteConfig;
}

export function getPage(slug) {
  return pages[slug] || null;
}

export function getAllPosts() {
  return posts;
}

export function getPost(slug) {
  return posts.find((p) => p.slug === slug) || null;
}

export function getAllRecipes() {
  return recipes;
}

export function getRecipe(slug) {
  return recipes.find((r) => r.slug === slug) || null;
}

export function getLatestPost() {
  return posts.length > 0 ? posts[0] : null;
}

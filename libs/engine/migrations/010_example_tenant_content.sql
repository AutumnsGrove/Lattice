-- Migration: Insert example tenant content (The Midnight Bloom)
-- Tenant ID: example-tenant-001

-- =============================================================================
-- EXAMPLE TENANT
-- =============================================================================
INSERT OR IGNORE INTO tenants (id, subdomain, display_name, email, plan, theme, active, created_at, updated_at)
VALUES ('example-tenant-001', 'midnight-bloom', 'The Midnight Bloom', 'example@grove.place', 'starter', 'default', 1, unixepoch(), unixepoch());

-- =============================================================================
-- PAGES
-- =============================================================================

-- Home Page
INSERT INTO pages (id, tenant_id, slug, title, description, markdown_content, html_content, hero, gutter_content, created_at, updated_at)
VALUES (
    'example-page-home',
    'example-tenant-001',
    'home',
    'The Midnight Bloom',
    'A late-night tea café where time slows down',
    '# Welcome to The Midnight Bloom

When the rest of the world winds down, we''re just getting started. The Midnight Bloom is a sanctuary for night owls, late-shift workers, insomniacs, and anyone who finds peace in the quiet hours after dark.

## Our Philosophy

We believe tea is more than a beverage—it''s a ritual, a moment of pause, a small act of self-care in a world that rarely stops moving. Every cup we serve is an invitation to slow down, to breathe, to simply *be*.

Our selection spans the globe: delicate white teas from Fujian, robust pu-erhs from Yunnan, rare oolongs from the mountains of Taiwan, and herbal blends we craft in-house under the light of the moon.

## What Makes Us Different

- **Hours built for night people**: We open at 6 PM and don''t close until 4 AM
- **Curated silence**: No background music, just the gentle sounds of tea being prepared
- **Rare finds**: Teas you won''t find anywhere else in the city
- **No rush**: Stay as long as you need—we understand that some nights are longer than others

## Visit Us

We''re tucked away on Twilight Lane, easy to miss if you''re not looking. A small wooden sign, a door with a brass moon handle, and the warm glow of candlelight in the window. You''ll know it when you find it.

*The Midnight Bloom: where every night holds the possibility of something beautiful.*',
    '<h1>Welcome to The Midnight Bloom</h1>
<p>When the rest of the world winds down, we''re just getting started. The Midnight Bloom is a sanctuary for night owls, late-shift workers, insomniacs, and anyone who finds peace in the quiet hours after dark.</p>
<h2>Our Philosophy</h2>
<p>We believe tea is more than a beverage—it''s a ritual, a moment of pause, a small act of self-care in a world that rarely stops moving. Every cup we serve is an invitation to slow down, to breathe, to simply <em>be</em>.</p>
<p>Our selection spans the globe: delicate white teas from Fujian, robust pu-erhs from Yunnan, rare oolongs from the mountains of Taiwan, and herbal blends we craft in-house under the light of the moon.</p>
<h2>What Makes Us Different</h2>
<ul>
<li><strong>Hours built for night people</strong>: We open at 6 PM and don''t close until 4 AM</li>
<li><strong>Curated silence</strong>: No background music, just the gentle sounds of tea being prepared</li>
<li><strong>Rare finds</strong>: Teas you won''t find anywhere else in the city</li>
<li><strong>No rush</strong>: Stay as long as you need—we understand that some nights are longer than others</li>
</ul>
<h2>Visit Us</h2>
<p>We''re tucked away on Twilight Lane, easy to miss if you''re not looking. A small wooden sign, a door with a brass moon handle, and the warm glow of candlelight in the window. You''ll know it when you find it.</p>
<p><em>The Midnight Bloom: where every night holds the possibility of something beautiful.</em></p>',
    '{"title":"The Midnight Bloom","subtitle":"Open when the stars come out","cta":{"text":"Read Our Blog","link":"/blog"}}',
    '[]',
    unixepoch(),
    unixepoch()
);

-- About Page
INSERT INTO pages (id, tenant_id, slug, title, description, markdown_content, html_content, hero, gutter_content, created_at, updated_at)
VALUES (
    'example-page-about',
    'example-tenant-001',
    'about',
    'About Us',
    'Our story and philosophy',
    '# Our Story

The Midnight Bloom opened its doors on the winter solstice of 2019—the longest night of the year. It felt fitting.

## How It Began

Our founder, Elena Chen, spent a decade working night shifts as a nurse. She understood intimately what it meant to be awake when the world sleeps, to crave connection and comfort in the small hours. The coffee shops were closed. The bars were too loud. There was nowhere to simply sit with a warm drink and quiet thoughts.

So she created that place herself.

## The Name

The midnight bloom refers to night-blooming flowers—jasmine, moonflowers, evening primrose—plants that save their beauty for the darkness. They don''t compete with the sun; they wait for the moon.

We think there''s something poetic in that. Some things are meant to flourish after dark.

## Our Space

The café is small by design. Just twelve seats, arranged to offer both community and solitude. Worn wooden tables, mismatched vintage chairs, and candlelight that flickers gently against the exposed brick walls.

We have no Wi-Fi password—by choice. This is a place to disconnect from the digital and reconnect with the present moment. Bring a book, bring a journal, bring a friend. Or bring nothing at all.

*Come find us when the stars come out.*',
    '<h1>Our Story</h1>
<p>The Midnight Bloom opened its doors on the winter solstice of 2019—the longest night of the year. It felt fitting.</p>
<h2>How It Began</h2>
<p>Our founder, Elena Chen, spent a decade working night shifts as a nurse. She understood intimately what it meant to be awake when the world sleeps, to crave connection and comfort in the small hours. The coffee shops were closed. The bars were too loud. There was nowhere to simply sit with a warm drink and quiet thoughts.</p>
<p>So she created that place herself.</p>
<h2>The Name</h2>
<p>The midnight bloom refers to night-blooming flowers—jasmine, moonflowers, evening primrose—plants that save their beauty for the darkness. They don''t compete with the sun; they wait for the moon.</p>
<p>We think there''s something poetic in that. Some things are meant to flourish after dark.</p>
<h2>Our Space</h2>
<p>The café is small by design. Just twelve seats, arranged to offer both community and solitude. Worn wooden tables, mismatched vintage chairs, and candlelight that flickers gently against the exposed brick walls.</p>
<p>We have no Wi-Fi password—by choice. This is a place to disconnect from the digital and reconnect with the present moment. Bring a book, bring a journal, bring a friend. Or bring nothing at all.</p>
<p><em>Come find us when the stars come out.</em></p>',
    NULL,
    '[]',
    unixepoch(),
    unixepoch()
);

-- =============================================================================
-- POSTS
-- =============================================================================

-- Post 1: Why We Don't Play Music
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, html_content, tags, status, gutter_content, published_at, created_at, updated_at)
VALUES (
    'example-post-001',
    'example-tenant-001',
    'why-we-dont-play-music',
    'Why We Don''t Play Music',
    'The radical act of letting silence speak',
    'Every new visitor asks the same question, usually within the first ten minutes: "Is the music broken?"

No. There is no music. There never has been.

## The Sound of Most Cafés

Walk into any coffee shop and you''ll be greeted by a carefully curated playlist. Indie folk in the morning, lo-fi beats in the afternoon, something vaguely jazzy in the evening. It''s designed to create "ambiance"—to fill the space with something pleasant and forgettable.

We understand the impulse. Silence can feel awkward, especially in public spaces. Music gives people permission to talk without feeling overheard. It smooths the edges of social interaction.

But here''s the thing: we don''t want to smooth edges. We want to create a space where the edges are felt.

## What You Hear Instead

Without music, The Midnight Bloom has its own soundscape:

- The whisper of steam from the kettles
- The gentle clink of ceramic cups on wooden tables
- Rain on the windows when the weather obliges
- The occasional turning of a page
- Quiet conversation that rises and falls like breath
- Sometimes, nothing at all

This isn''t silence—it''s the absence of manufactured sound. There''s a difference.

*Sometimes the most radical thing you can offer is nothing at all.*',
    '<p>Every new visitor asks the same question, usually within the first ten minutes: "Is the music broken?"</p>
<p>No. There is no music. There never has been.</p>
<h2 id="the-sound-of-most-cafés">The Sound of Most Cafés</h2>
<p>Walk into any coffee shop and you''ll be greeted by a carefully curated playlist. Indie folk in the morning, lo-fi beats in the afternoon, something vaguely jazzy in the evening. It''s designed to create "ambiance"—to fill the space with something pleasant and forgettable.</p>
<p>We understand the impulse. Silence can feel awkward, especially in public spaces. Music gives people permission to talk without feeling overheard. It smooths the edges of social interaction.</p>
<p>But here''s the thing: we don''t want to smooth edges. We want to create a space where the edges are felt.</p>
<h2 id="what-you-hear-instead">What You Hear Instead</h2>
<p>Without music, The Midnight Bloom has its own soundscape:</p>
<ul>
<li>The whisper of steam from the kettles</li>
<li>The gentle clink of ceramic cups on wooden tables</li>
<li>Rain on the windows when the weather obliges</li>
<li>The occasional turning of a page</li>
<li>Quiet conversation that rises and falls like breath</li>
<li>Sometimes, nothing at all</li>
</ul>
<p>This isn''t silence—it''s the absence of manufactured sound. There''s a difference.</p>
<p><em>Sometimes the most radical thing you can offer is nothing at all.</em></p>',
    '["atmosphere","philosophy","design"]',
    'published',
    '[{"type":"comment","anchor":"anchor:sound-note","content":"<p>Elena spent six months researching \"café playlists\" before opening. She found over 50,000 \"coffee shop vibes\" playlists on Spotify alone. It felt less like curation and more like conformity.</p>"}]',
    1733011200,
    unixepoch(),
    unixepoch()
);

-- Post 2: Our Favorite Midnight Regulars
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, html_content, tags, status, gutter_content, published_at, created_at, updated_at)
VALUES (
    'example-post-002',
    'example-tenant-001',
    'our-favorite-midnight-regulars',
    'Our Favorite Midnight Regulars',
    'The beautiful humans who make our late nights worthwhile',
    'Every café has its regulars. Ours just happen to appear after midnight.

## The Night Shift Nurses

They come in groups of two or three, still in scrubs, exhausted in ways that show in their eyes more than their posture. They rarely speak to each other at first—just sit with their tea and decompress. By the second cup, conversation slowly emerges.

We always have their orders started before they sit down. Chamomile for Sarah. Lapsang souchong for Marcus. Mint blend for whoever needs it most.

## The Novelist

We don''t know her real name. She introduced herself once as "just someone trying to finish a book," and we never pressed further. She arrives around 10 PM every Thursday with a leather journal and a fountain pen, orders our strongest black tea, and writes until we close.

In three years, she''s filled dozens of notebooks. We''ve never asked what she''s writing. Some mysteries are better left intact.

## Why They Matter

These people—and dozens of others who drift in and out of our orbit—are the reason The Midnight Bloom exists. We didn''t open a café to serve tea. We opened it to create a space where night people could find each other.

*Come be a regular. We''ll learn your order.*',
    '<p>Every café has its regulars. Ours just happen to appear after midnight.</p>
<h2 id="the-night-shift-nurses">The Night Shift Nurses</h2>
<p>They come in groups of two or three, still in scrubs, exhausted in ways that show in their eyes more than their posture. They rarely speak to each other at first—just sit with their tea and decompress. By the second cup, conversation slowly emerges.</p>
<p>We always have their orders started before they sit down. Chamomile for Sarah. Lapsang souchong for Marcus. Mint blend for whoever needs it most.</p>
<h2 id="the-novelist">The Novelist</h2>
<p>We don''t know her real name. She introduced herself once as "just someone trying to finish a book," and we never pressed further. She arrives around 10 PM every Thursday with a leather journal and a fountain pen, orders our strongest black tea, and writes until we close.</p>
<p>In three years, she''s filled dozens of notebooks. We''ve never asked what she''s writing. Some mysteries are better left intact.</p>
<h2 id="why-they-matter">Why They Matter</h2>
<p>These people—and dozens of others who drift in and out of our orbit—are the reason The Midnight Bloom exists. We didn''t open a café to serve tea. We opened it to create a space where night people could find each other.</p>
<p><em>Come be a regular. We''ll learn your order.</em></p>',
    '["community","stories","regulars"]',
    'published',
    '[{"type":"comment","anchor":"anchor:nurses","content":"<p>We keep a \"nurse discount\" that isn''t on the menu. 50% off for anyone who''s spent the night caring for others. Just show us your badge.</p>"}]',
    1732752000,
    unixepoch(),
    unixepoch()
);

-- Post 3: The Art of Brewing Patience
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, html_content, tags, status, gutter_content, published_at, created_at, updated_at)
VALUES (
    'example-post-003',
    'example-tenant-001',
    'the-art-of-brewing-patience',
    'The Art of Brewing Patience',
    'Why we take our time with every cup, and why you should too',
    'In a world of instant everything, we''ve chosen to go slow.

## The Problem with Speed

Modern tea culture has been infected by the same disease as everything else: the need for immediacy. Tea bags, single-serve pods, "instant" matcha powders that taste like sadness dissolved in water. We''ve sacrificed quality for convenience, ritual for routine.

At The Midnight Bloom, we reject this entirely.

## What Proper Brewing Requires

Every tea has its own personality, its own needs. A delicate white tea wants water just off the boil and a brief, gentle steep. A hearty pu-erh can handle boiling water and rewards longer immersion. To rush either is to miss the point entirely.

### Temperature Matters

We keep three kettles at different temperatures throughout the night:

- **175°F (80°C)**: For white and green teas
- **195°F (90°C)**: For oolongs and lighter blacks
- **212°F (100°C)**: For pu-erh and robust black teas

## The Ritual of Waiting

When you order tea at The Midnight Bloom, you wait. Not because we''re slow—we''re deliberate. Those few minutes while your tea steeps are a gift. Use them.

*In a world that never stops, we offer you permission to pause.*',
    '<p>In a world of instant everything, we''ve chosen to go slow.</p>
<h2 id="the-problem-with-speed">The Problem with Speed</h2>
<p>Modern tea culture has been infected by the same disease as everything else: the need for immediacy. Tea bags, single-serve pods, "instant" matcha powders that taste like sadness dissolved in water. We''ve sacrificed quality for convenience, ritual for routine.</p>
<p>At The Midnight Bloom, we reject this entirely.</p>
<h2 id="what-proper-brewing-requires">What Proper Brewing Requires</h2>
<p>Every tea has its own personality, its own needs. A delicate white tea wants water just off the boil and a brief, gentle steep. A hearty pu-erh can handle boiling water and rewards longer immersion. To rush either is to miss the point entirely.</p>
<h3 id="temperature-matters">Temperature Matters</h3>
<p>We keep three kettles at different temperatures throughout the night:</p>
<ul>
<li><strong>175°F (80°C)</strong>: For white and green teas</li>
<li><strong>195°F (90°C)</strong>: For oolongs and lighter blacks</li>
<li><strong>212°F (100°C)</strong>: For pu-erh and robust black teas</li>
</ul>
<h2 id="the-ritual-of-waiting">The Ritual of Waiting</h2>
<p>When you order tea at The Midnight Bloom, you wait. Not because we''re slow—we''re deliberate. Those few minutes while your tea steeps are a gift. Use them.</p>
<p><em>In a world that never stops, we offer you permission to pause.</em></p>',
    '["tea","philosophy","brewing"]',
    'published',
    '[{"type":"comment","anchor":"anchor:kettle-note","content":"<p>Our kettles are vintage copper pieces from Japan, each one over 50 years old. They heat water differently than modern electric kettles—more evenly, more gently.</p>"}]',
    1731628800,
    unixepoch(),
    unixepoch()
);

-- Update tenant post count
UPDATE tenants SET post_count = 3 WHERE id = 'example-tenant-001';

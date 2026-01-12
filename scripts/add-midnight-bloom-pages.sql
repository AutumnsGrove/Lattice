-- Add new pages to Midnight Bloom example site
-- Run with: npx wrangler d1 execute grove-engine-db --file scripts/add-midnight-bloom-pages.sql --remote

-- ============================================
-- UPDATE HOME PAGE - Link to Blog instead of Menu
-- ============================================
UPDATE pages
SET markdown_content = '# Welcome to The Midnight Bloom

When the rest of the world winds down, we''re just getting started. The Midnight Bloom is a sanctuary for night owls, late-shift workers, insomniacs, and anyone who finds peace in the quiet hours after dark.

## Our Philosophy

We believe tea is more than a beverage—it''s a ritual, a moment of pause, a small act of self-care in a world that rarely stops moving. Every cup we serve is an invitation to slow down, to breathe, to simply *be*.

Our selection spans the globe: delicate white teas from Fujian, robust pu-erhs from Yunnan, rare oolongs from the mountains of Taiwan, and herbal blends we craft in-house under the light of the moon.

## What Makes Us Different

- **Hours built for night people**: We open at 6 PM and don''t close until 4 AM
- **Curated silence**: No background music, just the gentle sounds of tea being prepared
- **Rare finds**: Teas you won''t find anywhere else in the city
- **No rush**: Stay as long as you need—we understand that some nights are longer than others

## Explore Our World

Curious about what we serve? Browse our [tea menu](/menu) to discover our carefully curated selection. Want to see the space? Visit our [gallery](/gallery) for a glimpse into our candlelit sanctuary.

Or dive into our [blog](/blog) where we share stories from our late-night regulars, brewing guides, and thoughts on the beauty of quiet hours.

## Visit Us

We''re tucked away on Twilight Lane, easy to miss if you''re not looking. A small wooden sign, a door with a brass moon handle, and the warm glow of candlelight in the window. You''ll know it when you find it.

*The Midnight Bloom: where every night holds the possibility of something beautiful.*',
    updated_at = unixepoch()
WHERE slug = 'home' AND tenant_id = 'example-tenant-001';

-- ============================================
-- CREATE MENU PAGE
-- ============================================
INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, created_at, updated_at)
VALUES (
  'example-page-menu',
  'example-tenant-001',
  'menu',
  'Our Menu',
  'A curated selection of rare and beautiful teas from around the world',
  'page',
  '# Our Tea Menu

Every tea on this menu has been personally selected by Elena after extensive tasting and sourcing. We believe in quality over quantity—our selection is small, but each offering tells a story.

---

## White Teas
*Delicate, subtle, like morning mist on still water*

### Silver Needle (Bai Hao Yin Zhen)
**Origin**: Fujian, China
**Notes**: Honeydew, cucumber, sweet hay
**Steep**: 175°F / 3-4 minutes

The emperor of white teas. These tender buds are hand-picked only in early spring, when the first leaves emerge covered in silvery down. Each cup is an exercise in subtlety.

### White Peony (Bai Mu Dan)
**Origin**: Fujian, China
**Notes**: Peach, wildflowers, light woodiness
**Steep**: 180°F / 3-4 minutes

Fuller-bodied than Silver Needle, with leaves alongside the buds. A beautiful everyday white tea that reveals new dimensions with each steeping.

---

## Oolong Teas
*The artist''s medium—infinite variety between green and black*

### High Mountain Ali Shan
**Origin**: Taiwan
**Notes**: Orchid, butter, lingering sweetness
**Steep**: 195°F / 45 seconds, multiple infusions

Grown at elevations above 1,500 meters, where cool mists and dramatic temperature shifts create extraordinary complexity. This tea will give you six or seven infusions, each one different.

### Da Hong Pao (Big Red Robe)
**Origin**: Wuyi Mountains, China
**Notes**: Roasted stone fruit, mineral, dark chocolate
**Steep**: 200°F / 30-45 seconds, multiple infusions

The legendary rock tea. Our source has been working these cliffside gardens for four generations. Intensely aromatic with a finish that lasts for minutes.

### Oriental Beauty
**Origin**: Taiwan
**Notes**: Honey, ripe fruit, muscatel
**Steep**: 185°F / 3 minutes

A happy accident—this tea develops its distinctive character only when tea leafhoppers nibble the leaves, triggering a unique oxidation. Nature''s collaboration.

---

## Black Teas
*Bold, confident, perfect for the small hours*

### Keemun Hao Ya
**Origin**: Anhui, China
**Notes**: Wine, cocoa, smoky undertones
**Steep**: 200°F / 3-4 minutes

The "burgundy of teas." Complex and full-bodied, this is what we recommend when you need something substantial to carry you through a long night.

### Golden Monkey
**Origin**: Fujian, China
**Notes**: Malt, honey, stone fruit
**Steep**: 200°F / 3 minutes

Named for the golden tips that curl like monkey paws. Smooth enough to drink without additions, with a natural sweetness that never cloies.

---

## Pu-erh Teas
*Aged, earthy, for contemplative moments*

### 2015 Aged Sheng
**Origin**: Yunnan, China
**Notes**: Leather, dried fruit, forest floor
**Steep**: 212°F / 20 seconds, many infusions

Raw pu-erh, aged nine years in our climate-controlled storage. The tea is alive—it changes year by year, and even cup by cup as you work through a session.

### Shou Pu-erh (Cooked)
**Origin**: Yunnan, China
**Notes**: Earth, mushroom, dark chocolate
**Steep**: 212°F / 15-20 seconds, many infusions

Deeply grounding. This is what we brew when someone needs to feel rooted. The fermentation process gives it immediate approachability that raw pu-erh takes decades to develop.

---

## House Blends
*Created here, under moonlight*

### Midnight Blend
**Notes**: Chamomile, lavender, lemon balm, passionflower
**Steep**: 200°F / 5-7 minutes

Our signature blend, designed to ease you into the night. Caffeine-free, deeply calming, with a floral sweetness that doesn''t require honey.

### Night Shift
**Notes**: Black tea, bergamot, vanilla, a whisper of smoke
**Steep**: 200°F / 4 minutes

For those who need to stay sharp. More sophisticated than standard Earl Grey, with enough body to carry you through until dawn.

### Moonlight Jasmine
**Notes**: Green tea, jasmine blossoms, white peach
**Steep**: 175°F / 2-3 minutes

Jasmine tea as it should be—scented naturally with fresh blossoms over several nights. The aroma alone is worth the visit.

---

## Pricing

We don''t list prices on our menu. Tea is served by the pot or by the gaiwan session, and costs vary based on the rarity of what you''re drinking. Ask your server, or simply tell us your budget and we''ll guide you to something wonderful.

*All teas can be purchased by the ounce to take home. Ask about our quarterly tea subscriptions.*',
  '',
  NULL,
  '[]',
  'default',
  unixepoch(),
  unixepoch()
);

-- ============================================
-- CREATE GALLERY PAGE
-- ============================================
INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, created_at, updated_at)
VALUES (
  'example-page-gallery',
  'example-tenant-001',
  'gallery',
  'Gallery',
  'Glimpses into our candlelit sanctuary',
  'page',
  '# Gallery

*Glimpses into our candlelit sanctuary*

---

## The Space

Our café exists in the space between day and night. Twelve seats. Exposed brick. Candles that flicker against vintage mirrors. We designed every corner to invite stillness.

The main room centers around a long wooden table—reclaimed oak from a monastery in Vermont. It seats eight and has witnessed countless quiet conversations, solitary writing sessions, and the simple magic of strangers becoming friends over shared tea.

Four smaller tables line the walls, each tucked into its own pocket of candlelight. These are for those who need solitude, or for pairs who want the world to narrow down to just the two of them.

---

## The Details

### Our Tea Wall
Three hundred teas live behind our counter in glass jars and ceramic canisters, organized by type and origin. The wall itself is antique apothecary shelving, found at an estate sale in the Hudson Valley.

### The Water Station
We use water from a local spring, filtered through Japanese Binchotan charcoal. Three copper kettles stay heated at different temperatures throughout the night. The kettles came from a tea house in Kyoto that closed after ninety years.

### The Ceramics
Every cup and pot in our collection is handmade. Most come from a potter in Vermont who shares our love of the late hours. Each piece is unique—you''ll never drink from the same cup twice.

### The Candles
We make our own, scented with night-blooming jasmine. A small ritual happens each evening at opening: Elena lights each one individually, moving through the space like a prayer.

---

## The Atmosphere

### Morning Light (Before We Open)
The café sleeps during the day, blinds drawn, air still. Dust motes drift through the slats of light that sneak through. This is the space''s rest, its recovery before another long night.

### Golden Hour (6 PM - Opening)
The first candles are lit. The copper kettles begin to heat. Someone sweeps the floor with slow, meditative strokes. There''s a hush of anticipation—the night is about to begin.

### The Quiet Hours (2 AM - 4 AM)
This is when the café becomes something else entirely. The crowd thins. The conversations drop to whispers. The candles burn low. For those who are here, there''s a shared understanding: we are the people of the night.

### Closing (4 AM)
The last guests linger over final cups. Outside, the sky begins its slow shift toward dawn. One by one, the candles are extinguished. The café returns to its daytime sleep.

---

## Come See for Yourself

Photos can only capture so much. The play of candlelight on brick, the steam rising from a fresh pot, the way the whole space seems to breathe—these things you have to experience.

We''re open from 6 PM to 4 AM, every night except Monday.

*Find us on Twilight Lane. Look for the brass moon handle.*',
  '',
  NULL,
  '[]',
  'default',
  unixepoch(),
  unixepoch()
);

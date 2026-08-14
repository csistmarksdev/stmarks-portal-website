# The church year on the site

The site keeps the Church of South India's liturgical calendar. The season is
computed from the visitor's own date, on their own machine, and it changes what
the site looks like — the temperature of the paper, the light falling into each
section, the colour of the cross that heads them, and in Holy Week the
photography itself.

Nothing about this is manual. Nobody has to put the snow up in December or take
it down in January, and nobody has to remember that Easter moved.

---

## Checking it — the preview parameters

Both parameters work on **every route**, not just the home page.

### `?season=`

| Parameter | Season |
| --- | --- |
| `?season=christmas` | Christmas |
| `?season=lent` | Lent |
| `?season=holy-week` | Holy Week |
| `?season=good-friday` | Good Friday |
| `?season=easter` | Easter |
| `?season=csi-day` | CSI Day |
| `?season=ordinary` | Ordinary time |

```
http://localhost:3000/?season=good-friday
http://localhost:3000/about?season=lent
http://localhost:3000/leadership?season=easter
```

An unrecognised value is **ignored**, not honoured — a typo shows the real
season rather than silently stripping the site on an ordinary Tuesday.

### `?snow=`

| Parameter | Effect |
| --- | --- |
| `?snow` or `?snow=1` | Snow on, in any season |
| `?snow=0` | Snow off, even in December |

```
http://localhost:3000/?snow
http://localhost:3000/?season=christmas&snow
http://localhost:3000/?snow=0
```

The off switch is the one that matters in December: it is the only way to look
at a page *without* snow over it — to photograph a hero, or to rule the snow out
when something else looks wrong.

### The season sticks as you browse

It is resolved **once per page load**. Load `?season=lent` and then click through
the navigation normally — the whole site stays in Lent, so you can walk every
page in one season without re-adding the parameter. A hard refresh on a clean URL
returns to the real date.

### It is a URL and nothing else

No cookie, no stored preference, no build flag. The override lives exactly as
long as the URL that carries it, so there is no state anywhere that can leave the
site quietly snowing in June.

---

## What each season actually changes

A season is not a tint over the page — it retints **the palette itself**. Each one
restates the paper (`--background`, `--surface`, `--surface-muted`, `--border`),
the season's own colour across the whole accent scale (`--color-accent-200`
through `700`, which is what every eyebrow, rule, chip, drop cap and card frame
is painted with), the cross (`--sacred`), the buttons and links (`--primary`),
and the two ink grounds behind the presbyter's letter and the week's verse
(`--color-brand-900`, `--color-sand-950`).

| Season | Paper | The season's colour | Cross & buttons | Ink grounds | Extra |
| --- | --- | --- | --- | --- | --- |
| **Christmas** (1 Dec – 1 Jan) | Snow — cold, near-white | Red, at full strength | Crimson | Burgundy | ❄ Snow, garland, treeline, frieze, greeting |
| **Lent** | Ashen violet-grey | Violet, drained of chroma | Deep violet | Violet-black | Bare branches, veils, stones, wilderness frieze |
| **Holy Week** | Ash, red-leaning | Crimson | Passion crimson | Near-black red | Lent's branches, veils and stones continue |
| **Good Friday** | Cold stone | **Every scale drained to pure neutral** | Plain ink | Near-black | Calvary, crown of thorns, nails; photography **left in colour** |
| **Easter** | Brightest, warm ivory | Gold, full strength | Gilded | Lit brown | Everything glows; lilies, rays, empty tomb |
| **CSI Day** | Warm | Flame | Magenta | Magenta | — |
| **Ordinary time** | The site as it is | Flame | Crimson & brand | Near-black | — |

The light in each section (`--season-light`) moves with them, and on Good Friday
is `transparent` rather than merely dim.

### What to look for

- **`lent`** — the clearest of the set after Good Friday. The paper goes
  grey-violet, every eyebrow and rule turns from flame to drained violet, and the
  buttons follow. Compare against `ordinary` side by side.
- **`good-friday`** — the strongest of the set, and deliberately so. Every UI
  element and icon is black and white; the light is *removed*, not dimmed; and
  Calvary stands at the foot of every section. The photography stays in colour.
- **`easter`** — the opposite end of the same year, and the only season with
  *lighting* rather than only colour. Every surface glows, lilies stand where the
  firs and the crosses stood, and light falls from the head of each section.
- **`christmas`** — red on snow, and the only season that also brings the four
  decoration layers below.

The clearest place to judge any of them is a page with several sections — the
home page, or `/about`.

### The Lent decorations

Lent gets the same structure as Christmas and the opposite of its content. The
season is about subtraction, so the decorations are what is *left* when the room
is undressed — the same page, the same horizon, everything taken off it.

| Layer | Where | What |
| --- | --- | --- |
| **Bare branches** | Every section, along the foot | The Christmas fir with no star, no baubles and no tiers — a trunk and its limbs, drawn to the same box and standing on the same line, so the reader who saw December meets the same horizon stripped. The row is thinned by half. |
| **Veils** | Every section, from the head | Cloth over a rod, hem scalloped — the covering a church puts over its crosses and images from Passiontide, and the same practice the site already follows by drawing colour out of its photography. Four, against Christmas's eight. |
| **Stones** | Every section, on the ground | A wilderness is made of these and little else. |
| **Wilderness frieze** | Foot of the page | Three bare trees far apart, a scatter of stones, one plain cross on the horizon and a single candle still burning. |
| **Scripture** | Above the frieze | *Return to me with all your heart* — Joel 2:12, with its reference, in the reader's own language. |

Everything is drawn in the same hand and at the same hairline weight as the
Christmas set, at roughly **half the strength**, on paper that has itself gone
ashen. It should be noticed only once the reader stops to look.

Good Friday has its own set — see below. Lent's branches and veils stop at
Maundy Thursday; nothing carries over.

### Good Friday

**The interface goes monochrome and the photography does not.**

Every step of every palette — brand, accent, crimson and the warm neutrals — is
redefined as a pure neutral at *exactly* the lightness it had in colour. So a
button that was `brand-700` becomes the grey that `brand-700` weighed, and every
contrast ratio the design relies on holds unchanged. It is done by redefining the
scales rather than by putting `filter: grayscale()` over the document: a page
filter would flatten the photography too, cost a full-page composite, and fight
the browser on every scroll.

The photographs stay in colour deliberately. The congregation should still see
their own church and their own faces — it is the building that is stripped, not
the people in it. What goes black and white is everything the site itself draws:
type, rules, buttons, icons, chips, marks.

| Layer | Where | What |
| --- | --- | --- |
| **Calvary** | Every section, along the foot | Three crosses, the centre one taller and standing clear — drawn to the same box the fir and the bare tree stand in, on the same base line. |
| **Crown of thorns** | Every section, from the head | A plaited ring with the thorns struck outward. The only thing this day hangs. |
| **Calvary frieze** | Foot of the page | The hill, three crosses, the crown, three nails, the spear and the sponge on hyssop, and stones. |
| **Scripture** | Above the frieze | *It is finished* — John 19:30. |

**Nothing moves.** The other seasons have snow falling or light breathing behind
them; every warm wash on the site — the footer's bloom, the verse's halo, the
CTA band's light, the announcement card's tint — resolves through
`--season-light-dark`, which is `transparent` on this day. The page is still,
which is the point of it.

An earlier version of this system gave Good Friday nothing at all, on the
reasoning that a decoration surviving the day it commemorates would prove the
calendar was never really being kept. That was wrong in one respect: the altar is
stripped, but the church is not empty — the cross is brought forward and
venerated, and it is the one day of the year the building is *about* a single
image. So the page carries that image, and nothing else.

### Easter

**The season changes how the site is *lit*, not just what colour it is.**

Every other season recolours the page. Easter glows — the counterpart, forty-eight
hours later, to the black-and-white of Good Friday.

| Layer | What |
| --- | --- |
| **Dawn** | A fixed wash of gold light entering high behind the whole page. |
| **Buttons** | Lit from within, brighter under the hand. |
| **Cards & plates** | The shade they cast warms into light — every surface using the site's elevation is lit without knowing about the season. |
| **The cross** | Haloed at the head of every section: the one place a glow is not decoration but the subject. |
| **Rules & display type** | Catch the light along their length; headings are lit from behind. |
| **The Risen Christ** | **One** figure, centred at the foot of every section — in a mandorla, arms open, cruciform nimbus, the wounds marked. Not a row: the fir, the bare branch and the cross repeat because a wood, a wilderness and a hill are each made of many; he is not one of many. |
| **Rays** | Falling from the head of each section — the decoration *is* the light. |
| **Light shafts** | Struck down across the hero of every page — seven of them, `mix-blend-screen` so they can only ever *add* light, drifting on a 24–44 second cycle. |
| **The rising sun** | At the foot of the page: the sun coming up behind the hill, the opened tomb with its stone rolled clear, Friday's three crosses standing empty on the far hill, lilies and a butterfly. |
| **The greeting** | *Christ is risen!* — *He is risen indeed. Halleluyah!* |

**On not drawing the figure.** A figure of the Risen Christ was attempted three
times — line art, a filled silhouette in three pieces, then a single continuous
outline with a neck and sloping shoulders — and every version read as something
other than a person: a totem, a bell with sticks attached, a blank hooded shape.
The last was geometrically correct, symmetric to the unit and properly closed,
and still did not work.

The reason is scale, not craft. A human figure is the shape people read most
precisely and judge most harshly, and a face is available neither at ninety
pixels nor in a tradition that shows Christ as a sign rather than a portrait.
Without one, what the eye cannot accept as a person it reads as an object — and
every extra detail made it worse, which is the signal that the premise was wrong
rather than the drawing.

So the season is carried by the emblems the church already uses: the lily, the
butterfly, the empty cross, and the sun rising behind the hill. All of them are
legible instantly because they were always meant to be signs. The resurrection
is stated by the cross being **empty**, which is how it has been stated in glass
and stone for centuries without drawing a body.

Three rules keep the glow from becoming a neon sign. Every glow is a `box-shadow`
or `text-shadow` — **additive light around an element, never a change to its fill
or text colour** — so no contrast ratio moves and the light sits *outside* the
letterforms. It is warm and it is one colour, the flame of the crest turned to
gold, so the page reads as one light source. And **nothing pulses**: a glow that
breathes is a notification.

Under `prefers-reduced-motion` the glows come down to about a third rather than
off entirely — nothing here moves, but a reader who asks for less motion often
finds heavy visual effects difficult too.

"Halleluyah" carries particular weight in the greeting: the word is put away for
the whole of Lent and returns at Easter, so the site is literally not allowed to
say it until that moment.

### The Christmas decorations

Christmas is the one season that adds things to the page rather than only
recolouring it. Four layers, all of them rendering `null` for the other eleven
months:

| Layer | Where | What |
| --- | --- | --- |
| **Garland** | Top of every page | Baubles, stars, bells and flakes on threads, with a spray of fir in each upper corner. Absolute, not fixed — it sits over the dark hero every page opens on, and scrolls away with it. |
| **String lights** | Swagged across the head of every section | Four arcs with twenty bulbs in four colours, breathing out of step. Wire and bulbs are generated from the *same* curve, so no bulb can float off the string. |
| **Section decorations** | Every section, along the foot | Twenty-one pieces: dressed firs, plus gifts, candy canes, bells, a wreath, candles and holly. The row shifts per section so no two read alike. Drawn on the `-z-10` layer, **always behind the words**. |
| **Snow on the cards** | Every plate on the site | A dusting along the top edge, thicker at the corners where snow gathers. A `::before` on the card, so every card gets it — including ones written later. |
| **Frost** | The four corners of the viewport | Fixed, behind everything, forming from the edges inward the way frost actually does. |
| **Snowfall** | The whole site | 28 flakes, thinned to 16 on phones. |
| **Frieze** | Foot of the page | A drift with a dressed tree, a snowman, a lantern, a wreath, gifts and firs behind. |
| **Greeting** | Above the frieze | "Merry Christmas" over "Glory to God in the highest", set in the site's own display serif. |

Two rules hold across all of them. Nothing decorative is ever in front of content —
the section pieces sit on the same layer as the section's own light and grain,
and the garland hangs beneath the masthead's stacking level. And everything is
line-drawn at a hairline weight, the same weight as the rules and cross marks
used all year, so the decorations read as the same hand rather than as clip art
dropped on top.

**The interface itself is dressed, not just the room.** Every control, surface,
rule and state takes the season's three materials — deep red, gold, frost — while
keeping every shape, size and contrast ratio as it is the rest of the year:

| Component | Christmas |
| --- | --- |
| **Buttons** | Deep red fill with a gold hairline and warm shade — a wrapped gift. Hover brightens the *gold*, never the red, so the label keeps its contrast. |
| **Cards** | Gold ribbon frame, red-warmed shade, snow along the top edge. |
| **Section rules** | Ribbon candy — red and warm white on the diagonal. At 1px it resolves into a fine dashed line, not a novelty. |
| **Form fields** | Frosted: cold blue frame, white inner highlight. Focus turns **gold**, so it can never be mistaken for the error state, which is red all year. |
| **Chips over photos** | A cold rim, as if rimed. |
| **Media wells** | Frost creeping in from the edge of the glass. |
| **Focus rings** | Gold, unmistakable on both grounds. |
| **Text selection** | The feast's own red. |
| **The masthead** | Frosted glass — the one property saying what the glass is made of. Its shape, position and behaviour are untouched. |

The entire block is borders, rings, shadows and background *edges*. Nothing
changes a text colour or a fill that carries type, which is why the season can be
this emphatic without a single contrast pairing moving.

**Christmas is decorated; Easter is lit.** That difference is deliberate. Easter
adds one warm light to every surface; Christmas adds *objects* to the room and
lights only those — the bulbs, the snow caps, the frost. The page itself stays
cold, which is what makes the small warm points read.

On a phone the treeline thins from fifteen firs to seven and the hanging set
halves, so a small screen gets a treeline rather than a solid band of green.

The greeting is the one piece here that is **real text, not artwork**: it is
translated (a Tamil reader gets இனிய கிறிஸ்துமஸ்), it is read aloud by a screen
reader, and it is set in Fraunces at the site's own weight and tracking — because
unlike the trees around it, it is a message rather than a decoration.

### What never changes

Type, contrast ratios, layout, navigation and photography *content*. Nothing is
harder to read or to use in any season, including Good Friday. A congregation
walking into their own church in Lent does not find a different building — they
find the same one, barer, and they know at once.

---

## The dates

Christmas is fixed. Easter is not — it is the Sunday after the first full moon on
or after the vernal equinox, which is why Lent, Holy Week and Good Friday move by
up to five weeks from year to year. The site computes it rather than storing it.

| Year | Ash Wednesday | Palm Sunday | Good Friday | Easter | Eastertide ends |
| --- | --- | --- | --- | --- | --- |
| 2026 | 18 Feb | 29 Mar | 3 Apr | **5 Apr** | 24 May |
| 2027 | 10 Feb | 21 Mar | 26 Mar | **28 Mar** | 16 May |
| 2028 | 1 Mar | 9 Apr | 14 Apr | **16 Apr** | 4 Jun |
| 2029 | 14 Feb | 25 Mar | 30 Mar | **1 Apr** | 20 May |
| 2030 | 6 Mar | 14 Apr | 19 Apr | **21 Apr** | 9 Jun |

Fixed dates: **Christmas** 1 Dec – 1 Jan · **CSI Day** 27 Sep.

### Season boundaries

- **Lent** — Ash Wednesday (Easter − 46) to the day before Palm Sunday. Forty
  days plus the six Sundays inside them, which are not counted because a Sunday
  is never a fast.
- **Holy Week** — Palm Sunday (Easter − 7) through Holy Saturday, with Good
  Friday (Easter − 2) taken out of the middle as its own day.
- **Easter** — Easter Day through the 49th day after it, closing on Pentecost.
- **Christmas** — **1 December through 1 January**, crossing the new year.
- **CSI Day** — 27 September. Always ordinary time in the Western calendar, so
  it can never collide with a moveable season.

> **Both Christmas boundaries are deliberate departures.** Liturgically,
> Christmastide is the twelve days from the 25th to Twelfth Night, with Advent
> holding the weeks before it. Advent is not one of the seasons this site dresses
> for, so Christmas opens on **1 December** and carries the month the
> congregation actually spends waiting. It closes on **1 January** because that is
> when decorations come down in practice — the site should not still be hung with
> baubles in the week everyone has gone back to work. Recorded here and in
> `liturgical-year.ts` so neither ever reads as a bug.

---

## Why this is the CSI calendar

The CSI is a united church — Anglican, Methodist, Congregational, Presbyterian
and Reformed traditions joined in 1947 — in full communion with the Anglican
Communion, and its *Book of Common Worship* keeps the Western calendar and the
Revised Common Lectionary. That has consequences the code depends on:

- The **Gregorian computus** is the correct one. An Orthodox parish would need
  the Julian variant, which can put Easter five weeks later.
- **Lent is forty days plus Sundays**, counted back to Ash Wednesday — the
  Western reckoning, not the Eastern Great Lent.
- **Eastertide closes on Pentecost**, the fiftieth day, and the long green
  stretch after it is ordinary time rather than a numbered Trinity season.
- **CSI Day, 27 September**, is in no other church's calendar: the date in 1947
  when the CSI was inaugurated at St George's Cathedral, Madras. It is the one
  observance here that belongs to this communion alone.

### The colours

They follow the BCW's own sequence — violet through Lent, red in Holy Week, white
and gold at Easter, green in ordinary time, and Good Friday bare — and, apart
from Christmas, every one of them is **mixed from the parish crest**, which
carries a magenta cross and an orange flame and nothing else.

Christmas is the deliberate exception: red on snow, which is the feast's own
pairing and older than any brand. A church at Christmas does not look like a
church in October, and the whole point of keeping a calendar is that some days
are not like the others.

So Lent is the crest's magenta pulled toward violet and drained; Holy Week is that
same magenta swung to crimson; Easter is the flame turned to gold. No hue is
introduced that the church's own arms have no claim to.

Ordinary time is green in the BCW, and green is the one colour the crest does not
contain. Rather than invent it, the site simply rests — which is also the honest
reading of the season. Ordinary time is not an occasion the building is dressed
for; it is the building.

---

## The splash screen

The opening frame changes with the season too — it was the one surface on the
site that kept the same colours all year.

| Season | The arch | The bloom behind it |
| --- | --- | --- |
| **Ordinary** | The crest's magenta | Warm, magenta into flame |
| **Christmas** | The feast's red, keystones gilded | **Frost** — colder than the paper |
| **Lent** | Drained violet on ash | Almost put out |
| **Holy Week** | Passion crimson | Almost put out |
| **Good Friday** | Plain ink on stone | **`transparent`** — not dim, absent |
| **Easter** | Gilded, keystones burning | Gold, at full strength |
| **CSI Day** | Both of the seal's colours | Magenta into flame |

Six properties — the arch stroke, its keystones, the halo's two stops, the
waiting rule and the rings that open as the crest flies — are on tokens and
retargeted per season. The ground needed nothing: it is `--surface`, which the
season blocks already move.

On Good Friday the crest itself is desaturated, and the halo is the one thing on
that screen whose whole job is to be light — so on the day the church puts its
lights out, it is simply not there.

> **One timing caveat.** The splash is server-rendered and up before hydration,
> while `data-season` is written a frame or two later — so the arch begins
> drawing in the default colours and settles into the season's while it is being
> struck. Since the arch takes 1.4s to draw, the change lands *inside* the
> animation rather than after it. Making it exact would mean computing the
> season in a blocking inline script with the computus duplicated in a string,
> which is a maintenance risk a splash screen does not justify.

## Where it lives

| File | Responsibility |
| --- | --- |
| `src/lib/liturgical-year.ts` | Dates only. Easter computus and season boundaries. No React, no DOM, no colour. |
| `src/components/common/liturgical-season.tsx` | Resolves the season (and the `?season=` override) and writes it to `<html data-season>`. |
| `src/styles/globals.css` | The season blocks. Colour only — the paper, the accent scale, the cross, the buttons and the ink grounds, plus the Holy Week veiling. |
| `src/components/common/snowfall.tsx` | The fall. Reads the same season rather than counting months of its own, so the two can never disagree about what day it is. |
| `src/components/common/christmas-scene.tsx` | The frieze at the foot of the page — firs, a snowman, a lantern, a wreath and the star. Renders `null` outside Christmas. |
| `src/components/common/lent-scene.tsx` | Its counterpart — bare trees, stones, a cross on the horizon, one candle, and Joel 2:12. Renders `null` outside Lent and Holy Week. |
| `src/components/common/good-friday-scene.tsx` | Calvary — three crosses, the crown, the nails, the spear and sponge, and John 19:30. |
| `src/components/common/easter-scene.tsx` | The empty tomb at sunrise, lilies, a butterfly, and the Paschal greeting. |
| `src/components/common/section-ornaments.tsx` | What every section carries: firs and baubles in December, bare branches, veils and stones in Lent. |

The split is the point: the calendar file knows nothing about colour, and the
stylesheet knows nothing about dates.

---

## Accessibility

- **`prefers-reduced-motion` outranks the preview switch.** A reader who has
  asked for less motion never gets the snow, even with `?snow` in the URL — a
  permanent fall of thirty moving specks is exactly what that preference exists
  to prevent. There is no still version: snow that does not fall is a scatter of
  dots over the church's photography.
- **The snow never blocks anything.** It sits above the page and below the
  masthead, the menus and the dialogs; it is `pointer-events-none` and
  `aria-hidden`, and it animates only `transform` and `opacity`, so it runs on
  the compositor and never touches the main thread.
- **Contrast is untouched in every season**, including Good Friday. The seasons
  move the paper and the light; they do not move the ink.

---

## Verification

**Contrast, every season.** Seven pairs are checked per season — body and muted
text on paper, eyebrow on paper, body on card, and white on each of the button,
the presbyter's letter and the week's verse. All seventy pass WCAG AA, most of
them far above it: the lowest reading anywhere in the year is 8.3:1, against a
4.5:1 requirement. **No season is harder to read than another**, Good Friday
included.

**The calendar.** The computus and every season boundary are checked against
published dates —
Easter 2026–2038, the 2026 boundary days on both sides of every season, and every
day of December resolving to Christmas — plus 1 January in, and 2 January out — for each year from
2026 to 2035. All checks pass.

If you change anything in `liturgical-year.ts`, re-run that check before
trusting it. The failure mode of a calendar bug is that nobody notices until
Good Friday.

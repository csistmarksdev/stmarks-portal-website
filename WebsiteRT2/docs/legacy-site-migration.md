# Moving the old website's content into the new one

**Old site:** <https://csistmarks.com/> - WordPress, crawled 28 November 2026.
**For:** whoever runs the import, and the church office, who confirm the items marked ✱.

The old site's REST API is locked, so it was read through its sitemaps and its
pages: 33 pages, 25 posts, 30 events and 21 photo albums.

## Where each part of the old site went

| Old site | New site | How it gets there |
| --- | --- | --- |
| **Church History** | About → History. Added: why the congregation was planted (Moovarasampet's pastorate status, Keelkattalai), the first Confirmation (19 Sep 2006, 16 members, Bishop V. Devasahayam), the unit date (1 Apr 2007), and the outreach (medical camps, orphanages). New 2006 milestone. | `src/content/church.ts` - code, live on the next deploy |
| **Church Timings** | Service timings table (9 rows: Praise & Worship, Holy Communion on the 2nd and 4th Sundays and on the 1st of each month, Matins, Sunday School, Evening Service, Campus Prayer, Fasting Prayer, Choir practice) ✱ | `src/data/church.mock.ts` → Portal, by the import |
| **Sunday School, Youth, Women's, Men's, Young Couple, Choir** | Each fellowship's page: tagline (its scripture), introduction, vision, schedule, member count, office bearers ✱. English and Tamil. | `src/data/fellowships.mock.ts` → Portal, by the import |
| **Photos** (21 albums, 480 photos) | Gallery: 15 albums. The seven "Church Construction - Stage 0…6" albums became one, *Building the New Church*, with each photo captioned by its stage. | `scripts/legacy-site/archive.json` → Portal, by the import (as drafts) |
| **Videos** (5 YouTube links) | Gallery album *Videos from the Archive*. All five videos were still online when checked. | same |
| **Membership forms** (Tamil, English PDF) | Downloads → Forms | same |
| **Our Pastors** | Not changed. The new roll in `src/content/leadership.ts` comes from the church's own register and is more exact than the old page. | - |
| **Church Committee** | Not changed. The new site holds the current committee (commit 0368f18, 3 Nov 2026); the old page shows the committee from the previous presbyter's time. | - |
| **Presbyter-in-charge** | Not changed - Rev. V. Pavun Sangeetha is correct. The old site still names Rev. D. Y. Dinakaran "till date". | - |
| **Contact Us** | Office email **info@csistmarks.com** added; the domain had a working mail server on 28 Nov 2026 ✱. The address already matched. The phone (+91 94440 64537) was not added: it is Mr. V. George's mobile from when he was Secretary, and the site already lists the current Secretary and Treasurer as contacts. | `src/content/church-office.ts` |
| **Home page verse** (Isaiah 65:24) | Fallback weekly verse | `src/data/church.mock.ts` |
| **2023 photo album** | The sanctuary photo replaces the History placeholder image. The Sunday School building's foundation-stone plaque (25 Apr 2022) became a milestone. | `public/images/`, `src/content/church.ts` |
| **Membership forms** | Also shipped in `public/downloads/`, replacing eight sample downloads whose files never existed | `src/data/downloads.mock.ts` |

## Left behind, and why

| Old content | Reason |
| --- | --- |
| **"Marg Malar" monthly magazine** (20 posts) | Each issue is printed *"For Private Circulation only"* and lists members' birthdays, wedding anniversaries, home addresses and phone numbers, and quiz scores with children's names. Only 5 of the 20 PDFs still exist anyway (the other links return error pages, and April–July 2017 all point at the September 2016 issue). |
| **News & Events: birthdays and anniversaries** (~270 entries) | Members' personal dates. |
| **Sermon recordings** (12 mp3s, 2017–2018) and the **audio archive list** (75 sermons, 2015–2017, no recordings) | The Portal cannot store audio. **The mp3s disappear when the old site goes down.** If the church wants to keep them, download them from the old *Audio* page first, or put them on the YouTube channel. |
| **Events** (2017–2018) | Routine weekly services and VBS days with no description; all long past. |
| **Needs** (building-fund appeal with bank details) | The church has been built. Re-publishing account details that may have changed would be risky. |
| **Aayar Madal** (pastor's letter) | A Lent 2020 letter signed by the former presbyter, announcing a confirmation class for that year. It cannot stand under the current presbyter's name. |
| **Older duplicate pages** (`/choir/`, `/youth-fellowship/`, `/men-fellowship/` …) | Earlier drafts of the fellowship pages above; the newer versions were used. |

## Running the import

```sh
cd WebsiteRT2
# 1. See what would change. Reads the live Portal, changes nothing, needs no login.
PORTAL_API_URL=https://<portal>/v1 node --import ./scripts/ts-resolve-hook.mjs scripts/import-legacy-site.mjs

# 2. Do it. Albums and downloads are created as drafts.
PORTAL_API_URL=… PORTAL_ADMIN_EMAIL=… PORTAL_ADMIN_PASSWORD=… \
  node --import ./scripts/ts-resolve-hook.mjs scripts/import-legacy-site.mjs --apply
```

Flags: `--publish` publishes albums and downloads instead of leaving drafts;
`--replace-timings` replaces the service timings even when someone has edited a row.

**What it will not overwrite.** A fellowship field is only written while the
Portal still holds placeholder text: the Portal's seed, or the sample copied in
from the old mock (kept in `scripts/legacy-site/prev-mock-fellowships.json`).
Anything typed in by a person stays and is reported. Re-running is safe: albums
and downloads are matched by slug, and uploads are cached in
`node_modules/.cache/`.

The dry run against the live Portal on 28 Nov 2026 found two edits it keeps:

- the Youth Fellowship's English schedule, *"Every Sunday, 11:00 AM"* (its Tamil still reads the placeholder *மாலை 4:00*)
- a service-timing row *Holy Communion, 8:30 AM – 11:00 AM, 1st & 3rd Sundays*, which conflicts with the old site's *2nd & 4th Sundays*. Timings are therefore not replaced until someone confirms which is right.

## For the church office to confirm ✱

1. **Service timings** - the old page dates from 2024. In particular: is Holy Communion on the **2nd & 4th** Sundays (old site) or the **1st & 3rd** (as typed into the Portal)?
2. **Fellowship office bearers** - all taken from the old site (around 2024):
   Youth - Richard Abraham W. (Coordinator), Andrews Stanley (Secretary) ·
   Young Couple - Suneeta Saghayam (Secretary), P. Sudhakaran (Treasurer) ·
   Sunday School - Nalini Nixon (Superintendent) ·
   Choir - S. Richard Nixon (In charge), Isaac Francis P. (Organist) ·
   Women's - A. Latha (Secretary), Sheela Wilson (Treasurer); **the President is left blank** (it was the former presbyter's wife) ·
   Men's - M. Christdoss (Secretary), P. Sudhakaran (Treasurer).
3. **Photos of children** - the VBS, Sunday School and Christmas albums show children. They arrive as drafts; publish them once the church is content to.
4. **Prayer Fellowship and Other Fellowships** - the old site had no pages for these. Prayer Fellowship carries only the Wednesday and fasting-prayer times.
5. **Office email** - info@csistmarks.com is now on the website. Is someone reading it, and will the church keep renewing the csistmarks.com domain after the old site is retired? If not, remove it from `src/content/church-office.ts`.
6. **Tamil spellings of names** - fellowship office bearers appear in English letters in both languages until the church supplies the Tamil, as with the presbyter roll.

## Corrections made on the way

- *"Sunday Schools started in the mid-17th century"* → eighteenth century (Robert Raikes, 1780).
- *"The Women's Fellowship exits…"* → *exists*; other small spelling fixes.
- The old history says the Adambakkam–Madipakkam pastorate was formed in *"April 1997"* in a paragraph about 1999. The new site keeps the register's date (June 1999).

## Section hero photographs

The six backdrop photographs behind each section's heading (`public/hero/<section>/*.jpg`, six per section; each changed photo got a new filename so no browser or image cache keeps serving the old one) used to be stills from the opening animation. They are now photographs from the old site's albums and home-page sliders, cropped to 1920×1080. The Announcements hero ("From the church office") shows the church itself: the entrance and notice board, the sanctuary, the spire, the foundation-stone plaques and the advisory committee. Smart cropping kept people's faces in frame. To change one, delete it and add the new photo under a **new** filename (overwriting under the same name leaves the old picture in image caches); see `src/content/hero-slides.ts`.

Most of the 2023 photographs and the 2013 VBS photographs are 1800–3900 px wide. The building photographs (About 05–06, Contact 02–06) are 968 px wide and enlarged, so they are softer. Replace them when better photos of the building arrive.

✱ Many of these photographs show identifiable people, including children (Gallery, Events and Fellowships especially). The church published them on its own website, but the office should still confirm it is content to show them this prominently.

| Section | Slide | Original on csistmarks.com |
| --- | --- | --- |
| about | church-01 | /wp-content/uploads/2023/03/CHURCH-ALTER-1.jpg |
| about | church-02 | /wp-content/uploads/2016/12/rsz_3.jpg |
| about | church-03 | /wp-content/uploads/2023/03/CONFIRMATION-2022.jpg |
| about | church-04 | /wp-content/uploads/2016/12/DSCN4757.jpg |
| about | church-05 | /wp-content/uploads/2016/12/DSC_0560.jpg |
| about | church-06 | /wp-content/uploads/2016/12/DSC_0549.jpg |
| fellowships | church-01 | /wp-content/uploads/2016/12/DSC_0106-1.jpg |
| fellowships | church-02 | /wp-content/uploads/2016/12/DSCN4759.jpg |
| fellowships | church-03 | /wp-content/uploads/2016/12/6_x_9_-_20_Print.jpg |
| fellowships | church-04 | /wp-content/uploads/2016/12/United-Fellowship-Carols-015_LR-2.jpg |
| fellowships | church-05 | /wp-content/uploads/2016/12/CS_07.jpg |
| fellowships | church-06 | /wp-content/uploads/2016/12/Family-Carols-Women-Fellowship.jpg |
| events | church-01 | /wp-content/uploads/2016/12/Harvest_Festival_2014_030.jpg |
| events | church-02 | /wp-content/uploads/2016/12/DSC_0046.jpg |
| events | church-03 | /wp-content/uploads/2016/12/WS_Day_-003.jpg |
| events | church-04 | /wp-content/uploads/2016/12/DSC_0055-2.jpg |
| events | church-05 | /wp-content/uploads/2016/12/087.jpg |
| events | church-06 | /wp-content/uploads/2016/12/022.jpg |
| blog | church-01 | /wp-content/uploads/2023/03/IMG_8070-scaled.jpg |
| blog | church-02 | /wp-content/uploads/2016/12/DSCN4761.jpg |
| blog | church-03 | /wp-content/uploads/2016/12/DSC_0006.jpg |
| blog | church-04 | /wp-content/uploads/2016/12/4-Opening-Prayer.jpg |
| blog | church-05 | /wp-content/uploads/2016/12/United-Fellowship-Carols-002_LR.jpg |
| blog | church-06 | /wp-content/uploads/2016/12/088.jpg |
| contact | church-01 | /wp-content/uploads/2016/12/DSCN4763.jpg |
| contact | church-02 | /wp-content/uploads/2016/12/DSC_0035.jpg |
| contact | church-03 | /wp-content/uploads/2016/12/DSC_0023.jpg |
| contact | church-04 | /wp-content/uploads/2016/12/DSC_0055.jpg |
| contact | church-05 | /wp-content/uploads/2016/12/5.jpg |
| contact | church-06 | /wp-content/uploads/2016/12/3-2.jpg |
| announcements | office-01 | /wp-content/uploads/2023/03/IMG_7699-scaled.jpg (entrance and notice board, cropped) |
| announcements | office-02 | /wp-content/uploads/2019/04/IMG-20190414-WA0007.jpg (sanctuary) |
| announcements | office-03 | /wp-content/uploads/2023/03/IMG_7699-scaled.jpg (spire, cropped) |
| announcements | office-04 | /wp-content/uploads/2023/03/CSI-Madp-06-scaled.jpg (2022 foundation stone) |
| announcements | office-05 | /wp-content/uploads/2023/03/CSI-Madp-75-scaled.jpg (advisory committee) |
| announcements | office-06 | /wp-content/uploads/2017/09/slide2.jpg (2016 dedication plaque; low resolution) |
| gallery | photos-01 | /wp-content/uploads/2023/03/FRONT-PAGE-PHOTO-scaled.jpg |
| gallery | photos-02 | /wp-content/uploads/2023/03/IMG_8119-scaled.jpg |
| gallery | photos-03 | /wp-content/uploads/2023/03/IMG_7833-scaled.jpg |
| gallery | photos-04 | /wp-content/uploads/2023/03/IMG_7978-scaled.jpg |
| gallery | photos-05 | VBS 2013 - teachers with the committee |
| gallery | photos-06 | World Sunday School Day 2014 |
| leadership | team-01 | /wp-content/uploads/2023/03/CHURCH-COMMITTEE.jpg |
| leadership | team-02 | /wp-content/uploads/2023/03/CSI-Madp-181-scaled.jpg |
| leadership | team-03 | /wp-content/uploads/2023/03/CSI-Madp-36-scaled.jpg |
| leadership | team-04 | /wp-content/uploads/2023/03/CSI-Madp-79-scaled.jpg |
| leadership | team-05 | /wp-content/uploads/2023/03/CSI-Madp-183-scaled.jpg |
| leadership | team-06 | Welcoming Rev. J. Raja Freeman, 2012 |
| downloads | documents-01 | VBS 2013 - Bible exhibition |
| downloads | documents-02 | VBS 2013 - Bible exhibition |
| downloads | documents-03 | VBS 2013 - Bible exhibition |
| downloads | documents-04 | VBS 2013 - Bible exhibition |
| downloads | documents-05 | Church life 2014 - a reading |
| downloads | documents-06 | Church life 2014 - a reading |

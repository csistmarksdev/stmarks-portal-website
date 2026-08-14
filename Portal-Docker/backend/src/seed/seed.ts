/* eslint-disable no-console */
/**
 * Idempotent database seed.
 *
 *   npm run seed                            (from backend/ or the repo root)
 *   SEED_DEMO_CONTENT=true npm run seed     (adds throwaway demo rows)
 *
 * Always creates the structure a real installation needs:
 *  - the initial super-admin user (SEED_ADMIN_* env vars)
 *  - the eight fixed fellowships (Website slug enum)
 *  - the church singletons the CMS owns (timings, pastor message, verse)
 *
 * Only with `SEED_DEMO_CONTENT=true`, a sample event and announcement, so a
 * developer's list pages are not empty.
 *
 * Those two used to be created unconditionally, and they are not neutral: they
 * publish immediately, the announcement pins itself to the top, and the event
 * dates itself two weeks out — so it sorts above real events and takes a slot
 * on the home page. A parish that ran the seed got invented content on its
 * public site, indistinguishable at a glance from its own. Structure is safe to
 * create anywhere; content is not, so content is now opt-in.
 *
 * Existing records are never overwritten — safe to run repeatedly.
 */
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import type { FellowshipSlug, ImageAsset, LocalizedText } from "@portal/shared";
import * as bcrypt from "bcryptjs";
import type { Model } from "mongoose";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import sharp from "sharp";

import { AppModule } from "../app.module";
import { AnnouncementEntity } from "../modules/announcements/schemas/announcement.schema";
import { SingletonEntity } from "../modules/church/schemas/singleton.schema";
import { ChurchEventEntity } from "../modules/events/schemas/event.schema";
import { FellowshipEntity } from "../modules/fellowships/schemas/fellowship.schema";
import { User } from "../modules/users/schemas/user.schema";

const t = (en: string, ta: string): LocalizedText => ({ en, ta });

/**
 * Whether to create the throwaway demo rows.
 *
 * Opt-in, and compared against the exact string: an unset variable, an empty
 * one, or a stray "false" all mean no. The failure that matters here is demo
 * content reaching a live site, so anything ambiguous resolves to "don't".
 */
const SEED_DEMO_CONTENT = process.env.SEED_DEMO_CONTENT === "true";

const PLACEHOLDER_WIDTH = 1600;
const PLACEHOLDER_HEIGHT = 900;
const PLACEHOLDER_PATH = "images/placeholder.jpg";

/**
 * The stand-in banner, written to disk if it is not already there.
 *
 * It used to be a bare constant pointing at
 * `http://localhost:4000/uploads/images/placeholder.jpg` — two faults in one
 * line. Nothing ever created that file, so every seeded fellowship banner was a
 * 404; and the origin was hardcoded, so even once the file existed the URL only
 * worked on the seeding machine. Banner URLs are *stored* in the records, so
 * that address outlives the process that wrote it.
 *
 * Now the file is generated when missing and the origin comes from the app's
 * own `publicUrl` — the same value the media service stamps into uploads, so
 * seeded and uploaded images agree about where they live.
 */
async function ensurePlaceholderImage(
  uploadRoot: string,
  publicUrl: string,
): Promise<ImageAsset> {
  const absolute = join(uploadRoot, PLACEHOLDER_PATH);

  if (!existsSync(absolute)) {
    await mkdir(dirname(absolute), { recursive: true });
    await sharp({
      create: {
        width: PLACEHOLDER_WIDTH,
        height: PLACEHOLDER_HEIGHT,
        channels: 3,
        // The parchment neutral the site is built on, so a placeholder reads as
        // "no photograph yet" rather than as a broken or black image.
        background: { r: 240, g: 236, b: 228 },
      },
    })
      .jpeg({ quality: 82 })
      .toFile(absolute);
    console.log(`✓ Created ${PLACEHOLDER_PATH}`);
  }

  return {
    url: `${publicUrl.replace(/\/$/, "")}/uploads/${PLACEHOLDER_PATH}`,
    alt: t("Placeholder image", "இடம் நிரப்பும் படம்"),
    width: PLACEHOLDER_WIDTH,
    height: PLACEHOLDER_HEIGHT,
  };
}

const FELLOWSHIP_SEED: Array<{
  slug: FellowshipSlug;
  name: LocalizedText;
  tagline: LocalizedText;
  order: number;
}> = [
  { slug: "youth-fellowship", name: t("Youth Fellowship", "இளைஞர் ஐக்கியம்"), tagline: t("Growing together in faith", "விசுவாசத்தில் ஒன்றாக வளர்தல்"), order: 1 },
  { slug: "young-couple-fellowship", name: t("Young Couple Fellowship", "இளம் தம்பதியர் ஐக்கியம்"), tagline: t("Building Christ-centred homes", "கிறிஸ்துவை மையமாகக் கொண்ட இல்லங்கள்"), order: 2 },
  { slug: "sunday-school", name: t("Sunday School", "ஞாயிறு பள்ளி"), tagline: t("Little hearts, strong roots", "சிறு இதயங்கள், உறுதியான வேர்கள்"), order: 3 },
  { slug: "choir", name: t("Choir", "பாடகர் குழு"), tagline: t("Worship through song", "பாடல் மூலம் ஆராதனை"), order: 4 },
  { slug: "womens-fellowship", name: t("Women's Fellowship", "மகளிர் ஐக்கியம்"), tagline: t("Serving with grace", "கிருபையுடன் சேவை"), order: 5 },
  { slug: "mens-fellowship", name: t("Men's Fellowship", "ஆடவர் ஐக்கியம்"), tagline: t("Standing firm in the Lord", "கர்த்தரில் உறுதியாக நிற்றல்"), order: 6 },
  { slug: "prayer-fellowship", name: t("Prayer Fellowship", "ஜெப ஐக்கியம்"), tagline: t("Devoted to prayer", "ஜெபத்தில் உறுதி"), order: 7 },
  { slug: "other-fellowships", name: t("Other Fellowships", "பிற ஐக்கியங்கள்"), tagline: t("Every member has a place", "ஒவ்வொருவருக்கும் இடம் உண்டு"), order: 8 },
];

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    /*
     * Read the origin and upload root from the running app rather than
     * re-deriving them: `publicUrl` already carries the LAN/PUBLIC_URL logic,
     * so seeded image URLs match what the media service stamps into uploads.
     */
    const config = app.get(ConfigService);
    const placeholderImage = await ensurePlaceholderImage(
      resolve(process.cwd(), config.get<string>("uploadDir", "uploads")),
      config.get<string>("publicUrl", "http://localhost:4000"),
    );

    const users = app.get<Model<User>>(getModelToken(User.name));
    const fellowships = app.get<Model<FellowshipEntity>>(getModelToken(FellowshipEntity.name));
    const singletons = app.get<Model<SingletonEntity>>(getModelToken(SingletonEntity.name));
    const events = app.get<Model<ChurchEventEntity>>(getModelToken(ChurchEventEntity.name));
    const announcements = app.get<Model<AnnouncementEntity>>(getModelToken(AnnouncementEntity.name));

    /* ------------------------------ Admin user ----------------------------- */

    const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@csistmarksmadipakkam.org").toLowerCase();
    if (!(await users.exists({ email: adminEmail }))) {
      const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@123";
      await users.create({
        name: process.env.SEED_ADMIN_NAME ?? "Portal Administrator",
        email: adminEmail,
        passwordHash: await bcrypt.hash(password, 12),
        role: "super-admin",
        active: true,
      });
      console.log(`✓ Created super-admin ${adminEmail}`);
    } else {
      console.log(`- Super-admin ${adminEmail} already exists`);
    }

    /* ----------------------------- Fellowships ----------------------------- */

    for (const item of FELLOWSHIP_SEED) {
      if (await fellowships.exists({ slug: item.slug })) continue;
      await fellowships.create({
        slug: item.slug,
        status: "published",
        name: item.name,
        tagline: item.tagline,
        about: [t(`The ${item.name.en} of CSI St. Mark's Church, Madipakkam.`, `மடிப்பாக்கம் சி.எஸ்.ஐ புனித மாற்கு ஆலயத்தின் ${item.name.ta}.`)],
        vision: t("To glorify God in all we do.", "நாம் செய்யும் அனைத்திலும் தேவனை மகிமைப்படுத்துதல்."),
        schedule: t("Every Sunday, 4:00 PM", "ஒவ்வொரு ஞாயிறு, மாலை 4:00"),
        banner: placeholderImage,
        committee: [],
        coordinator: { name: t("Church Office", "ஆலய அலுவலகம்") },
        order: item.order,
      });
      console.log(`✓ Created fellowship ${item.slug}`);
    }

    /* --------------------------- Church singletons -------------------------- */

    const singletonSeeds: Array<{ key: string; data: unknown }> = [
      {
        key: 'service-timings',
        data: [
          {
            id: 'st-1',
            day: t('Sunday', 'ஞாயிறு'),
            time: t('6:30 AM', 'காலை 6:30'),
            service: t('Holy Communion', 'திருவிருந்து ஆராதனை'),
            venue: t('Main Sanctuary', 'பிரதான ஆலயம்'),
          },
          {
            id: 'st-2',
            day: t('Sunday', 'ஞாயிறு'),
            time: t('9:00 AM', 'காலை 9:00'),
            service: t('Morning Worship', 'காலை ஆராதனை'),
            venue: t('Main Sanctuary', 'பிரதான ஆலயம்'),
          },
        ],
      },
      {
        key: 'pastor-message',
        data: {
          authorName: t('Rev. Presbyter', 'போதகர்'),
          authorRole: t('Presbyter-in-charge', 'பொறுப்பு போதகர்'),
          excerpt: t('Grace and peace to you.', 'உங்களுக்கு கிருபையும் சமாதானமும் உண்டாவதாக.'),
          body: [
            t(
              "Update the pastor's message in the Portal CMS.",
              'போதகரின் செய்தியை போர்டல் CMS-இல் புதுப்பிக்கவும்.',
            ),
          ],
        },
      },
      {
        key: 'weekly-verse',
        data: {
          reference: t('Psalm 118:24', 'சங்கீதம் 118:24'),
          text: t(
            'This is the day the Lord has made; let us rejoice and be glad in it.',
            'இது கர்த்தர் உண்டாக்கின நாள்; இதிலே களிகூர்ந்து மகிழக்கடவோம்.',
          ),
          weekOf: new Date().toISOString().slice(0, 10),
        },
      },
    ];

    for (const { key, data } of singletonSeeds) {
      if (await singletons.exists({ key })) continue;
      await singletons.create({ key, data });
      console.log(`✓ Created church singleton "${key}"`);
    }

    /* ------------------------------ Demo content ---------------------------- */

    if (!SEED_DEMO_CONTENT) {
      console.log(
        "• Skipped demo content (set SEED_DEMO_CONTENT=true to create it)",
      );
    } else {
      if ((await events.countDocuments()) === 0) {
        const inTwoWeeks = new Date(Date.now() + 14 * 24 * 3600 * 1000);
        await events.create({
          slug: "sample-harvest-festival",
          status: "published",
          title: t("Harvest Festival", "அறுவடை திருவிழா"),
          summary: t("Annual harvest festival and thanksgiving.", "வருடாந்திர அறுவடை திருவிழா மற்றும் நன்றி செலுத்துதல்."),
          description: [t("Join us for the annual harvest festival.", "வருடாந்திர அறுவடை திருவிழாவில் கலந்து கொள்ளுங்கள்.")],
          startDate: inTwoWeeks,
          location: t("Church premises", "ஆலய வளாகம்"),
          // Featured events lead the events page and take a home-page slot, and
          // every other event carries a banner. Without one this demo row was
          // the single image-less card in the grid — which reads as a broken
          // record rather than as sample data.
          image: placeholderImage,
          featured: true,
        });
        console.log("✓ Created sample event");
      }

      if ((await announcements.countDocuments()) === 0) {
        await announcements.create({
          slug: "welcome-to-the-portal",
          status: "published",
          title: t("Welcome to the new church portal", "புதிய ஆலய போர்டலுக்கு வரவேற்கிறோம்"),
          body: t(
            "Content on this site is now managed through the Portal CMS.",
            "இந்த தளத்தின் உள்ளடக்கம் இப்போது போர்டல் CMS மூலம் நிர்வகிக்கப்படுகிறது.",
          ),
          publishedAt: new Date(),
          pinned: true,
        });
        console.log("✓ Created sample announcement");
      }
    }

    console.log("Seed complete.");
  } finally {
    await app.close();
  }
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});

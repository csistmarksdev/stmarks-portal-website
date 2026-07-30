/* eslint-disable no-console */
/**
 * First-run data initializer for the production build.
 *
 *   node dist/seed/initialize        (run by the bundle's entrypoint on boot)
 *
 * Brings a brand-new installation up to a working, demonstrable state:
 *  - the super-admin account (SEED_ADMIN_* env vars)
 *  - the demo content captured in `seed-data/` by `scripts/export-demo-data.mjs`
 *  - the media those records reference, unpacked into the uploads volume
 *
 * Idempotent by design, because the entrypoint runs it on *every* boot: each
 * collection is filled only when it is empty, each media file copied only when
 * absent, and the admin created only when missing. A container restart, or a
 * redeploy against a database the church has been editing for a year, changes
 * nothing.
 *
 * Media URLs are stored as the token `{{MEDIA}}/…` in the export and resolved
 * here against this installation's own `PUBLIC_URL`. That is what makes the
 * dataset portable: the same build restores correctly on localhost, on a LAN
 * address, or behind a public domain, without an export per environment.
 */
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { getConnectionToken } from "@nestjs/mongoose";
import * as bcrypt from "bcryptjs";
import type { Connection } from "mongoose";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { copyFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import { AppModule } from "../app.module";

/** Where the export lives inside the build, relative to `backend/`. */
const SEED_DATA = "seed-data";
const SEED_ASSETS = "seed-assets";

/**
 * A strict ISO-8601 instant, e.g. `2026-08-16T01:00:00.000Z`.
 *
 * JSON has no date type, so every `Date` in the export is a string by the time
 * it is read back. Inserted as-is, `startDate` would be a string and
 * `find({ startDate: { $gte: new Date() } })` would silently match nothing —
 * the events page would simply be empty, with no error anywhere to explain it.
 * Anchored and time-bearing so ordinary content ("2026", "600091") is untouched.
 */
const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

function revive(value: unknown, mediaBase: string): unknown {
  if (typeof value === "string") {
    if (ISO_INSTANT.test(value)) return new Date(value);
    if (value.includes("{{MEDIA}}")) {
      return value.split("{{MEDIA}}").join(mediaBase);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => revive(v, mediaBase));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [
        k,
        revive(v, mediaBase),
      ]),
    );
  }
  return value;
}

/**
 * Rewrite stored media URLs whose origin is no longer this installation's.
 *
 * Media URLs are absolute and stored *inside* content records, so the origin is
 * fixed at the moment a record is written. On a hosting platform you usually do
 * not know your URL until after the first deploy — so the first boot bakes in
 * whatever `PUBLIC_URL` was guessed, and every image 404s until the database is
 * wiped. Repairing them on boot turns that from a destructive reset into
 * "correct the variable and restart".
 *
 * Deliberately narrow: only `<origin>/uploads/<path>` is touched, and only when
 * the origin differs. A link to an external host, or to anything that is not
 * this API's upload route, is left exactly as it is.
 */
async function retargetMedia(
  db: NonNullable<Connection["db"]>,
  collections: string[],
  mediaBase: string,
): Promise<number> {
  const OWN_MEDIA = /^https?:\/\/[^/]+\/uploads\//;
  let updated = 0;

  const rewrite = (value: unknown): unknown => {
    if (typeof value === "string") {
      return OWN_MEDIA.test(value)
        ? value.replace(OWN_MEDIA, `${mediaBase}/`)
        : value;
    }
    if (Array.isArray(value)) return value.map(rewrite);
    if (value && typeof value === "object" && !(value instanceof Date)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          rewrite(v),
        ]),
      );
    }
    return value;
  };

  for (const name of collections) {
    // `media` holds paths relative to the upload root, not URLs — nothing to
    // retarget, and rewriting them would corrupt the library.
    if (name === "media") continue;

    for (const doc of await db.collection(name).find({}).toArray()) {
      const { _id, ...rest } = doc;
      const fixed = rewrite(rest) as Record<string, unknown>;
      if (JSON.stringify(rest) === JSON.stringify(fixed)) continue;
      await db.collection(name).replaceOne({ _id }, fixed);
      updated += 1;
    }
  }

  return updated;
}

/** Every file under `dir`, as paths relative to it. */
function walk(dir: string, base = dir): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory()
      ? walk(full, base)
      : [full.slice(base.length + 1).split("\\").join("/")];
  });
}

async function initialize() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    const config = app.get(ConfigService);
    const connection = app.get<Connection>(getConnectionToken());
    const db = connection.db;
    if (!db) throw new Error("No database connection");

    const publicUrl = config
      .get<string>("publicUrl", "http://localhost:4000")
      .replace(/\/$/, "");
    const uploadRoot = join(
      process.cwd(),
      config.get<string>("uploadDir", "uploads"),
    );
    const mediaBase = `${publicUrl}/uploads`;

    /* ------------------------------- Admin -------------------------------- */

    const email = (
      process.env.SEED_ADMIN_EMAIL ?? "admin@csistmarksmadipakkam.org"
    ).toLowerCase();

    if (!(await db.collection("users").findOne({ email }))) {
      const password = process.env.SEED_ADMIN_PASSWORD;
      if (!password) {
        throw new Error(
          "SEED_ADMIN_PASSWORD is not set and no administrator exists — " +
            "the Portal would start with no way to sign in.",
        );
      }
      await db.collection("users").insertOne({
        name: process.env.SEED_ADMIN_NAME ?? "Portal Administrator",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: "super-admin",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`✓ Created super-admin ${email}`);
    } else {
      console.log(`· Administrator ${email} already exists`);
    }

    /* ------------------------------- Media -------------------------------- */

    const assetRoot = join(process.cwd(), SEED_ASSETS);
    const assets = walk(assetRoot);
    let copied = 0;

    for (const rel of assets) {
      const target = join(uploadRoot, rel);
      if (existsSync(target)) continue;
      await mkdir(dirname(target), { recursive: true });
      await copyFile(join(assetRoot, rel), target);
      copied += 1;
    }

    console.log(
      assets.length === 0
        ? "· No bundled media to install"
        : `${copied > 0 ? "✓" : "·"} Media: ${copied} installed, ${assets.length - copied} already present`,
    );

    /* ------------------------------ Content ------------------------------- */

    const dataRoot = join(process.cwd(), SEED_DATA);
    if (!existsSync(dataRoot)) {
      console.log("· No bundled content to install");
      return;
    }

    const files = readdirSync(dataRoot).filter(
      (f) => f.endsWith(".json") && f !== "manifest.json",
    );

    for (const file of files) {
      const name = file.replace(/\.json$/, "");
      const existing = await db.collection(name).countDocuments();

      if (existing > 0) {
        console.log(`· ${name}: ${existing} document(s) already present, left alone`);
        continue;
      }

      const raw = JSON.parse(
        readFileSync(join(dataRoot, file), "utf8"),
      ) as unknown[];
      if (raw.length === 0) continue;

      const docs = raw.map((d) => revive(d, mediaBase) as Record<string, unknown>);
      await db.collection(name).insertMany(docs);
      console.log(`✓ ${name}: inserted ${docs.length} document(s)`);
    }

    /* ---------------------------- Media origin ---------------------------- */

    const collections = files.map((f) => f.replace(/\.json$/, ""));
    const retargeted = await retargetMedia(db, collections, mediaBase);

    console.log(
      retargeted > 0
        ? `✓ Media origin: repointed ${retargeted} record(s) at ${publicUrl}`
        : `· Media origin already ${publicUrl}`,
    );

    console.log("Initialization complete.");
  } finally {
    await app.close();
  }
}

initialize().catch((error: unknown) => {
  console.error(
    "Initialization failed:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});

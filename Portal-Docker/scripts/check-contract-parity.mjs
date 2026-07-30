/**
 * Fails if the Portal's contract types have drifted from the Website's.
 *
 *   node scripts/check-contract-parity.mjs
 *
 * The Website owns the contract (`Website/src/types/content.ts`); the Portal
 * mirrors it in `shared/src/content.ts`. A silent divergence is the dangerous
 * kind — a renamed field type-checks fine on both sides and only breaks once
 * the two are wired together — so this compares them field by field.
 *
 * Only the shapes the Portal actually serves are checked. Write-once content
 * (church profile, history, vision & mission, diocese, hero slides) is
 * hardcoded in the Website and deliberately absent here; it is listed in
 * WEBSITE_ONLY so its presence in the Website is not mistaken for drift.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORTAL = join(root, "shared", "src", "content.ts");

/*
 * Every website checkout beside the Portal, not just one.
 *
 * This pointed only at `Website/`, while active development had moved to
 * `WebsiteRT/`. The two happen to agree today, so the check still passed — but
 * it was passing about the wrong file: any contract change made in `WebsiteRT`
 * would have gone unnoticed, which is precisely the silent drift this script
 * exists to catch. Checking each one that is present also catches the two
 * websites drifting from each other, since both are compared to the same
 * Portal source.
 */
const WEBSITE_DIRS = ["WebsiteRT", "Website"]
  .map((name) => ({
    name,
    path: join(root, "..", name, "src", "types", "content.ts"),
  }))
  .filter((site) => existsSync(site.path));

if (WEBSITE_DIRS.length === 0) {
  console.error(
    "No website checkout found beside the Portal — expected ../WebsiteRT or ../Website.",
  );
  process.exit(1);
}

/** Shapes the Portal stores and serves — these must match exactly. */
const SHARED_SHAPES = [
  "ServiceTiming",
  "PastorMessage",
  "WeeklyVerse",
  "ChurchEvent",
  "BlogPost",
  "GalleryVideo",
  "GalleryPhoto",
  "GalleryAlbum",
  "Announcement",
  "DownloadFile",
  "FellowshipCommitteeMember",
  "Fellowship",
  "ContactFormValues",
  "ContactSubmissionResult",
];

/** Hardcoded in the Website; the Portal must NOT declare or serve these. */
const WEBSITE_ONLY = [
  "Leader",
  "ChurchProfile",
  "ChurchAddress",
  "ChurchHistory",
  "HistoryMilestone",
  "VisionMission",
  "ChurchValue",
  "DioceseInfo",
];

/** Field names of an interface, ignoring comments, modifiers and ordering. */
function fields(source, name) {
  const match = source.match(
    new RegExp(`interface ${name}[^{]*\\{([\\s\\S]*?)\\n\\}`),
  );
  if (!match) return null;
  return match[1]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("/") && !line.startsWith("*"))
    .map((line) => line.split(/[?:]/)[0].trim())
    .filter(Boolean)
    .sort()
    .join(", ");
}

const portal = readFileSync(PORTAL, "utf8");

const problems = [];

for (const site of WEBSITE_DIRS) {
  const website = readFileSync(site.path, "utf8");

  for (const name of SHARED_SHAPES) {
    const a = fields(website, name);
    const b = fields(portal, name);
    if (a === null) problems.push(`${name}: missing from ${site.name}`);
    else if (b === null) problems.push(`${name}: missing from the Portal`);
    else if (a !== b) {
      problems.push(
        `${name} differs\n    ${site.name}: ${a}\n    Portal:  ${b}`,
      );
    }
  }
}

for (const name of WEBSITE_ONLY) {
  if (fields(portal, name) !== null) {
    problems.push(
      `${name} is hardcoded in the Website but declared in the Portal — remove it`,
    );
  }
}

if (problems.length > 0) {
  console.error("Contract drift detected:\n");
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  console.error(
    `\n${problems.length} problem(s). Update shared/src/content.ts to match the Website.`,
  );
  process.exit(1);
}

console.log(
  `✓ ${SHARED_SHAPES.length} shared shapes match ` +
    `${WEBSITE_DIRS.map((s) => s.name).join(" + ")}; ` +
    `${WEBSITE_ONLY.length} write-once shapes correctly absent.`,
);

import { Types } from "mongoose";
import type { Document } from "mongoose";

/** Recursively converts ObjectIds → strings and Dates → ISO strings. */
function toPlain(value: unknown): unknown {
  if (value instanceof Types.ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === undefined) continue;
      out[key] = toPlain(entry);
    }
    return out;
  }
  return value;
}

/**
 * Serializes a Mongoose document to the API wire shape:
 * `_id` becomes `id`, `__v` is dropped, dates become ISO strings, and any
 * fields in `omit` (e.g. the internal `status` on public endpoints) are
 * removed.
 */
export function serializeDoc<T>(doc: Document, omit: string[] = []): T {
  const raw = doc.toObject({ virtuals: false }) as Record<string, unknown>;
  const { _id, __v, ...rest } = raw;
  void __v;
  for (const key of omit) delete rest[key];
  const plain = toPlain(rest) as Record<string, unknown>;
  return { id: String(_id), ...plain } as T;
}

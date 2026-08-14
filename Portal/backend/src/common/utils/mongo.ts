/**
 * Helpers for building Mongo queries out of user input.
 */

/**
 * Escapes a search term so Mongo treats it as text rather than a pattern.
 *
 * `{ $regex: term }` compiles whatever arrives into a regular expression. Two
 * things follow from that, and both were live here:
 *
 * A search for `c++` or `(` is a syntax error the driver raises — the user
 * types a bracket into a search box and gets a 500.
 *
 * More seriously, a crafted term is a denial of service. `(a+)+$` against a
 * long string backtracks catastrophically, and the work happens inside the
 * database, on a thread nothing else can use. Every content search sits behind
 * `content.read`, which the *viewer* role holds — so the cheapest account in
 * the Portal could stall the server for the whole parish.
 *
 * Escaping is the whole fix: a literal term cannot backtrack pathologically,
 * because there is nothing left in it for the engine to choose between.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A case-insensitive "contains" match on a literal term. */
export function containsInsensitive(term: string) {
  return { $regex: escapeRegex(term), $options: "i" };
}

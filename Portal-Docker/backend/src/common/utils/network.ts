import { networkInterfaces } from "node:os";

/**
 * First non-internal IPv4 address of this machine, or null.
 *
 * Used to default `PUBLIC_URL` to something other devices can actually reach.
 * Media URLs are stored inside content records, so a `localhost` default would
 * bake unreachable addresses into the database the moment anyone uploads from
 * a phone.
 */
export function lanAddress(): string | null {
  const candidates: string[] = [];

  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family !== "IPv4" || address.internal) continue;
      candidates.push(address.address);
    }
  }

  if (candidates.length === 0) return null;

  // Prefer ordinary LAN ranges over virtual adapters (Docker, WSL, VPNs tend
  // to sit outside 192.168/10 or appear later in the list).
  const preferred = candidates.find(
    (ip) => ip.startsWith("192.168.") || ip.startsWith("10."),
  );
  return preferred ?? candidates[0];
}

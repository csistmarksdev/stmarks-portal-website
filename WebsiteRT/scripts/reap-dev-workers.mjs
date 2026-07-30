#!/usr/bin/env node
/**
 * Kill orphaned Turbopack dev workers left behind by a previous `next dev`.
 *
 * Why this exists
 * ---------------
 * Turbopack evaluates Node-side modules in short-lived child processes, spawned
 * by the native binding as `node <distDir>/dev/build/<hash>.js <ipc-port>`.
 * They are not `detached`, but on Windows that does not matter: killing a
 * terminal, or a dev server crashing, leaves the children running. Nothing ever
 * reaps them, and each holds ~50-80 MB.
 *
 * That is survivable once. It is not survivable across restarts, because the
 * orphans from every previous run accumulate. This repo has seen 1080 of them
 * holding 8.6 GB with no dev server running at all.
 *
 * What it does
 * ------------
 * Kills only workers that are (a) this project's, matched on the absolute
 * `.next` path, and (b) genuinely orphaned — their parent process is gone. A
 * worker belonging to a live dev server is never touched, so this is safe to
 * run while one is going.
 *
 * Runs automatically via the `predev` script.
 */

import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* Matches the worker command line; kept loose so a distDir change still hits. */
const marker = path.join(projectRoot, ".next").toLowerCase();

/** @returns {Array<{pid: number, ppid: number, command: string}>} */
function listNodeProcesses() {
  if (process.platform === "win32") {
    // CIM rather than tasklist: only CIM returns the full command line.
    const script =
      "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | " +
      "ForEach-Object { \"$($_.ProcessId)`t$($_.ParentProcessId)`t$($_.CommandLine)\" }";
    const out = execFileSync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", script],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    );
    return out
      .split(/\r?\n/)
      .map((line) => line.split("\t"))
      .filter((parts) => parts.length >= 3)
      .map(([pid, ppid, ...rest]) => ({
        pid: Number(pid),
        ppid: Number(ppid),
        command: rest.join("\t"),
      }));
  }

  const out = execFileSync("ps", ["-eo", "pid=,ppid=,command="], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return out
    .split("\n")
    .map((line) => line.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/))
    .filter((match) => match !== null)
    .map((match) => ({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      command: match[3],
    }));
}

function isAlive(pid) {
  if (pid <= 0) return false;
  try {
    // Signal 0 tests for existence without touching the process.
    process.kill(pid, 0);
    return true;
  } catch (error) {
    // EPERM means it exists but belongs to someone else — still alive.
    return error.code === "EPERM";
  }
}

let processes;
try {
  processes = listNodeProcesses();
} catch (error) {
  // Never block `npm run dev` because a process listing failed.
  console.warn(`[reap-dev-workers] skipped: ${error.message}`);
  process.exit(0);
}

const orphans = processes.filter(
  (entry) =>
    entry.pid !== process.pid &&
    entry.command.toLowerCase().includes(marker) &&
    !isAlive(entry.ppid),
);

if (orphans.length === 0) {
  console.log("[reap-dev-workers] no orphaned dev workers");
  process.exit(0);
}

let killed = 0;
for (const orphan of orphans) {
  try {
    process.kill(orphan.pid, "SIGKILL");
    killed += 1;
  } catch {
    /* Already gone between listing and killing. */
  }
}

console.log(
  `[reap-dev-workers] killed ${killed} orphaned dev worker${killed === 1 ? "" : "s"}`,
);

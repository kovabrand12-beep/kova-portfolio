// Load / save the appointments datastore (a plain JSON array).

import { readFile, writeFile } from "node:fs/promises";
import { STORE_PATH } from "./config.js";

export async function loadAppointments() {
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error("appointments.json is not an array");
    return data;
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function saveAppointments(appointments) {
  const sorted = [...appointments].sort((a, b) =>
    (a.startISO || "").localeCompare(b.startISO || "")
  );
  await writeFile(STORE_PATH, JSON.stringify(sorted, null, 2) + "\n", "utf8");
}

// Build a stable, human-readable id from the start time and client name.
export function makeId(startISO, name) {
  const slug = (name || "client")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  const stamp = startISO.replace(/[-:]/g, "").replace(/\.\d+/, "").slice(0, 15); // 20260912T150000
  return `apt_${stamp}_${slug}`;
}

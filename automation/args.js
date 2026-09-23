// Tiny argument reader. Prefers --flags, falls back to APT_* env vars
// (GitHub Actions passes workflow inputs as environment variables).

export function readInput(name, { required = false, fallback = "" } = {}) {
  const argv = process.argv.slice(2);
  const flag = `--${name}`;
  const idx = argv.findIndex((a) => a === flag || a.startsWith(flag + "="));
  let val = "";
  if (idx !== -1) {
    val = argv[idx].includes("=") ? argv[idx].split("=").slice(1).join("=") : argv[idx + 1] || "";
  }
  if (!val) val = process.env[`APT_${name.toUpperCase().replace(/-/g, "_")}`] || "";
  if (!val) val = fallback;
  if (required && !val) {
    throw new Error(`Missing required input "--${name}" (or APT_${name.toUpperCase()}).`);
  }
  return val.trim();
}

/**
 * Cloudflare Worker — booking-page intake proxy.
 *
 * The public booking page (book.html) POSTs a JSON booking request here.
 * This Worker validates it and triggers the GitHub `repository_dispatch`
 * event `booking-request`, which the client-booking-request.yml workflow
 * handles. The GitHub token stays server-side (never in the browser).
 *
 * ── Deploy (free, ~3 minutes) ────────────────────────────────────────────
 * 1. https://dash.cloudflare.com → Workers & Pages → Create → paste this file.
 * 2. Settings → Variables:
 *      GITHUB_TOKEN   (secret)  fine-grained PAT, repo kova-portfolio,
 *                               permission: Contents = Read and write
 *      REPO           (plain)   kovabrand12-beep/kova-portfolio
 *      ALLOW_ORIGIN    (plain)  https://kovabrand12-beep.github.io
 * 3. Deploy, copy the *.workers.dev URL.
 * 4. Put that URL in book.html as BOOKING_ENDPOINT.
 */

export default {
  async fetch(request, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOW_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") {
      return json({ error: "POST only" }, 405, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "invalid JSON" }, 400, cors);
    }

    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim();
    const start = String(body.start || "").trim();
    const timezone = String(body.timezone || "").trim();
    const notes = String(body.notes || "").trim().slice(0, 1000);

    if (body.company) return json({ ok: true }, 200, cors); // honeypot: silently accept, do nothing
    if (!name || name.length > 120) return json({ error: "name required" }, 400, cors);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "valid email required" }, 400, cors);
    if (!/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(start)) return json({ error: "start must be YYYY-MM-DD HH:MM" }, 400, cors);

    const gh = await fetch(`https://api.github.com/repos/${env.REPO}/dispatches`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "kova-booking-worker",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "booking-request",
        client_payload: { name, email, start, timezone, notes },
      }),
    });

    if (gh.status !== 204) {
      return json({ error: "upstream failed", detail: await gh.text() }, 502, cors);
    }
    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

// HORAI audition relay (Cloudflare Worker).
// Settings > Variables and Secrets:
//   DISCORD_WEBHOOK  (secret)  the Discord webhook URL, never put it in the page
//   ALLOWED_ORIGIN   (text)    your site, e.g. https://horai.example
const ART = { performing: 0xE5601A, visual: 0x5E2BA8, production: 0x0E5A3B };
const cut = (v, n = 700) => { v = String(v ?? "").trim(); return v ? (v.length > n ? v.slice(0, n - 1) + "…" : v) : "—"; };
const F = (name, v, inline = false) => ({ name, value: cut(v), inline });

export default {
  async fetch(req, env) {
    const cors = {
      "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (req.method !== "POST") return new Response("Not found", { status: 404 });

    let d;
    try { d = await req.json(); } catch { return new Response("Bad request", { status: 400, headers: cors }); }
    if (!d.fullName || !d.email || !d.link1) return new Response("Missing fields", { status: 422, headers: cors });

    const art = String(d.art || "").toLowerCase();
    const color = ART[art] ?? 0xF9F8F3;
    const b = new Date(d.dob), n = new Date();
    let age = n.getFullYear() - b.getFullYear();
    if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) age--;
    const minor = age < 18;

    const embeds = [
      {
        title: `${cut(d.stageName, 150)} | ${cut(d.art, 30)}`,
        description: minor ? "**Under 18. Guardian approval required before any stage.**" : "",
        color,
        fields: [
          F("Full name", d.fullName, true), F("Credit name", d.stageName, true), F("Age", Number.isNaN(age) ? "—" : age, true),
          F("City", d.city, true), F("Phone", d.phone, true), F("Email", d.email, true), F("Social", d.social, true),
        ],
        footer: { text: "HORAI open audition" },
        timestamp: new Date().toISOString(),
      },
      ...(minor ? [{
        title: "Guardian", color,
        fields: [F("Name", d.gName, true), F("Relationship", d.gRel, true), F("Phone", d.gPhone, true)],
      }] : []),
      {
        title: "Art", color,
        fields: [F("Discipline", d.disc, true), F("Style or medium", d.style, true), F("Years", d.years, true), F("Training", d.training)],
      },
      {
        title: "Proof", color,
        fields: [F("Best work", d.link1), F("Second link", d.link2), F("Stages and events", d.stages), F("Audience", d.audience)],
      },
      {
        title: "Standard", color,
        fields: [
          F("What is theirs", d.original), F("Why HORAI", d.why), F("In three years", d.vision),
          F("Residency", d.commit, true), F("Languages", d.langs, true), F("Heard via", d.heard, true),
        ],
      },
    ];

    const r = await fetch(env.DISCORD_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "HORAI Audition",
        content: `New ${cut(d.art, 30).toLowerCase()} application: ${cut(d.stageName, 100)}${minor ? " (under 18)" : ""}`,
        allowed_mentions: { parse: [] },
        embeds,
      }),
    });
    return new Response(r.ok ? "ok" : "discord error", { status: r.ok ? 200 : 502, headers: cors });
  },
};

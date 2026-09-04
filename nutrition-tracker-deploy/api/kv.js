// Vercel Serverless Function — 資料同步（Upstash Redis / Vercel KV）
// 支援 Upstash Integration 可能產生的 KV_REST_* 與 STORAGE_KV_REST_* 變數。
export const config = { maxDuration: 20 };

const getEnv = (...names) => names.map((n) => process.env[n]).find(Boolean) || "";

export default async function handler(req, res) {
  const base = getEnv("KV_REST_API_URL", "STORAGE_KV_REST_API_URL");
  const token = getEnv("KV_REST_API_TOKEN", "STORAGE_KV_REST_API_TOKEN");
  const u = (req.query?.u || "").toString().trim();
  const key = (req.query?.key || "").toString().trim();

  if (!base || !token) return res.status(500).json({ error: "KV not configured" });
  if (!u || !key) return res.status(400).json({ error: "missing u or key" });
  if (u.length > 120 || key.length > 80) return res.status(400).json({ error: "invalid key" });

  const redisKey = `u:${u}:${key}`;

  try {
    if (req.method === "GET") {
      const r = await fetch(`${base}/get/${encodeURIComponent(redisKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const j = await r.json();
      if (!r.ok) return res.status(r.status).json(j);
      res.setHeader("content-type", "application/json; charset=utf-8");
      return res.status(200).send(j.result || "");
    }

    if (req.method === "PUT" || req.method === "POST") {
      const body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
      const r = await fetch(`${base}/set/${encodeURIComponent(redisKey)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "text/plain; charset=utf-8",
        },
        body,
      });
      const j = await r.json();
      if (!r.ok) return res.status(r.status).json(j);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

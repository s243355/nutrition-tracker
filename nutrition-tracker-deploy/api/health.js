// Vercel Serverless Function — 接收 iPhone「捷徑」上傳的 Apple 健康資料
// 需要環境變數:KV_REST_API_URL、KV_REST_API_TOKEN(與 api/kv.js 相同)
//
// POST /api/health  (JSON 或表單皆可;也接受網址參數方便測試)
//   u        同步碼(必填,與 App「跨裝置同步」相同)
//   kind     "workout"(一筆運動,計入消耗)或 "active"(當日活動消耗,僅參考)
//   kcal     大卡數字(可帶小數或文字,會自動取數字)
//   name     運動名稱(workout 用,選填)
//   duration 分鐘(選填)
//   id       該筆運動的唯一識別(選填;同 id 重送會覆蓋,不重複)
//   date     YYYY-MM-DD(選填,預設台北時間今天)
//
// 資料存在 u:<同步碼>:health,格式 { "2026-10-07": { active: 481, workouts: [{id,name,kcal,duration}] } }

function taipeiToday() {
  const d = new Date(Date.now() + 8 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}
function num(v) {
  if (v == null) return 0;
  const m = String(v).replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

export default async function handler(req, res) {
  const base = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!base || !token) return res.status(500).json({ error: "KV not configured" });

  let body = req.body || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const pick = (k) => (body[k] != null && body[k] !== "" ? body[k] : req.query[k]);

  const u = String(pick("u") || "").trim();
  const kind = String(pick("kind") || "workout").trim();
  const kcal = Math.round(num(pick("kcal")));
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(pick("date") || "")) ? String(pick("date")) : taipeiToday();
  if (!u) return res.status(400).json({ error: "missing u (同步碼)" });
  if (!(kind === "workout" || kind === "active")) return res.status(400).json({ error: "kind must be workout or active" });
  if (!(kcal > 0)) return res.status(400).json({ error: "kcal must be > 0" });

  const redisKey = `u:${u}:health`;
  try {
    const g = await fetch(`${base}/get/${encodeURIComponent(redisKey)}`, { headers: { Authorization: `Bearer ${token}` } });
    const gj = await g.json();
    let data = {};
    try { data = gj.result ? JSON.parse(gj.result) : {}; } catch { data = {}; }
    if (!data || typeof data !== "object") data = {};

    const day = data[date] || { active: null, workouts: [] };
    if (kind === "active") {
      day.active = kcal;
    } else {
      const id = String(pick("id") || `${date}_${kcal}`);
      const w = { id, name: String(pick("name") || "運動").slice(0, 30), kcal, duration: Math.round(num(pick("duration"))) || null };
      day.workouts = (day.workouts || []).filter((x) => x.id !== id).concat(w);
    }
    data[date] = day;

    // 只保留最近 90 天
    const keep = Object.keys(data).sort().slice(-90);
    const trimmed = {};
    keep.forEach((k) => { trimmed[k] = data[k]; });

    await fetch(`${base}/set/${encodeURIComponent(redisKey)}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(trimmed),
    });
    return res.status(200).json({ ok: true, date, kind, kcal });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}

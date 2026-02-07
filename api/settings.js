import { sql } from "@vercel/postgres";

const KEY = "admin_settings";

export default async function handler(req, res) {
  try {
    // table ensure
    await sql`
      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    if (req.method === "GET") {
      const r = await sql`SELECT value FROM app_settings WHERE key = ${KEY};`;
      const value = r.rows?.[0]?.value ?? null;
      return res.status(200).json({ ok: true, data: value });
    }

    if (req.method === "POST") {
      const value = req.body;
      if (value == null) {
        return res.status(400).json({ ok: false, error: "Body required" });
      }

      await sql`
        INSERT INTO app_settings (key, value, updated_at)
        VALUES (${KEY}, ${value}, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
      `;

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
}

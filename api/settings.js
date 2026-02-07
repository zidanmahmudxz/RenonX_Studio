import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    const key = "main";

    if (req.method === "GET") {
      const result = await sql`
        SELECT data FROM admin_settings WHERE id = ${key} LIMIT 1
      `;
      return res.status(200).json({ ok: true, data: result.rows[0]?.data || null });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      await sql`
        INSERT INTO admin_settings (id, data)
        VALUES (${key}, ${body})
        ON CONFLICT (id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = now()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

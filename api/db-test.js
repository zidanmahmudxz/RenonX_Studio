import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  try {
    const result = await sql`SELECT 1 as ok`;
    return res.status(200).json({ ok: true, from: "db-test", rows: result.rows });
  } catch (e) {
    return res.status(500).json({ ok: false, from: "db-test", error: e?.message || String(e) });
  }
}

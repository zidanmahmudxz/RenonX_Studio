import { sql } from "@vercel/postgres";

export default async function handler(req, res) {
  try {
    // DB test
    const test = await sql`SELECT 1 as ok`;

    // simple response (now it should not crash)
    return res.status(200).json({
      ok: true,
      db: "connected",
      test: test.rows?.[0] || null,
      method: req.method,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      step: "db_failed",
      message: e?.message || String(e),
    });
  }
}

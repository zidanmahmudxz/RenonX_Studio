const { sql } = require('@vercel/postgres');

module.exports = async function handler(req, res) {
  try {
    const result = await sql`SELECT 1 as ok`;
    return res.status(200).json({ ok: true, rows: result.rows });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};

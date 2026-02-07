import pg from "pg";

const { Pool } = pg;

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

async function ensureTable() {
  const p = getPool();
  await p.query(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export default async function handler(req, res) {
  try {
    await ensureTable();
    const p = getPool();

    if (req.method === "GET") {
      const r = await p.query("SELECT data FROM admin_settings WHERE id=1;");
      const data = r.rows?.[0]?.data || null;
      return res.status(200).json({ ok: true, data });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

      await p.query(
        `
        INSERT INTO admin_settings (id, data)
        VALUES (1, $1::jsonb)
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();
        `,
        [JSON.stringify(body)]
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message: e?.message || String(e),
    });
  }
}

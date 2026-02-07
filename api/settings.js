// api/settings.js
import { Pool } from "pg";

const pool =
  globalThis.__renonx_pool ||
  new Pool({
    connectionString:
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_PRISMA_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NO_SSL,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  });

globalThis.__renonx_pool = pool;

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS renonx_admin_settings (
      id INT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export default async function handler(req, res) {
  // Preflight support (safe)
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    await ensureTable();

    if (req.method === "GET") {
      const r = await pool.query(
        "SELECT data FROM renonx_admin_settings WHERE id = 1 LIMIT 1"
      );

      if (r.rowCount === 0) {
        await pool.query(
          "INSERT INTO renonx_admin_settings (id, data) VALUES (1, '{}'::jsonb)"
        );
        res.status(200).json({ ok: true, data: {} });
        return;
      }

      res.status(200).json({ ok: true, data: r.rows[0].data || {} });
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};

      await pool.query(
        `
        INSERT INTO renonx_admin_settings (id, data, updated_at)
        VALUES (1, $1::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        `,
        [JSON.stringify(body)]
      );

      res.status(200).json({ ok: true, saved: true });
      return;
    }

    res.status(405).json({ ok: false, error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({
      ok: false,
      error: "settings api failed",
      message: String(e?.message || e),
    });
  }
}

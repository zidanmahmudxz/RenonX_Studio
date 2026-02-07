import { Pool } from "pg";

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL || process.env.POSTGRES_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const { toolId, meta } = req.body || {};
    if (!toolId) {
      return res.status(400).json({ ok: false, error: "toolId required" });
    }

    const p = getPool();

    await p.query(`
      CREATE TABLE IF NOT EXISTS tool_executions (
        id SERIAL PRIMARY KEY,
        tool_id TEXT NOT NULL,
        meta JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await p.query(
      `INSERT INTO tool_executions (tool_id, meta) VALUES ($1, $2)`,
      [toolId, meta ?? null]
    );

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}

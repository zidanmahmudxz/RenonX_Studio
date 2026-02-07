export default async function handler(req, res) {
  try {
    // Quick ENV check (so it won't crash silently)
    const env = {
      has_DATABASE_URL: !!process.env.DATABASE_URL,
      has_POSTGRES_URL: !!process.env.POSTGRES_URL,
      has_PGHOST_UNPOOLED: !!process.env.PGHOST_UNPOOLED,
      node: process.version,
      method: req.method,
    };

    // Try import pg safely (this is where ESM problem happens often)
    let pg;
    try {
      pg = await import("pg");
    } catch (e) {
      return res.status(500).json({
        ok: false,
        step: "import_pg_failed",
        env,
        message: e?.message || String(e),
      });
    }

    const { Pool } = pg;

    const conn =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      process.env.POSTGRES_URL_NO_SSL ||
      process.env.DATABASE_URL_UNPOOLED;

    if (!conn) {
      return res.status(500).json({
        ok: false,
        step: "missing_connection_string",
        env,
        message:
          "No connection string found. Need DATABASE_URL or POSTGRES_URL (or similar).",
      });
    }

    const pool = new Pool({
      connectionString: conn,
      ssl: { rejectUnauthorized: false },
    });

    // Simple query to verify DB
    const test = await pool.query("SELECT 1 as ok;");

    return res.status(200).json({ ok: true, env, test: test.rows?.[0] });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      step: "unknown_error",
      message: e?.message || String(e),
    });
  }
}

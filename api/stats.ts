import { sql } from "@vercel/postgres";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const totalRes = await sql`SELECT COUNT(*)::int AS total FROM tool_executions;`;
    const total = totalRes.rows?.[0]?.total ?? 0;

    // optional: last 24h
    const last24Res = await sql`
      SELECT COUNT(*)::int AS total
      FROM tool_executions
      WHERE created_at > now() - interval '24 hours';
    `;
    const last24h = last24Res.rows?.[0]?.total ?? 0;

    return res.status(200).json({ total, last24h });
  } catch (err: any) {
    console.error("stats api error:", err);
    return res.status(500).json({
      error: err?.message || "Failed to read stats",
    });
  }
}

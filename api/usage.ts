import { sql } from "@vercel/postgres";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // সব সময়ের মোট usage (tool_type ভিত্তিক)
    const totalRes = await sql`
      SELECT tool_type, COUNT(*)::int AS count
      FROM tool_executions
      GROUP BY tool_type
      ORDER BY count DESC;
    `;

    // last 24h usage (tool_type ভিত্তিক)
    const last24Res = await sql`
      SELECT tool_type, COUNT(*)::int AS count
      FROM tool_executions
      WHERE created_at > now() - interval '24 hours'
      GROUP BY tool_type
      ORDER BY count DESC;
    `;

    return res.status(200).json({
      total: totalRes.rows || [],
      last24h: last24Res.rows || [],
    });
  } catch (err: any) {
    console.error("usage api error:", err);
    return res.status(500).json({ error: err?.message || "Failed to read usage" });
  }
}

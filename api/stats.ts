// api/stats.ts
import { sql } from "@vercel/postgres";

export default async function handler(req: any, res: any) {
  // ✅ Allow only GET
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // ✅ Total executions (all time)
    const totalResult = await sql`
      SELECT COUNT(*)::int AS total
      FROM tool_executions;
    `;

    const total =
      totalResult.rows && totalResult.rows.length > 0
        ? totalResult.rows[0].total
        : 0;

    // ✅ Executions in last 24 hours
    const last24Result = await sql`
      SELECT COUNT(*)::int AS total
      FROM tool_executions
      WHERE created_at > now() - interval '24 hours';
    `;

    const last24h =
      last24Result.rows && last24Result.rows.length > 0
        ? last24Result.rows[0].total
        : 0;

    // ✅ Success response
    return res.status(200).json({
      total,
      last24h,
    });
  } catch (err: any) {
    console.error("❌ /api/stats error:", err);

    return res.status(500).json({
      error: "Failed to read execution stats",
      details: err?.message ?? null,
    });
  }
}

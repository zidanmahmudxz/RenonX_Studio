import { sql } from "@vercel/postgres";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { request_id, tool_type, status } = req.body || {};

    if (!tool_type || !status) {
      return res.status(400).json({ error: "Missing tool_type or status" });
    }

    await sql`
      INSERT INTO tool_executions (request_id, tool_type, status)
      VALUES (${request_id || null}, ${tool_type}, ${status});
    `;

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error("log-execution api error:", err);
    return res.status(500).json({ error: err?.message || "Failed to log" });
  }
}

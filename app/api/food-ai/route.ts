import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const allowedIps = process.env.OFFICE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (!allowedIps?.length && process.env.NODE_ENV === "production") return NextResponse.json({ error: "Configure the office network allowlist before production use." }, { status: 403 });
  if (allowedIps?.length) {
    const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
    if (!allowedIps.includes(address)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  }
  const apiKey = process.env.BLOOM_AI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Add a server-side Bloom AI provider key to enable recommendations." }, { status: 503 });
  let prompt: unknown;
  try { ({ prompt } = await request.json() as { prompt: unknown }); } catch { return NextResponse.json({ error: "Enter a lunch request." }, { status: 400 }); }
  if (typeof prompt !== "string" || prompt.trim().length < 3 || prompt.length > 500) return NextResponse.json({ error: "Requests must be between 3 and 500 characters." }, { status: 400 });
  const endpoint = process.env.BLOOM_AI_ENDPOINT || "https://api.openai.com/v1/chat/completions";
  const model = process.env.BLOOM_AI_MODEL || "gpt-4o-mini";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, temperature: 0.6, messages: [
        { role: "system", content: "You are Bloom Food AI, a practical lunch planner for one office manager in Abu Dhabi. Recommend 3 suitable Abu Dhabi restaurants or dishes, with a brief reason, estimated AED price, and dietary considerations. Be clear when a recommendation needs verification. Keep the answer concise." },
        { role: "user", content: prompt.trim() },
      ] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return NextResponse.json({ error: "The food recommendation service is temporarily unavailable." }, { status: 502 });
    const result = await response.json() as { choices?: { message?: { content?: string } }[] };
    const recommendation = result.choices?.[0]?.message?.content;
    if (!recommendation) return NextResponse.json({ error: "The recommendation service returned no suggestions." }, { status: 502 });
    return NextResponse.json({ recommendation });
  } catch {
    return NextResponse.json({ error: "Could not reach the food recommendation service." }, { status: 502 });
  }
}
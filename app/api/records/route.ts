import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const allowedKinds = new Set(["employees", "lunches", "preferences", "transactions", "events", "restaurants", "cart-items", "uploads"]);

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function deniedByNetwork(request: NextRequest) {
  const allowed = process.env.OFFICE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (!allowed?.length) return process.env.NODE_ENV === "production";
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const address = forwarded || request.headers.get("x-real-ip") || "";
  return !allowed.includes(address);
}

function kindFrom(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind") ?? "";
  return allowedKinds.has(kind) ? kind : null;
}

export async function GET(request: NextRequest) {
  if (deniedByNetwork(request)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  const kind = kindFrom(request);
  if (!kind) return NextResponse.json({ error: "Unknown record type." }, { status: 400 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("office_records").select("id, data, created_at, updated_at").eq("kind", kind).order("created_at");
  if (error) return NextResponse.json({ error: "Could not load records." }, { status: 500 });
  return NextResponse.json({ records: data });
}

export async function POST(request: NextRequest) {
  if (deniedByNetwork(request)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  const kind = kindFrom(request);
  if (!kind) return NextResponse.json({ error: "Unknown record type." }, { status: 400 });
  let data: unknown;
  try { ({ data } = await request.json() as { data: unknown }); } catch { return NextResponse.json({ error: "A JSON data object is required." }, { status: 400 }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "A JSON data object is required." }, { status: 400 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: record, error } = await supabase.from("office_records").insert({ kind, data }).select("id, data, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "Could not save record." }, { status: 500 });
  return NextResponse.json({ record }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  if (deniedByNetwork(request)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  const kind = kindFrom(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!kind || !id) return NextResponse.json({ error: "A valid record type and ID are required." }, { status: 400 });
  let data: unknown;
  try { ({ data } = await request.json() as { data: unknown }); } catch { return NextResponse.json({ error: "A JSON data object is required." }, { status: 400 }); }
  if (!data || typeof data !== "object" || Array.isArray(data)) return NextResponse.json({ error: "A JSON data object is required." }, { status: 400 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data: record, error } = await supabase.from("office_records").update({ data }).eq("id", id).eq("kind", kind).select("id, data, created_at, updated_at").single();
  if (error) return NextResponse.json({ error: "Could not update record." }, { status: 500 });
  return NextResponse.json({ record });
}

export async function DELETE(request: NextRequest) {
  if (deniedByNetwork(request)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  const kind = kindFrom(request);
  const id = request.nextUrl.searchParams.get("id");
  if (!kind || !id) return NextResponse.json({ error: "A valid record type and ID are required." }, { status: 400 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { error } = await supabase.from("office_records").delete().eq("id", id).eq("kind", kind);
  if (error) return NextResponse.json({ error: "Could not delete record." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
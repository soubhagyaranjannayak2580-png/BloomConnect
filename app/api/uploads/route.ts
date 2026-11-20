import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const bucket = "office-uploads";
const maxBytes = 10 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
}

function blocked(request: NextRequest) {
  const allowed = process.env.OFFICE_ALLOWED_IPS?.split(",").map((ip) => ip.trim()).filter(Boolean);
  if (!allowed?.length) return process.env.NODE_ENV === "production";
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  return !allowed.includes(address);
}

export async function POST(request: NextRequest) {
  if (blocked(request)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const form = await request.formData();
  const file = form.get("file");
  const category = form.get("category") === "receipt" ? "receipt" : "image";
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  if (!allowedTypes.has(file.type)) return NextResponse.json({ error: "Upload a JPG, PNG, WebP image or PDF." }, { status: 415 });
  if (file.size > maxBytes) return NextResponse.json({ error: "Files must be 10 MB or smaller." }, { status: 413 });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "upload";
  const path = `${category}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return NextResponse.json({ error: "Could not upload file. Check the private storage bucket setup." }, { status: 500 });
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
  const { data: record, error: recordError } = await supabase.from("office_records").insert({ kind: "uploads", data: { path, name: file.name, type: file.type, size: file.size, category } }).select("id").single();
  if (recordError) {
    await supabase.storage.from(bucket).remove([path]);
    return NextResponse.json({ error: "File uploaded but could not save its record." }, { status: 500 });
  }
  return NextResponse.json({ id: record.id, name: file.name, category, url: signed?.signedUrl ?? null }, { status: 201 });
}

export async function GET(request: NextRequest) {
  if (blocked(request)) return NextResponse.json({ error: "Access is restricted to the office network." }, { status: 403 });
  const supabase = client();
  if (!supabase) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const { data, error } = await supabase.from("office_records").select("id, data, created_at").eq("kind", "uploads").order("created_at", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: "Could not load uploads." }, { status: 500 });
  const uploads = await Promise.all((data ?? []).map(async (record) => {
    const path = typeof record.data.path === "string" ? record.data.path : "";
    const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
    return { id: record.id, name: record.data.name, category: record.data.category, created_at: record.created_at, url: signed?.signedUrl ?? null };
  }));
  return NextResponse.json({ uploads });
}
"use client";

import { useEffect, useRef, useState } from "react";
import { Check, FileImage, FileText, LoaderCircle, UploadCloud } from "lucide-react";

type UploadItem = { id: string; name: string; category: string; url: string | null };

export default function UploadDropzone({ category }: { category: "receipt" | "image" }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/uploads").then(async (response) => {
      if (!response.ok) return;
      const result = await response.json() as { uploads: UploadItem[] };
      if (active) setUploads(result.uploads.filter((upload) => upload.category === category).slice(0, 3));
    }).catch(() => undefined);
    return () => { active = false; };
  }, [category]);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    form.set("category", category);
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const result = await response.json() as UploadItem & { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Upload failed.");
      setUploads((current) => [result, ...current].slice(0, 3));
      setMessage("Uploaded securely");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not upload this file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return <div className="upload-section"><div className="upload-heading"><div><span className="section-label">{category === "receipt" ? "RECEIPTS" : "EVENT PHOTOS"}</span><strong>{category === "receipt" ? "Files & receipts" : "Celebration memories"}</strong></div><span className="upload-private">Private</span></div><button className={`dropzone ${dragging ? "dropzone-active" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); void upload(event.dataTransfer.files[0]); }} disabled={busy}><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" hidden onChange={(event) => void upload(event.target.files?.[0])} />{busy ? <LoaderCircle size={17} className="spin" /> : <UploadCloud size={18} />}<span>{busy ? "Uploading..." : "Drop a file or browse"}</span><small>JPG, PNG, WebP or PDF · 10 MB max</small></button>{message && <div className={`upload-message ${message === "Uploaded securely" ? "upload-success" : "upload-error"}`}>{message === "Uploaded securely" && <Check size={12} />}{message}</div>}{uploads.map((file) => <a className="upload-file" key={file.id} href={file.url ?? undefined} target="_blank" rel="noreferrer"><span className="upload-file-icon">{file.name.toLowerCase().endsWith(".pdf") ? <FileText size={14} /> : <FileImage size={14} />}</span><span>{file.name}</span><small>View</small></a>)}</div>;
}
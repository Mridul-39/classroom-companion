import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8 MB)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name || "") || ".bin";
    const safeExt = ext.length <= 12 ? ext : ".bin";
    const name = `${randomUUID()}${safeExt}`;
    const dir = path.join(process.cwd(), "public", "uploads", "assignments");
    await mkdir(dir, { recursive: true });
    const fullPath = path.join(dir, name);
    await writeFile(fullPath, buf);

    const url = `/uploads/assignments/${name}`;
    return NextResponse.json({ url, name: file.name || name });
  } catch (e) {
    console.error("upload failed", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

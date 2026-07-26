import { NextResponse } from "next/server";
import { keyFor, putObject } from "../../lib/r2";
import { ALLOWED_MIME, MAX_IMAGE_BYTES, isValidKey } from "../../lib/images";

const SLOTS = ["passport", "aadhaarFront", "aadhaarBack", "medical"];

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const slot = String(form.get("slot") || "");
    const existingKey = String(form.get("key") || "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (!SLOTS.includes(slot)) {
      return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
    }

    if (existingKey && !isValidKey(existingKey)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const mime = file.type;
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json(
        { error: "Only webp or jpeg images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const key = existingKey || keyFor(slot, mime);
    await putObject(key, buffer, mime);

    return NextResponse.json({
      storage: "r2",
      key,
      mime,
      size: file.size,
      filename: file.name || undefined,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Upload failed" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getObject } from "../../../lib/r2";
import { isValidKey } from "../../../lib/images";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key: parts } = await ctx.params;
    const key = (parts || []).map((p) => decodeURIComponent(p)).join("/");

    if (!isValidKey(key)) {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const obj = await getObject(key);
    if (!obj.Body) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const etag = obj.ETag || "";
    if (etag && req.headers.get("if-none-match") === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    const bytes = await obj.Body.transformToByteArray();

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": obj.ContentType || "application/octet-stream",
        "Cache-Control": "private, no-cache",
        ...(etag ? { ETag: etag } : {}),
      },
    });
  } catch (e: any) {
    if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}

import { IMAGE_PREFIX } from "./r2";

export const MAX_IMAGE_BYTES = 1_200_000;
export const ALLOWED_MIME = ["image/webp", "image/jpeg"];

export type ImgRef = {
  storage?: "r2";
  key?: string;
  dataUrl?: string;
  filename?: string;
  mime: string;
  size: number;
};

export function isValidKey(key: any) {
  return typeof key === "string" && key.startsWith(IMAGE_PREFIX + "/") && !key.includes("..");
}

export function isValidImgRef(x: any) {
  if (!x) return true;
  if (typeof x !== "object") return false;
  if (typeof x.mime !== "string" || !ALLOWED_MIME.includes(x.mime)) return false;
  if (typeof x.size !== "number" || x.size > MAX_IMAGE_BYTES) return false;
  if (x.filename !== undefined && typeof x.filename !== "string") return false;

  if (x.storage === "r2" || x.key) {
    return isValidKey(x.key);
  }

  if (typeof x.dataUrl === "string" && x.dataUrl.startsWith("data:image/")) {
    return true;
  }

  return false;
}

export function pickImgRef(x: any): ImgRef | null {
  if (!x) return null;

  if (x.storage === "r2" || x.key) {
    return {
      storage: "r2",
      key: String(x.key || ""),
      mime: String(x.mime || ""),
      size: Number(x.size || 0),
      filename: x.filename ? String(x.filename) : undefined,
    };
  }

  return {
    dataUrl: String(x.dataUrl || ""),
    mime: String(x.mime || ""),
    size: Number(x.size || 0),
    filename: x.filename ? String(x.filename) : undefined,
  };
}

export function keysFromDoc(doc: any): string[] {
  const fields = ["passportPhoto", "aadhaarFrontPhoto", "aadhaarBackPhoto", "medicalPhoto"];
  const keys: string[] = [];
  for (const f of fields) {
    const k = doc?.[f]?.key;
    if (typeof k === "string" && k) keys.push(k);
  }
  return keys;
}

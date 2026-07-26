import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const accountId = process.env.R2_ACCOUNT_ID || "";
const bucket = process.env.R2_BUCKET || "";
const endpoint =
  process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

let client: S3Client | null = null;

function getClient() {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return client;
}

export const IMAGE_PREFIX = "sangat";

export function extFromMime(mime: string) {
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return "bin";
}

export function keyFor(slot: string, mime: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${IMAGE_PREFIX}/${slot}/${yyyy}/${mm}/${randomUUID()}.${extFromMime(mime)}`;
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getObject(key: string) {
  return getClient().send(
    new GetObjectCommand({ Bucket: bucket, Key: key })
  );
}

export async function deleteObject(key: string) {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  );
}

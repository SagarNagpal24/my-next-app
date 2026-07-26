import { MongoClient } from "mongodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

for (const file of [".env", ".env.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {}
}

const DRY_RUN = process.argv.includes("--dry-run");
const KEEP_DATAURL = process.argv.includes("--keep-dataurl");
const PURGE = process.argv.includes("--purge");

const accountId = process.env.R2_ACCOUNT_ID || "";
const bucket = process.env.R2_BUCKET || "";
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

const s3 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const FIELDS = ["passportPhoto", "aadhaarFrontPhoto", "aadhaarBackPhoto", "medicalPhoto"];
const SLOT = {
  passportPhoto: "passport",
  aadhaarFrontPhoto: "aadhaarFront",
  aadhaarBackPhoto: "aadhaarBack",
  medicalPhoto: "medical",
};

function extFromMime(mime) {
  if (mime === "image/webp") return "webp";
  if (mime === "image/jpeg") return "jpg";
  return "bin";
}

function keyFor(slot, mime) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `sangat/${slot}/${yyyy}/${mm}/${randomUUID()}.${extFromMime(mime)}`;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "jatha";
  if (!uri) throw new Error("Missing MONGODB_URI");

  const client = new MongoClient(uri);
  await client.connect();
  const col = client.db(dbName).collection("customers");

  if (PURGE) {
    await purge(col);
    await client.close();
    return;
  }

  const cursor = col.find({});
  let scanned = 0;
  let migrated = 0;
  let skipped = 0;

  for await (const doc of cursor) {
    scanned++;
    const set = {};

    for (const field of FIELDS) {
      const img = doc[field];
      if (!img) continue;
      if (img.key) continue;
      if (!img.dataUrl || typeof img.dataUrl !== "string") continue;

      const match = img.dataUrl.match(/^data:(.+);base64,(.*)$/);
      if (!match) continue;

      const mime = img.mime || match[1];
      const buffer = Buffer.from(match[2], "base64");
      const key = keyFor(SLOT[field], mime);

      if (!DRY_RUN) {
        await s3.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: buffer,
            ContentType: mime,
          })
        );
      }

      set[field] = {
        storage: "r2",
        key,
        mime,
        size: buffer.length,
        filename: img.filename || undefined,
        ...(KEEP_DATAURL ? { dataUrl: img.dataUrl } : {}),
      };
      migrated++;
      console.log(`${DRY_RUN ? "[dry] " : ""}${doc._id} ${field} -> ${key}`);
    }

    if (!DRY_RUN && Object.keys(set).length) {
      await col.updateOne({ _id: doc._id }, { $set: set });
    }
    if (!Object.keys(set).length) skipped++;
  }

  console.log(
    `\nScanned ${scanned} docs, migrated ${migrated} images, ${skipped} docs unchanged.` +
      (KEEP_DATAURL ? " (dataUrl kept, run with --purge later)" : "")
  );
  await client.close();
}

async function purge(col) {
  const cursor = col.find({});
  let scanned = 0;
  let purged = 0;

  for await (const doc of cursor) {
    scanned++;
    const unset = {};

    for (const field of FIELDS) {
      const img = doc[field];
      if (!img) continue;
      if (!img.key) continue;
      if (!img.dataUrl) continue;
      unset[`${field}.dataUrl`] = "";
      purged++;
      console.log(`${DRY_RUN ? "[dry] " : ""}${doc._id} ${field} dataUrl purged`);
    }

    if (!DRY_RUN && Object.keys(unset).length) {
      await col.updateOne({ _id: doc._id }, { $unset: unset });
    }
  }

  console.log(`\nScanned ${scanned} docs, purged ${purged} dataUrl fields.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

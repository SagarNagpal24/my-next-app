import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI in .env.local");

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

// Reuse in dev (hot reload safe)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export default clientPromise;

export async function getDb() {
  const dbName = process.env.MONGODB_DB || "jatha";
  const client = await clientPromise;
  return client.db(dbName);
}

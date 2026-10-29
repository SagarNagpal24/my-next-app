import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI!;
if (!uri) throw new Error("Missing MONGODB_URI in .env.local");

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function createConnection() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  return client.connect();
}

export async function getClient(): Promise<MongoClient> {
  const existing = global._mongoClientPromise;

  if (existing) {
    try {
      return await existing;
    } catch {
      global._mongoClientPromise = undefined;
    }
  }

  const promise = createConnection();
  global._mongoClientPromise = promise;

  try {
    return await promise;
  } catch (err) {
    if (global._mongoClientPromise === promise) {
      global._mongoClientPromise = undefined;
    }
    throw err;
  }
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB || "jatha";
  return client.db(dbName);
}

export default getClient;

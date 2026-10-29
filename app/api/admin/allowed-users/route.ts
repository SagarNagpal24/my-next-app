import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { getDb } from "../../../lib/mongodb";

type Role = "admin" | "user";

function cleanEmail(v: any) {
  return String(v || "").toLowerCase().trim();
}

function isAdmin(session: any) {
  return session && (session as any).role === "admin";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return new Response("Forbidden", { status: 403 });

  const db = await getDb();

  const users = await db
    .collection("allowed_users")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  return Response.json(users);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return new Response("Forbidden", { status: 403 });

  const body = await req.json();

  const email = cleanEmail(body.email);
  if (!email) return new Response("Missing email", { status: 400 });

  const role: Role = body.role === "admin" ? "admin" : "user";
  const active = body.active !== false;

  // permissions object optional
  const permissions = body.permissions && typeof body.permissions === "object" ? body.permissions : {};

  const db = await getDb();

  await db.collection("allowed_users").updateOne(
    { email },
    {
      $set: { role, active, permissions },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return new Response("OK");
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return new Response("Forbidden", { status: 403 });

  const body = await req.json();
  const email = cleanEmail(body.email);
  if (!email) return new Response("Missing email", { status: 400 });

  const updates: any = {};
  if (typeof body.active === "boolean") updates.active = body.active;
  if (body.role === "admin" || body.role === "user") updates.role = body.role;
  if (body.permissions && typeof body.permissions === "object") updates.permissions = body.permissions;

  if (!Object.keys(updates).length) return new Response("No updates", { status: 400 });

  const db = await getDb();

  await db.collection("allowed_users").updateOne({ email }, { $set: updates });

  return new Response("OK");
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return new Response("Forbidden", { status: 403 });

  const { searchParams } = new URL(req.url);
  const email = cleanEmail(searchParams.get("email"));
  if (!email) return new Response("Missing email", { status: 400 });

  const db = await getDb();

  await db.collection("allowed_users").deleteOne({ email });

  return new Response("OK");
}

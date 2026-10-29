import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { getDb } from "../../../lib/mongodb";

function displayName(email: string) {
  return String(email || "").toLowerCase().trim();
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Unauthorized", { status: 401 });

  const db = await getDb();

  const users = await db
    .collection("allowed_users")
    .find({})
    .sort({ email: 1 })
    .toArray();

  const items = users.map((u: any) => {
    const email = String(u.email || "").toLowerCase().trim();
    return { email, name: displayName(email) };
  });

  return Response.json({ items });
}

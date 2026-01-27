"use client";

import React from "react";
import { useSession } from "next-auth/react";

type Role = "admin" | "user";

type Permissions = {
  customers?: boolean;
  bulkUpload?: boolean;
  trainData?: boolean;
  nominalRoll?: boolean;
  reports?: boolean;
  jathaDate?: boolean;
  calling?: boolean;
};

type AllowedUser = {
  _id?: string;
  email: string;
  role: Role;
  active: boolean;
  permissions?: Permissions;
  createdAt?: string;
};

const PERM_FIELDS: { key: keyof Permissions; label: string }[] = [
  { key: "customers", label: "Sangat Data" },
  { key: "bulkUpload", label: "Bulk Upload" },
  { key: "trainData", label: "Ticket Data" },
  { key: "nominalRoll", label: "Nominal Roll" },
  { key: "reports", label: "Reports" },
  { key: "jathaDate", label: "Jatha Date" },
  { key: "calling", label: "Calling" },
];

function cleanEmail(v: string) {
  return String(v || "").toLowerCase().trim();
}

// ✅ ensure DB always gets real booleans (not "true"/"false")
function normalizePerms(p: Permissions | undefined): Permissions {
  const out: Permissions = {};
  for (const f of PERM_FIELDS) {
    const v: any = p?.[f.key];
    out[f.key] = v === true || v === "true" || v === 1 || v === "1";
  }
  return out;
}

export default function AdminUsersPage() {
  const { data: session, update } = useSession();

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [users, setUsers] = React.useState<AllowedUser[]>([]);

  // add/update form
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("user");
  const [active, setActive] = React.useState(true);
  const [permissions, setPermissions] = React.useState<Permissions>({
    customers: true,
    bulkUpload: true,
    trainData: true,
    nominalRoll: true,
    reports: true,
    jathaDate: true,
    calling: true,
  });

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/admin/allowed-users", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as AllowedUser[];
      setUsers(data || []);
    } catch (e: any) {
      setErr("Failed to load");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  function toggleFormPerm(key: keyof Permissions) {
    setPermissions((p) => ({ ...p, [key]: !Boolean(p?.[key]) }));
  }

  // ✅ If admin edits THEIR OWN permissions, refresh next-auth session so navbar updates immediately.
  async function refreshSessionIfAffectsCurrentUser(changedEmail: string) {
    try {
      const myEmail = cleanEmail(session?.user?.email || "");
      if (myEmail && cleanEmail(changedEmail) === myEmail) {
        await update(); // triggers /api/auth/session, your session callback reads latest DB perms
      }
    } catch {
      // ignore
    }
  }

  async function addOrUpdate() {
    const e = cleanEmail(email);
    if (!e) return;

    setErr("");
    try {
      const res = await fetch("/api/admin/allowed-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: e,
          role,
          active,
          permissions: normalizePerms(permissions),
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      setEmail("");
      await load();
      await refreshSessionIfAffectsCurrentUser(e);
    } catch (e: any) {
      setErr("Failed to save");
    }
  }

  async function updateUser(userEmail: string, patch: Partial<AllowedUser>) {
    const e = cleanEmail(userEmail);
    setErr("");
    try {
      const body: any = { email: e, ...patch };

      if (body.permissions) body.permissions = normalizePerms(body.permissions);

      const res = await fetch("/api/admin/allowed-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());

      await load();
      await refreshSessionIfAffectsCurrentUser(e);
    } catch (e: any) {
      setErr("Update failed");
    }
  }

  async function removeUser(userEmail: string) {
    const e = cleanEmail(userEmail);
    const ok = window.confirm(`Remove ${e}?`);
    if (!ok) return;

    setErr("");
    try {
      const res = await fetch(`/api/admin/allowed-users?email=${encodeURIComponent(e)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());

      await load();
      await refreshSessionIfAffectsCurrentUser(e);
    } catch (e: any) {
      setErr("Delete failed");
    }
  }

  function userPerms(u: AllowedUser): Permissions {
    return normalizePerms(u.permissions || {});
  }

  return (
    <div className="px-6 py-6">
      <div className="text-xl font-semibold">Allowed Users</div>
      <div className="text-sm text-zinc-600 mt-1">Only emails listed here can access the app.</div>

      {err ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {err}
        </div>
      ) : null}

      {/* Add / Update form */}
      <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@gmail.com"
            className="w-64 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
          />

          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-zinc-950"
          >
            <option value="user">user</option>
            <option value="admin">admin</option>
          </select>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            active
          </label>

          <button
            onClick={addOrUpdate}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Add / Update
          </button>

          <button
            onClick={load}
            className="rounded-lg border border-black/10 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/30"
          >
            Refresh
          </button>
        </div>

        {/* Permissions picker for the form */}
        <div className="mt-3">
          <div className="text-sm font-semibold mb-2">Permissions (tabs access)</div>
          <div className="flex flex-wrap gap-3">
            {PERM_FIELDS.map((f) => (
              <label key={String(f.key)} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!permissions[f.key]}
                  onChange={() => toggleFormPerm(f.key)}
                />
                {f.label}
              </label>
            ))}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Note: Admin role always has access to all tabs.
            <br />
            Note: If you edit permissions of another user, they may need to refresh/re-login to see updated tabs.
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-black/10 dark:border-white/10">
                <th className="py-3 pr-3">Email</th>
                <th className="py-3 pr-3">Role</th>
                <th className="py-3 pr-3">Active</th>
                <th className="py-3 pr-3">Permissions</th>
                <th className="py-3 pr-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td className="py-4" colSpan={5}>
                    Loading...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td className="py-4" colSpan={5}>
                    No allowed users found.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const perms = userPerms(u);

                  return (
                    <tr key={u.email} className="border-b border-black/5 dark:border-white/5">
                      <td className="py-4 pr-3">{u.email}</td>

                      <td className="py-4 pr-3">
                        <select
                          value={u.role}
                          onChange={(e) => updateUser(u.email, { role: e.target.value as Role })}
                          className="rounded-lg border border-black/10 bg-white px-2 py-1 text-sm dark:border-white/10 dark:bg-zinc-950"
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>

                      <td className="py-4 pr-3">
                        <button
                          onClick={() => updateUser(u.email, { active: !u.active })}
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold border",
                            u.active
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-zinc-200 bg-zinc-50 text-zinc-600",
                          ].join(" ")}
                        >
                          {String(u.active)}
                        </button>
                      </td>

                      <td className="py-4 pr-3">
                        {u.role === "admin" ? (
                          <span className="text-xs text-zinc-500">All (admin)</span>
                        ) : (
                          <div className="flex flex-wrap gap-3">
                            {PERM_FIELDS.map((f) => (
                              <label key={String(f.key)} className="flex items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={!!perms[f.key]}
                                  onChange={() =>
                                    updateUser(u.email, {
                                      permissions: { ...perms, [f.key]: !perms[f.key] },
                                    })
                                  }
                                />
                                {f.label}
                              </label>
                            ))}
                          </div>
                        )}
                      </td>

                      <td className="py-4 pr-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateUser(u.email, { active: false })}
                            className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-zinc-900/30"
                          >
                            Deactivate
                          </button>

                          <button
                            onClick={() => removeUser(u.email)}
                            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

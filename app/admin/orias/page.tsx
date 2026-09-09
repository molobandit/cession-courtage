import { getActor, isAdmin, listPendingOriasUsers } from "@/lib/authz";
import { formatDate } from "@/lib/format/fr";
import { OriasActions } from "@/components/admin/orias-actions";
import { redirect } from "next/navigation";

export const metadata = { title: "Validation ORIAS" };

const roleLabel = {
  SELLER: "Cédant",
  BUYER: "Acquéreur",
  BOTH: "Les deux",
  ADMIN: "Admin",
} as const;

export default async function AdminOriasPage() {
  const actor = await getActor();
  if (!actor) redirect("/connexion?next=/admin/orias");
  if (!isAdmin(actor)) redirect("/app");
  const pending = await listPendingOriasUsers(actor);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-serif text-2xl text-navy">Validation ORIAS</h1>
      <p className="mt-1 text-sm text-muted">
        Les comptes restent bloqués hors de l&apos;espace membre tant que le numéro n&apos;est
        pas validé.
      </p>
      <div className="mt-4 overflow-x-auto border border-line bg-paper">
        <table className="w-full text-sm">
          <thead className="bg-surface-alt text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-2 py-1.5 font-medium">Courtier</th>
              <th className="px-2 py-1.5 font-medium">ORIAS</th>
              <th className="px-2 py-1.5 font-medium">Rôle</th>
              <th className="px-2 py-1.5 font-medium">Inscription</th>
              <th className="px-2 py-1.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td className="px-2 py-3 text-muted" colSpan={5}>
                  Aucune demande en attente.
                </td>
              </tr>
            ) : (
              pending.map((u) => (
                <tr key={u.id} className="border-t border-line align-top">
                  <td className="px-2 py-2">
                    <div>{u.fullName ?? "Non renseigné"}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-2 py-2 font-medium tabular-nums">{u.oriasNumber}</td>
                  <td className="px-2 py-2">{roleLabel[u.role]}</td>
                  <td className="px-2 py-2">{formatDate(u.createdAt)}</td>
                  <td className="px-2 py-2">
                    <OriasActions userId={u.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

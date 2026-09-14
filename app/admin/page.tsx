import { redirect } from "next/navigation";

/** L'adresse nue de l'administration mène à la première file de travail. */
export default function AdminIndexPage() {
  redirect("/admin/orias");
}

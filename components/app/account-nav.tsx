const LINKS = [
  { href: "#identite", label: "Identité" },
  { href: "#cabinet", label: "Cabinet" },
  { href: "#recherche", label: "Recherche" },
  { href: "#mot-de-passe", label: "Mot de passe" },
  { href: "#notifications", label: "Notifications" },
  { href: "#factures", label: "Factures" },
  { href: "#pieces", label: "Pièces signées" },
  { href: "#securite", label: "Sécurité" },
];

export function AccountNav() {
  return (
    <nav aria-label="Rubriques du compte" className="mt-5 flex flex-wrap gap-2">
      {LINKS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="inline-flex min-h-10 items-center rounded-full border border-line bg-paper px-3.5 text-[13px] font-medium text-ink hover:border-indigo hover:text-indigo-dark"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}

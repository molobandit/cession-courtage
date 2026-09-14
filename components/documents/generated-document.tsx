import Link from "next/link";
import { PrintButton } from "@/components/direct/print-button";
import { formatLongDate, type GeneratedDocument } from "@/lib/direct/documents";

/*
 * À l'impression, seule la pièce sort : l'en-tête et le pied du site n'ont rien
 * à faire sur un acte qu'on signe et qu'on envoie à une compagnie.
 */
const PRINT_CSS = `
@page { size: A4; margin: 18mm 16mm; }
@media print {
  header, footer, nav, [data-print-hide] { display: none !important; }
  body { background: #fff !important; }
  [data-piece] { box-shadow: none !important; border: 0 !important; padding: 0 !important; max-width: none !important; }
}
`;

export type ElectronicSignature = { label: string; name: string; signedAt: Date; hash: string | null };

/**
 * Pièce générée, prête à relire, imprimer ou signer.
 *
 * Partagée par les dossiers de gré à gré et les dossiers de cession : un même
 * protocole ne doit pas se présenter de deux façons selon le chemin emprunté.
 * Signée électroniquement, la pièce porte le nom des signataires, la date et
 * l'empreinte du texte ; sinon, des cadres pour la signature manuscrite. Une
 * pièce qui ne se signe que sur la plateforme (`electronic`) n'affiche jamais
 * de blancs à remplir à la main.
 */
export function GeneratedDocumentView({
  doc,
  issuedAt,
  backHref,
  backLabel = "Retour au dossier",
  signatures,
  banner,
  electronic = false,
}: {
  doc: GeneratedDocument;
  issuedAt: Date;
  backHref: string;
  backLabel?: string;
  signatures?: ElectronicSignature[];
  banner?: React.ReactNode;
  electronic?: boolean;
}) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <style>{PRINT_CSS}</style>

      <div data-print-hide className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-muted underline-offset-2 hover:underline">
          {backLabel}
        </Link>
        <PrintButton />
      </div>
      {banner ? <div data-print-hide className="mb-6">{banner}</div> : null}

      <article
        data-piece
        className="rounded-2xl border border-line bg-white p-6 text-[14px] leading-relaxed text-ink shadow-sm sm:p-10"
      >
        <div className="flex flex-wrap items-start justify-between gap-4 text-[12px] text-muted">
          <span>Réf. {doc.reference}</span>
          <span>Établi le {formatLongDate(issuedAt)}</span>
        </div>

        {doc.addressee ? (
          <div className="mt-6 ml-auto w-fit text-[14px]">
            {doc.addressee.map((ligne) => (
              <p key={ligne} className={ligne === doc.addressee![0] ? "font-semibold" : "text-muted"}>
                {ligne}
              </p>
            ))}
          </div>
        ) : null}

        <h1 className="mt-8 text-center text-[22px] font-bold tracking-tight">{doc.title}</h1>
        <p className="mt-1 text-center text-[13px] text-muted">{doc.subtitle}</p>
        {doc.signedAt ? (
          <p className="mt-3 text-center text-[13px] font-medium text-ok">
            Signé électroniquement le {formatLongDate(doc.signedAt)}
          </p>
        ) : null}

        <div className="mt-8 grid gap-5">
          {doc.sections.map((section, i) => (
            <section key={section.heading ?? i}>
              {section.heading ? (
                <h2 className="text-[15px] font-semibold">{section.heading}</h2>
              ) : null}
              {section.paragraphs.map((p) => (
                <p key={p} className="mt-2 text-justify">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>

        {doc.annex ? (
          <section className="mt-8">
            <h2 className="text-[15px] font-semibold">{doc.annex.heading}</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    {doc.annex.columns.map((c) => (
                      <th key={c} className="border border-line px-3 py-2 text-left font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {doc.annex.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border border-line px-3 py-2">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {electronic || (signatures && signatures.length > 0) ? null : (
          <p className="mt-10">Fait en deux exemplaires, le ____________________ à ____________________</p>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          {doc.signatories.map((s) => {
            const e = signatures?.find((x) => x.label === s.label);
            return (
              <div key={s.label} className="rounded-xl border border-line p-4">
                <p className="text-[13px] font-semibold">{s.label}</p>
                <p className="mt-1">{s.name}</p>
                <p className="text-[13px] text-muted">{s.capacity}</p>
                {e ? (
                  <div className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-[12px] leading-relaxed">
                    <p className="font-semibold text-ok">Signé électroniquement</p>
                    <p>
                      par {e.name}, le{" "}
                      {e.signedAt.toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Paris" })}
                    </p>
                    {e.hash ? <p className="break-all font-mono text-[10px] text-muted">Empreinte {e.hash}</p> : null}
                  </div>
                ) : electronic ? (
                  s.label === "La plateforme" ? null : (
                    <p className="mt-3 rounded-lg bg-surface-alt px-3 py-2 text-[12px] text-muted">
                      Signature électronique sur la plateforme, en attente
                    </p>
                  )
                ) : (
                  <>
                    <p className="mt-2 text-[12px] text-muted">« Lu et approuvé », signature et cachet</p>
                    <div className="mt-2 h-20" />
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 border-t border-line pt-4 text-[12px] text-muted">{doc.notice}</p>
      </article>
    </main>
  );
}

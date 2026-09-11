/** Pictogramme de marque : mallette, uniquement dans l’en-tête. */

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    // next/image exige un optimiseur que Cloudflare Workers ne fournit pas ; pour
    // un pictogramme de 64 px servi depuis les assets, il coûterait plus qu'il ne
    // rapporte.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/mark.png"
      alt=""
      width={64}
      height={64}
      className={`rounded-[0.7rem] object-cover ${className}`}
    />
  );
}

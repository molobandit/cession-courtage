/** Pictogramme de marque : mallette, uniquement dans l’en-tête. */

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/brand/mark.png"
      alt=""
      width={64}
      height={64}
      className={`rounded-[0.7rem] object-cover ${className}`}
    />
  );
}

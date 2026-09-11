/**
 * Marque originale : pictogramme 3D (cassette technique) et lockup typographique.
 * Pas une copie Assurdeal.
 */

export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img
      src="/brand/icon-3d.png"
      alt=""
      width={64}
      height={64}
      className={`rounded-lg object-cover ${className}`}
    />
  );
}

export function BrandLockup({ className = "h-40 w-auto" }: { className?: string }) {
  return (
    <img
      src="/brand/lockup-3d.png"
      alt="Le Bon Portefeuille"
      width={512}
      height={512}
      className={`object-contain ${className}`}
    />
  );
}

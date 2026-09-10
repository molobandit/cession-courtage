/** Marque graphique originale, pas une copie des logos Assurdeal ou PA. */
export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2563EB" />
      <path
        fill="#fff"
        d="M9 11.2c0-.7.5-1.2 1.2-1.2h11.6c.7 0 1.2.5 1.2 1.2V13H9v-1.8Zm0 3.3h14v7.3c0 .7-.5 1.2-1.2 1.2H10.2c-.7 0-1.2-.5-1.2-1.2v-7.3Zm5.2 2.1v1.4h3.6v-1.4h-3.6Z"
      />
    </svg>
  );
}

/** Pictogrammes originaux pour le rail membre — pas une copie des icônes Assurdeal. */

type IconProps = { className?: string };

export function IconBoard({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 16.5V8.2c0-.7.5-1.2 1.1-1.2h3.3c.6 0 1.1.5 1.1 1.2v8.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M10.5 16.5V5.8c0-.6.5-1.1 1.1-1.1h3.2c.6 0 1.1.5 1.1 1.1v10.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16 16.5v-4.8c0-.6.5-1.1 1.1-1.1h1.8c.6 0 1.1.5 1.1 1.1v4.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M4 18.2h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconFolder({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4.5 8.2V7c0-.8.6-1.4 1.4-1.4h4.1L12 7.8h6.1c.8 0 1.4.6 1.4 1.4v8.4c0 .8-.6 1.4-1.4 1.4H5.9c-.8 0-1.4-.6-1.4-1.4V8.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M4.5 11.2h15" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconSliders({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 8h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M5 16h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="9" cy="8" r="2.1" fill="currentColor" />
      <circle cx="15" cy="16" r="2.1" fill="currentColor" />
    </svg>
  );
}

export function IconPerson({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M5.8 18.6c.9-2.8 3.2-4.4 6.2-4.4s5.3 1.6 6.2 4.4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconSearch({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.2 20 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function IconPlusDoc({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 4.5h7.2L18.5 9v10.5c0 .8-.6 1.4-1.4 1.4H7.4c-.8 0-1.4-.6-1.4-1.4V5.9c0-.8.6-1.4 1.4-1.4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14 4.6V9h4.4" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 12.2v5M9.5 14.7h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconUpload({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 16.5V7.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M8.5 10.2 12 6.8l3.5 3.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 17.5v1.2c0 .7.5 1.2 1.2 1.2h9.6c.7 0 1.2-.5 1.2-1.2V17.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconClipboard({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="6" y="5.5" width="12" height="14" rx="1.6" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 5.5V4.8c0-.7.6-1.3 1.3-1.3h3.4c.7 0 1.3.6 1.3 1.3v.7" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9 11h6M9 14.5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconLinks({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8.2" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="15.8" cy="12" r="3.1" stroke="currentColor" strokeWidth="1.7" />
      <path d="M10.4 12h3.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconRows({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 7h10M7 12h10M7 17h7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function IconLogout({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 5.5H7.4C6.6 5.5 6 6.1 6 6.9v10.2c0 .8.6 1.4 1.4 1.4H10"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M14 8.2 18 12l-4 3.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 12H10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

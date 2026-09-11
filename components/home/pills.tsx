export function Pills({ items, limit = 3 }: { items: string[]; limit?: number }) {
  if (items.length === 0) return null;
  const visible = items.slice(0, limit);
  const extra = items.length - visible.length;
  return (
    <ul className="mt-1.5 flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <li
          key={item}
          className="rounded-full bg-indigo-soft px-2.5 py-0.5 text-[12px] font-medium text-indigo-dark"
        >
          {item}
        </li>
      ))}
      {extra > 0 ? (
        <li className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[12px] text-muted">+{extra}</li>
      ) : null}
    </ul>
  );
}

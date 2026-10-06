import Link from "next/link";

export interface Crumb { label: string; href?: string }

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ink-mute">
      <ol className="flex flex-wrap gap-x-2">
        {items.map((c, i) => (
          <li key={c.label} className="flex gap-x-2">
            {c.href ? <Link href={c.href} className="hover:text-navy-700 hover:underline">{c.label}</Link> : <span aria-current="page" className="text-ink-soft">{c.label}</span>}
            {i < items.length - 1 && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

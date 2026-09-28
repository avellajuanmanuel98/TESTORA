import { Fragment } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-fg-muted">
      {items.map((item, index) => (
        <Fragment key={index}>
          {index > 0 && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
          {item.to ? (
            <Link to={item.to} className="hover:text-fg-primary">
              {item.label}
            </Link>
          ) : (
            <span className="text-fg-primary">{item.label}</span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}

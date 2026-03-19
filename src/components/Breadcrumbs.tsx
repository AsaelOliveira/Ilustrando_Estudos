import { ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface Crumb {
  label: string;
  href?: string;
}

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const location = useLocation();
  const rootHref = location.pathname.startsWith("/app") ? "/app" : "/";

  return (
    <nav aria-label="Breadcrumb" className="sticky top-0 z-30 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-md">
      <ol className="container mx-auto flex items-center gap-1.5 text-sm font-body">
        <li>
          <Link to={rootHref} className="text-muted-foreground transition-colors hover:text-foreground">
            Inicio
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            {item.href ? (
              <Link to={item.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-foreground">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

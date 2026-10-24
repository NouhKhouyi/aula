"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Network, Settings } from "lucide-react";
import { ThemeToggle } from "./theme";

/** The mark: three facts, the top one resting on the two below it. */
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M7 18 L12 7 M17 18 L12 7" stroke="var(--faint)" strokeWidth="1.6" fill="none" />
      <rect x="2.5" y="16" width="9" height="5" rx="1.6" fill="var(--learner)" />
      <rect x="12.5" y="16" width="9" height="5" rx="1.6" fill="var(--learner)" />
      <rect x="7" y="3" width="10" height="6" rx="1.8" fill="var(--accent)" />
    </svg>
  );
}

const NAV = [
  { href: "/", label: "Sessions", Icon: BookOpen },
  { href: "/graph", label: "Knowledge", Icon: Network },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function AppHeader({ children }: { children?: React.ReactNode }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-serif text-xl font-semibold tracking-tight">
          <Mark />
          aula
        </Link>
        <div className="min-w-0 flex-1">{children}</div>
        <nav className="flex items-center gap-0.5 font-sans text-sm" aria-label="Main">
          {NAV.map((item) => {
            const active = item.href === "/" ? path === "/" : path.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={clsx(
                  "rounded-md p-2 sm:px-2.5 sm:py-1.5",
                  active ? "text-ink" : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                <item.Icon size={17} className="sm:hidden" aria-hidden />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

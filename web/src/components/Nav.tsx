"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/auth", label: "Auth" },
  { href: "/query-builder", label: "Query Builder" },
  { href: "/results", label: "Results" },
  { href: "/sessions", label: "Sessions" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4">
        <ul className="flex gap-4 py-3 text-sm">
          {links.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  className={
                    active
                      ? "font-medium text-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }
                  href={href}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}



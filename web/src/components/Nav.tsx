"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { UserDropdown } from "@/components/UserDropdown";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/query-builder", label: "Query Builder" },
  { href: "/results", label: "Results" },
  { href: "/sessions", label: "Sessions" },
  { href: "/reranking-demo", label: "Re-ranking Demo" },
  { href: "/two-stage-retrieval-demo", label: "Two-Stage Pipeline" },
  { href: "/metadata-dashboard", label: "Metadata Dashboard" },
];

const authLinks = [
  { href: "/login", label: "Login" },
  { href: "/signup", label: "Sign Up" },
];

export function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-between py-3">
          <ul className="flex gap-4 text-sm">
            {publicLinks.map(({ href, label }) => {
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
          
          <div className="flex items-center gap-4">
            {user ? (
              <UserDropdown />
            ) : (
              <ul className="flex gap-4 text-sm">
                {authLinks.map(({ href, label }) => {
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
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}



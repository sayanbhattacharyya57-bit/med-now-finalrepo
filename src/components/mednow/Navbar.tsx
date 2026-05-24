import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Heart, Menu, Moon, Sun, Globe, LogOut, LayoutDashboard, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n, LANG_LABELS, type Lang } from "@/lib/i18n";
import { useAuth, type Role } from "@/lib/auth";
import { useTheme } from "@/lib/theme";

function dashboardRoute(role: Role): string {
  if (role === "doctor") return "/dashboard/doctor";
  if (role === "hospital_admin") return "/dashboard/admin";
  return "/dashboard/patient";
}

export function Navbar({ onBook }: { onBook?: () => void }) {
  const [open, setOpen] = useState(false);
  const { lang, setLang, t } = useI18n();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const links = [
    { to: "/", label: t("nav.features") },
    { to: "/telemedicine", label: t("nav.telemedicine") },
    { to: "/pharmacy", label: t("nav.pharmacy") },
    { to: "/ambulance", label: t("nav.ambulance") },
  ] as const;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[image:var(--gradient-hero)] text-primary-foreground shadow-[var(--shadow-soft)]">
            <Heart className="h-5 w-5" fill="currentColor" />
          </div>
          <span className="text-lg font-bold tracking-tight">MedNow</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {l.label}
            </Link>
          ))}
          {user && (
            <Link
              to={dashboardRoute(user.role)}
              className="transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {t("nav.dashboard")}
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Change language">
                <Globe className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(LANG_LABELS) as Lang[]).map((l) => (
                <DropdownMenuItem key={l} onClick={() => setLang(l)}>
                  {LANG_LABELS[l]} {lang === l && "✓"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {user ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
                onClick={() => navigate({ to: dashboardRoute(user.role) })}
              >
                <LayoutDashboard className="mr-1.5 h-4 w-4" />
                {t("nav.dashboard")}
              </Button>
              <Button variant="ghost" size="icon" onClick={logout} aria-label={t("nav.logout")}>
                <LogOut className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden rounded-full sm:inline-flex"
                onClick={() => navigate({ to: "/login" })}
              >
                {t("nav.login")}
              </Button>
              {onBook ? (
                <Button onClick={onBook} className="hidden rounded-full px-5 sm:inline-flex">
                  {t("cta.book")}
                </Button>
              ) : (
                <Button
                  onClick={() => navigate({ to: "/register" })}
                  className="hidden rounded-full px-5 sm:inline-flex"
                >
                  {t("nav.signup")}
                </Button>
              )}
            </>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Menu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border/40 bg-background/95 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            {user ? (
              <>
                <Link
                  to={dashboardRoute(user.role)}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {t("nav.dashboard")}
                </Link>
                <button
                  onClick={() => { logout(); setOpen(false); }}
                  className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-destructive hover:bg-muted"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {t("nav.login")}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

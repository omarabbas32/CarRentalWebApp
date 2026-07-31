import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Phase 0 placeholder. Phase 3 replaces this with the real landing page.
 *
 * It exists to prove the token layer works: every colour here comes from a
 * CSS variable, so toggling the theme must restyle the whole page without a
 * single component branching on theme.
 */

const STATUSES = [
  { label: "Pending", fg: "text-status-pending", bg: "bg-status-pending-bg" },
  { label: "Confirmed", fg: "text-status-confirmed", bg: "bg-status-confirmed-bg" },
  { label: "In progress", fg: "text-status-inprogress", bg: "bg-status-inprogress-bg" },
  { label: "Completed", fg: "text-status-completed", bg: "bg-status-completed-bg" },
  { label: "Cancelled", fg: "text-status-cancelled", bg: "bg-status-cancelled-bg" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-12 lg:px-12">
      <header className="flex items-center justify-between">
        <span className="text-label uppercase text-muted-foreground">
          Phase 0 · scaffold
        </span>
        <ThemeToggle />
      </header>

      <div className="mt-10 space-y-3">
        <h1 className="text-display">CarRental</h1>
        <p className="measure text-muted-foreground">
          The design system is wired up. Routes, data and screens arrive in the
          phases that follow — see <code>phases/</code> at the repository root.
        </p>
      </div>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-h2">Type scale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-h1">H1 — Find a car</p>
            <p className="text-h2">H2 — Section heading</p>
            <p className="text-h3">H3 — Subsection</p>
            <p className="text-body">Body — running copy at 14/1.5.</p>
            <p className="text-caption text-muted-foreground">
              Caption — supporting detail.
            </p>
            <p className="text-label uppercase text-muted-foreground">
              Label — overline
            </p>
            <p className="tabular text-h2">1,284.50 · 17,930 km · 4 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-h2">Colour</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Primary action</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
            </div>

            <div className="space-y-2">
              <p className="text-label uppercase text-muted-foreground">
                Booking status
              </p>
              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <span
                    key={s.label}
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium ${s.bg} ${s.fg}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden />
                    {s.label}
                  </span>
                ))}
              </div>
              <p className="text-caption text-muted-foreground">
                Dot + label + background. Colour is never the only signal.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Badge>Badge</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

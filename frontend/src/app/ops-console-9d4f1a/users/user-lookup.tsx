"use client";

import { useState } from "react";
import { Info, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { deleteUser, getPendingVerifications, getUser } from "@/lib/api/users";
import { ApiError } from "@/lib/api/errors";
import { UserRole, userRoleLabel, userStatusLabel } from "@/lib/enums";
import { useAsync } from "@/lib/use-async";
import type { UserDto } from "@/types/api";

/**
 * **There is no list-users endpoint.** `GET /api/users/{id}` fetches one user
 * and `DELETE /api/users/{id}` removes one; nothing enumerates them.
 *
 * So this is a lookup, not a table. Faking a roster would mean inventing a
 * source of truth — the honest surface is a search box, plus the partial list
 * the review queue happens to expose, clearly labelled as partial.
 *
 * `GET /api/users` is on the backend fix list.
 */
export function UserLookup() {
  const { session } = useAuth();
  const [query, setQuery] = useState("");
  const [lookupId, setLookupId] = useState<string | null>(null);

  const isAdmin = session?.role === UserRole.Admin;

  return (
    <div className="space-y-8 p-4 lg:p-6">
      <header className="space-y-2">
        <h1 className="text-h1">Users</h1>
        <p className="max-w-prose text-muted-foreground">
          Look up an account by its ID.
        </p>
      </header>

      <Alert>
        <Info className="size-4" aria-hidden />
        <AlertDescription>
          The API has no endpoint that lists users, so there is no full directory here.
          You can look one up by ID, or pick from the accounts currently in the review
          queue.
        </AlertDescription>
      </Alert>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setLookupId(query.trim() || null);
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="font-mono"
          />
        </div>
        <Button type="submit">
          <Search className="size-4" aria-hidden />
          Look up
        </Button>
      </form>

      {lookupId && <UserCard userId={lookupId} canDelete={isAdmin} />}

      <Separator />

      <FromQueue onPick={(id) => { setQuery(id); setLookupId(id); }} />
    </div>
  );
}

function UserCard({ userId, canDelete }: { userId: string; canDelete: boolean }) {
  const state = useAsync(() => getUser(userId), [userId]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  if (state.status === "loading") return <Skeleton className="h-48 w-full" />;

  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error.message}</AlertDescription>
      </Alert>
    );
  }

  if (deleted) {
    return (
      <Alert>
        <AlertDescription>That account has been deleted.</AlertDescription>
      </Alert>
    );
  }

  const user: UserDto = state.data;

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteUser(user.id);
      toast.success("Account deleted");
      setDeleted(true);
      setConfirming(false);
    } catch (cause) {
      toast.error(
        cause instanceof ApiError ? cause.message : "We couldn't delete that account.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5 rounded-xl border p-5">
      <div className="space-y-1">
        <h2 className="text-h2">
          {user.firstName} {user.lastName}
        </h2>
        <p className="text-caption text-muted-foreground">{user.email}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Detail label="Role" value={userRoleLabel[user.role]} />
        <Detail label="Status" value={userStatusLabel[user.status]} />
        <Detail label="ID verified" value={user.identityVerified ? "Yes" : "No"} />
        <Detail label="Licence verified" value={user.driverLicenseVerified ? "Yes" : "No"} />
        <Detail label="Phone" value={user.phoneNumber || "—"} />
        <Detail label="Joined" value={new Date(user.createdAt).toLocaleDateString()} />
      </dl>

      {canDelete && (
        <>
          <Separator />
          {/* DeleteUserCommand is the one user route with real server-side
              authorization — [Authorize(Roles = "Admin")]. */}
          <Button variant="outline" onClick={() => setConfirming(true)}>
            <Trash2 className="size-4" aria-hidden />
            Delete account
          </Button>
        </>
      )}

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this account?</DialogTitle>
            <DialogDescription>
              {user.firstName} {user.lastName} ({user.email}) will be removed. This
              can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={deleting}>
              Keep it
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * The only enumeration available anywhere: whoever is currently in the review
 * queue. Explicitly labelled partial so it is never mistaken for a roster.
 */
function FromQueue({ onPick }: { onPick: (id: string) => void }) {
  const state = useAsync(() => getPendingVerifications(), []);

  if (state.status === "loading") return <Skeleton className="h-24 w-full" />;
  if (state.status === "error") return null;

  if (state.data.length === 0) {
    return (
      <p className="text-caption text-muted-foreground">
        Nobody is in the review queue right now.
      </p>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-h2">In the review queue</h2>
      <p className="text-caption text-muted-foreground">
        A partial list — only accounts with documents awaiting review.
      </p>
      <ul className="divide-y rounded-xl border">
        {state.data.map((row) => (
          <li key={row.userId} className="flex items-center gap-4 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-body">{row.fullName}</p>
              <p className="text-caption text-muted-foreground">{row.email}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onPick(row.userId)}>
              Open
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-label uppercase text-muted-foreground">{label}</dt>
      <dd className="text-body break-words">{value}</dd>
    </div>
  );
}

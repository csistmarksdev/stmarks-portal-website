"use client";

import { ROLE_PERMISSIONS } from "@portal/shared";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

/** Matches the API's own floor, so the form fails before the request does. */
const MIN_PASSWORD_LENGTH = 12;

export default function SettingsPage() {
  const { user, refreshUser, logout } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Housekeeping"
        title="Settings"
        description="Your account, and what it's allowed to do."
      />

      <ProfileCard
        name={user?.name ?? ""}
        email={user?.email ?? ""}
        onSaved={refreshUser}
      />

      <PasswordCard onChanged={logout} />

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
          <CardDescription>
            Your role decides what you can do. Only an administrator can change
            it, on the Users page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="flex items-center gap-2">
            <span className="text-muted-foreground">Role: </span>
            {user && <Badge>{user.role}</Badge>}
          </p>
          <p>
            <span className="text-muted-foreground">Last sign-in: </span>
            {formatDateTime(user?.lastLoginAt)}
          </p>
          <div className="flex flex-wrap gap-1 pt-1">
            {user &&
              ROLE_PERMISSIONS[user.role].map((permission) => (
                <Badge key={permission} variant="muted">
                  {permission}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ProfileCard({
  name,
  email,
  onSaved,
}: {
  name: string;
  email: string;
  onSaved: () => Promise<void>;
}) {
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  /*
   * The card renders before `/auth/me` resolves, so the field starts empty and
   * is seeded once the name arrives — without clobbering anything already
   * typed, which is why this is not a plain `setValue(name)`.
   */
  useEffect(() => {
    setValue((current) => (current === "" ? name : current));
  }, [name]);

  const trimmed = value.trim();
  const dirty = trimmed !== name;
  const tooShort = trimmed.length > 0 && trimmed.length < 2;

  async function save() {
    setSaving(true);
    try {
      await api.patch("/auth/me", { name: trimmed });
      await onSaved();
      toast.success("Name updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          How your name appears on activity and in the audit log.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={80}
            autoComplete="name"
          />
          {tooShort && (
            <p className="text-[13px] text-destructive">
              Use at least 2 characters.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="account-email">Email</Label>
          <Input id="account-email" value={email} disabled readOnly />
          <p className="text-[13px] text-muted-foreground">
            Your email is your sign-in, and can only be changed by an
            administrator.
          </p>
        </div>

        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={!dirty || tooShort || trimmed.length === 0 || saving}
          >
            {saving ? "Saving…" : "Save name"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function PasswordCard({ onChanged }: { onChanged: () => Promise<void> }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const tooShort = next.length > 0 && next.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== next;
  const unchanged = next.length > 0 && next === current;
  const ready =
    current.length > 0 &&
    next.length >= MIN_PASSWORD_LENGTH &&
    confirm === next &&
    !unchanged;

  async function submit() {
    setSaving(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword: current,
        newPassword: next,
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      /*
       * The change revokes every session on the server, this one included.
       * Signing out here rather than letting the next request fail turns a
       * confusing "session expired" into an expected return to sign-in.
       */
      toast.success("Password changed — please sign in again");
      await onChanged();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not change password",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Changing it signs you out of every device, including this one.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <PasswordInput
            id="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <PasswordInput
            id="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            autoComplete="new-password"
          />
          <p
            className={
              tooShort
                ? "text-[13px] text-destructive"
                : "text-[13px] text-muted-foreground"
            }
          >
            At least {MIN_PASSWORD_LENGTH} characters.
          </p>
          {unchanged && (
            <p className="text-[13px] text-destructive">
              That is your current password.
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordInput
            id="confirm-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            autoComplete="new-password"
          />
          {mismatch && (
            <p className="text-[13px] text-destructive">
              The two passwords do not match.
            </p>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={submit} disabled={!ready || saving}>
            {saving ? "Changing…" : "Change password"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

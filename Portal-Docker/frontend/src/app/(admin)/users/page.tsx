"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminUser, Paginated, UserRole } from "@portal/shared";
import { USER_ROLES } from "@portal/shared";
import { KeyRoundIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime } from "@/lib/utils";

interface UserDraft {
  id?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

const NEW_USER: UserDraft = {
  name: "",
  email: "",
  password: "",
  role: "editor",
  active: true,
};

export default function UsersPage() {
  const { can, user: me } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<UserDraft | null>(null);
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<Paginated<AdminUser>>("/admin/users", { pageSize: 50 }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["users"] });

  const saveUser = useMutation({
    mutationFn: async (user: UserDraft) => {
      if (user.id) {
        const { id, password, ...rest } = user;
        void password;
        return api.patch(`/admin/users/${id}`, rest);
      }
      return api.post("/admin/users", user);
    },
    onSuccess: () => {
      toast.success("User saved");
      setDraft(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resetPassword = useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      api.patch(`/admin/users/${id}/password`, { password }),
    onSuccess: () => {
      toast.success("Password reset — the user must sign in again");
      setPasswordFor(null);
      setNewPassword("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeUser = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      toast.success("User deleted");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const canWrite = can("users.write");

  return (
    <div>
      <PageHeader
        eyebrow="Access"
        title="Users"
        description="Who can sign in here, and as what. What each role may do is spelled out under Roles & permissions."
        actions={
          canWrite ? (
            <Button className="hidden lg:inline-flex" onClick={() => setDraft({ ...NEW_USER })}>
              <PlusIcon /> New user
            </Button>
          ) : undefined
        }
      />

      {canWrite && (
        <button
          type="button"
          aria-label="New user"
          onClick={() => setDraft({ ...NEW_USER })}
          className="bottom-dock fixed right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground [box-shadow:var(--shadow-float)] transition-transform active:scale-95 lg:hidden"
        >
          <PlusIcon className="size-6" />
        </button>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.items.map((user) => (
            <Card key={user.id} className="flex flex-col">
              <div className="flex-1 p-5">
                <div className="flex items-start gap-3">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white shadow-sm ${
                      user.active ? "bg-primary" : "bg-muted-foreground"
                    }`}
                  >
                    {user.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[15px] font-medium leading-snug">
                      <span className="truncate">{user.name}</span>
                      {user.id === me?.id && (
                        <Badge variant="secondary">you</Badge>
                      )}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-1.5">
                  <Badge>{user.role}</Badge>
                  <Badge variant={user.active ? "success" : "muted"}>
                    {user.active ? "active" : "disabled"}
                  </Badge>
                </div>
                <p className="mt-3 text-[12px] text-muted-foreground">
                  Last signed in {formatDateTime(user.lastLoginAt)}
                </p>
              </div>
              {canWrite && (
                <div className="flex items-center justify-between border-t border-border/70 px-3 py-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setDraft({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        password: "",
                        role: user.role,
                        active: user.active,
                      })
                    }
                  >
                    <PencilIcon /> Edit
                  </Button>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Reset password"
                      onClick={() => setPasswordFor(user)}
                    >
                      <KeyRoundIcon />
                    </Button>
                    {user.id !== me?.id && (
                      <ConfirmDialog
                        title={`Delete ${user.name}?`}
                        description="The account is removed permanently."
                        onConfirm={() => removeUser.mutateAsync(user.id)}
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            title="Delete"
                          >
                            <Trash2Icon />
                          </Button>
                        }
                      />
                    )}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Edit user" : "New user"}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={draft.email}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                />
              </div>
              {!draft.id && (
                <div className="space-y-1.5">
                  <Label>Password (min 8 characters)</Label>
                  <PasswordInput
                    autoComplete="new-password"
                    value={draft.password}
                    onChange={(event) => setDraft({ ...draft, password: event.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={draft.role}
                  onChange={(event) => setDraft({ ...draft, role: event.target.value as UserRole })}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <Label>Active</Label>
                <Switch
                  checked={draft.active}
                  onCheckedChange={(active) => setDraft({ ...draft, active })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              disabled={saveUser.isPending}
              onClick={() => draft && saveUser.mutate(draft)}
            >
              {saveUser.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset dialog */}
      <Dialog
        open={passwordFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordFor(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password for {passwordFor?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>New password (min 8 characters)</Label>
            <PasswordInput
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordFor(null)}>
              Cancel
            </Button>
            <Button
              disabled={resetPassword.isPending || newPassword.length < 8}
              onClick={() =>
                passwordFor &&
                resetPassword.mutate({ id: passwordFor.id, password: newPassword })
              }
            >
              {resetPassword.isPending ? "Saving…" : "Reset password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

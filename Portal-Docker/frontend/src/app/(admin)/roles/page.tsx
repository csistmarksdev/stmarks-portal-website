"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  PERMISSION_CATALOG,
  type Permission,
  type PermissionGroup,
  type RoleDefinition,
} from "@portal/shared";
import { CheckIcon, LockIcon, MinusIcon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const GROUPS: PermissionGroup[] = ["Content", "Media", "Inbox", "People", "Records"];

const LABEL: Record<Permission, string> = Object.fromEntries(
  PERMISSION_CATALOG.map((entry) => [entry.permission, entry.label]),
) as Record<Permission, string>;

interface RoleDraft {
  /** Set when editing an existing custom role. */
  key?: string;
  name: string;
  description: string;
  permissions: Permission[];
}

const EMPTY: RoleDraft = { name: "", description: "", permissions: ["content.read"] };

export default function RolesPage() {
  const { can, user: me } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<RoleDraft | null>(null);

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RoleDefinition[]>("/admin/roles"),
  });

  const mine = me?.permissions ?? [];
  const canManage = can("roles.write");
  /** You can only change a role that does nothing beyond your own access. */
  const withinMine = (permissions: readonly Permission[]) =>
    permissions.every((permission) => mine.includes(permission));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["roles"] });

  const save = useMutation({
    mutationFn: (role: RoleDraft) => {
      const body = {
        name: role.name.trim(),
        description: role.description.trim(),
        permissions: role.permissions,
      };
      return role.key
        ? api.patch<RoleDefinition>(`/admin/roles/${role.key}`, body)
        : api.post<RoleDefinition>("/admin/roles", body);
    },
    onSuccess: (_, role) => {
      toast.success(role.key ? "Role updated. It applies straight away" : "Role created");
      setDraft(null);
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (key: string) => api.delete(`/admin/roles/${key}`),
    onSuccess: () => {
      toast.success("Role deleted");
      void invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const builtIn = roles?.filter((role) => role.builtIn) ?? [];
  const custom = roles?.filter((role) => !role.builtIn) ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Access"
        title="Roles & permissions"
        description="Four built-in roles, plus any custom roles you define for a specific job. The server checks these on every request, and changes to a role apply to everyone holding it at once."
        actions={
          canManage ? (
            <Button onClick={() => setDraft({ ...EMPTY })}>
              <PlusIcon /> New role
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-44 rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          {/* ---------------------------------------------------- Custom */}
          <section className="space-y-3">
            <h2 className="label text-muted-foreground">Custom roles</h2>
            {custom.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border-strong px-6 py-8 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">No custom roles yet.</span>{" "}
                {canManage
                  ? "Create one when someone needs access that none of the built-in roles fits, say a youth leader who posts events and photos but nothing else."
                  : "An admin can create one when someone needs access the built-in roles do not fit."}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {custom.map((role) => (
                  <RoleCard
                    key={role.key}
                    role={role}
                    actions={
                      canManage && withinMine(role.permissions) ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setDraft({
                                key: role.key,
                                name: role.name,
                                description: role.description ?? "",
                                permissions: role.permissions,
                              })
                            }
                          >
                            <PencilIcon /> Edit
                          </Button>
                          <ConfirmDialog
                            title={`Delete "${role.name}"?`}
                            description={
                              role.userCount > 0
                                ? `${role.userCount} user${role.userCount === 1 ? " holds" : "s hold"} this role. Move them to another role on the Users page first.`
                                : "Nobody holds this role. It is removed permanently."
                            }
                            onConfirm={() => remove.mutateAsync(role.key)}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                title="Delete role"
                              >
                                <Trash2Icon />
                              </Button>
                            }
                          />
                        </>
                      ) : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {/* -------------------------------------------------- Built-in */}
          <section className="space-y-3">
            <h2 className="label text-muted-foreground">Built-in roles</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {builtIn.map((role) => (
                <RoleCard
                  key={role.key}
                  role={role}
                  actions={
                    canManage && withinMine(role.permissions) ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Start a custom role from this one"
                        onClick={() =>
                          setDraft({
                            name: "",
                            description: "",
                            permissions: role.permissions,
                          })
                        }
                      >
                        <PlusIcon /> Copy as custom
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------- Matrix */}
          <section className="space-y-3">
            <h2 className="label text-muted-foreground">Side by side</h2>
            <div className="overflow-x-auto rounded-3xl ring-1 ring-border/70">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-56">Permission</TableHead>
                    {roles?.map((role) => (
                      <TableHead key={role.key} className="whitespace-nowrap text-center">
                        <Badge variant={role.builtIn ? "secondary" : "default"}>{role.name}</Badge>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_CATALOG.map(({ permission, label, description }) => (
                    <TableRow key={permission}>
                      <TableCell>
                        <p className="font-medium">{label}</p>
                        <p className="text-xs text-muted-foreground">{description}</p>
                      </TableCell>
                      {roles?.map((role) => (
                        <TableCell key={role.key} className="text-center">
                          {role.permissions.includes(permission) ? (
                            <CheckIcon className="mx-auto size-4 text-success" />
                          ) : (
                            <MinusIcon className="mx-auto size-4 text-muted-foreground/40" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </>
      )}

      <RoleDialog
        draft={draft}
        onChange={setDraft}
        onClose={() => setDraft(null)}
        onSave={(role) => save.mutate(role)}
        saving={save.isPending}
        mine={mine}
        templates={builtIn.filter((role) => withinMine(role.permissions))}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function RoleCard({ role, actions }: { role: RoleDefinition; actions?: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="flex-1 space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-medium leading-snug">
              <span className="truncate">{role.name}</span>
              {role.builtIn && (
                <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label="Built-in" />
              )}
            </p>
            {role.description && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">{role.description}</p>
            )}
          </div>
          <span
            className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"
            title="Accounts holding this role"
          >
            <UsersIcon className="size-3.5" /> {role.userCount}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {role.permissions.length === 0 ? (
            <span className="text-xs text-muted-foreground">No access</span>
          ) : (
            role.permissions.map((permission) => (
              <Badge key={permission} variant="muted">
                {LABEL[permission] ?? permission}
              </Badge>
            ))
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center justify-between border-t border-border/70 px-3 py-2">
          {actions}
        </div>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function RoleDialog({
  draft,
  onChange,
  onClose,
  onSave,
  saving,
  mine,
  templates,
}: {
  draft: RoleDraft | null;
  onChange: (draft: RoleDraft) => void;
  onClose: () => void;
  onSave: (draft: RoleDraft) => void;
  saving: boolean;
  mine: readonly Permission[];
  templates: RoleDefinition[];
}) {
  const toggle = (permission: Permission, on: boolean) => {
    if (!draft) return;
    const next = new Set(draft.permissions);
    if (on) next.add(permission);
    else next.delete(permission);
    onChange({ ...draft, permissions: [...next] });
  };

  const valid = !!draft && draft.name.trim().length >= 2;

  return (
    <Dialog open={draft !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{draft?.key ? "Edit role" : "New role"}</DialogTitle>
        </DialogHeader>
        {draft && (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  autoFocus
                  placeholder="e.g. Youth leader"
                  maxLength={60}
                  value={draft.name}
                  onChange={(event) => onChange({ ...draft, name: event.target.value })}
                />
              </div>
              {!draft.key && templates.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Start from</Label>
                  <Select
                    defaultValue=""
                    onChange={(event) => {
                      const template = templates.find((role) => role.key === event.target.value);
                      if (template) onChange({ ...draft, permissions: [...template.permissions] });
                    }}
                  >
                    <option value="" disabled>
                      Copy a built-in role…
                    </option>
                    {templates.map((role) => (
                      <option key={role.key} value={role.key}>
                        {role.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>What is it for? (optional)</Label>
              <Textarea
                rows={2}
                maxLength={300}
                placeholder="e.g. Posts youth fellowship events and their photos."
                value={draft.description}
                onChange={(event) => onChange({ ...draft, description: event.target.value })}
              />
            </div>

            <div className="space-y-4">
              {GROUPS.map((group) => (
                <fieldset key={group} className="space-y-1.5">
                  <legend className="label pb-1 text-muted-foreground">{group}</legend>
                  {PERMISSION_CATALOG.filter((entry) => entry.group === group).map(
                    ({ permission, label, description }) => {
                      const held = mine.includes(permission);
                      const checked = draft.permissions.includes(permission);
                      return (
                        <label
                          key={permission}
                          className={cn(
                            "flex items-start gap-3 rounded-2xl px-3 py-2.5 ring-1 ring-border/70 transition-colors",
                            held ? "cursor-pointer hover:bg-muted/60" : "cursor-not-allowed opacity-55",
                            checked && "bg-secondary/60 ring-border",
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
                            checked={checked}
                            disabled={!held}
                            onChange={(event) => toggle(permission, event.target.checked)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{label}</span>
                            <span className="block text-xs text-muted-foreground">
                              {held
                                ? description
                                : "You do not have this yourself, so you cannot give it to a role."}
                            </span>
                          </span>
                        </label>
                      );
                    },
                  )}
                </fieldset>
              ))}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={() => draft && onSave(draft)}>
            {saving ? "Saving…" : draft?.key ? "Save role" : "Create role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

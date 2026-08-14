"use client";

import { ROLE_PERMISSIONS, USER_ROLES, type Permission } from "@portal/shared";
import { CheckIcon, MinusIcon } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL_PERMISSIONS: Array<{ permission: Permission; label: string }> = [
  { permission: "content.read", label: "Read content" },
  { permission: "content.write", label: "Create & edit content" },
  { permission: "content.publish", label: "Publish / archive / pin" },
  { permission: "content.delete", label: "Delete content" },
  { permission: "media.read", label: "Browse media" },
  { permission: "media.write", label: "Upload media" },
  { permission: "media.delete", label: "Delete media" },
  { permission: "contact.read", label: "Read contact inbox" },
  { permission: "users.read", label: "View users" },
  { permission: "users.write", label: "Manage users" },
  { permission: "audit.read", label: "View audit logs" },
  { permission: "audit.delete", label: "Clear audit history" },
  { permission: "settings.write", label: "Change settings" },
  { permission: "backup.read", label: "Download a backup" },
  { permission: "backup.restore", label: "Restore from a backup" },
];

export default function RolesPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Access"
        title="Roles & permissions"
        description="Four roles, from read-only to full control. The server enforces this table on every request — assigning a role on the Users page is all it takes."
      />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Permission</TableHead>
            {USER_ROLES.map((role) => (
              <TableHead key={role} className="text-center">
                <Badge variant="secondary">{role}</Badge>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ALL_PERMISSIONS.map(({ permission, label }) => (
            <TableRow key={permission}>
              <TableCell>
                <p className="font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{permission}</p>
              </TableCell>
              {USER_ROLES.map((role) => (
                <TableCell key={role} className="text-center">
                  {ROLE_PERMISSIONS[role].includes(permission) ? (
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
  );
}

/**
 * Portal-only types — admin CMS, auth, RBAC, audit, media library.
 * The public Website never sees these shapes.
 */

import type { DownloadCategory, DownloadFile } from "./content";
import type { LocalizedText } from "./common";

/* -------------------------------------------------------------------------- */
/* Publish workflow                                                           */
/* -------------------------------------------------------------------------- */

/**
 * `pending` = submitted for approval. Editors can only save drafts and submit;
 * an admin or super admin approves (publishes). See
 * `backend/src/common/utils/approval.ts`. Only `published` is ever public.
 */
export type PublishStatus = "draft" | "pending" | "published" | "archived";

export const PUBLISH_STATUSES: readonly PublishStatus[] = [
  "draft",
  "pending",
  "published",
  "archived",
] as const;

/** Admin list/detail responses add workflow fields on top of the public shape. */
export type WithStatus<T> = T & { status: PublishStatus };

/**
 * Scheduling, on top of `status` (F-049).
 *
 * A published record is public only while `publishAt <= now` (or unset) and,
 * where expiry applies, `now < expiresAt` (or unset). Both are ISO datetimes.
 * Records written before these fields existed have neither, which means
 * "no schedule, no expiry" — exactly how they behaved before.
 *
 * Admin-only: public responses never carry these keys.
 */
export interface PublishSchedule {
  /** Not public before this instant. */
  publishAt?: string;
  /** Not public from this instant on (announcements only). */
  expiresAt?: string;
}

/** Admin shape for content that has the publish schedule. */
export type WithSchedule<T> = WithStatus<T> & PublishSchedule;

/**
 * Fields stripped from every public response of a content record. `revision`
 * is a change waiting for approval — the website must never see it.
 */
export const ADMIN_ONLY_FIELDS: readonly string[] = [
  "status",
  "publishAt",
  "expiresAt",
  "revision",
  "submittedBy",
];

/**
 * A change to a live (published or archived) record, made by someone who
 * cannot publish. The record itself — what the website shows — is untouched
 * until an admin approves it; there is at most one per record, and a newer
 * submission replaces it.
 */
export interface ContentRevision<T = Record<string, unknown>> {
  /** The submitted fields, as sent by the editor's form. */
  changes: Partial<T>;
  submittedBy: { userId: string; name: string };
  submittedAt: string;
}

/* -------------------------------------------------------------------------- */
/* RBAC                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The four roles that ship with the Portal. Their permissions are fixed in code
 * and cannot be edited. Administrators add *custom* roles alongside them (see
 * `RoleDefinition`), so a user's `role` is any role key, not just these.
 */
export type UserRole = "super-admin" | "admin" | "editor" | "viewer";

export const USER_ROLES: readonly UserRole[] = [
  "super-admin",
  "admin",
  "editor",
  "viewer",
] as const;

/** Alias that reads better where custom roles are meant too. */
export type BuiltInRole = UserRole;
export const BUILT_IN_ROLES = USER_ROLES;

/** A role key: one of `USER_ROLES`, or a custom role's slug. */
export type RoleKey = string;

export function isBuiltInRole(role: string): role is BuiltInRole {
  return (USER_ROLES as readonly string[]).includes(role);
}

export type Permission =
  | "content.read"
  | "content.write"
  | "content.publish"
  | "content.delete"
  | "media.read"
  | "media.write"
  | "media.delete"
  | "users.read"
  | "users.write"
  /** Creating, editing and deleting custom roles. */
  | "roles.write"
  | "audit.read"
  /** Purging audit history. Super-admin only — it removes the record of who did what. */
  | "audit.delete"
  | "contact.read"
  /**
   * Downloading a full backup. Super-admin only — every collection is in the
   * archive, so it carries password hashes and the contact inbox. Holding this
   * is read access to the entire installation in one portable file, which is a
   * larger thing than any of the permissions above it.
   */
  | "backup.read"
  /**
   * Uploading a backup to restore. Super-admin only — a restore rewrites the
   * user table, and whoever can do it can hand themselves any account in the
   * archive.
   */
  | "backup.restore"
  /**
   * Taking the public website into maintenance mode and back. Super-admin only
   * (church request, 23 Nov 2026) — it takes the whole site offline.
   */
  | "site.maintenance";

export type PermissionGroup = "Content" | "Media" | "Inbox" | "People" | "Records" | "Website";

/**
 * Every permission, in display order, with the words the CMS uses for it.
 * Single source for the role editor, the Roles page and server validation.
 */
export const PERMISSION_CATALOG: ReadonlyArray<{
  permission: Permission;
  group: PermissionGroup;
  label: string;
  description: string;
}> = [
  { permission: "content.read", group: "Content", label: "View content", description: "See events, posts, albums, notices and downloads in the CMS." },
  { permission: "content.write", group: "Content", label: "Create & edit drafts", description: "Write new items and edit drafts; they wait for approval." },
  { permission: "content.publish", group: "Content", label: "Publish & approve", description: "Put content live, approve submissions, archive and pin." },
  { permission: "content.delete", group: "Content", label: "Delete content", description: "Remove items permanently." },
  { permission: "media.read", group: "Media", label: "Choose media", description: "Pick existing images and files when editing content." },
  { permission: "media.write", group: "Media", label: "Upload media", description: "Upload new images, videos and files." },
  { permission: "media.delete", group: "Media", label: "Manage media library", description: "Open the Media library and delete files." },
  { permission: "contact.read", group: "Inbox", label: "Read contact inbox", description: "Read messages sent through the website's contact form." },
  { permission: "users.read", group: "People", label: "View users", description: "See who has an account and what role they hold." },
  { permission: "users.write", group: "People", label: "Manage users", description: "Create accounts, change roles, reset passwords, delete users." },
  { permission: "roles.write", group: "People", label: "Manage roles", description: "Create, edit and delete custom roles." },
  { permission: "audit.read", group: "Records", label: "View audit log", description: "See the history of who changed what." },
  { permission: "audit.delete", group: "Records", label: "Clear audit history", description: "Purge old audit entries." },
  { permission: "backup.read", group: "Records", label: "Download backups", description: "Download a full copy of the Portal, including accounts." },
  { permission: "backup.restore", group: "Records", label: "Restore backups", description: "Replace everything with the contents of a backup." },
  { permission: "site.maintenance", group: "Website", label: "Switch maintenance mode", description: "Take the public website offline behind a maintenance notice, and bring it back." },
];

export const ALL_PERMISSIONS: readonly Permission[] = PERMISSION_CATALOG.map(
  (entry) => entry.permission,
);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/** Built-in role → permission matrix. Custom roles live in the database. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  "super-admin": [...ALL_PERMISSIONS],
  admin: [
    "content.read",
    "content.write",
    "content.publish",
    "content.delete",
    "media.read",
    "media.write",
    "media.delete",
    "users.read",
    "roles.write",
    "audit.read",
    "contact.read",
  ],
  // No "content.publish": an editor's work goes live only when an admin or
  // super admin approves it (church request, 22 Nov 2026). No inbox, media
  // library, users or audit log either — the System pages are admin-only
  // (church request, 23 Nov 2026). Uploading from inside a form still works.
  editor: ["content.read", "content.write", "media.read", "media.write"],
  viewer: ["content.read", "media.read"],
};

export const BUILT_IN_ROLE_NAMES: Record<UserRole, string> = {
  "super-admin": "Super admin",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const BUILT_IN_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  "super-admin": "Everything, including users, backups and restore.",
  admin: "Runs the site day to day: publishes, approves, manages media and roles.",
  editor: "Writes and edits drafts that an admin approves.",
  viewer: "Can look but not change anything.",
};

/** Permission check for a built-in role. For any role, use a user's `permissions`. */
export function roleHasPermission(
  role: string,
  permission: Permission,
): boolean {
  return isBuiltInRole(role) && ROLE_PERMISSIONS[role].includes(permission);
}

/** A role as the API describes it — built-in or custom. */
export interface RoleDefinition {
  key: RoleKey;
  name: string;
  description?: string;
  permissions: Permission[];
  builtIn: boolean;
  /** Accounts currently holding the role. */
  userCount: number;
}

export interface RoleInput {
  name: string;
  description?: string;
  permissions: Permission[];
}

/* -------------------------------------------------------------------------- */
/* Users & auth                                                               */
/* -------------------------------------------------------------------------- */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  /** Role key — built-in or custom. */
  role: RoleKey;
  /** Display name of the role. */
  roleName: string;
  /** What the role allows, resolved by the server. */
  permissions: Permission[];
  active: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: AdminUser;
}

/* -------------------------------------------------------------------------- */
/* Audit log                                                                  */
/* -------------------------------------------------------------------------- */

export type AuditAction =
  | "login"
  | "logout"
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "unpublish"
  | "archive"
  | "pin"
  | "upload";

export interface AuditLogEntry {
  id: string;
  action: AuditAction;
  /** Resource collection, e.g. "events", "media", "auth". */
  resource: string;
  /** Id of the affected record, when applicable. */
  resourceId?: string;
  /** Human-readable summary, e.g. `Published event "Christmas Carol Service"`. */
  summary: string;
  userId?: string;
  userName?: string;
  ip?: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Media library                                                              */
/* -------------------------------------------------------------------------- */

export type MediaKind = "image" | "video" | "pdf" | "document";

export const MEDIA_KINDS: readonly MediaKind[] = [
  "image",
  "video",
  "pdf",
  "document",
] as const;

export interface MediaItem {
  id: string;
  kind: MediaKind;
  /** Public absolute URL of the file. */
  url: string;
  /** Thumbnail URL (images only). */
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  /** Uppercase extension, e.g. "PDF", "JPG". */
  format: string;
  /** Bytes. */
  sizeBytes: number;
  /** Human-readable, e.g. "1.2 MB". */
  size: string;
  /** Intrinsic pixel size (images only). */
  width?: number;
  height?: number;
  /** Tiny base64 preview (images only). */
  blurDataURL?: string;
  alt?: LocalizedText;
  createdAt: string;
  updatedAt: string;
}

/* -------------------------------------------------------------------------- */
/* Contact inbox                                                              */
/* -------------------------------------------------------------------------- */

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Backup & restore                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Bumped whenever the archive layout changes in a way an older Portal could
 * not read. The restore refuses anything it does not recognise rather than
 * half-importing it.
 */
export const BACKUP_FORMAT = "csistmc-portal-backup";
export const BACKUP_FORMAT_VERSION = 1;

/** `manifest.json` at the root of every backup archive. */
export interface BackupManifest {
  format: typeof BACKUP_FORMAT;
  formatVersion: number;
  capturedAt: string;
  /** Origin the archive was taken from, for the operator's benefit only. */
  publicUrl: string;
  database: string;
  createdBy?: { id: string; name: string; email: string };
  /** Collection name → document count. Empty collections are listed too. */
  collections: Record<string, number>;
  documents: number;
  uploads: { files: number; bytes: number };
}

/** What a backup taken right now would contain — shown before one is built. */
export interface BackupPreview {
  collections: Record<string, number>;
  documents: number;
  uploads: { files: number; bytes: number };
  /** Humanised lower bound on the archive size, e.g. "84.2 MB". */
  estimatedSize: string;
}

/** What `POST /admin/backup` hands back — the archive waits on the server. */
export interface BackupTicket {
  id: string;
  filename: string;
  sizeBytes: number;
  /** Human-readable, e.g. "84.2 MB". */
  size: string;
  /** Relative API path, already carrying its one-time token. */
  downloadPath: string;
  expiresAt: string;
  manifest: BackupManifest;
}

/**
 * `replace` empties every collection the archive contains before inserting, so
 * the database ends up exactly as it was when the backup was taken — records
 * created since are gone. `merge` upserts by `_id` and deletes nothing.
 */
export type RestoreMode = "replace" | "merge";

export const RESTORE_MODES: readonly RestoreMode[] = ["replace", "merge"] as const;

/**
 * An uploaded archive, inspected and held but not yet applied.
 *
 * Restoring is destructive and cannot be undone, so the upload and the decision
 * to apply it are two separate requests: the CMS shows what is actually in the
 * file — when it was taken, from where, how much of it there is — and only then
 * offers the button. Uploading the file twice to achieve that would be cruel on
 * a church's connection.
 */
export interface StagedRestore {
  id: string;
  expiresAt: string;
  manifest: BackupManifest;
  /** Bytes the archive expands to on disk. */
  uploadBytes: number;
  /** Collections in this installation the archive says nothing about. */
  untouchedCollections: string[];
  /** Anything worth reading before pressing the button. */
  warnings: string[];
}

export interface RestoreResult {
  mode: RestoreMode;
  manifest: BackupManifest;
  collections: Array<{
    name: string;
    inserted: number;
    /** Documents overwritten in place (merge only). */
    updated: number;
    /** Documents removed before inserting (replace only). */
    removed: number;
  }>;
  documents: number;
  uploads: { written: number; skipped: number };
  /** True when the restore rewrote `users`, so the caller's session may be gone. */
  usersReplaced: boolean;
  /** The pre-restore backup taken automatically, when one was asked for. */
  safetyBackup?: BackupTicket;
}

/* -------------------------------------------------------------------------- */
/* Misc API shapes                                                            */
/* -------------------------------------------------------------------------- */

export type DownloadsGrouped = Record<DownloadCategory, DownloadFile[]>;

export interface DashboardStats {
  events: { total: number; published: number; upcoming: number };
  blog: { total: number; published: number };
  gallery: { albums: number; photos: number };
  announcements: { total: number; pinned: number };
  downloads: { total: number };
  fellowships: { total: number };
  media: { total: number };
  users: { total: number };
  contact: { total: number; unread: number };
  /**
   * Waiting for an approver, per content type: new items submitted for
   * approval plus changes to live items (revisions).
   */
  approvals: Record<ApprovalType, { submissions: number; changes: number }>;
}

export type ApprovalType =
  | "events"
  | "blog"
  | "gallery"
  | "announcements"
  | "downloads"
  | "fellowships";

/* -------------------------------------------------------------------------- */
/* Notifications                                                              */
/* -------------------------------------------------------------------------- */

/** Approval events worth telling someone about. */
export type NotificationKind =
  | "submitted" // a new item was submitted for approval (→ approvers)
  | "changes-submitted" // changes to a live item were submitted (→ approvers)
  | "approved" // your submission was approved and published (→ writer)
  | "rejected"; // your submission was rejected (→ writer)

/** Notifications are deleted automatically this many days after they are sent. */
export const NOTIFICATION_RETENTION_DAYS = 60;

export interface PortalNotification {
  id: string;
  kind: NotificationKind;
  /** One readable line, e.g. `Priya Samuel submitted the event "Carol Service"`. */
  title: string;
  /** Where in the CMS to go, e.g. `/events/123`. */
  link: string;
  /** Who caused it. */
  actor: { userId: string; name: string };
  read: boolean;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Site status — maintenance mode                                             */
/* -------------------------------------------------------------------------- */

/**
 * Whether the public website should show its maintenance notice instead of
 * its pages. Served publicly at `GET /site/status` for the Website to read.
 *
 * Kept here rather than in `content.ts` until the Website implements it: the
 * contract-parity check compares `content.ts` with the Website's own types,
 * and this shape does not exist there yet. Move it across when it does.
 */
export interface SiteMaintenance {
  enabled: boolean;
  /** Shown to visitors, in both languages. */
  message: LocalizedText;
  /** When the site is expected back, if known. Shown to visitors. */
  until?: string;
}

export interface SiteStatus {
  maintenance: SiteMaintenance;
}

/** The admin view adds who changed it and when. */
export interface SiteMaintenanceAdmin extends SiteMaintenance {
  updatedAt?: string;
  updatedBy?: { userId: string; name: string };
}

export const DEFAULT_MAINTENANCE_MESSAGE: LocalizedText = {
  en: "The website is being updated and will be back shortly. Thank you for your patience.",
  ta: "இணையதளம் புதுப்பிக்கப்படுகிறது, விரைவில் மீண்டும் கிடைக்கும். உங்கள் பொறுமைக்கு நன்றி.",
};

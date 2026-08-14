/**
 * Portal-only types — admin CMS, auth, RBAC, audit, media library.
 * The public Website never sees these shapes.
 */

import type { DownloadCategory, DownloadFile } from "./content";
import type { LocalizedText } from "./common";

/* -------------------------------------------------------------------------- */
/* Publish workflow                                                           */
/* -------------------------------------------------------------------------- */

export type PublishStatus = "draft" | "published" | "archived";

export const PUBLISH_STATUSES: readonly PublishStatus[] = [
  "draft",
  "published",
  "archived",
] as const;

/** Admin list/detail responses add workflow fields on top of the public shape. */
export type WithStatus<T> = T & { status: PublishStatus };

/* -------------------------------------------------------------------------- */
/* RBAC                                                                       */
/* -------------------------------------------------------------------------- */

export type UserRole = "super-admin" | "admin" | "editor" | "viewer";

export const USER_ROLES: readonly UserRole[] = [
  "super-admin",
  "admin",
  "editor",
  "viewer",
] as const;

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
  | "audit.read"
  /** Purging audit history. Super-admin only — it removes the record of who did what. */
  | "audit.delete"
  | "settings.write"
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
  | "backup.restore";

/** Static role → permission matrix. Single source for backend guard + frontend UI. */
export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  "super-admin": [
    "content.read",
    "content.write",
    "content.publish",
    "content.delete",
    "media.read",
    "media.write",
    "media.delete",
    "users.read",
    "users.write",
    "audit.read",
    "audit.delete",
    "settings.write",
    "contact.read",
    "backup.read",
    "backup.restore",
  ],
  admin: [
    "content.read",
    "content.write",
    "content.publish",
    "content.delete",
    "media.read",
    "media.write",
    "media.delete",
    "users.read",
    "audit.read",
    "settings.write",
    "contact.read",
  ],
  editor: [
    "content.read",
    "content.write",
    "content.publish",
    "media.read",
    "media.write",
    "contact.read",
  ],
  viewer: ["content.read", "media.read", "audit.read", "contact.read"],
};

export function roleHasPermission(
  role: UserRole,
  permission: Permission,
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/* -------------------------------------------------------------------------- */
/* Users & auth                                                               */
/* -------------------------------------------------------------------------- */

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
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
}

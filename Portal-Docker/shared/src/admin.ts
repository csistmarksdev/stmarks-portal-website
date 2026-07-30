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
  | "contact.read";

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

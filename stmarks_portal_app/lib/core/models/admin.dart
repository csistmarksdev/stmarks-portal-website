/// Portal-only models — mirrors `Portal-Docker/shared/src/admin.ts`.
library;

import 'common.dart';

const List<String> kUserRoles = ['super-admin', 'admin', 'editor', 'viewer'];

const Map<String, List<String>> kRolePermissions = {
  'super-admin': [
    'content.read',
    'content.write',
    'content.publish',
    'content.delete',
    'media.read',
    'media.write',
    'media.delete',
    'users.read',
    'users.write',
    'audit.read',
    'audit.delete',
    'settings.write',
    'contact.read',
    'backup.read',
    'backup.restore',
  ],
  'admin': [
    'content.read',
    'content.write',
    'content.publish',
    'content.delete',
    'media.read',
    'media.write',
    'media.delete',
    'users.read',
    'audit.read',
    'settings.write',
    'contact.read',
  ],
  'editor': ['content.read', 'content.write', 'content.publish', 'media.read', 'media.write', 'contact.read'],
  'viewer': ['content.read', 'media.read', 'audit.read', 'contact.read'],
};

bool roleHasPermission(String? role, String permission) {
  if (role == null) return false;
  return kRolePermissions[role]?.contains(permission) ?? false;
}

class AdminUser {
  const AdminUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.active,
    this.lastLoginAt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String email;
  final String role;
  final bool active;
  final String? lastLoginAt;
  final String createdAt;
  final String updatedAt;

  factory AdminUser.fromJson(Map<String, dynamic> json) => AdminUser(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    role: json['role'] as String? ?? 'viewer',
    active: json['active'] as bool? ?? true,
    lastLoginAt: json['lastLoginAt'] as String?,
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
  );
}

class AuditLogEntry {
  const AuditLogEntry({
    required this.id,
    required this.action,
    required this.resource,
    this.resourceId,
    required this.summary,
    this.userId,
    this.userName,
    this.ip,
    required this.createdAt,
  });

  final String id;
  final String action;
  final String resource;
  final String? resourceId;
  final String summary;
  final String? userId;
  final String? userName;
  final String? ip;
  final String createdAt;

  factory AuditLogEntry.fromJson(Map<String, dynamic> json) => AuditLogEntry(
    id: json['id'] as String? ?? '',
    action: json['action'] as String? ?? '',
    resource: json['resource'] as String? ?? '',
    resourceId: json['resourceId'] as String?,
    summary: json['summary'] as String? ?? '',
    userId: json['userId'] as String?,
    userName: json['userName'] as String?,
    ip: json['ip'] as String?,
    createdAt: json['createdAt'] as String? ?? '',
  );
}

const List<String> kMediaKinds = ['image', 'video', 'pdf', 'document'];

class MediaItem {
  const MediaItem({
    required this.id,
    required this.kind,
    required this.url,
    this.thumbnailUrl,
    required this.filename,
    required this.mimeType,
    required this.format,
    required this.sizeBytes,
    required this.size,
    this.width,
    this.height,
    this.blurDataURL,
    this.alt,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String kind;
  final String url;
  final String? thumbnailUrl;
  final String filename;
  final String mimeType;
  final String format;
  final int sizeBytes;
  final String size;
  final int? width;
  final int? height;
  final String? blurDataURL;
  final LocalizedText? alt;
  final String createdAt;
  final String updatedAt;

  factory MediaItem.fromJson(Map<String, dynamic> json) => MediaItem(
    id: json['id'] as String? ?? '',
    kind: json['kind'] as String? ?? 'document',
    url: json['url'] as String? ?? '',
    thumbnailUrl: json['thumbnailUrl'] as String?,
    filename: json['filename'] as String? ?? '',
    mimeType: json['mimeType'] as String? ?? '',
    format: json['format'] as String? ?? '',
    sizeBytes: (json['sizeBytes'] as num?)?.toInt() ?? 0,
    size: json['size'] as String? ?? '',
    width: (json['width'] as num?)?.toInt(),
    height: (json['height'] as num?)?.toInt(),
    blurDataURL: json['blurDataURL'] as String?,
    alt: json['alt'] != null ? LocalizedText.fromJson(json['alt'] as Map<String, dynamic>?) : null,
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
  );
}

class ContactMessage {
  const ContactMessage({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    required this.subject,
    required this.message,
    required this.read,
    required this.createdAt,
  });

  final String id;
  final String name;
  final String email;
  final String? phone;
  final String subject;
  final String message;
  final bool read;
  final String createdAt;

  factory ContactMessage.fromJson(Map<String, dynamic> json) => ContactMessage(
    id: json['id'] as String? ?? '',
    name: json['name'] as String? ?? '',
    email: json['email'] as String? ?? '',
    phone: json['phone'] as String?,
    subject: json['subject'] as String? ?? '',
    message: json['message'] as String? ?? '',
    read: json['read'] as bool? ?? false,
    createdAt: json['createdAt'] as String? ?? '',
  );
}

class DashboardCount {
  const DashboardCount(this.data);
  final Map<String, dynamic> data;
  int get(String key) => (data[key] as num?)?.toInt() ?? 0;
}

class DashboardStats {
  const DashboardStats(this.raw);
  final Map<String, dynamic> raw;

  factory DashboardStats.fromJson(Map<String, dynamic> json) => DashboardStats(json);

  DashboardCount _section(String key) => DashboardCount((raw[key] as Map<String, dynamic>?) ?? {});

  DashboardCount get events => _section('events');
  DashboardCount get blog => _section('blog');
  DashboardCount get gallery => _section('gallery');
  DashboardCount get announcements => _section('announcements');
  DashboardCount get downloads => _section('downloads');
  DashboardCount get fellowships => _section('fellowships');
  DashboardCount get media => _section('media');
  DashboardCount get users => _section('users');
  DashboardCount get contact => _section('contact');
}

class BackupManifest {
  const BackupManifest(this.raw);
  final Map<String, dynamic> raw;

  factory BackupManifest.fromJson(Map<String, dynamic> json) => BackupManifest(json);

  String get capturedAt => raw['capturedAt'] as String? ?? '';
  String get publicUrl => raw['publicUrl'] as String? ?? '';
  int get documents => (raw['documents'] as num?)?.toInt() ?? 0;
  Map<String, dynamic> get collections => (raw['collections'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic> get uploads => (raw['uploads'] as Map<String, dynamic>?) ?? {};
  Map<String, dynamic>? get createdBy => raw['createdBy'] as Map<String, dynamic>?;
}

class BackupPreview {
  const BackupPreview(this.raw);
  final Map<String, dynamic> raw;

  factory BackupPreview.fromJson(Map<String, dynamic> json) => BackupPreview(json);

  Map<String, dynamic> get collections => (raw['collections'] as Map<String, dynamic>?) ?? {};
  int get documents => (raw['documents'] as num?)?.toInt() ?? 0;
  Map<String, dynamic> get uploads => (raw['uploads'] as Map<String, dynamic>?) ?? {};
  String get estimatedSize => raw['estimatedSize'] as String? ?? '';
}

class BackupTicket {
  const BackupTicket(this.raw);
  final Map<String, dynamic> raw;

  factory BackupTicket.fromJson(Map<String, dynamic> json) => BackupTicket(json);

  String get id => raw['id'] as String? ?? '';
  String get filename => raw['filename'] as String? ?? '';
  String get size => raw['size'] as String? ?? '';
  String get downloadPath => raw['downloadPath'] as String? ?? '';
  String get expiresAt => raw['expiresAt'] as String? ?? '';
  BackupManifest get manifest => BackupManifest((raw['manifest'] as Map<String, dynamic>?) ?? {});
}

class StagedRestore {
  const StagedRestore(this.raw);
  final Map<String, dynamic> raw;

  factory StagedRestore.fromJson(Map<String, dynamic> json) => StagedRestore(json);

  String get id => raw['id'] as String? ?? '';
  String get expiresAt => raw['expiresAt'] as String? ?? '';
  BackupManifest get manifest => BackupManifest((raw['manifest'] as Map<String, dynamic>?) ?? {});
  int get uploadBytes => (raw['uploadBytes'] as num?)?.toInt() ?? 0;
  List<String> get untouchedCollections =>
      (raw['untouchedCollections'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
  List<String> get warnings => (raw['warnings'] as List<dynamic>? ?? []).map((e) => e.toString()).toList();
}

class RestoreResult {
  const RestoreResult(this.raw);
  final Map<String, dynamic> raw;

  factory RestoreResult.fromJson(Map<String, dynamic> json) => RestoreResult(json);

  String get mode => raw['mode'] as String? ?? '';
  int get documents => (raw['documents'] as num?)?.toInt() ?? 0;
  bool get usersReplaced => raw['usersReplaced'] as bool? ?? false;
  List<Map<String, dynamic>> get collections =>
      (raw['collections'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
  Map<String, dynamic> get uploads => (raw['uploads'] as Map<String, dynamic>?) ?? {};
  /// The pre-restore backup taken automatically, when one was asked for —
  /// carries the download link that undoes this restore.
  BackupTicket? get safetyBackup =>
      raw['safetyBackup'] != null ? BackupTicket(raw['safetyBackup'] as Map<String, dynamic>) : null;
}

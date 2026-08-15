import 'package:flutter_test/flutter_test.dart';

import 'package:csi_portal/core/models/admin.dart';
import 'package:csi_portal/core/models/common.dart';
import 'package:csi_portal/core/models/content.dart';

void main() {
  group('LocalizedText', () {
    test('fromJson and toJson', () {
      final json = {'en': 'Hello', 'ta': 'வணக்கம்'};
      final loc = LocalizedText.fromJson(json);
      expect(loc.en, 'Hello');
      expect(loc.ta, 'வணக்கம்');
      expect(loc.isEmpty, isFalse);
      expect(loc.toJson(), json);
    });

    test('empty static and null json handling', () {
      final loc = LocalizedText.fromJson(null);
      expect(loc.isEmpty, isTrue);
      expect(LocalizedText.empty.en, '');
    });

    test('copyWith', () {
      const loc = LocalizedText(en: 'Eng', ta: 'Tam');
      final updated = loc.copyWith(en: 'English');
      expect(updated.en, 'English');
      expect(updated.ta, 'Tam');
    });
  });

  group('ImageAsset', () {
    test('fromJson and toJson', () {
      final json = {
        'url': '/uploads/test.jpg',
        'alt': {'en': 'Test Alt', 'ta': 'ஆல்ட்'},
        'width': 800,
        'height': 600,
        'blurDataURL': 'data:image/jpeg;base64,...',
      };
      final img = ImageAsset.fromJson(json);
      expect(img.url, '/uploads/test.jpg');
      expect(img.alt.en, 'Test Alt');
      expect(img.width, 800);
      expect(img.height, 600);
      expect(img.blurDataURL, 'data:image/jpeg;base64,...');
      expect(img.toJson(), json);
    });
  });

  group('Paginated', () {
    test('fromJson parses items list correctly', () {
      final json = {
        'items': [
          {'id': '1', 'name': 'User 1', 'email': 'u1@test.com', 'role': 'admin', 'active': true, 'createdAt': '', 'updatedAt': ''},
          {'id': '2', 'name': 'User 2', 'email': 'u2@test.com', 'role': 'editor', 'active': true, 'createdAt': '', 'updatedAt': ''},
        ],
        'total': 2,
        'page': 1,
        'pageSize': 10,
        'hasMore': false,
      };
      final page = Paginated.fromJson(json, (item) => AdminUser.fromJson(item));
      expect(page.total, 2);
      expect(page.items.length, 2);
      expect(page.items[0].name, 'User 1');
      expect(page.hasMore, isFalse);
    });
  });

  group('Admin Models & Permissions', () {
    test('roleHasPermission checks permissions per role', () {
      expect(roleHasPermission('super-admin', 'backup.restore'), isTrue);
      expect(roleHasPermission('admin', 'backup.restore'), isFalse);
      expect(roleHasPermission('editor', 'content.write'), isTrue);
      expect(roleHasPermission('viewer', 'content.write'), isFalse);
      expect(roleHasPermission(null, 'content.read'), isFalse);
    });

    test('AdminUser fromJson', () {
      final json = {
        'id': 'usr_1',
        'name': 'John Pastor',
        'email': 'john@csistmarks.org',
        'role': 'admin',
        'active': true,
        'lastLoginAt': '2026-08-15T10:00:00Z',
        'createdAt': '2026-01-01T00:00:00Z',
        'updatedAt': '2026-08-15T10:00:00Z',
      };
      final user = AdminUser.fromJson(json);
      expect(user.id, 'usr_1');
      expect(user.name, 'John Pastor');
      expect(user.role, 'admin');
      expect(user.active, isTrue);
    });

    test('AuditLogEntry fromJson', () {
      final json = {
        'id': 'log_1',
        'action': 'CREATE',
        'resource': 'events',
        'resourceId': 'evt_100',
        'summary': 'Created Easter Service event',
        'userId': 'usr_1',
        'userName': 'John Pastor',
        'ip': '127.0.0.1',
        'createdAt': '2026-08-15T12:00:00Z',
      };
      final log = AuditLogEntry.fromJson(json);
      expect(log.id, 'log_1');
      expect(log.action, 'CREATE');
      expect(log.resource, 'events');
      expect(log.summary, contains('Easter Service'));
    });

    test('MediaItem fromJson', () {
      final json = {
        'id': 'med_1',
        'kind': 'image',
        'url': '/uploads/pic.png',
        'thumbnailUrl': '/uploads/thumb_pic.png',
        'filename': 'pic.png',
        'mimeType': 'image/png',
        'format': 'PNG',
        'sizeBytes': 2048576,
        'size': '2.0 MB',
        'width': 1920,
        'height': 1080,
        'createdAt': '2026-08-15T12:00:00Z',
        'updatedAt': '2026-08-15T12:00:00Z',
      };
      final media = MediaItem.fromJson(json);
      expect(media.id, 'med_1');
      expect(media.kind, 'image');
      expect(media.sizeBytes, 2048576);
      expect(media.width, 1920);
    });

    test('ContactMessage fromJson', () {
      final json = {
        'id': 'msg_1',
        'name': 'Grace Smith',
        'email': 'grace@example.com',
        'phone': '+91 9876543210',
        'subject': 'Prayer Request',
        'message': 'Please pray for my family.',
        'read': false,
        'createdAt': '2026-08-15T14:00:00Z',
      };
      final msg = ContactMessage.fromJson(json);
      expect(msg.id, 'msg_1');
      expect(msg.subject, 'Prayer Request');
      expect(msg.read, isFalse);
    });

    test('DashboardStats and Counts', () {
      final json = {
        'events': {'total': 15, 'published': 10, 'upcoming': 3},
        'blog': {'total': 42},
      };
      final stats = DashboardStats.fromJson(json);
      expect(stats.events.get('total'), 15);
      expect(stats.events.get('published'), 10);
      expect(stats.blog.get('total'), 42);
      expect(stats.users.get('total'), 0);
    });

    test('Backup models parsing', () {
      final previewJson = {
        'collections': {'users': 5, 'events': 20},
        'documents': 25,
        'uploads': {'files': 10},
        'estimatedSize': '12.5 MB',
      };
      final preview = BackupPreview.fromJson(previewJson);
      expect(preview.documents, 25);
      expect(preview.estimatedSize, '12.5 MB');

      final ticketJson = {
        'id': 'bkt_1',
        'filename': 'backup-2026.zip',
        'size': '12.5 MB',
        'downloadPath': '/admin/backup/download/bkt_1',
        'expiresAt': '2026-08-16T00:00:00Z',
        'manifest': {'capturedAt': '2026-08-15T15:00:00Z', 'documents': 25},
      };
      final ticket = BackupTicket.fromJson(ticketJson);
      expect(ticket.id, 'bkt_1');
      expect(ticket.manifest.documents, 25);
    });
  });

  group('Content Models', () {
    test('ChurchEvent fromJson and toJson', () {
      final json = {
        'id': 'evt_1',
        'slug': 'sunday-service',
        'createdAt': '2026-08-01T00:00:00Z',
        'updatedAt': '2026-08-01T00:00:00Z',
        'status': 'published',
        'title': {'en': 'Sunday Holy Communion', 'ta': 'ஞாயிறு நற்கருணை ஆராதனை'},
        'summary': {'en': 'Join us this Sunday', 'ta': 'வாருங்கள்'},
        'description': [
          {'en': 'First paragraph of description', 'ta': 'விளக்கம் 1'},
        ],
        'startDate': '2026-08-17T08:00:00Z',
        'location': {'en': 'Main Sanctuary', 'ta': 'பிரதான ஆலயம்'},
        'featured': true,
      };
      final event = ChurchEvent.fromJson(json);
      expect(event.id, 'evt_1');
      expect(event.slug, 'sunday-service');
      expect(event.title.en, 'Sunday Holy Communion');
      expect(event.featured, isTrue);

      final exported = event.toJson();
      expect(exported['startDate'], '2026-08-17T08:00:00Z');
      expect(exported['featured'], isTrue);
    });

    test('BlogPost fromJson and toJson', () {
      final json = {
        'id': 'blog_1',
        'slug': 'pastoral-letter',
        'createdAt': '2026-08-01T00:00:00Z',
        'updatedAt': '2026-08-01T00:00:00Z',
        'status': 'published',
        'title': {'en': 'Monthly Pastoral Letter', 'ta': 'மாதாந்திர பாஸ்டர் கடிதம்'},
        'excerpt': {'en': 'Reflections on faith', 'ta': 'நம்பிக்கை சிந்தனைகள்'},
        'body': [
          {'en': 'Dear congregation...', 'ta': 'அன்புள்ள திருச்சபையே...'},
        ],
        'publishedAt': '2026-08-01T00:00:00Z',
        'author': {'en': 'Rev. Paul', 'ta': 'ரெவ். பால்'},
      };
      final post = BlogPost.fromJson(json);
      expect(post.id, 'blog_1');
      expect(post.author.en, 'Rev. Paul');
      expect(post.toJson()['publishedAt'], '2026-08-01T00:00:00Z');
    });

    test('Announcement fromJson and toJson', () {
      final json = {
        'id': 'ann_1',
        'slug': 'choir-rehearsal',
        'createdAt': '2026-08-10T00:00:00Z',
        'updatedAt': '2026-08-10T00:00:00Z',
        'status': 'published',
        'title': {'en': 'Special Choir Rehearsal', 'ta': 'சிறப்பு பாடகர்குழு பயிற்சி'},
        'body': {'en': 'This Saturday at 5 PM', 'ta': 'இந்த சனிக்கிழமை மாலை 5 மணிக்கு'},
        'publishedAt': '2026-08-10T00:00:00Z',
        'pinned': true,
      };
      final ann = Announcement.fromJson(json);
      expect(ann.pinned, isTrue);
      expect(ann.toJson()['pinned'], isTrue);
    });
  });
}

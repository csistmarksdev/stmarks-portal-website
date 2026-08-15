import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/admin.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';

class DashboardData {
  const DashboardData({required this.stats, required this.upcomingEvents, required this.recentAudit, this.weeklyVerse});

  final DashboardStats stats;
  final List<ChurchEvent> upcomingEvents;
  final List<AuditLogEntry> recentAudit;
  final WeeklyVerse? weeklyVerse;
}

final dashboardDataProvider = FutureProvider.autoDispose<DashboardData>((ref) async {
  final api = ref.watch(apiClientProvider);
  // Mirrors the web dashboard's `enabled: can("audit.read")` — the audit feed
  // is fetched (and shown) only for roles allowed to see it (editors cannot).
  final auth = ref.watch(authControllerProvider);
  final canReadAudit = roleHasPermission(auth.user?.role, 'audit.read');

  final statsFuture = api.get<Map<String, dynamic>>('/admin/dashboard/stats').then(DashboardStats.fromJson);
  final eventsFuture = api
      .get<dynamic>('/events', params: {'status': 'upcoming', 'limit': 4})
      .then((json) => (json as List<dynamic>).map((e) => ChurchEvent.fromJson(e as Map<String, dynamic>)).toList())
      .catchError((_) => <ChurchEvent>[]);
  // pageSize 7, matching the web dashboard's activity feed exactly.
  final auditFuture = canReadAudit
      ? api
          .get<Map<String, dynamic>>('/admin/audit-logs', params: {'pageSize': 7})
          .then((json) => ((json['items'] as List<dynamic>? ?? json['data'] as List<dynamic>? ?? []))
              .map((e) => AuditLogEntry.fromJson(e as Map<String, dynamic>))
              .toList())
          .catchError((_) => <AuditLogEntry>[])
      : Future.value(<AuditLogEntry>[]);
  final Future<WeeklyVerse?> verseFuture = api
      .get<Map<String, dynamic>>('/admin/church/weekly-verse')
      .then<WeeklyVerse?>(WeeklyVerse.fromJson)
      .catchError((_) => null);

  final stats = await statsFuture;
  final events = await eventsFuture;
  final audit = await auditFuture;
  final verse = await verseFuture;

  return DashboardData(stats: stats, upcomingEvents: events, recentAudit: audit, weeklyVerse: verse);
});

/// Collapses consecutive identical audit entries into one row with a "×N"
/// counter — mirrors the web dashboard's `collapseRuns`.
class AuditRun {
  const AuditRun(this.entry, this.count);
  final AuditLogEntry entry;
  final int count;
}

List<AuditRun> collapseAuditRuns(List<AuditLogEntry> entries) {
  final runs = <AuditRun>[];
  for (final entry in entries) {
    if (runs.isNotEmpty &&
        runs.last.entry.action == entry.action &&
        runs.last.entry.resource == entry.resource &&
        runs.last.entry.summary == entry.summary) {
      runs[runs.length - 1] = AuditRun(runs.last.entry, runs.last.count + 1);
    } else {
      runs.add(AuditRun(entry, 1));
    }
  }
  return runs;
}

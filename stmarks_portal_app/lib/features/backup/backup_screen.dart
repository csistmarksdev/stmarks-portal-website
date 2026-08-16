import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_exception.dart';
import '../../core/models/admin.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../core/theme/app_theme_extension.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/app_surface.dart';

/// The word a super-admin has to type before a replace restore will run —
/// mirrors the web app's `CONFIRM_PHRASE`. Only "replace" demands it: merge
/// is recoverable by restoring again, replace is not.
const _kConfirmPhrase = 'RESTORE';

/// Backup & restore — a high-stakes screen: building/downloading an archive
/// exposes every password hash in the installation, and applying a restore
/// can rewrite the user table out from under the operator running it. Both
/// are gated on `backup.read` / `backup.restore` (super-admin only), and the
/// UI leans on explicit, unambiguous language rather than being clever.
class BackupScreen extends ConsumerStatefulWidget {
  const BackupScreen({super.key});

  @override
  ConsumerState<BackupScreen> createState() => _BackupScreenState();
}

class _BackupScreenState extends ConsumerState<BackupScreen> {
  BackupPreview? _preview;
  bool _previewLoading = true;
  String? _previewError;

  bool _building = false;
  BackupTicket? _ticket;
  String? _buildError;

  bool _downloading = false;
  double? _downloadProgress;

  bool _uploading = false;
  double? _uploadProgress;
  StagedRestore? _staged;
  String? _uploadError;

  // Defaults to "replace" — the option that truly puts things back — the
  // same default the web app ships with.
  String _mode = 'replace';
  bool _safetyBackup = true;
  bool _restoring = false;
  RestoreResult? _restoreResult;
  String? _restoreError;

  @override
  void initState() {
    super.initState();
    _loadPreview();
  }

  Future<void> _loadPreview() async {
    setState(() {
      _previewLoading = true;
      _previewError = null;
    });
    try {
      final json = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/admin/backup/preview');
      if (!mounted) return;
      setState(() {
        _preview = BackupPreview.fromJson(json);
        _previewLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _previewError = e is ApiException ? e.message : 'Could not load the backup preview.';
        _previewLoading = false;
      });
    }
  }

  Future<void> _buildBackup() async {
    setState(() {
      _building = true;
      _buildError = null;
    });
    try {
      final json = await ref.read(apiClientProvider).post<Map<String, dynamic>>('/admin/backup');
      if (!mounted) return;
      final ticket = BackupTicket.fromJson(json);
      setState(() {
        _ticket = ticket;
        _building = false;
      });
      // Same reassurance the web app gives with its toast — the archive was
      // actually built, not merely requested.
      showAppSnackBar(context, 'Backup ready — ${ticket.size}');
      await _downloadTicket(ticket);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _buildError = e is ApiException ? e.message : 'Could not build the backup.';
        _building = false;
      });
    }
  }

  /// Pulls the archive down over the authenticated client and hands it to the
  /// system save dialog, so it lands wherever the operator chooses on the
  /// device.
  ///
  /// This used to `launchUrl` the download path into the system browser. The
  /// browser carries no access token, so the server answered 401 and nothing
  /// was ever saved — the backup only *looked* like it downloaded.
  Future<void> _downloadTicket(BackupTicket ticket) async {
    if (_downloading) return;
    setState(() {
      _downloading = true;
      _downloadProgress = null;
      _buildError = null;
    });
    try {
      final bytes = await ref.read(apiClientProvider).getBytes(
        ticket.downloadPath,
        onProgress: (received, total) {
          if (!mounted || total <= 0) return;
          setState(() => _downloadProgress = received / total);
        },
      );
      if (!mounted) return;
      setState(() {
        _downloading = false;
        _downloadProgress = null;
      });

      final name = ticket.filename.isNotEmpty ? ticket.filename : 'csi-portal-backup.zip';
      final saved = await FilePicker.saveFile(
        fileName: name,
        bytes: bytes,
        mimeType: 'application/zip',
        dialogTitle: 'Save backup archive',
      );
      if (!mounted) return;
      if (saved == null) {
        // Cancelling the save dialog is a choice, not a failure.
        showAppSnackBar(context, 'Save cancelled — the backup is still on the server.');
        return;
      }
      showAppSnackBar(context, 'Backup saved to your device — $name');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _downloading = false;
        _downloadProgress = null;
        _buildError = e is ApiException ? e.message : 'Could not download the backup.';
      });
    }
  }

  Future<void> _pickAndUpload() async {
    final file = await FilePicker.pickFile(type: FileType.any);
    if (file == null) return;
    final Uint8List bytes;
    try {
      bytes = await file.readAsBytes();
    } catch (_) {
      if (mounted) showAppSnackBar(context, 'Could not read the selected file.', error: true);
      return;
    }

    setState(() {
      _uploading = true;
      _uploadProgress = 0;
      _uploadError = null;
      _staged = null;
      _restoreResult = null;
    });

    try {
      final form = FormData.fromMap({
        'file': MultipartFile.fromBytes(bytes, filename: file.name),
      });
      final json = await ref.read(apiClientProvider).upload<Map<String, dynamic>>(
        '/admin/backup/restore',
        form,
        onProgress: (sent, total) {
          if (!mounted || total <= 0) return;
          setState(() => _uploadProgress = sent / total);
        },
      );
      if (!mounted) return;
      setState(() {
        _staged = StagedRestore.fromJson(json);
        _uploading = false;
        _uploadProgress = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _uploadError = e is ApiException ? e.message : 'Could not read that archive.';
        _uploading = false;
        _uploadProgress = null;
      });
    } finally {
      if (mounted && _uploading) setState(() => _uploading = false);
    }
  }

  Future<void> _applyRestore() async {
    final staged = _staged;
    if (staged == null) return;

    final confirmed = await _confirmRestoreDialog(
      context,
      mode: _mode,
      capturedAt: _formatDateTime(staged.manifest.capturedAt),
    );
    if (!confirmed) return;

    setState(() {
      _restoring = true;
      _restoreError = null;
    });

    try {
      final json = await ref.read(apiClientProvider).post<Map<String, dynamic>>(
        '/admin/backup/restore/${staged.id}',
        data: {'mode': _mode, 'safetyBackup': _safetyBackup},
      );
      if (!mounted) return;
      final result = RestoreResult.fromJson(json);
      setState(() {
        _restoreResult = result;
        // The staged review is done with — showing it alongside the result
        // would let the "Apply restore" button be pressed a second time.
        _staged = null;
        _restoring = false;
      });
      showAppSnackBar(context, 'Restored ${result.documents} record(s)');
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _restoreError = e is ApiException ? e.message : 'The restore failed.';
        _restoring = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final auth = ref.watch(authControllerProvider);
    final canRead = ref.read(authControllerProvider.notifier).can('backup.read');
    final canRestore = ref.read(authControllerProvider.notifier).can('backup.restore');
    // Re-evaluate against the live auth state (can() reads state.user internally,
    // but watching `auth` above keeps this widget rebuilding when it changes).
    final _ = auth;

    if (!canRead) {
      return const Center(
        child: EmptyState(
          icon: LucideIcons.lock,
          title: 'Not available to your role',
          message:
              'A backup contains every record in the Portal, including admin accounts and their passwords. '
              'Only a super-admin can download or restore one.',
        ),
      );
    }

    return SingleChildScrollView(
      padding: EdgeInsets.fromLTRB(20, appPageTop(context), 20, kFloatingDockHeight + 24),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'SAFEKEEPING',
                style: theme.textTheme.labelMedium?.copyWith(color: context.semanticColors.accentForeground),
              ),
              const SizedBox(height: 4),
              Text('Backup & restore', style: theme.textTheme.headlineSmall),
              const SizedBox(height: 6),
              Text(
                'A backup is one zip file holding everything: all content, the media library, admin accounts '
                'and the activity history. Keep a copy somewhere that is not this server.',
                style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 24),
              _PreviewCard(
                loading: _previewLoading,
                error: _previewError,
                preview: _preview,
                onRefresh: _loadPreview,
              ),
              const SizedBox(height: 20),
              _BuildCard(
                building: _building,
                downloading: _downloading,
                downloadProgress: _downloadProgress,
                error: _buildError,
                ticket: _ticket,
                onBuild: _buildBackup,
                onDownload: _downloadTicket,
              ),
              if (canRestore) ...[
                const SizedBox(height: 20),
                _RestoreCard(
                  uploading: _uploading,
                  uploadProgress: _uploadProgress,
                  uploadError: _uploadError,
                  staged: _staged,
                  mode: _mode,
                  safetyBackup: _safetyBackup,
                  restoring: _restoring,
                  restoreError: _restoreError,
                  restoreResult: _restoreResult,
                  onPickFile: _pickAndUpload,
                  onCancelStaged: () => setState(() => _staged = null),
                  onModeChanged: (m) => setState(() => _mode = m),
                  onSafetyBackupChanged: (v) => setState(() => _safetyBackup = v),
                  onApply: _applyRestore,
                  onDownloadTicket: _downloadTicket,
                  onDone: () => setState(() => _restoreResult = null),
                ),
              ],
              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }
}

/// A dialog that only unlocks once the exact confirm phrase has been typed —
/// mirrors the web app's `ConfirmDialog` with `confirmPhrase`. Implemented
/// locally (rather than extending the shared `showConfirmDialog`) because
/// this is the one screen in the app that needs it.
Future<bool> _confirmRestoreDialog(
  BuildContext context, {
  required String mode,
  required String capturedAt,
}) async {
  final requirePhrase = mode == 'replace';
  final controller = TextEditingController();
  final result = await showDialog<bool>(
    context: context,
    builder: (ctx) => StatefulBuilder(
      builder: (ctx, setState) {
        final theme = Theme.of(ctx);
        final unlocked = !requirePhrase || controller.text.trim() == _kConfirmPhrase;
        return AlertDialog(
          title: Text(mode == 'replace' ? 'Replace everything?' : 'Merge this backup in?'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                mode == 'replace'
                    ? 'This clears every collection in the backup and puts back the data as it stood on '
                        '$capturedAt. Anything created or edited since then is permanently lost, and admin '
                        'passwords revert to what they were. It cannot be undone from inside the Portal.'
                    : 'This adds and updates records from the backup taken $capturedAt. Nothing is deleted, '
                        'but existing records with the same id are overwritten.',
              ),
              if (requirePhrase) ...[
                const SizedBox(height: 16),
                Text.rich(
                  TextSpan(
                    style: theme.textTheme.bodySmall,
                    children: const [
                      TextSpan(text: 'Type '),
                      TextSpan(text: _kConfirmPhrase, style: TextStyle(fontWeight: FontWeight.w700)),
                      TextSpan(text: ' to continue'),
                    ],
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: controller,
                  autocorrect: false,
                  textCapitalization: TextCapitalization.characters,
                  onChanged: (_) => setState(() {}),
                  decoration: const InputDecoration(isDense: true),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: theme.colorScheme.error, foregroundColor: theme.colorScheme.onError),
              onPressed: unlocked ? () => Navigator.pop(ctx, true) : null,
              child: Text(mode == 'replace' ? 'Replace everything' : 'Merge'),
            ),
          ],
        );
      },
    ),
  );
  return result ?? false;
}

// ---------------------------------------------------------------------------
// Shared card chrome
// ---------------------------------------------------------------------------

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, this.trailing, required this.child, this.subtitle});

  final String title;
  final String? subtitle;
  final Widget? trailing;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: ShapeDecoration(
        color: theme.colorScheme.surface,
        shape: appSquircle(
          AppRadii.card,
          side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
        ),
        shadows: restingShadow(context),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.titleMedium),
                    if (subtitle != null) ...[
                      const SizedBox(height: 2),
                      Text(subtitle!, style: theme.textTheme.bodySmall),
                    ],
                  ],
                ),
              ),
              ?trailing,
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// (a) Preview
// ---------------------------------------------------------------------------

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({required this.loading, required this.error, required this.preview, required this.onRefresh});

  final bool loading;
  final String? error;
  final BackupPreview? preview;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    Widget body;
    if (loading) {
      body = const Padding(
        padding: EdgeInsets.symmetric(vertical: 24),
        child: Center(child: CircularProgressIndicator()),
      );
    } else if (error != null) {
      body = ErrorRetryState(message: error!, onRetry: onRefresh);
    } else if (preview == null) {
      body = const SizedBox.shrink();
    } else {
      final p = preview!;
      final uploadFiles = (p.uploads['files'] as num?)?.toInt();
      final uploadBytes = (p.uploads['bytes'] as num?)?.toInt();
      body = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Expanded(child: _Stat(label: 'Records', value: NumberFormat.decimalPattern().format(p.documents))),
              Expanded(
                child: _Stat(
                  label: 'Media files',
                  value: uploadFiles == null
                      ? '—'
                      : '$uploadFiles file${uploadFiles == 1 ? '' : 's'}${uploadBytes != null ? ' · ${formatBytes(uploadBytes)}' : ''}',
                ),
              ),
              Expanded(child: _Stat(label: 'Approximate size', value: p.estimatedSize.isEmpty ? '—' : p.estimatedSize)),
            ],
          ),
          const SizedBox(height: 16),
          Text('Collections', style: theme.textTheme.labelLarge),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final entry in p.collections.entries)
                if (((entry.value as num?)?.toInt() ?? 0) > 0)
                  Chip(label: Text('${entry.key} ${(entry.value as num).toInt()}')),
              if (p.collections.values.every((v) => ((v as num?)?.toInt() ?? 0) == 0))
                Text('No collections reported.', style: theme.textTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: theme.colorScheme.surfaceContainerHighest,
              borderRadius: BorderRadius.circular(AppRadii.sm),
            ),
            child: Text(
              'The file includes admin accounts and their passwords, and every message from the contact form. '
              'Treat it like the database it is — store it somewhere private.',
              style: theme.textTheme.bodySmall,
            ),
          ),
        ],
      );
    }

    return _SectionCard(
      title: 'What would be backed up',
      subtitle: 'Everything in the Portal, as it is right now, in a single zip file.',
      trailing: IconButton(
        tooltip: 'Refresh',
        icon: const Icon(LucideIcons.refreshCw),
        onPressed: loading ? null : onRefresh,
      ),
      child: body,
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelMedium),
        const SizedBox(height: 4),
        Text(value, style: theme.textTheme.titleMedium, maxLines: 2, overflow: TextOverflow.ellipsis),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// (b) Build & download
// ---------------------------------------------------------------------------

class _BuildCard extends StatelessWidget {
  const _BuildCard({
    required this.building,
    required this.downloading,
    required this.downloadProgress,
    required this.error,
    required this.ticket,
    required this.onBuild,
    required this.onDownload,
  });

  final bool building;
  final bool downloading;
  final double? downloadProgress;
  final String? error;
  final BackupTicket? ticket;
  final VoidCallback onBuild;
  final void Function(BackupTicket) onDownload;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final ticket = this.ticket;

    return _SectionCard(
      title: 'Download a backup',
      subtitle: 'Everything in the Portal, as it is right now, in a single zip file.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          FilledButton.icon(
            onPressed: (building || downloading) ? null : onBuild,
            icon: (building || downloading)
                ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                : const Icon(LucideIcons.archive, size: 18),
            label: Text(
              building
                  ? 'Building…'
                  : downloading
                      ? 'Downloading…'
                      : 'Build & save backup',
            ),
            style: FilledButton.styleFrom(
              backgroundColor: theme.colorScheme.primary,
              foregroundColor: theme.colorScheme.onPrimary,
              padding: const EdgeInsets.symmetric(vertical: 14),
            ),
          ),
          if (downloading) ...[
            const SizedBox(height: 12),
            ClipRSuperellipse(
              borderRadius: BorderRadius.circular(AppRadii.pill),
              child: LinearProgressIndicator(value: downloadProgress, minHeight: 6),
            ),
            const SizedBox(height: 6),
            Text(
              downloadProgress == null
                  ? 'Fetching the archive…'
                  : '${(downloadProgress! * 100).round()}% downloaded',
              style: theme.textTheme.bodySmall,
            ),
          ],
          if (error != null) ...[
            const SizedBox(height: 12),
            Text(error!, style: TextStyle(color: theme.colorScheme.error)),
          ],
          if (ticket != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: ShapeDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                shape: appSquircle(AppRadii.md),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(ticket.filename, style: theme.textTheme.titleSmall, overflow: TextOverflow.ellipsis),
                  const SizedBox(height: 4),
                  Text('${ticket.size} · ${ticket.manifest.documents} documents', style: theme.textTheme.bodySmall),
                  const SizedBox(height: 2),
                  Text('Link expires ${_formatDateTime(ticket.expiresAt)}.', style: theme.textTheme.bodySmall),
                  const SizedBox(height: 12),
                  OutlinedButton.icon(
                    onPressed: downloading ? null : () => onDownload(ticket),
                    icon: const Icon(LucideIcons.save, size: 18),
                    label: const Text('Save to device again'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

String _formatDateTime(String iso) {
  final dt = DateTime.tryParse(iso);
  if (dt == null) return iso;
  return DateFormat('d MMM y, h:mm a').format(dt.toLocal());
}

// ---------------------------------------------------------------------------
// (c) Restore
// ---------------------------------------------------------------------------

class _RestoreCard extends StatelessWidget {
  const _RestoreCard({
    required this.uploading,
    required this.uploadProgress,
    required this.uploadError,
    required this.staged,
    required this.mode,
    required this.safetyBackup,
    required this.restoring,
    required this.restoreError,
    required this.restoreResult,
    required this.onPickFile,
    required this.onCancelStaged,
    required this.onModeChanged,
    required this.onSafetyBackupChanged,
    required this.onApply,
    required this.onDownloadTicket,
    required this.onDone,
  });

  final bool uploading;
  final double? uploadProgress;
  final String? uploadError;
  final StagedRestore? staged;
  final String mode;
  final bool safetyBackup;
  final bool restoring;
  final String? restoreError;
  final RestoreResult? restoreResult;
  final VoidCallback onPickFile;
  final VoidCallback onCancelStaged;
  final ValueChanged<String> onModeChanged;
  final ValueChanged<bool> onSafetyBackupChanged;
  final VoidCallback onApply;
  final void Function(BackupTicket) onDownloadTicket;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return _SectionCard(
      title: 'Restore from a backup',
      subtitle: 'Upload a backup file to put the Portal back the way it was. You will see what is in the '
          'file before anything is changed.',
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (uploading) ...[
            ClipRRect(
              borderRadius: BorderRadius.circular(999),
              child: LinearProgressIndicator(
                value: uploadProgress != null && uploadProgress! < 1 ? uploadProgress : null,
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              uploadProgress != null && uploadProgress! < 1
                  ? 'Uploading… ${(uploadProgress! * 100).round()}%'
                  : 'Reading the archive…',
              style: theme.textTheme.bodySmall,
            ),
          ] else if (staged == null && restoreResult == null)
            OutlinedButton.icon(
              onPressed: onPickFile,
              icon: const Icon(LucideIcons.fileUp, size: 18),
              label: const Text('Choose a backup file'),
            ),
          if (uploadError != null) ...[
            const SizedBox(height: 12),
            Text(uploadError!, style: TextStyle(color: theme.colorScheme.error)),
          ],
          if (staged != null) ...[
            const SizedBox(height: 20),
            _StagedSummary(staged: staged!),
            const SizedBox(height: 20),
            Text('What should happen to the data that is here now?', style: theme.textTheme.labelLarge),
            const SizedBox(height: 8),
            _ModeOption(
              checked: mode == 'replace',
              onSelect: () => onModeChanged('replace'),
              title: 'Replace',
              description: 'Clear everything the backup covers and put the backup in its place. Anything added '
                  'since the backup was taken is lost — this is the option that truly puts things back.',
            ),
            const SizedBox(height: 8),
            _ModeOption(
              checked: mode == 'merge',
              onSelect: () => onModeChanged('merge'),
              title: 'Merge',
              description: 'Add what is missing and update what has changed, but delete nothing. Safer, but '
                  'records deleted since the backup stay deleted.',
            ),
            if (staged!.untouchedCollections.isNotEmpty) ...[
              const SizedBox(height: 10),
              Text(
                'Not in this backup, and left alone either way: ${staged!.untouchedCollections.join(', ')}.',
                style: theme.textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: ShapeDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                shape: appSquircle(AppRadii.md),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Back up the current data first', style: theme.textTheme.bodyMedium),
                        const SizedBox(height: 2),
                        Text(
                          'Gives you a download link to undo this, in case the wrong file was uploaded.',
                          style: theme.textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  Switch(value: safetyBackup, onChanged: onSafetyBackupChanged),
                ],
              ),
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                TextButton(onPressed: onCancelStaged, child: const Text('Cancel')),
                const Spacer(),
                FilledButton.icon(
                  onPressed: restoring ? null : onApply,
                  icon: restoring
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(LucideIcons.rotateCcw, size: 18),
                  label: Text(restoring ? 'Working…' : 'Restore this backup'),
                  style: FilledButton.styleFrom(
                    backgroundColor: mode == 'replace' ? theme.colorScheme.error : theme.colorScheme.primary,
                    foregroundColor: mode == 'replace' ? theme.colorScheme.onError : theme.colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 18),
                  ),
                ),
              ],
            ),
            if (restoreError != null) ...[
              const SizedBox(height: 12),
              Text(restoreError!, style: TextStyle(color: theme.colorScheme.error)),
            ],
          ],
          if (restoreResult != null) ...[
            const SizedBox(height: 16),
            _RestoreResultSummary(result: restoreResult!, onDownloadTicket: onDownloadTicket, onDone: onDone),
          ],
        ],
      ),
    );
  }
}

class _ModeOption extends StatelessWidget {
  const _ModeOption({required this.checked, required this.onSelect, required this.title, required this.description});

  final bool checked;
  final VoidCallback onSelect;
  final String title;
  final String description;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return InkWell(
      onTap: onSelect,
      borderRadius: BorderRadius.circular(AppRadii.md),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          border: Border.all(color: checked ? theme.colorScheme.primary : theme.colorScheme.outline.withValues(alpha: 0.7)),
          color: checked ? theme.colorScheme.primary.withValues(alpha: 0.06) : null,
          borderRadius: BorderRadius.circular(AppRadii.md),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.all(12),
              child: Icon(
                checked ? LucideIcons.circleDot : LucideIcons.circle,
                color: checked ? theme.colorScheme.primary : theme.colorScheme.outline,
                size: 20,
              ),
            ),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 2),
                    Text(description, style: theme.textTheme.bodySmall),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StagedSummary extends StatelessWidget {
  const _StagedSummary({required this.staged});

  final StagedRestore staged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final manifest = staged.manifest;
    final semantic = context.semanticColors;
    final files = (manifest.uploads['files'] as num?)?.toInt() ?? 0;
    final createdByName = manifest.createdBy?['name'] as String?;
    final collections = manifest.collections.entries.where((e) => ((e.value as num?)?.toInt() ?? 0) > 0).toList();

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Backup taken ${_formatDateTime(manifest.capturedAt)}', style: theme.textTheme.titleSmall),
          const SizedBox(height: 4),
          Text(
            '${manifest.documents} records · $files media files · ${formatBytes(staged.uploadBytes)}'
            '${createdByName != null ? ' · by $createdByName' : ''}',
            style: theme.textTheme.bodySmall,
          ),
          if (collections.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [for (final c in collections) Chip(label: Text('${c.key} ${(c.value as num).toInt()}'))],
            ),
          ],
          if (staged.untouchedCollections.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text('Not in this backup, and left alone either way', style: theme.textTheme.labelMedium),
            const SizedBox(height: 4),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [for (final c in staged.untouchedCollections) Chip(label: Text(c))],
            ),
          ],
          if (staged.warnings.isNotEmpty) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: semantic.warningSoft,
                borderRadius: BorderRadius.circular(AppRadii.sm),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Icon(LucideIcons.triangleAlert, size: 16, color: semantic.accentForeground),
                      const SizedBox(width: 6),
                      Text('Warnings', style: theme.textTheme.labelLarge?.copyWith(color: semantic.accentForeground)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  for (final w in staged.warnings)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text('• $w', style: theme.textTheme.bodySmall?.copyWith(color: semantic.accentForeground)),
                    ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _RestoreResultSummary extends StatelessWidget {
  const _RestoreResultSummary({required this.result, required this.onDownloadTicket, required this.onDone});

  final RestoreResult result;
  final void Function(BackupTicket) onDownloadTicket;
  final VoidCallback onDone;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = context.semanticColors;
    final written = (result.uploads['written'] as num?)?.toInt() ?? 0;
    final safetyBackup = result.safetyBackup;

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: semantic.successSoft,
        borderRadius: BorderRadius.circular(AppRadii.md),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(LucideIcons.circleCheck, color: semantic.success, size: 18),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Restored ${result.documents} record(s) across ${result.collections.length} collection'
                  '${result.collections.length == 1 ? '' : 's'}, and $written media file${written == 1 ? '' : 's'}.',
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          if (result.collections.isNotEmpty) ...[
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                for (final c in result.collections)
                  Chip(
                    label: Text(
                      '${c['name'] ?? '—'} +${c['inserted'] ?? 0}'
                      '${(c['updated'] ?? 0) > 0 ? ' ~${c['updated']}' : ''}'
                      '${(c['removed'] ?? 0) > 0 ? ' −${c['removed']}' : ''}',
                    ),
                  ),
              ],
            ),
          ],
          if (safetyBackup != null) ...[
            const SizedBox(height: 12),
            InkWell(
              onTap: () => onDownloadTicket(safetyBackup),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: 'Download the backup taken just before this restore',
                      style: TextStyle(color: theme.colorScheme.primary, fontWeight: FontWeight.w600, decoration: TextDecoration.underline),
                    ),
                    TextSpan(
                      text: ' (${safetyBackup.size}, link expires ${_formatDateTime(safetyBackup.expiresAt)}) '
                          '— save it now if this was a mistake.',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
            ),
          ],
          if (result.usersReplaced) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: context.semanticColors.warningSoft,
                borderRadius: BorderRadius.circular(AppRadii.sm),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(LucideIcons.triangleAlert, size: 16, color: context.semanticColors.accentForeground),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Admin accounts were restored too. If your password has changed since this backup was '
                      'taken, sign in with the old one.',
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: context.semanticColors.accentForeground,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 12),
          Align(
            alignment: Alignment.centerRight,
            child: OutlinedButton(onPressed: onDone, child: const Text('Done')),
          ),
        ],
      ),
    );
  }
}

/// Formats a byte count as a human-readable size (KB/MB/GB).
String formatBytes(int bytes) {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  var value = bytes.toDouble();
  var unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  final formatted = value >= 100 || unitIndex == 0 ? value.toStringAsFixed(0) : value.toStringAsFixed(1);
  return '$formatted ${units[unitIndex]}';
}

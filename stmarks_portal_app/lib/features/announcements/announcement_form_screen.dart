import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/resource/field_def.dart';
import '../../core/resource/resource_form_page.dart';
import 'announcements_repository_provider.dart';

class AnnouncementFormScreen extends ConsumerWidget {
  const AnnouncementFormScreen({super.key, this.id});

  final String? id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(announcementsRepositoryProvider);

    return ResourceFormPage<Announcement>(
      title: 'announcement',
      itemId: id,
      repository: repo,
      defaultFormData: () => {
        'title': LocalizedText.empty.toJson(),
        'body': LocalizedText.empty.toJson(),
        'publishedAt': DateTime.now().toIso8601String(),
        'pinned': false,
        'fellowshipSlug': null,
      },
      toFormData: (a) => a.toJson(),
      fields: [
        const FieldDef(key: 'title', label: 'Title', kind: FieldKind.localized, required: true),
        const FieldDef(key: 'body', label: 'Body', kind: FieldKind.localized, required: true, multiline: true),
        const FieldDef(key: 'publishedAt', label: 'Published on', kind: FieldKind.date, required: true),
        FieldDef(
          key: 'fellowshipSlug',
          label: 'Fellowship',
          kind: FieldKind.select,
          options: kFellowshipLabels.entries.map((e) => MapEntry(e.key, e.value)).toList(),
        ),
        const FieldDef(
          key: 'pinned',
          label: 'Pinned',
          kind: FieldKind.checkbox,
          hint: 'Only one announcement can be pinned — pinning this unpins the rest',
        ),
      ],
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/resource/field_def.dart';
import '../../core/resource/resource_form_page.dart';
import 'downloads_repository_provider.dart';

class DownloadFormScreen extends ConsumerWidget {
  const DownloadFormScreen({super.key, this.id});

  final String? id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(downloadsRepositoryProvider);

    return ResourceFormPage<DownloadFile>(
      title: 'download',
      itemId: id,
      repository: repo,
      defaultFormData: () => {
        'title': LocalizedText.empty.toJson(),
        'description': null,
        'category': 'document',
        'fileUrl': null,
        'format': null,
        'size': null,
        'publishedAt': DateTime.now().toIso8601String(),
        'fellowshipSlug': null,
      },
      toFormData: (d) => d.toJson(),
      extraValidate: (data) =>
          (data['fileUrl'] == null || (data['fileUrl'] as String).isEmpty) ? 'Pick a file from the media library' : null,
      fields: [
        const FieldDef(key: 'title', label: 'Title', kind: FieldKind.localized, required: true),
        const FieldDef(key: 'description', label: 'Description', kind: FieldKind.localized, multiline: true),
        const FieldDef(
          key: 'category',
          label: 'Category',
          kind: FieldKind.select,
          required: true,
          options: [MapEntry('bulletin', 'Bulletin'), MapEntry('form', 'Form'), MapEntry('document', 'Document')],
        ),
        FieldDef(key: 'fileUrl', label: 'File', kind: FieldKind.file, required: true),
        const FieldDef(key: 'publishedAt', label: 'Published on', kind: FieldKind.date, required: true),
        FieldDef(
          key: 'fellowshipSlug',
          label: 'Fellowship',
          kind: FieldKind.select,
          options: kFellowshipLabels.entries.map((e) => MapEntry(e.key, e.value)).toList(),
        ),
      ],
    );
  }
}

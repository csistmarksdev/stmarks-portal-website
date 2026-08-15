import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/resource/field_def.dart';
import '../../core/resource/resource_form_page.dart';
import 'events_repository_provider.dart';

class EventFormScreen extends ConsumerWidget {
  const EventFormScreen({super.key, this.id});

  final String? id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repo = ref.watch(eventsRepositoryProvider);

    return ResourceFormPage<ChurchEvent>(
      title: 'event',
      itemId: id,
      repository: repo,
      defaultFormData: () => {
        'title': LocalizedText.empty.toJson(),
        'summary': LocalizedText.empty.toJson(),
        'description': <Map<String, dynamic>>[],
        'startDate': null,
        'endDate': null,
        'location': LocalizedText.empty.toJson(),
        'image': null,
        'fellowshipSlug': null,
        'organiser': null,
        'featured': false,
      },
      toFormData: (e) => e.toJson(),
      fields: [
        const FieldDef(key: 'title', label: 'Title', kind: FieldKind.localized, required: true),
        const FieldDef(key: 'summary', label: 'Summary', kind: FieldKind.localized, required: true, multiline: true),
        const FieldDef(key: 'description', label: 'Description', kind: FieldKind.paragraphs),
        const FieldDef(key: 'startDate', label: 'Starts', kind: FieldKind.datetime, required: true),
        const FieldDef(key: 'endDate', label: 'Ends', kind: FieldKind.datetime),
        const FieldDef(key: 'location', label: 'Location', kind: FieldKind.localized, required: true),
        const FieldDef(key: 'image', label: 'Cover image', kind: FieldKind.image),
        FieldDef(
          key: 'fellowshipSlug',
          label: 'Fellowship',
          kind: FieldKind.select,
          options: kFellowshipLabels.entries.map((e) => MapEntry(e.key, e.value)).toList(),
        ),
        const FieldDef(key: 'organiser', label: 'Organiser', kind: FieldKind.localized),
        const FieldDef(
          key: 'featured',
          label: 'Featured event',
          kind: FieldKind.checkbox,
          hint: 'Featured events are highlighted on the website home page',
        ),
      ],
    );
  }
}

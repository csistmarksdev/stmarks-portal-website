import 'package:flutter/widgets.dart';

enum FieldKind { localized, paragraphs, date, datetime, checkbox, select, image, file, custom }

/// Declarative description of one form field — mirrors the web app's
/// `FieldDef[]` config-driven form renderer. [ResourceFormPage] walks a list
/// of these to build Events/Announcements/Downloads forms from ~10 lines of
/// config instead of a bespoke widget tree each.
class FieldDef {
  const FieldDef({
    required this.key,
    required this.label,
    required this.kind,
    this.required = false,
    this.multiline = false,
    this.hint,
    this.options,
    this.customBuilder,
  });

  final String key;
  final String label;
  final FieldKind kind;
  final bool required;
  final bool multiline;
  final String? hint;
  final List<MapEntry<String, String>>? options;

  /// Only for [FieldKind.custom] — receives the live form-data map and a
  /// patch callback so a field can update more than one key at once (e.g.
  /// picking a download file sets `fileUrl`, `format` and `size` together).
  final Widget Function(BuildContext context, Map<String, dynamic> data, void Function(Map<String, dynamic> patch) patch)? customBuilder;
}

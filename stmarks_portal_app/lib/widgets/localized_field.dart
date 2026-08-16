import 'package:flutter/material.dart';

import '../core/models/common.dart';

/// Side-by-side EN/TA input — every content field in the Portal is
/// bilingual, so this is the single most-reused form control in the app.
class LocalizedField extends StatefulWidget {
  const LocalizedField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.maxLines = 1,
    this.required = false,
    this.hint,
    this.tamilHint,
  });

  final String label;
  final LocalizedText value;
  final ValueChanged<LocalizedText> onChanged;
  final int maxLines;
  final bool required;

  /// Placeholder for the English box. Defaults to "English", matching the web
  /// Portal's `localized-field.tsx`.
  final String? hint;

  /// Placeholder for the Tamil box, in Tamil. Defaults to "தமிழ்" — a Tamil
  /// field prompting in English is the kind of small thing that tells a
  /// translator the language was an afterthought.
  final String? tamilHint;

  @override
  State<LocalizedField> createState() => _LocalizedFieldState();
}

class _LocalizedFieldState extends State<LocalizedField> {
  late final TextEditingController _enController;
  late final TextEditingController _taController;

  @override
  void initState() {
    super.initState();
    _enController = TextEditingController(text: widget.value.en);
    _taController = TextEditingController(text: widget.value.ta);
  }

  @override
  void didUpdateWidget(covariant LocalizedField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.value.en != _enController.text && widget.value.en != oldWidget.value.en) {
      _enController.text = widget.value.en;
    }
    if (widget.value.ta != _taController.text && widget.value.ta != oldWidget.value.ta) {
      _taController.text = widget.value.ta;
    }
  }

  @override
  void dispose() {
    _enController.dispose();
    _taController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Text(widget.label, style: theme.textTheme.labelLarge),
            if (widget.required) Text(' *', style: TextStyle(color: theme.colorScheme.error)),
          ],
        ),
        const SizedBox(height: 8),
        LayoutBuilder(
          builder: (context, constraints) {
            final wide = constraints.maxWidth > 480;
            final enField = _LanguageBox(
              caption: 'English',
              child: TextFormField(
                controller: _enController,
                maxLines: widget.maxLines,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: widget.hint ?? 'English',
                  isDense: true,
                ),
                onChanged: (v) => widget.onChanged(widget.value.copyWith(en: v)),
              ),
            );
            final taField = _LanguageBox(
              caption: 'Tamil',
              child: TextFormField(
                controller: _taController,
                maxLines: widget.maxLines,
                textCapitalization: TextCapitalization.sentences,
                decoration: InputDecoration(
                  hintText: widget.tamilHint ?? 'தமிழ்',
                  isDense: true,
                ),
                onChanged: (v) => widget.onChanged(widget.value.copyWith(ta: v)),
              ),
            );
            if (wide) {
              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(child: enField),
                  const SizedBox(width: 12),
                  Expanded(child: taField),
                ],
              );
            }
            return Column(children: [enField, const SizedBox(height: 12), taField]);
          },
        ),
      ],
    );
  }
}

/// A field with its language named underneath, the way the web Portal labels
/// its bilingual pairs. The caption carries the language once the writer has
/// typed and the placeholder is gone.
class _LanguageBox extends StatelessWidget {
  const _LanguageBox({required this.caption, required this.child});

  final String caption;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        child,
        Padding(
          padding: const EdgeInsets.only(top: 3, left: 4),
          child: Text(
            caption,
            style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0.2, fontSize: 10.5),
          ),
        ),
      ],
    );
  }
}

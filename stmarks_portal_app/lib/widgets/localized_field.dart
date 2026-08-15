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
  });

  final String label;
  final LocalizedText value;
  final ValueChanged<LocalizedText> onChanged;
  final int maxLines;
  final bool required;
  final String? hint;

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
            final enField = TextFormField(
              controller: _enController,
              maxLines: widget.maxLines,
              decoration: InputDecoration(
                prefixText: 'EN  ',
                hintText: widget.hint,
                isDense: true,
              ),
              onChanged: (v) => widget.onChanged(widget.value.copyWith(en: v)),
            );
            final taField = TextFormField(
              controller: _taController,
              maxLines: widget.maxLines,
              decoration: InputDecoration(
                prefixText: 'TA  ',
                hintText: widget.hint,
                isDense: true,
              ),
              onChanged: (v) => widget.onChanged(widget.value.copyWith(ta: v)),
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
            return Column(children: [enField, const SizedBox(height: 10), taField]);
          },
        ),
      ],
    );
  }
}

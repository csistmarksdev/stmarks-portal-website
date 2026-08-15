import 'package:flutter/material.dart';

import '../core/models/common.dart';
import 'localized_field.dart';

/// A repeatable list of bilingual paragraphs — used for event/fellowship
/// "about"/"description" fields and blog post body text.
class ParagraphsField extends StatelessWidget {
  const ParagraphsField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.paragraphMaxLines = 4,
  });

  final String label;
  final List<LocalizedText> value;
  final ValueChanged<List<LocalizedText>> onChanged;
  final int paragraphMaxLines;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final items = value.isEmpty ? [LocalizedText.empty] : value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        for (var i = 0; i < items.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: LocalizedField(
                    label: 'Paragraph ${i + 1}',
                    value: items[i],
                    maxLines: paragraphMaxLines,
                    onChanged: (v) {
                      final next = [...items]..[i] = v;
                      onChanged(next);
                    },
                  ),
                ),
                if (items.length > 1)
                  Padding(
                    padding: const EdgeInsets.only(top: 26),
                    child: IconButton(
                      icon: const Icon(Icons.remove_circle_outline_rounded, size: 20),
                      onPressed: () {
                        final next = [...items]..removeAt(i);
                        onChanged(next);
                      },
                    ),
                  ),
              ],
            ),
          ),
        OutlinedButton.icon(
          onPressed: () => onChanged([...items, LocalizedText.empty]),
          icon: const Icon(Icons.add_rounded, size: 16),
          label: const Text('Add paragraph'),
        ),
      ],
    );
  }
}

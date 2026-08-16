import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/models/common.dart';
import '../core/text/rich_markup.dart';
import '../core/theme/app_theme.dart';
import '../core/theme/app_theme_extension.dart';
import 'app_surface.dart';
import 'markup_editor.dart';

/// Side-by-side bilingual writing surface — the phone counterpart of the web
/// Portal's `BilingualEditor`.
///
/// Both languages stay visible on a wide screen so a translator can work
/// passage by passage; on a phone the panes become tabs, since two
/// 40-character columns are unusable there.
class BilingualBodyEditor extends StatefulWidget {
  const BilingualBodyEditor({
    super.key,
    required this.value,
    required this.onChanged,
    this.label = 'Body',
  });

  final List<LocalizedText> value;
  final ValueChanged<List<LocalizedText>> onChanged;
  final String label;

  @override
  State<BilingualBodyEditor> createState() => _BilingualBodyEditorState();
}

class _BilingualBodyEditorState extends State<BilingualBodyEditor> {
  late final MarkupEditingController _en;
  late final MarkupEditingController _ta;
  final _enFocus = FocusNode();
  final _taFocus = FocusNode();

  String _pane = 'en';

  @override
  void initState() {
    super.initState();
    // Seeded once. The stored paragraphs are rebuilt from this text on every
    // keystroke, so writing back into the controllers would fight the caret.
    _en = MarkupEditingController(text: paragraphsToText(widget.value, 'en'));
    _ta = MarkupEditingController(text: paragraphsToText(widget.value, 'ta'));
    _en.addListener(_publish);
    _ta.addListener(_publish);
    _enFocus.addListener(_onFocusChanged);
    _taFocus.addListener(_onFocusChanged);
  }

  void _onFocusChanged() => setState(() {});

  void _publish() {
    widget.onChanged(textToParagraphs(_en.text, _ta.text));
    setState(() {}); // refresh the stats line and the mark states
  }

  @override
  void dispose() {
    _en.dispose();
    _ta.dispose();
    _enFocus.dispose();
    _taFocus.dispose();
    super.dispose();
  }

  bool get _editing => _enFocus.hasFocus || _taFocus.hasFocus;

  MarkupEditingController get _activeController => _taFocus.hasFocus ? _ta : _en;
  FocusNode get _activeFocus => _taFocus.hasFocus ? _taFocus : _enFocus;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final englishParagraphs = splitParagraphs(_en.text).length;
    final tamilParagraphs = splitParagraphs(_ta.text).length;
    final mismatched =
        englishParagraphs > 0 && tamilParagraphs > 0 && englishParagraphs != tamilParagraphs;

    final english = _Pane(
      label: 'English',
      hint: 'Nothing written yet',
      controller: _en,
      focusNode: _enFocus,
      placeholder: 'Write the post here.\n\nPress Enter to start a new paragraph.',
      useDisplayFont: true,
    );
    final tamil = _Pane(
      label: 'தமிழ் — Tamil',
      hint: 'இன்னும் எழுதப்படவில்லை',
      controller: _ta,
      focusNode: _taFocus,
      placeholder: 'இங்கே தமிழில் எழுதுங்கள்.\n\nபுதிய பத்திக்கு Enter அழுத்தவும்.',
    );

    return Stack(
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(widget.label, style: theme.textTheme.labelLarge),
            const SizedBox(height: 6),
            Text(
              'Write as you normally would — press Enter for a new paragraph. Select text and use the '
              'B / I / U buttons, or hold on the text and pick a style.',
              style: theme.textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            LayoutBuilder(
              builder: (context, constraints) {
                if (constraints.maxWidth >= 900) {
                  return Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(child: english),
                      const SizedBox(width: 16),
                      Expanded(child: tamil),
                    ],
                  );
                }
                return Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _PaneTabs(
                      value: _pane,
                      onChanged: (v) => setState(() => _pane = v),
                      englishWords: markupStats(_en.text).words,
                      tamilWords: markupStats(_ta.text).words,
                    ),
                    const SizedBox(height: 12),
                    // Both panes stay built so neither loses its scroll
                    // position or undo history when you switch languages.
                    Offstage(offstage: _pane != 'en', child: english),
                    Offstage(offstage: _pane != 'ta', child: tamil),
                  ],
                );
              },
            ),
            if (mismatched) ...[
              const SizedBox(height: 12),
              _MismatchNotice(english: englishParagraphs, tamil: tamilParagraphs),
            ],
          ],
        ),
        Positioned.fill(
          child: KeyboardMarkupBar(
            visible: _editing,
            controller: _activeController,
            focusNode: _activeFocus,
          ),
        ),
      ],
    );
  }
}

class _PaneTabs extends StatelessWidget {
  const _PaneTabs({
    required this.value,
    required this.onChanged,
    required this.englishWords,
    required this.tamilWords,
  });

  final String value;
  final ValueChanged<String> onChanged;
  final int englishWords;
  final int tamilWords;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: ShapeDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        shape: const StadiumBorder(),
      ),
      child: Row(
        children: [
          for (final (id, label, words) in [
            ('en', 'English', englishWords),
            ('ta', 'தமிழ் Tamil', tamilWords),
          ])
            Expanded(
              child: Material(
                color: value == id ? theme.colorScheme.surface : Colors.transparent,
                shape: const StadiumBorder(),
                child: InkWell(
                  customBorder: const StadiumBorder(),
                  onTap: () => onChanged(id),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          label,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            color: value == id
                                ? theme.colorScheme.onSurface
                                : theme.colorScheme.onSurfaceVariant,
                          ),
                        ),
                        if (words > 0) ...[
                          const SizedBox(width: 6),
                          Text(
                            '$words',
                            style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _Pane extends StatelessWidget {
  const _Pane({
    required this.label,
    required this.hint,
    required this.controller,
    required this.focusNode,
    required this.placeholder,
    this.useDisplayFont = false,
  });

  final String label;

  /// Shown in place of the counts while the pane is empty.
  final String hint;
  final MarkupEditingController controller;
  final FocusNode focusNode;
  final String placeholder;
  final bool useDisplayFont;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stats = markupStats(controller.text);
    final isEmpty = stats.words == 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, left: 2, right: 2),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.labelMedium?.copyWith(letterSpacing: 0.6),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              MarkupToolbar(controller: controller, focusNode: focusNode),
              const SizedBox(width: 6),
              Text(
                isEmpty ? hint : '${stats.paragraphs} ¶ · ${stats.words} words · ~${stats.minutes} min',
                style: theme.textTheme.labelSmall?.copyWith(letterSpacing: 0, fontSize: 11),
              ),
            ],
          ),
        ),
        MarkupTextArea(
          controller: controller,
          focusNode: focusNode,
          placeholder: placeholder,
          useDisplayFont: useDisplayFont,
        ),
      ],
    );
  }
}

class _MismatchNotice extends StatelessWidget {
  const _MismatchNotice({required this.english, required this.tamil});

  final int english;
  final int tamil;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final semantic = context.semanticColors;

    return AppSurface(
      elevation: SurfaceElevation.flat,
      bordered: false,
      color: semantic.accentForeground.withValues(alpha: 0.1),
      radius: AppRadii.lg,
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(top: 2),
            child: Icon(LucideIcons.triangleAlert, size: 16, color: semantic.accentForeground),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'English has $english paragraph${english == 1 ? '' : 's'} and Tamil has $tamil. '
              'The website pairs them in order, so a reader in one language will hit a blank '
              'passage. Match the counts before publishing.',
              style: theme.textTheme.bodySmall?.copyWith(color: semantic.accentForeground, height: 1.45),
            ),
          ),
        ],
      ),
    );
  }
}

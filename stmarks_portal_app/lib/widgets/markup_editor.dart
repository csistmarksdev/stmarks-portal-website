import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../core/text/rich_markup.dart';
import '../core/theme/app_theme.dart';

/// A [TextEditingController] that paints the markup as it is typed: text
/// between `**` renders bold, `__` underlined, `*` italic.
///
/// The markers stay visible (dimmed) rather than being hidden. A controller's
/// `buildTextSpan` may only restyle the text — it cannot remove characters —
/// so hiding them would leave the caret stepping through glyphs that are not
/// on screen, and selection offsets would stop matching what the writer sees.
class MarkupEditingController extends TextEditingController {
  MarkupEditingController({super.text});

  @override
  TextSpan buildTextSpan({
    required BuildContext context,
    TextStyle? style,
    required bool withComposing,
  }) {
    final base = style ?? const TextStyle();
    final theme = Theme.of(context);
    final markerStyle = base.copyWith(
      color: theme.colorScheme.primary.withValues(alpha: 0.45),
      fontWeight: FontWeight.w400,
    );

    return TextSpan(
      style: base,
      children: buildMarkupSpans(text, baseStyle: base, markerStyle: markerStyle),
    );
  }
}

/// The B / I / U row.
///
/// The buttons must not take focus: on both platforms, moving focus out of the
/// field collapses the selection, and a formatting button that clears what you
/// selected is worse than no button at all. `canRequestFocus: false` is this
/// widget's equivalent of the web editor's `onMouseDown: preventDefault`.
class MarkupToolbar extends StatelessWidget {
  const MarkupToolbar({super.key, required this.controller, required this.focusNode});

  final MarkupEditingController controller;
  final FocusNode focusNode;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final mark in MarkupMark.values)
          _MarkButton(
            mark: mark,
            active: isMarkActive(controller, mark),
            onPressed: () => applyMark(controller, focusNode, mark),
          ),
      ],
    );
  }
}

/// True when the cursor sits inside a run of [mark] — drives the pressed state
/// so the toolbar reflects the text rather than just the last button tapped.
bool isMarkActive(TextEditingController controller, MarkupMark mark) {
  final selection = controller.selection;
  if (!selection.isValid) return false;
  final text = controller.text;
  final start = selection.start.clamp(0, text.length);

  // Count unmatched openers before the caret. An odd number means we are
  // inside a run. Bold is checked before italic so `**` is not read as `*`.
  final before = text.substring(0, start);
  final pattern = switch (mark) {
    MarkupMark.bold => RegExp(r'\*\*'),
    MarkupMark.underline => RegExp('__'),
    MarkupMark.italic => RegExp(r'(?<!\*)\*(?!\*)'),
  };
  return pattern.allMatches(before).length.isOdd;
}

void applyMark(MarkupEditingController controller, FocusNode focusNode, MarkupMark mark) {
  final edit = toggleMark(controller.text, controller.selection, mark);
  controller.value = TextEditingValue(
    text: edit.text,
    selection: edit.selection,
    composing: TextRange.empty,
  );
  if (!focusNode.hasFocus) focusNode.requestFocus();
}

class _MarkButton extends StatelessWidget {
  const _MarkButton({required this.mark, required this.active, required this.onPressed});

  final MarkupMark mark;
  final bool active;
  final VoidCallback onPressed;

  static const _icons = {
    MarkupMark.bold: LucideIcons.bold,
    MarkupMark.italic: LucideIcons.italic,
    MarkupMark.underline: LucideIcons.underline,
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(right: 2),
      child: Tooltip(
        message: '${mark.label} (Ctrl+${mark.key})',
        child: Material(
          color: active ? theme.colorScheme.primary.withValues(alpha: 0.15) : Colors.transparent,
          shape: const StadiumBorder(),
          child: InkWell(
            customBorder: const StadiumBorder(),
            // Keeps the selection alive — focus must not leave the editor.
            canRequestFocus: false,
            focusNode: FocusNode(skipTraversal: true, canRequestFocus: false),
            onTap: onPressed,
            child: SizedBox(
              // A comfortable thumb target; the web version can afford 28px,
              // a phone cannot.
              width: 40,
              height: 36,
              child: Icon(
                _icons[mark],
                size: 16,
                color: active ? theme.colorScheme.primary : theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A writing surface for one language: a tall, generously-led text area with
/// the markup rendered live, plus every way of applying a mark that makes
/// sense on the device in hand.
class MarkupTextArea extends StatefulWidget {
  const MarkupTextArea({
    super.key,
    required this.controller,
    required this.focusNode,
    required this.placeholder,
    this.minLines = 10,
    this.useDisplayFont = false,
  });

  final MarkupEditingController controller;
  final FocusNode focusNode;
  final String placeholder;
  final int minLines;

  /// English body copy is set in the display face on the website; Tamil is
  /// not, because the display face has no Tamil coverage.
  final bool useDisplayFont;

  @override
  State<MarkupTextArea> createState() => _MarkupTextAreaState();
}

class _MarkupTextAreaState extends State<MarkupTextArea> {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final style = TextStyle(
      fontFamily: widget.useDisplayFont ? 'Fraunces' : 'Inter',
      fontSize: 16,
      height: 1.75,
      color: theme.colorScheme.onSurface,
    );

    return CallbackShortcuts(
      // Hardware keyboards — the same chords the web editor claims.
      bindings: {
        for (final mark in MarkupMark.values) ...{
          SingleActivator(_logicalKey(mark), control: true):
              () => applyMark(widget.controller, widget.focusNode, mark),
          SingleActivator(_logicalKey(mark), meta: true):
              () => applyMark(widget.controller, widget.focusNode, mark),
        },
      },
      child: TextField(
        controller: widget.controller,
        focusNode: widget.focusNode,
        style: style,
        maxLines: null,
        minLines: widget.minLines,
        keyboardType: TextInputType.multiline,
        textCapitalization: TextCapitalization.sentences,
        textInputAction: TextInputAction.newline,
        // Room for the writer's thumb and the floating toolbar: without this
        // the caret can end up flush against the bottom of the viewport.
        scrollPadding: const EdgeInsets.only(bottom: 140),
        decoration: InputDecoration(
          hintText: widget.placeholder,
          hintStyle: style.copyWith(color: theme.colorScheme.onSurfaceVariant.withValues(alpha: 0.7)),
          contentPadding: const EdgeInsets.fromLTRB(18, 18, 18, 18),
          filled: true,
          fillColor: theme.colorScheme.surface,
        ),
        // Bold / Italic / Underline join Cut-Copy-Paste, which is how you
        // format on a phone without hunting for a toolbar.
        contextMenuBuilder: (context, editableState) {
          final items = [
            ...editableState.contextMenuButtonItems,
            for (final mark in MarkupMark.values)
              ContextMenuButtonItem(
                label: mark.label,
                onPressed: () {
                  ContextMenuController.removeAny();
                  applyMark(widget.controller, widget.focusNode, mark);
                },
              ),
          ];
          return AdaptiveTextSelectionToolbar.buttonItems(
            anchors: editableState.contextMenuAnchors,
            buttonItems: items,
          );
        },
      ),
    );
  }

  LogicalKeyboardKey _logicalKey(MarkupMark mark) => switch (mark) {
        MarkupMark.bold => LogicalKeyboardKey.keyB,
        MarkupMark.italic => LogicalKeyboardKey.keyI,
        MarkupMark.underline => LogicalKeyboardKey.keyU,
      };
}

/// The B/I/U bar, docked just above the keyboard while the editor has focus.
///
/// A toolbar at the top of a long article scrolls out of reach after the first
/// screenful. This one rides the keyboard, so it is under the writer's thumb
/// wherever they are in the piece.
class KeyboardMarkupBar extends StatelessWidget {
  const KeyboardMarkupBar({
    super.key,
    required this.visible,
    required this.controller,
    required this.focusNode,
  });

  final bool visible;
  final MarkupEditingController controller;
  final FocusNode focusNode;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (!visible) return const SizedBox.shrink();

    return Align(
      alignment: Alignment.bottomCenter,
      child: Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.viewInsetsOf(context).bottom + 12),
        child: DecoratedBox(
          decoration: ShapeDecoration(shape: const StadiumBorder(), shadows: floatingShadow(context)),
          child: Material(
            color: theme.colorScheme.surface,
            shape: StadiumBorder(
              side: BorderSide(color: theme.colorScheme.outline.withValues(alpha: 0.8)),
            ),
            clipBehavior: Clip.antiAlias,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 4),
              child: ListenableBuilder(
                listenable: controller,
                builder: (context, _) => MarkupToolbar(controller: controller, focusNode: focusNode),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

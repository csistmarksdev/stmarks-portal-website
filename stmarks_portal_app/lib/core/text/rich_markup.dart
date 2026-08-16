/// Inline formatting for body copy — the Flutter app's half of the syntax.
///
/// **This mirrors `frontend/src/lib/rich-text.tsx` and must stay in step with
/// it.** The projects share no package, so the syntax is duplicated rather
/// than imported; if one side gains a mark the others must too, or a post
/// written on the phone renders differently on the website.
///
///     **bold**      __underline__      *italic*
///
/// Emphasis lives inside the stored string because `body` is a list of
/// `LocalizedText` — plain strings — and that response shape is fixed.
/// Nothing about the API changes to support formatting.
library;

import 'package:flutter/material.dart';

import '../models/common.dart';

const String kBoldMarker = '**';
const String kUnderlineMarker = '__';
const String kItalicMarker = '*';

enum MarkupMark {
  bold(kBoldMarker, 'Bold', 'B'),
  italic(kItalicMarker, 'Italic', 'I'),
  underline(kUnderlineMarker, 'Underline', 'U');

  const MarkupMark(this.marker, this.label, this.key);

  final String marker;
  final String label;

  /// The letter this mark is bound to with Ctrl/Cmd.
  final String key;
}

/// Order matters: `**` is tried before `*`, so bold is not read as an italic
/// run. The negative lookahead on the closing marker is what makes nesting
/// work — bold text ending in an italic run produces `**a *b***`, and without
/// it the lazy match stops at the first `**` of that `***`.
final List<(MarkupMark, RegExp)> _rules = [
  (MarkupMark.bold, RegExp(r'\*\*([\s\S]+?)\*\*(?!\*)')),
  (MarkupMark.underline, RegExp(r'__([\s\S]+?)__(?!_)')),
  (MarkupMark.italic, RegExp(r'\*([\s\S]+?)\*')),
];

/// Strips markers — for word counts and other plain-text uses.
String stripMarkers(String text) {
  var out = text;
  for (final (_, pattern) in _rules) {
    out = out.replaceAllMapped(pattern, (m) => m.group(1)!);
  }
  return out;
}

/// Parses [text] into styled spans.
///
/// When [markerStyle] is given the markers themselves are kept in the output
/// (dimmed) — that is what an editing field needs, since hiding characters
/// the user can still move a caret through desynchronises the selection from
/// the text. Pass null to drop them, for a read-only preview.
List<InlineSpan> buildMarkupSpans(
  String text, {
  required TextStyle baseStyle,
  TextStyle? markerStyle,
}) {
  List<InlineSpan> parse(String input, TextStyle style) {
    (MarkupMark, RegExpMatch)? earliest;
    for (final (mark, pattern) in _rules) {
      final match = pattern.firstMatch(input);
      if (match == null) continue;
      if (earliest == null || match.start < earliest.$2.start) {
        earliest = (mark, match);
      }
    }

    if (earliest == null) {
      return input.isEmpty ? const [] : [TextSpan(text: input, style: style)];
    }

    final (mark, match) = earliest;
    final inner = switch (mark) {
      MarkupMark.bold => style.copyWith(fontWeight: FontWeight.w700),
      MarkupMark.italic => style.copyWith(fontStyle: FontStyle.italic),
      MarkupMark.underline => style.copyWith(decoration: TextDecoration.underline),
    };

    return [
      ...parse(input.substring(0, match.start), style),
      if (markerStyle != null) TextSpan(text: mark.marker, style: markerStyle),
      ...parse(match.group(1)!, inner),
      if (markerStyle != null) TextSpan(text: mark.marker, style: markerStyle),
      ...parse(input.substring(match.end), style),
    ];
  }

  return parse(text, baseStyle);
}

/// The result of toggling a mark: the new text and where the caret/selection
/// should end up.
typedef MarkupEdit = ({String text, TextSelection selection});

/// Wraps the selected range in [mark]'s markers, or unwraps it if the range is
/// already wrapped. With an empty selection it inserts an empty pair and puts
/// the caret between them, so the writer can just carry on typing.
MarkupEdit toggleMark(String text, TextSelection selection, MarkupMark mark) {
  final marker = mark.marker;
  final start = selection.start.clamp(0, text.length);
  final end = selection.end.clamp(0, text.length);

  if (start == end) {
    final inserted = text.replaceRange(start, start, '$marker$marker');
    return (
      text: inserted,
      selection: TextSelection.collapsed(offset: start + marker.length),
    );
  }

  final selected = text.substring(start, end);

  // Already wrapped from the inside: `**|bold|**` → drop the markers.
  if (selected.length >= marker.length * 2 &&
      selected.startsWith(marker) &&
      selected.endsWith(marker)) {
    final bare = selected.substring(marker.length, selected.length - marker.length);
    return (
      text: text.replaceRange(start, end, bare),
      selection: TextSelection(baseOffset: start, extentOffset: start + bare.length),
    );
  }

  // Already wrapped from the outside: `**|bold|**` with the markers sitting
  // just beyond the selection — drop those instead of nesting a second pair.
  final before = text.substring(0, start);
  final after = text.substring(end);
  if (before.endsWith(marker) && after.startsWith(marker)) {
    final stripped = before.substring(0, before.length - marker.length) +
        selected +
        after.substring(marker.length);
    return (
      text: stripped,
      selection: TextSelection(
        baseOffset: start - marker.length,
        extentOffset: start - marker.length + selected.length,
      ),
    );
  }

  final wrapped = text.replaceRange(start, end, '$marker$selected$marker');
  return (
    text: wrapped,
    selection: TextSelection(
      baseOffset: start + marker.length,
      extentOffset: start + marker.length + selected.length,
    ),
  );
}

// ---------------------------------------------------------------------------
// Paragraphs ⇄ continuous prose
// ---------------------------------------------------------------------------

/// The API stores a post body as a list of `LocalizedText` — one entry per
/// paragraph, carrying both languages. That is the right shape to serve and a
/// miserable shape to write into, so the editor works in continuous prose with
/// a blank line between paragraphs and converts at the boundary.
String paragraphsToText(List<LocalizedText> body, String locale) {
  return body.map((p) => locale == 'ta' ? p.ta : p.en).join('\n\n');
}

List<String> splitParagraphs(String text) {
  return text
      .split(RegExp(r'\n\s*\n'))
      .map((p) => p.trim())
      .where((p) => p.isNotEmpty)
      .toList();
}

/// Zips the two languages back into the stored shape. Where one language has
/// fewer paragraphs the missing entries become empty strings rather than being
/// dropped, so paragraph *n* refers to the same passage in both — the website
/// renders them by index.
List<LocalizedText> textToParagraphs(String englishText, String tamilText) {
  final english = splitParagraphs(englishText);
  final tamil = splitParagraphs(tamilText);
  final length = english.length > tamil.length ? english.length : tamil.length;

  return List.generate(
    length,
    (i) => LocalizedText(
      en: i < english.length ? english[i] : '',
      ta: i < tamil.length ? tamil[i] : '',
    ),
  );
}

/// Word / paragraph / reading-time counts, taken on the prose rather than the
/// markers so emphasis never inflates a count. The minutes formula matches the
/// server's estimate so the app and the website agree.
({int words, int paragraphs, int minutes}) markupStats(String text) {
  final words = stripMarkers(text).split(RegExp(r'\s+')).where((w) => w.isNotEmpty).length;
  return (
    words: words,
    paragraphs: splitParagraphs(text).length,
    minutes: (words / 200).round().clamp(1, 1 << 30),
  );
}

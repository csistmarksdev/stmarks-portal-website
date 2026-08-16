import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:csi_portal/core/models/common.dart';
import 'package:csi_portal/core/text/rich_markup.dart';

TextSelection sel(int a, int b) => TextSelection(baseOffset: a, extentOffset: b);

void main() {
  group('stripMarkers', () {
    test('removes every mark, including nested', () {
      expect(stripMarkers('**bold** and *italic* and __under__'), 'bold and italic and under');
      expect(stripMarkers('**a *b***'), 'a b');
      expect(stripMarkers('plain'), 'plain');
    });
  });

  group('toggleMark', () {
    test('wraps a selection', () {
      final r = toggleMark('hello world', sel(0, 5), MarkupMark.bold);
      expect(r.text, '**hello** world');
      expect(r.selection.start, 2);
      expect(r.selection.end, 7);
    });

    test('unwraps when the selection includes the markers', () {
      final r = toggleMark('**hello** world', sel(0, 9), MarkupMark.bold);
      expect(r.text, 'hello world');
    });

    test('unwraps when the markers sit just outside the selection', () {
      final r = toggleMark('**hello** world', sel(2, 7), MarkupMark.bold);
      expect(r.text, 'hello world');
      expect(r.selection.start, 0);
      expect(r.selection.end, 5);
    });

    test('empty selection inserts a pair with the caret between', () {
      final r = toggleMark('ab', const TextSelection.collapsed(offset: 1), MarkupMark.italic);
      expect(r.text, 'a**b');
      expect(r.selection.baseOffset, 2);
      expect(r.selection.isCollapsed, isTrue);
    });

    test('underline and italic use their own markers', () {
      expect(toggleMark('x', sel(0, 1), MarkupMark.underline).text, '__x__');
      expect(toggleMark('x', sel(0, 1), MarkupMark.italic).text, '*x*');
    });
  });

  group('buildMarkupSpans', () {
    TextStyle styleOf(List<InlineSpan> spans, String text) {
      TextStyle? found;
      void walk(InlineSpan s) {
        if (s is TextSpan) {
          if (s.text == text) found = s.style;
          for (final c in s.children ?? const <InlineSpan>[]) {
            walk(c);
          }
        }
      }
      for (final s in spans) {
        walk(s);
      }
      return found!;
    }

    test('applies weight, slant and decoration', () {
      const base = TextStyle(fontSize: 16);
      final spans = buildMarkupSpans('**b** *i* __u__', baseStyle: base);
      expect(styleOf(spans, 'b').fontWeight, FontWeight.w700);
      expect(styleOf(spans, 'i').fontStyle, FontStyle.italic);
      expect(styleOf(spans, 'u').decoration, TextDecoration.underline);
    });

    test('bold wins over italic on a double marker', () {
      const base = TextStyle();
      final spans = buildMarkupSpans('**bold**', baseStyle: base);
      expect(styleOf(spans, 'bold').fontWeight, FontWeight.w700);
      expect(styleOf(spans, 'bold').fontStyle, isNot(FontStyle.italic));
    });

    test('keeps markers only when a marker style is supplied', () {
      const base = TextStyle();
      final withMarkers = buildMarkupSpans('**b**', baseStyle: base, markerStyle: base);
      final plain = buildMarkupSpans('**b**', baseStyle: base);
      String flatten(List<InlineSpan> s) => s.map((e) => (e as TextSpan).text ?? '').join();
      expect(flatten(withMarkers), '**b**');
      expect(flatten(plain), 'b');
    });
  });

  group('paragraph round-trip', () {
    test('splits on blank lines and zips both languages by index', () {
      final paras = textToParagraphs('one\n\ntwo', 'ஒன்று\n\nஇரண்டு');
      expect(paras.length, 2);
      expect(paras[0].en, 'one');
      expect(paras[0].ta, 'ஒன்று');
      expect(paras[1].en, 'two');
    });

    test('pads the shorter language so indexes stay aligned', () {
      final paras = textToParagraphs('one\n\ntwo\n\nthree', 'ஒன்று');
      expect(paras.length, 3);
      expect(paras[1].ta, '');
      expect(paras[2].en, 'three');
    });

    test('round-trips through paragraphsToText', () {
      const body = [
        LocalizedText(en: 'first **para**', ta: 'ஒன்று'),
        LocalizedText(en: 'second', ta: 'இரண்டு'),
      ];
      final en = paragraphsToText(body, 'en');
      final ta = paragraphsToText(body, 'ta');
      expect(en, 'first **para**\n\nsecond');
      final back = textToParagraphs(en, ta);
      expect(back.length, 2);
      expect(back[0].en, 'first **para**');
      expect(back[1].ta, 'இரண்டு');
    });
  });

  group('markupStats', () {
    test('counts prose, not markers', () {
      final s = markupStats('**two** words');
      expect(s.words, 2);
      expect(s.paragraphs, 1);
      expect(s.minutes, 1);
    });

    test('counts paragraphs split by blank lines', () {
      expect(markupStats('a\n\nb\n\nc').paragraphs, 3);
    });
  });
}

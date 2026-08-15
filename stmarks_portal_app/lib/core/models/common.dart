/// Core shared shapes — mirrors `Portal-Docker/shared/src/common.ts`.
library;

/// A field the API returns in every supported language.
class LocalizedText {
  const LocalizedText({required this.en, required this.ta});

  final String en;
  final String ta;

  static const empty = LocalizedText(en: '', ta: '');

  factory LocalizedText.fromJson(Map<String, dynamic>? json) {
    if (json == null) return empty;
    return LocalizedText(en: json['en'] as String? ?? '', ta: json['ta'] as String? ?? '');
  }

  Map<String, dynamic> toJson() => {'en': en, 'ta': ta};

  LocalizedText copyWith({String? en, String? ta}) =>
      LocalizedText(en: en ?? this.en, ta: ta ?? this.ta);

  bool get isEmpty => en.trim().isEmpty && ta.trim().isEmpty;
}

class ImageAsset {
  const ImageAsset({
    required this.url,
    required this.alt,
    required this.width,
    required this.height,
    this.blurDataURL,
  });

  final String url;
  final LocalizedText alt;
  final int width;
  final int height;
  final String? blurDataURL;

  factory ImageAsset.fromJson(Map<String, dynamic> json) => ImageAsset(
    url: json['url'] as String? ?? '',
    alt: LocalizedText.fromJson(json['alt'] as Map<String, dynamic>?),
    width: (json['width'] as num?)?.toInt() ?? 0,
    height: (json['height'] as num?)?.toInt() ?? 0,
    blurDataURL: json['blurDataURL'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'url': url,
    'alt': alt.toJson(),
    'width': width,
    'height': height,
    if (blurDataURL != null) 'blurDataURL': blurDataURL,
  };
}

class Paginated<T> {
  const Paginated({
    required this.items,
    required this.total,
    required this.page,
    required this.pageSize,
    required this.hasMore,
  });

  final List<T> items;
  final int total;
  final int page;
  final int pageSize;
  final bool hasMore;

  factory Paginated.fromJson(Map<String, dynamic> json, T Function(Map<String, dynamic>) fromJson) {
    return Paginated(
      items: (json['items'] as List<dynamic>? ?? [])
          .map((e) => fromJson(e as Map<String, dynamic>))
          .toList(),
      total: (json['total'] as num?)?.toInt() ?? 0,
      page: (json['page'] as num?)?.toInt() ?? 1,
      pageSize: (json['pageSize'] as num?)?.toInt() ?? 20,
      hasMore: json['hasMore'] as bool? ?? false,
    );
  }
}

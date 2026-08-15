/// Public content models — mirrors `Portal-Docker/shared/src/content.ts`.
library;

import 'common.dart';

const List<String> kFellowshipSlugs = [
  'youth-fellowship',
  'young-couple-fellowship',
  'sunday-school',
  'choir',
  'womens-fellowship',
  'mens-fellowship',
  'prayer-fellowship',
  'other-fellowships',
];

const Map<String, String> kFellowshipLabels = {
  'youth-fellowship': 'Youth Fellowship',
  'young-couple-fellowship': 'Young Couple Fellowship',
  'sunday-school': 'Sunday School',
  'choir': 'Choir',
  'womens-fellowship': "Women's Fellowship",
  'mens-fellowship': "Men's Fellowship",
  'prayer-fellowship': 'Prayer Fellowship',
  'other-fellowships': 'Other Fellowships',
};

const List<String> kPublishStatuses = ['draft', 'published', 'archived'];

/// Common fields every content record carries, plus the admin-only
/// `status` (omitted by public endpoints).
abstract class BaseEntity {
  BaseEntity({
    required this.id,
    required this.slug,
    required this.createdAt,
    required this.updatedAt,
    this.status,
  });

  final String id;
  final String slug;
  final String createdAt;
  final String updatedAt;
  final String? status;
}

class ServiceTiming {
  const ServiceTiming({
    required this.id,
    required this.day,
    required this.time,
    required this.service,
    required this.venue,
  });

  final String id;
  final LocalizedText day;
  final LocalizedText time;
  final LocalizedText service;
  final LocalizedText venue;

  factory ServiceTiming.fromJson(Map<String, dynamic> json) => ServiceTiming(
    id: json['id'] as String? ?? '',
    day: LocalizedText.fromJson(json['day'] as Map<String, dynamic>?),
    time: LocalizedText.fromJson(json['time'] as Map<String, dynamic>?),
    service: LocalizedText.fromJson(json['service'] as Map<String, dynamic>?),
    venue: LocalizedText.fromJson(json['venue'] as Map<String, dynamic>?),
  );

  Map<String, dynamic> toJson() => {
    if (id.isNotEmpty) 'id': id,
    'day': day.toJson(),
    'time': time.toJson(),
    'service': service.toJson(),
    'venue': venue.toJson(),
  };

  ServiceTiming copyWith({LocalizedText? day, LocalizedText? time, LocalizedText? service, LocalizedText? venue}) =>
      ServiceTiming(
        id: id,
        day: day ?? this.day,
        time: time ?? this.time,
        service: service ?? this.service,
        venue: venue ?? this.venue,
      );
}

class FellowshipCommitteeMember {
  const FellowshipCommitteeMember({
    required this.id,
    required this.name,
    required this.designation,
    this.image,
  });

  final String id;
  final LocalizedText name;
  final LocalizedText designation;
  final ImageAsset? image;

  factory FellowshipCommitteeMember.fromJson(Map<String, dynamic> json) => FellowshipCommitteeMember(
    id: json['id'] as String? ?? '',
    name: LocalizedText.fromJson(json['name'] as Map<String, dynamic>?),
    designation: LocalizedText.fromJson(json['designation'] as Map<String, dynamic>?),
    image: json['image'] != null ? ImageAsset.fromJson(json['image'] as Map<String, dynamic>) : null,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name.toJson(),
    'designation': designation.toJson(),
    if (image != null) 'image': image!.toJson(),
  };

  FellowshipCommitteeMember copyWith({
    LocalizedText? name,
    LocalizedText? designation,
    ImageAsset? image,
  }) => FellowshipCommitteeMember(
    id: id,
    name: name ?? this.name,
    designation: designation ?? this.designation,
    image: image ?? this.image,
  );
}

class FellowshipCoordinator {
  const FellowshipCoordinator({required this.name, this.phone, this.email});

  final LocalizedText name;
  final String? phone;
  final String? email;

  factory FellowshipCoordinator.fromJson(Map<String, dynamic>? json) {
    if (json == null) return FellowshipCoordinator(name: LocalizedText.empty);
    return FellowshipCoordinator(
      name: LocalizedText.fromJson(json['name'] as Map<String, dynamic>?),
      phone: json['phone'] as String?,
      email: json['email'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
    'name': name.toJson(),
    if (phone != null && phone!.isNotEmpty) 'phone': phone,
    if (email != null && email!.isNotEmpty) 'email': email,
  };

  FellowshipCoordinator copyWith({LocalizedText? name, String? phone, String? email}) =>
      FellowshipCoordinator(name: name ?? this.name, phone: phone ?? this.phone, email: email ?? this.email);
}

class Fellowship extends BaseEntity {
  Fellowship({
    required super.id,
    required super.slug,
    required super.createdAt,
    required super.updatedAt,
    super.status,
    required this.name,
    required this.tagline,
    required this.about,
    required this.vision,
    required this.schedule,
    this.memberCount,
    required this.banner,
    required this.committee,
    required this.coordinator,
    required this.order,
  });

  final LocalizedText name;
  final LocalizedText tagline;
  final List<LocalizedText> about;
  final LocalizedText vision;
  final LocalizedText schedule;
  final int? memberCount;
  final ImageAsset? banner;
  final List<FellowshipCommitteeMember> committee;
  final FellowshipCoordinator coordinator;
  final int order;

  factory Fellowship.fromJson(Map<String, dynamic> json) => Fellowship(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    status: json['status'] as String?,
    name: LocalizedText.fromJson(json['name'] as Map<String, dynamic>?),
    tagline: LocalizedText.fromJson(json['tagline'] as Map<String, dynamic>?),
    about: (json['about'] as List<dynamic>? ?? [])
        .map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?))
        .toList(),
    vision: LocalizedText.fromJson(json['vision'] as Map<String, dynamic>?),
    schedule: LocalizedText.fromJson(json['schedule'] as Map<String, dynamic>?),
    memberCount: (json['memberCount'] as num?)?.toInt(),
    banner: json['banner'] != null ? ImageAsset.fromJson(json['banner'] as Map<String, dynamic>) : null,
    committee: (json['committee'] as List<dynamic>? ?? [])
        .map((e) => FellowshipCommitteeMember.fromJson(e as Map<String, dynamic>))
        .toList(),
    coordinator: FellowshipCoordinator.fromJson(json['coordinator'] as Map<String, dynamic>?),
    order: (json['order'] as num?)?.toInt() ?? 0,
  );

  Map<String, dynamic> toJson() => {
    'slug': slug,
    'name': name.toJson(),
    'tagline': tagline.toJson(),
    'about': about.map((e) => e.toJson()).toList(),
    'vision': vision.toJson(),
    'schedule': schedule.toJson(),
    if (memberCount != null) 'memberCount': memberCount,
    if (banner != null) 'banner': banner!.toJson(),
    'committee': committee.map((e) => e.toJson()).toList(),
    'coordinator': coordinator.toJson(),
    'order': order,
  };
}

class ChurchEvent extends BaseEntity {
  ChurchEvent({
    required super.id,
    required super.slug,
    required super.createdAt,
    required super.updatedAt,
    super.status,
    required this.title,
    required this.summary,
    required this.description,
    required this.startDate,
    this.endDate,
    required this.location,
    this.image,
    this.fellowshipSlug,
    this.organiser,
    required this.featured,
  });

  final LocalizedText title;
  final LocalizedText summary;
  final List<LocalizedText> description;
  final String startDate;
  final String? endDate;
  final LocalizedText location;
  final ImageAsset? image;
  final String? fellowshipSlug;
  final LocalizedText? organiser;
  final bool featured;

  factory ChurchEvent.fromJson(Map<String, dynamic> json) => ChurchEvent(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    status: json['status'] as String?,
    title: LocalizedText.fromJson(json['title'] as Map<String, dynamic>?),
    summary: LocalizedText.fromJson(json['summary'] as Map<String, dynamic>?),
    description: (json['description'] as List<dynamic>? ?? [])
        .map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?))
        .toList(),
    startDate: json['startDate'] as String? ?? '',
    endDate: json['endDate'] as String?,
    location: LocalizedText.fromJson(json['location'] as Map<String, dynamic>?),
    image: json['image'] != null ? ImageAsset.fromJson(json['image'] as Map<String, dynamic>) : null,
    fellowshipSlug: json['fellowshipSlug'] as String?,
    organiser: json['organiser'] != null
        ? LocalizedText.fromJson(json['organiser'] as Map<String, dynamic>?)
        : null,
    featured: json['featured'] as bool? ?? false,
  );

  Map<String, dynamic> toJson() => {
    'title': title.toJson(),
    'summary': summary.toJson(),
    'description': description.map((e) => e.toJson()).toList(),
    'startDate': startDate,
    if (endDate != null && endDate!.isNotEmpty) 'endDate': endDate,
    'location': location.toJson(),
    if (image != null) 'image': image!.toJson(),
    if (fellowshipSlug != null && fellowshipSlug!.isNotEmpty) 'fellowshipSlug': fellowshipSlug,
    if (organiser != null) 'organiser': organiser!.toJson(),
    'featured': featured,
  };
}

class BlogPost extends BaseEntity {
  BlogPost({
    required super.id,
    required super.slug,
    required super.createdAt,
    required super.updatedAt,
    super.status,
    required this.title,
    required this.excerpt,
    required this.body,
    required this.publishedAt,
    required this.author,
    this.coverImage,
    this.eventSlug,
    this.fellowshipSlug,
    this.readingMinutes,
  });

  final LocalizedText title;
  final LocalizedText excerpt;
  final List<LocalizedText> body;
  final String publishedAt;
  final LocalizedText author;
  final ImageAsset? coverImage;
  final String? eventSlug;
  final String? fellowshipSlug;
  final int? readingMinutes;

  factory BlogPost.fromJson(Map<String, dynamic> json) => BlogPost(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    status: json['status'] as String?,
    title: LocalizedText.fromJson(json['title'] as Map<String, dynamic>?),
    excerpt: LocalizedText.fromJson(json['excerpt'] as Map<String, dynamic>?),
    body: (json['body'] as List<dynamic>? ?? [])
        .map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?))
        .toList(),
    publishedAt: json['publishedAt'] as String? ?? '',
    author: LocalizedText.fromJson(json['author'] as Map<String, dynamic>?),
    coverImage:
        json['coverImage'] != null ? ImageAsset.fromJson(json['coverImage'] as Map<String, dynamic>) : null,
    eventSlug: json['eventSlug'] as String?,
    fellowshipSlug: json['fellowshipSlug'] as String?,
    readingMinutes: (json['readingMinutes'] as num?)?.toInt(),
  );

  Map<String, dynamic> toJson() => {
    'title': title.toJson(),
    'excerpt': excerpt.toJson(),
    'body': body.map((e) => e.toJson()).toList(),
    'publishedAt': publishedAt,
    'author': author.toJson(),
    if (coverImage != null) 'coverImage': coverImage!.toJson(),
    if (eventSlug != null && eventSlug!.isNotEmpty) 'eventSlug': eventSlug,
    if (fellowshipSlug != null && fellowshipSlug!.isNotEmpty) 'fellowshipSlug': fellowshipSlug,
  };
}

class GalleryVideo {
  const GalleryVideo({required this.url, this.provider});

  final String url;
  final String? provider;

  factory GalleryVideo.fromJson(Map<String, dynamic> json) =>
      GalleryVideo(url: json['url'] as String? ?? '', provider: json['provider'] as String?);

  Map<String, dynamic> toJson() => {'url': url, if (provider != null) 'provider': provider};
}

class GalleryPhoto {
  const GalleryPhoto({required this.id, required this.image, this.caption, this.video});

  final String id;
  final ImageAsset image;
  final LocalizedText? caption;
  final GalleryVideo? video;

  factory GalleryPhoto.fromJson(Map<String, dynamic> json) => GalleryPhoto(
    id: json['id'] as String? ?? '',
    image: ImageAsset.fromJson(json['image'] as Map<String, dynamic>? ?? {}),
    caption: json['caption'] != null ? LocalizedText.fromJson(json['caption'] as Map<String, dynamic>?) : null,
    video: json['video'] != null ? GalleryVideo.fromJson(json['video'] as Map<String, dynamic>) : null,
  );

  Map<String, dynamic> toJson() => {
    'image': image.toJson(),
    if (caption != null) 'caption': caption!.toJson(),
    if (video != null) 'video': video!.toJson(),
  };
}

class GalleryAlbum extends BaseEntity {
  GalleryAlbum({
    required super.id,
    required super.slug,
    required super.createdAt,
    required super.updatedAt,
    super.status,
    required this.title,
    this.description,
    required this.date,
    required this.cover,
    required this.photos,
    this.fellowshipSlug,
    this.shared,
  });

  final LocalizedText title;
  final LocalizedText? description;
  final String date;
  final ImageAsset? cover;
  final List<GalleryPhoto> photos;
  final String? fellowshipSlug;
  final bool? shared;

  factory GalleryAlbum.fromJson(Map<String, dynamic> json) => GalleryAlbum(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    status: json['status'] as String?,
    title: LocalizedText.fromJson(json['title'] as Map<String, dynamic>?),
    description: json['description'] != null
        ? LocalizedText.fromJson(json['description'] as Map<String, dynamic>?)
        : null,
    date: json['date'] as String? ?? '',
    cover: json['cover'] != null ? ImageAsset.fromJson(json['cover'] as Map<String, dynamic>) : null,
    photos: (json['photos'] as List<dynamic>? ?? [])
        .map((e) => GalleryPhoto.fromJson(e as Map<String, dynamic>))
        .toList(),
    fellowshipSlug: json['fellowshipSlug'] as String?,
    shared: json['shared'] as bool?,
  );

  Map<String, dynamic> toJson() => {
    'title': title.toJson(),
    if (description != null) 'description': description!.toJson(),
    'date': date,
    if (cover != null) 'cover': cover!.toJson(),
    if (fellowshipSlug != null && fellowshipSlug!.isNotEmpty) 'fellowshipSlug': fellowshipSlug,
    'shared': shared ?? false,
  };
}

class Announcement extends BaseEntity {
  Announcement({
    required super.id,
    required super.slug,
    required super.createdAt,
    required super.updatedAt,
    super.status,
    required this.title,
    required this.body,
    required this.publishedAt,
    required this.pinned,
    this.fellowshipSlug,
  });

  final LocalizedText title;
  final LocalizedText body;
  final String publishedAt;
  final bool pinned;
  final String? fellowshipSlug;

  factory Announcement.fromJson(Map<String, dynamic> json) => Announcement(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    status: json['status'] as String?,
    title: LocalizedText.fromJson(json['title'] as Map<String, dynamic>?),
    body: LocalizedText.fromJson(json['body'] as Map<String, dynamic>?),
    publishedAt: json['publishedAt'] as String? ?? '',
    pinned: json['pinned'] as bool? ?? false,
    fellowshipSlug: json['fellowshipSlug'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'title': title.toJson(),
    'body': body.toJson(),
    'publishedAt': publishedAt,
    'pinned': pinned,
    if (fellowshipSlug != null && fellowshipSlug!.isNotEmpty) 'fellowshipSlug': fellowshipSlug,
  };
}

const List<String> kDownloadCategories = ['bulletin', 'form', 'document'];

class DownloadFile extends BaseEntity {
  DownloadFile({
    required super.id,
    required super.slug,
    required super.createdAt,
    required super.updatedAt,
    super.status,
    required this.title,
    this.description,
    required this.category,
    required this.fileUrl,
    required this.format,
    required this.size,
    required this.publishedAt,
    this.fellowshipSlug,
  });

  final LocalizedText title;
  final LocalizedText? description;
  final String category;
  final String fileUrl;
  final String format;
  final String size;
  final String publishedAt;
  final String? fellowshipSlug;

  factory DownloadFile.fromJson(Map<String, dynamic> json) => DownloadFile(
    id: json['id'] as String? ?? '',
    slug: json['slug'] as String? ?? '',
    createdAt: json['createdAt'] as String? ?? '',
    updatedAt: json['updatedAt'] as String? ?? '',
    status: json['status'] as String?,
    title: LocalizedText.fromJson(json['title'] as Map<String, dynamic>?),
    description: json['description'] != null
        ? LocalizedText.fromJson(json['description'] as Map<String, dynamic>?)
        : null,
    category: json['category'] as String? ?? 'document',
    fileUrl: json['fileUrl'] as String? ?? '',
    format: json['format'] as String? ?? '',
    size: json['size'] as String? ?? '',
    publishedAt: json['publishedAt'] as String? ?? '',
    fellowshipSlug: json['fellowshipSlug'] as String?,
  );

  Map<String, dynamic> toJson() => {
    'title': title.toJson(),
    if (description != null) 'description': description!.toJson(),
    'category': category,
    'fileUrl': fileUrl,
    'format': format,
    'size': size,
    'publishedAt': publishedAt,
    if (fellowshipSlug != null && fellowshipSlug!.isNotEmpty) 'fellowshipSlug': fellowshipSlug,
  };
}

class PastorMessage {
  const PastorMessage({
    required this.authorName,
    required this.authorRole,
    this.authorImage,
    required this.excerpt,
    required this.body,
  });

  final LocalizedText authorName;
  final LocalizedText authorRole;
  final ImageAsset? authorImage;
  final LocalizedText excerpt;
  final List<LocalizedText> body;

  factory PastorMessage.fromJson(Map<String, dynamic> json) => PastorMessage(
    authorName: LocalizedText.fromJson(json['authorName'] as Map<String, dynamic>?),
    authorRole: LocalizedText.fromJson(json['authorRole'] as Map<String, dynamic>?),
    authorImage:
        json['authorImage'] != null ? ImageAsset.fromJson(json['authorImage'] as Map<String, dynamic>) : null,
    excerpt: LocalizedText.fromJson(json['excerpt'] as Map<String, dynamic>?),
    body: (json['body'] as List<dynamic>? ?? [])
        .map((e) => LocalizedText.fromJson(e as Map<String, dynamic>?))
        .toList(),
  );

  Map<String, dynamic> toJson() => {
    'authorName': authorName.toJson(),
    'authorRole': authorRole.toJson(),
    if (authorImage != null) 'authorImage': authorImage!.toJson(),
    'excerpt': excerpt.toJson(),
    'body': body.map((e) => e.toJson()).toList(),
  };

  PastorMessage copyWith({
    LocalizedText? authorName,
    LocalizedText? authorRole,
    ImageAsset? authorImage,
    LocalizedText? excerpt,
    List<LocalizedText>? body,
  }) => PastorMessage(
    authorName: authorName ?? this.authorName,
    authorRole: authorRole ?? this.authorRole,
    authorImage: authorImage ?? this.authorImage,
    excerpt: excerpt ?? this.excerpt,
    body: body ?? this.body,
  );
}

class WeeklyVerse {
  const WeeklyVerse({required this.reference, required this.text, required this.weekOf});

  final LocalizedText reference;
  final LocalizedText text;
  final String weekOf;

  factory WeeklyVerse.fromJson(Map<String, dynamic> json) => WeeklyVerse(
    reference: LocalizedText.fromJson(json['reference'] as Map<String, dynamic>?),
    text: LocalizedText.fromJson(json['text'] as Map<String, dynamic>?),
    weekOf: json['weekOf'] as String? ?? '',
  );

  Map<String, dynamic> toJson() => {'reference': reference.toJson(), 'text': text.toJson(), 'weekOf': weekOf};

  WeeklyVerse copyWith({LocalizedText? reference, LocalizedText? text, String? weekOf}) =>
      WeeklyVerse(reference: reference ?? this.reference, text: text ?? this.text, weekOf: weekOf ?? this.weekOf);
}

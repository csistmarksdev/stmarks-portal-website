/// The app's Privacy Policy and Terms of Use.
///
/// Written to describe what this build *actually* does — the local store keeps
/// only the server address, the two auth tokens and the theme/locale
/// preference; the manifest asks for nothing but `INTERNET` and
/// `ACCESS_NETWORK_STATE`; there is no analytics or advertising SDK linked in.
/// If any of that changes, this file has to change with it, or it becomes a
/// false statement rather than a stale one.
///
/// The `[…]` placeholders are the details only the parish can supply. They are
/// rendered verbatim so nobody can mistake an unfilled policy for a finished
/// one.
library;

class LegalDocument {
  const LegalDocument({
    required this.slug,
    required this.title,
    required this.summary,
    required this.lastUpdated,
    required this.sections,
  });

  final String slug;
  final String title;

  /// One line under the title — what this document is for, in plain words.
  final String summary;
  final String lastUpdated;
  final List<LegalSection> sections;
}

class LegalSection {
  const LegalSection({required this.heading, this.body = const [], this.bullets = const []});

  final String heading;
  final List<String> body;
  final List<String> bullets;
}

const String kLegalContactPlaceholder = '[parish office email]';

/// Shown in Settings. Kept in step with `version:` in pubspec.yaml by hand —
/// bump both together.
const String kAppVersion = '1.5.0';
const String _kLastUpdated = '16 August 2026';

const privacyPolicy = LegalDocument(
  slug: 'privacy',
  title: 'Privacy Policy',
  summary: 'What this app stores, what it sends, and what it never touches.',
  lastUpdated: _kLastUpdated,
  sections: [
    LegalSection(
      heading: 'Who this is for',
      body: [
        'The CSI St. Mark\'s Portal app is an administration tool for the staff and volunteers who look '
            'after the parish website. It is not a public app: you can only use it with an account issued '
            'to you by the parish.',
        'Throughout this policy, "the parish" means CSI St. Mark\'s Church, Madipakkam, and "the server" '
            'means the Portal server whose address you enter when you first open the app.',
      ],
    ),
    LegalSection(
      heading: 'What the app keeps on your device',
      body: ['The app stores a small amount of data locally so you do not have to sign in every time:'],
      bullets: [
        'The server address you entered.',
        'Your sign-in tokens, so the app can stay signed in.',
        'Your theme choice (light, dark or automatic) and language preference.',
        'A cache of images already shown to you, so lists load quickly.',
      ],
    ),
    LegalSection(
      heading: 'How that local data is protected',
      body: [
        'This data is held in the app\'s private storage, which other apps on the device cannot read. It '
            'is not additionally encrypted by the app, so the real protection is your device\'s own lock '
            'screen. Please use one, and do not sign in on a shared or unlocked device.',
        'Signing out deletes the stored tokens. Uninstalling the app removes everything listed above.',
      ],
    ),
    LegalSection(
      heading: 'What the app sends, and where',
      body: [
        'The app communicates only with the server address you configured. It does not send your data '
            'anywhere else.',
        'What travels to that server is: your email and password when you sign in; the content you '
            'create, edit, publish or delete; any files you choose to upload; and the ordinary technical '
            'details of a network request.',
        'The server is operated by or for the parish, and what it records is governed by the parish, not '
            'by this app. If the address you enter is not served over HTTPS, traffic between the app and '
            'the server is not encrypted in transit.',
      ],
    ),
    LegalSection(
      heading: 'What the app does not do',
      bullets: [
        'No analytics, telemetry or crash reporting is collected or sent.',
        'No advertising, and no third-party tracking of any kind.',
        'No access to your location, contacts, calendar, microphone or camera roll.',
        'Nothing is sold, rented or shared with anyone.',
      ],
    ),
    LegalSection(
      heading: 'Permissions the app asks for',
      body: [
        'The app requests internet and network-state access, and nothing else. When you attach a file or '
            'save a backup, the system\'s own file picker handles it and the app receives only the single '
            'file you chose — it has no blanket access to your storage.',
      ],
    ),
    LegalSection(
      heading: 'Other people\'s information',
      body: [
        'Much of what you handle in this app belongs to other people: messages sent through the parish '
            'contact form, the names and email addresses of other portal users, and photographs of members '
            'of the congregation.',
        'Treat all of it as confidential. Use it only for parish administration, show it only to people '
            'who need to see it, and do not copy it out of the Portal without good reason.',
      ],
    ),
    LegalSection(
      heading: 'Backups saved to your device',
      body: [
        'A backup archive contains the entire contents of the Portal — including administrator account '
            'records. The file the app saves to your device is not encrypted.',
        'Store it somewhere safe, do not email it or put it in shared cloud storage, and delete copies you '
            'no longer need.',
      ],
    ),
    LegalSection(
      heading: 'Activity recorded in the Portal',
      body: [
        'Actions taken in the Portal — signing in, creating, editing, publishing and deleting — are '
            'recorded in the server\'s audit log along with your name and the time. This exists so the '
            'parish can see who changed what. You cannot edit or erase your own entries.',
      ],
    ),
    LegalSection(
      heading: 'Children',
      body: [
        'This app is for parish staff and volunteers and is not directed at children.',
      ],
    ),
    LegalSection(
      heading: 'Changes to this policy',
      body: [
        'If the way the app handles data changes, this page is updated and the date at the top changes '
            'with it. Significant changes will also be communicated by the parish office.',
      ],
    ),
    LegalSection(
      heading: 'Questions, or asking for your data to be removed',
      body: [
        'Contact the parish office at $kLegalContactPlaceholder. Your portal account and anything '
            'attached to it are administered by the parish, so requests to see, correct or delete your '
            'information should go to them.',
      ],
    ),
  ],
);

const termsOfUse = LegalDocument(
  slug: 'terms',
  title: 'Terms & Conditions',
  summary: 'The terms you accept by using the Portal app.',
  lastUpdated: _kLastUpdated,
  sections: [
    LegalSection(
      heading: 'Agreement',
      body: [
        'By signing in to the CSI St. Mark\'s Portal app you accept these terms. If you do not accept '
            'them, do not use the app.',
        'The app is provided by CSI St. Mark\'s Church, Madipakkam ("the parish") for the administration '
            'of the parish website.',
      ],
    ),
    LegalSection(
      heading: 'Who may use it',
      body: [
        'Only people the parish has issued an account to. Accounts are personal: they are not to be '
            'shared, transferred, or used on behalf of someone else.',
      ],
    ),
    LegalSection(
      heading: 'Your account',
      bullets: [
        'Keep your password private and do not reuse it elsewhere.',
        'Sign out on any device that is not solely yours.',
        'Tell the parish office at once if you think someone else has access to your account.',
        'You are responsible for what is done through your account.',
      ],
    ),
    LegalSection(
      heading: 'How you may use it',
      body: ['Use the app only for parish administration. In particular, do not:'],
      bullets: [
        'Publish anything you do not have the right to publish, including photographs of people who have '
            'not agreed to appear on a public website.',
        'Publish anything unlawful, misleading, or damaging to a person\'s reputation.',
        'Copy congregation or contact data out of the Portal for any purpose of your own.',
        'Attempt to reach parts of the system your role does not grant you, or interfere with the server.',
      ],
    ),
    LegalSection(
      heading: 'What you publish',
      body: [
        'Content you publish through this app appears on the parish\'s public website. You are '
            'responsible for its accuracy and for having the right to use any text or images in it. The '
            'parish may edit or remove anything published through the Portal.',
      ],
    ),
    LegalSection(
      heading: 'Backup and restore',
      body: [
        'Restoring a backup changes the Portal\'s data. In "replace" mode it clears existing records and '
            'puts back the state captured in the archive; anything created since is lost and cannot be '
            'recovered from inside the app.',
        'Only run a restore if you understand what it will do. Backup archives contain sensitive data and '
            'must be stored securely and deleted when no longer needed.',
      ],
    ),
    LegalSection(
      heading: 'Availability',
      body: [
        'The app depends on the parish\'s server, on your device, and on your network connection. It is '
            'provided as it is, without any promise that it will always be available or free of faults. '
            'The parish may change, suspend or withdraw it at any time.',
      ],
    ),
    LegalSection(
      heading: 'Responsibility for loss',
      body: [
        'To the extent the law allows, the parish is not liable for loss of data, loss of income, or any '
            'indirect loss arising from your use of the app. Nothing in these terms limits any liability '
            'that cannot lawfully be limited.',
      ],
    ),
    LegalSection(
      heading: 'Ending access',
      body: [
        'The parish may suspend or remove your account at any time, in particular when you no longer hold '
            'the role the account was issued for, or when these terms have been broken.',
      ],
    ),
    LegalSection(
      heading: 'Governing law',
      body: [
        'These terms are governed by the laws of [jurisdiction — to be confirmed by the parish], and the '
            'courts of [place — to be confirmed by the parish] have exclusive jurisdiction over any '
            'dispute arising from them.',
      ],
    ),
    LegalSection(
      heading: 'Changes to these terms',
      body: [
        'These terms may be updated. The date at the top shows when they last changed, and continuing to '
            'use the app after a change means you accept the updated terms.',
      ],
    ),
    LegalSection(
      heading: 'Contact',
      body: ['Questions about these terms go to the parish office at $kLegalContactPlaceholder.'],
    ),
  ],
);

const legalDocuments = <LegalDocument>[privacyPolicy, termsOfUse];

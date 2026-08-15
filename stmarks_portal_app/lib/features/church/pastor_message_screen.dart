import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_exception.dart';
import '../../core/models/common.dart';
import '../../core/models/content.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_theme.dart';
import '../../widgets/confirm_dialog.dart';
import '../../widgets/empty_state.dart';
import '../../widgets/image_picker_field.dart';
import '../../widgets/localized_field.dart';
import '../../widgets/paragraphs_field.dart';

/// Editor for the church's pastor's message — a singleton document.
class PastorMessageScreen extends ConsumerStatefulWidget {
  const PastorMessageScreen({super.key});

  @override
  ConsumerState<PastorMessageScreen> createState() => _PastorMessageScreenState();
}

class _PastorMessageScreenState extends ConsumerState<PastorMessageScreen> {
  bool _loading = true;
  bool _saving = false;
  String? _error;

  LocalizedText _authorName = LocalizedText.empty;
  LocalizedText _authorRole = LocalizedText.empty;
  ImageAsset? _authorImage;
  LocalizedText _excerpt = LocalizedText.empty;
  List<LocalizedText> _body = [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final json = await ref.read(apiClientProvider).get<Map<String, dynamic>>('/admin/church/pastor-message');
      final message = PastorMessage.fromJson(json);
      setState(() {
        _authorName = message.authorName;
        _authorRole = message.authorRole;
        _authorImage = message.authorImage;
        _excerpt = message.excerpt;
        _body = message.body;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (e.statusCode == 404) {
        setState(() => _loading = false);
      } else {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = 'Could not load — $e';
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    if (_authorName.isEmpty || _authorRole.isEmpty || _excerpt.isEmpty) {
      showAppSnackBar(context, 'Author name, role and excerpt are required', error: true);
      return;
    }
    setState(() => _saving = true);
    try {
      final message = PastorMessage(
        authorName: _authorName,
        authorRole: _authorRole,
        authorImage: _authorImage,
        excerpt: _excerpt,
        body: _body,
      );
      await ref.read(apiClientProvider).put('/admin/church/pastor-message', data: message.toJson());
      if (mounted) showAppSnackBar(context, 'Saved');
    } catch (e) {
      if (mounted) showAppSnackBar(context, 'Could not save — $e', error: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 20, 20, 100),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 720),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_rounded),
                    onPressed: () => Navigator.of(context).maybePop(),
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text("Pastor's message", style: theme.textTheme.headlineSmall),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 60),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (_error != null)
                ErrorRetryState(message: _error!, onRetry: _load)
              else ...[
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surface,
                    borderRadius: BorderRadius.circular(AppRadii.card),
                    border: Border.all(color: theme.colorScheme.outline.withValues(alpha: 0.7)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      LocalizedField(
                        label: "Author's name",
                        value: _authorName,
                        required: true,
                        onChanged: (v) => setState(() => _authorName = v),
                      ),
                      const SizedBox(height: 20),
                      LocalizedField(
                        label: "Author's role",
                        value: _authorRole,
                        required: true,
                        onChanged: (v) => setState(() => _authorRole = v),
                      ),
                      const SizedBox(height: 20),
                      ImagePickerField(
                        label: "Author's photo",
                        value: _authorImage,
                        onChanged: (v) => setState(() => _authorImage = v),
                      ),
                      const SizedBox(height: 20),
                      LocalizedField(
                        label: 'Excerpt',
                        value: _excerpt,
                        required: true,
                        maxLines: 3,
                        onChanged: (v) => setState(() => _excerpt = v),
                      ),
                      const SizedBox(height: 20),
                      ParagraphsField(
                        label: 'Message body',
                        value: _body,
                        onChanged: (v) => setState(() => _body = v),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: theme.colorScheme.primary,
                    foregroundColor: theme.colorScheme.onPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                  ),
                  child: _saving
                      ? const SizedBox(
                          height: 18,
                          width: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Save'),
                ),
                const SizedBox(height: 40),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

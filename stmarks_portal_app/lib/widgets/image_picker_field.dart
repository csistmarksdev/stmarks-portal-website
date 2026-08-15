import 'package:flutter/material.dart';

import '../core/models/common.dart';
import '../core/theme/app_theme.dart';
import '../features/media/media_repository.dart';
import 'media_picker_sheet.dart';
import 'portal_image.dart';

/// Compact form-field wrapper around the media library — mirrors the web
/// app's `ImagePicker`: shows the chosen image with a "Change" affordance,
/// and flags a missing alt text.
class ImagePickerField extends StatelessWidget {
  const ImagePickerField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.kindFilter = 'image',
  });

  final String label;
  final ImageAsset? value;
  final ValueChanged<ImageAsset?> onChanged;
  final String kindFilter;

  Future<void> _pick(BuildContext context) async {
    final selected = await showMediaPickerSheet(context, kindFilter: kindFilter);
    if (selected != null && selected.isNotEmpty) {
      onChanged(mediaItemToImageAsset(selected.first));
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final missingAlt = value != null && value!.alt.isEmpty;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.labelLarge),
        const SizedBox(height: 8),
        AspectRatio(
          aspectRatio: 16 / 9,
          child: Stack(
            fit: StackFit.expand,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(AppRadii.md),
                child: Container(
                  decoration: BoxDecoration(
                    border: Border.all(color: theme.colorScheme.outline),
                    borderRadius: BorderRadius.circular(AppRadii.md),
                  ),
                  child: value != null
                      ? PortalImage(url: value!.url, borderRadius: BorderRadius.circular(AppRadii.md - 1))
                      : Center(
                          child: Icon(Icons.add_photo_alternate_outlined, size: 32, color: theme.colorScheme.onSurfaceVariant),
                        ),
                ),
              ),
              Positioned(
                right: 10,
                bottom: 10,
                child: Row(
                  children: [
                    if (value != null)
                      Padding(
                        padding: const EdgeInsets.only(right: 8),
                        child: _RoundButton(icon: Icons.close_rounded, onTap: () => onChanged(null)),
                      ),
                    _RoundButton(icon: Icons.edit_rounded, onTap: () => _pick(context)),
                  ],
                ),
              ),
            ],
          ),
        ),
        if (missingAlt) ...[
          const SizedBox(height: 6),
          Row(
            children: [
              Icon(Icons.warning_amber_rounded, size: 14, color: theme.colorScheme.error),
              const SizedBox(width: 4),
              Text('Missing alt text', style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.error)),
            ],
          ),
        ],
      ],
    );
  }
}

class _RoundButton extends StatelessWidget {
  const _RoundButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.black.withValues(alpha: 0.55),
      shape: const CircleBorder(),
      child: InkWell(
        customBorder: const CircleBorder(),
        onTap: onTap,
        child: Padding(padding: const EdgeInsets.all(8), child: Icon(icon, size: 16, color: Colors.white)),
      ),
    );
  }
}

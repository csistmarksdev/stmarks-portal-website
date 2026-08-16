import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/providers/providers.dart';
import '../../widgets/brand_mark.dart';

/// First-run (and Settings-revisited) screen where the operator points the
/// app at their Portal backend. The web app derives this from `window.location`;
/// a native app has no such origin to borrow, so it's asked once and kept.
class ConnectScreen extends ConsumerStatefulWidget {
  const ConnectScreen({super.key});

  @override
  ConsumerState<ConnectScreen> createState() => _ConnectScreenState();
}

class _ConnectScreenState extends ConsumerState<ConnectScreen> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _checking = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final store = ref.read(localStoreProvider);
    _controller.text = store.apiBaseUrl ?? '';
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _normalize(String raw) {
    var value = raw.trim().replaceAll(RegExp(r'/+$'), '');
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      value = 'http://$value';
    }
    if (!RegExp(r'/v\d+$').hasMatch(value) && !value.endsWith('/api')) {
      value = '$value/v1';
    }
    return value;
  }

  Future<void> _connect() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final url = _normalize(_controller.text);
    setState(() {
      _checking = true;
      _error = null;
    });

    try {
      final origin = url.replaceFirst(RegExp(r'/(v1|api)/?$'), '');
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 8)));
      await dio.get<dynamic>('$origin/health');
    } catch (_) {
      // The health check is a courtesy, not a gate — some deployments proxy
      // it differently or don't expose it. Login itself is the real test.
    }

    final store = ref.read(localStoreProvider);
    await store.setApiBaseUrl(url);
    ref.read(apiConfigVersionProvider.notifier).state++;

    if (!mounted) return;
    setState(() => _checking = false);
    await ref.read(authControllerProvider.notifier).restore();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: const [BrandMark(size: 72), SizedBox(width: 14), DiocesanArms(height: 64)],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text('Connect to your Portal', style: theme.textTheme.headlineMedium, textAlign: TextAlign.center),
                  const SizedBox(height: 8),
                  Text(
                    "Enter the address of your CSI St. Mark's Portal API — your church admin will have this.",
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),
                  Form(
                    key: _formKey,
                    child: TextFormField(
                      controller: _controller,
                      autofocus: true,
                      keyboardType: TextInputType.url,
                      textInputAction: TextInputAction.done,
                      onFieldSubmitted: (_) => _connect(),
                      decoration: const InputDecoration(
                        labelText: 'API base URL',
                        hintText: 'https://portal.example.org or 192.168.1.5:4000',
                        prefixIcon: Icon(LucideIcons.server),
                      ),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter a server address' : null,
                    ),
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 12),
                    Text(_error!, style: TextStyle(color: theme.colorScheme.error)),
                  ],
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _checking ? null : _connect,
                    style: FilledButton.styleFrom(
                      backgroundColor: theme.colorScheme.primary,
                      foregroundColor: theme.colorScheme.onPrimary,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _checking
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                          )
                        : const Text('Continue'),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    "You can change this later from Settings.",
                    style: theme.textTheme.bodySmall,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

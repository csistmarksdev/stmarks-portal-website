import 'dart:async';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api/api_exception.dart';
import '../../core/notifications/notification_service.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../widgets/brand_mark.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscure = true;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      await ref.read(authControllerProvider.notifier).login(_emailController.text.trim(), _passwordController.text);
      // Asked for here rather than at launch: the prompt makes sense once the
      // person is signed in and there is an inbox that could actually alert
      // them. Declining is fine — everything else still works.
      unawaited(NotificationService.instance.requestPermission());
      if (mounted) context.go('/dashboard');
    } on ApiException catch (e) {
      setState(() => _error = e.message);
    } catch (_) {
      setState(() => _error = 'Something went wrong — try again.');
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      body: LayoutBuilder(
        builder: (context, constraints) {
          final wide = constraints.maxWidth >= 900;
          final formPanel = _FormPanel(
            formKey: _formKey,
            emailController: _emailController,
            passwordController: _passwordController,
            obscure: _obscure,
            onToggleObscure: () => setState(() => _obscure = !_obscure),
            submitting: _submitting,
            error: _error,
            onSubmit: _submit,
            showBrand: !wide,
          );

          if (!wide) {
            return SafeArea(
              child: Center(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
                  child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 440), child: formPanel),
                ),
              ),
            );
          }

          return Row(
            children: [
              Expanded(
                flex: 5,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: isDark
                          ? [AppColors.brand950, AppColors.brand900, AppColors.accent950]
                          : [AppColors.brand800, AppColors.brand700, AppColors.accent800],
                    ),
                  ),
                  child: Center(
                    child: Padding(
                      padding: const EdgeInsets.all(48),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Row(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [BrandMark(size: 96), SizedBox(width: 16), DiocesanArms(height: 84)],
                          ),
                          const SizedBox(height: 28),
                          Text(
                            "CSI St. Mark's Church",
                            style: theme.textTheme.headlineLarge?.copyWith(color: Colors.white),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 10),
                          Text(
                            'Madipakkam · Portal Admin',
                            style: theme.textTheme.titleMedium?.copyWith(color: Colors.white.withValues(alpha: 0.85)),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 28),
                          Text(
                            'Manage events, blog posts, galleries, fellowships and more for the parish website.',
                            style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white.withValues(alpha: 0.75)),
                            textAlign: TextAlign.center,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              Expanded(
                flex: 4,
                child: Center(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(48),
                    child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 420), child: formPanel),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Quiet, small link styling — these are references, not calls to action.
final ButtonStyle _legalLinkStyle = TextButton.styleFrom(
  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
  minimumSize: Size.zero,
  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
  textStyle: const TextStyle(fontFamily: 'Inter', fontSize: 12.5, fontWeight: FontWeight.w600),
);

class _FormPanel extends StatelessWidget {
  const _FormPanel({
    required this.formKey,
    required this.emailController,
    required this.passwordController,
    required this.obscure,
    required this.onToggleObscure,
    required this.submitting,
    required this.error,
    required this.onSubmit,
    required this.showBrand,
  });

  final GlobalKey<FormState> formKey;
  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool obscure;
  final VoidCallback onToggleObscure;
  final bool submitting;
  final String? error;
  final VoidCallback onSubmit;
  final bool showBrand;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (showBrand) ...[
          Center(
            child: Row(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: const [BrandMark(size: 64), SizedBox(width: 12), DiocesanArms(height: 56)],
            ),
          ),
          const SizedBox(height: 20),
        ],
        Text('Welcome back', style: theme.textTheme.headlineMedium, textAlign: showBrand ? TextAlign.center : TextAlign.start),
        const SizedBox(height: 6),
        Text(
          'Sign in to manage the parish portal.',
          style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          textAlign: showBrand ? TextAlign.center : TextAlign.start,
        ),
        const SizedBox(height: 28),
        Form(
          key: formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                decoration: const InputDecoration(labelText: 'Email', prefixIcon: Icon(LucideIcons.mail)),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter your email' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: passwordController,
                obscureText: obscure,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => onSubmit(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(LucideIcons.lock),
                  suffixIcon: IconButton(
                    icon: Icon(obscure ? LucideIcons.eye : LucideIcons.eyeOff),
                    onPressed: onToggleObscure,
                  ),
                ),
                validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
              ),
              if (error != null) ...[
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: theme.colorScheme.error.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      Icon(LucideIcons.circleAlert, color: theme.colorScheme.error, size: 18),
                      const SizedBox(width: 8),
                      Expanded(child: Text(error!, style: TextStyle(color: theme.colorScheme.error))),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 22),
              FilledButton(
                onPressed: submitting ? null : onSubmit,
                style: FilledButton.styleFrom(
                  backgroundColor: theme.colorScheme.primary,
                  foregroundColor: theme.colorScheme.onPrimary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: submitting
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Text('Sign in'),
              ),
              const SizedBox(height: 16),
              Text(
                'Forgot your password? Ask an admin to reset it for you.',
                style: theme.textTheme.bodySmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Center(
                child: TextButton.icon(
                  onPressed: () => GoRouter.of(context).push('/connect'),
                  icon: const Icon(LucideIcons.server, size: 16),
                  label: const Text('Change server'),
                ),
              ),
              const SizedBox(height: 4),
              // Readable without an account — the `/legal-public` routes sit
              // outside the shell and outside the auth redirect.
              Wrap(
                alignment: WrapAlignment.center,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  TextButton(
                    onPressed: () => GoRouter.of(context).push('/legal-public/privacy'),
                    style: _legalLinkStyle,
                    child: const Text('Privacy Policy'),
                  ),
                  Text('·', style: theme.textTheme.bodySmall),
                  TextButton(
                    onPressed: () => GoRouter.of(context).push('/legal-public/terms'),
                    style: _legalLinkStyle,
                    child: const Text('Terms & Conditions'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}

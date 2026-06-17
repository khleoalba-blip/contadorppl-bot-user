import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _codeController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _codeSent = false;

  @override
  void dispose() {
    _phoneController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final authProvider = context.watch<AuthProvider>();

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Logo / Title
                  Icon(
                    Icons.account_balance,
                    size: 72,
                    color: theme.colorScheme.primary,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'ContadorPPL',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: theme.colorScheme.primary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Dashboard de Administración',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 48),

                  // Error message
                  if (authProvider.errorMessage != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: theme.colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.error_outline,
                              color: theme.colorScheme.onErrorContainer,
                              size: 20),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              authProvider.errorMessage!,
                              style: TextStyle(
                                color: theme.colorScheme.onErrorContainer,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  if (!_codeSent) ...[
                    // Phone input step
                    _buildPhoneInput(theme),
                  ] else ...[
                    // Code verification step
                    _buildCodeInput(theme, authProvider),
                  ],

                  const SizedBox(height: 16),

                  // Toggle between steps
                  if (_codeSent)
                    TextButton(
                      onPressed: () {
                        setState(() {
                          _codeSent = false;
                          _codeController.clear();
                          authProvider.clearError();
                        });
                      },
                      child: const Text('Cambiar número de teléfono'),
                    ),

                  const SizedBox(height: 24),

                  // Footer
                  Text(
                    'El código de confirmación será enviado\npor WhatsApp al número registrado.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildPhoneInput(ThemeData theme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Ingresa tu número de teléfono',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          'Formato cubano: +53 XXXX XXXX',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          decoration: InputDecoration(
            labelText: 'Teléfono',
            hintText: '+53 5XXX XXXX',
            prefixIcon: const Icon(Icons.phone_android),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            filled: true,
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Ingresa tu número de teléfono';
            }
            final cleaned = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
            if (cleaned.length < 10) {
              return 'Número de teléfono inválido';
            }
            return null;
          },
          onFieldSubmitted: (_) => _solicitarCodigo(),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _solicitarCodigo,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: const Text(
            'Solicitar Código',
            style: TextStyle(fontSize: 16),
          ),
        ),
      ],
    );
  }

  Widget _buildCodeInput(ThemeData theme, AuthProvider authProvider) {
    final isLoading = authProvider.status == AuthStatus.loading;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Verifica tu identidad',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 8),
        RichText(
          text: TextSpan(
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
            children: [
              const TextSpan(text: 'Código enviado a '),
              TextSpan(
                text: _phoneController.text.trim(),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const TextSpan(text: ' por WhatsApp'),
            ],
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          maxLength: 6,
          decoration: InputDecoration(
            labelText: 'Código de confirmación',
            hintText: '000000',
            prefixIcon: const Icon(Icons.lock),
            counterText: '',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            filled: true,
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Ingresa el código de confirmación';
            }
            if (value.trim().length < 4) {
              return 'El código debe tener al menos 4 dígitos';
            }
            return null;
          },
          onFieldSubmitted: (_) => _verificarCodigo(authProvider),
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: isLoading ? null : () => _verificarCodigo(authProvider),
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    color: Colors.white,
                  ),
                )
              : const Text(
                  'Verificar Código',
                  style: TextStyle(fontSize: 16),
                ),
        ),
      ],
    );
  }

  void _solicitarCodigo() {
    if (_formKey.currentState?.validate() ?? false) {
      final authProvider = context.read<AuthProvider>();
      authProvider.clearError();
      authProvider.requestCode(_phoneController.text.trim()).then((_) {
        if (authProvider.status != AuthStatus.error) {
          setState(() {
            _codeSent = true;
          });
        }
      });
    }
  }

  void _verificarCodigo(AuthProvider authProvider) {
    if (_formKey.currentState?.validate() ?? false) {
      authProvider.clearError();
      authProvider.verifyCode(
        _phoneController.text.trim(),
        _codeController.text.trim(),
      );
    }
  }
}

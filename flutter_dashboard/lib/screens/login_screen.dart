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
  bool _sending = false;

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
                    _buildPhoneInput(theme),
                  ] else ...[
                    _buildCodeInput(theme, authProvider),
                  ],

                  const SizedBox(height: 16),

                  if (_codeSent)
                    TextButton(
                      onPressed: _sending
                          ? null
                          : () {
                              setState(() {
                                _codeSent = false;
                                _sending = false;
                                _codeController.clear();
                                authProvider.clearError();
                              });
                            },
                      child: const Text('Cambiar número de teléfono'),
                    ),

                  const SizedBox(height: 24),

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
          'Sin el +53, solo los dígitos',
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          enabled: !_sending,
          decoration: const InputDecoration(
            labelText: 'Teléfono',
            hintText: '5XXX XXXX',
            prefixIcon: Icon(Icons.phone_android),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
            ),
            filled: true,
          ),
          validator: (value) {
            if (value == null || value.trim().isEmpty) {
              return 'Ingresa tu número de teléfono';
            }
            final cleaned = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
            if (cleaned.length < 10) {
              return 'Número muy corto (mínimo 10 dígitos)';
            }
            return null;
          },
        ),
        const SizedBox(height: 20),
        FilledButton(
          onPressed: _sending ? null : _solicitarCodigo,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: _sending
              ? const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                    SizedBox(width: 12),
                    Text('Enviando...', style: TextStyle(fontSize: 16)),
                  ],
                )
              : const Text(
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
                text: '+${_phoneController.text.trim()}',
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
          decoration: const InputDecoration(
            labelText: 'Código de confirmación',
            hintText: '000000',
            prefixIcon: Icon(Icons.lock),
            counterText: '',
            border: OutlineInputBorder(
              borderRadius: BorderRadius.all(Radius.circular(12)),
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

  Future<void> _solicitarCodigo() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    if (_sending) return;

    setState(() {
      _sending = true;
    });

    final authProvider = context.read<AuthProvider>();
    authProvider.clearError();

    try {
      await authProvider.requestCode(_phoneController.text.trim());

      // Verificar el estado después de que requestCode termine
      if (!mounted) return;

      if (authProvider.status == AuthStatus.error) {
        // Mostrar error, no avanzar
        setState(() => _sending = false);
      } else {
        // Éxito: mostrar pantalla de código
        setState(() {
          _sending = false;
          _codeSent = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _sending = false);
      }
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

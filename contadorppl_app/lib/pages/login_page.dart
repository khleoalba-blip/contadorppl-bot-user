import 'package:flutter/material.dart';
import '../config.dart';
import '../services/api_service.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _phoneController = TextEditingController();
  final _api = ApiService();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    final phone = _phoneController.text.trim();
    if (phone.length < 8) {
      setState(() => _error = 'Ingresa un número válido (8 dígitos)');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    final usuario = await _api.login('53$phone');

    if (!mounted) return;

    if (usuario.autorizado) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => _HomeShell(adminPhone: '53$phone', nombre: usuario.nombre),
        ),
      );
    } else {
      setState(() {
        _loading = false;
        _error = 'Número no autorizado. Contacta al admin.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(30),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const SizedBox(height: 40),
              const Icon(Icons.casino_outlined,
                  size: 80, color: Color(AppConfig.colorAccent)),
              const SizedBox(height: 16),
              const Text('ContadorPPL',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold,
                      color: Color(AppConfig.colorPrimary))),
              const Text('Dashboard de Administración',
                  style: TextStyle(fontSize: 14, color: Color(AppConfig.colorTextSecondary))),
              const SizedBox(height: 40),
              SizedBox(
                width: 320,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Número de teléfono',
                        style: TextStyle(color: Color(AppConfig.colorTextSecondary), fontSize: 12)),
                    const SizedBox(height: 6),
                    TextField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      maxLength: 8,
                      decoration: const InputDecoration(
                        hintText: '5356965304',
                        prefixText: '+53 ',
                        counterText: '',
                      ),
                      style: const TextStyle(fontSize: 18),
                      onSubmitted: (_) => _login(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              if (_error != null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                ),
              if (_loading)
                const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: SizedBox(
                    width: 200,
                    child: LinearProgressIndicator(color: Color(AppConfig.colorAccent)),
                  ),
                ),
              ElevatedButton.icon(
                onPressed: _loading ? null : _login,
                icon: const Icon(Icons.login),
                label: const Text('Entrar'),
              ),
              const SizedBox(height: 24),
              const Text('Solo para usuarios autorizados',
                  style: TextStyle(fontSize: 11, color: Color(AppConfig.colorTextSecondary),
                      fontStyle: FontStyle.italic)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Shell con BottomNavigationBar que aloja las páginas principales.
class _HomeShell extends StatefulWidget {
  final String adminPhone;
  final String nombre;

  const _HomeShell({required this.adminPhone, required this.nombre});

  @override
  State<_HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<_HomeShell> {
  int _currentIndex = 0;

  late final List<Widget> _pages;

  @override
  void initState() {
    super.initState();
    _pages = [
      HomePage(adminPhone: widget.adminPhone, nombre: widget.nombre),
      GruposPage(adminPhone: widget.adminPhone),
      ReportesPage(adminPhone: widget.adminPhone),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (i) => setState(() => _currentIndex = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Inicio'),
          BottomNavigationBarItem(icon: Icon(Icons.groups_outlined), activeIcon: Icon(Icons.groups), label: 'Grupos'),
          BottomNavigationBarItem(icon: Icon(Icons.assessment_outlined), activeIcon: Icon(Icons.assessment), label: 'Reportes'),
        ],
      ),
    );
  }
}

// ── Importa las páginas al final para evitar dependencias circulares ──
import 'home_page.dart';
import 'grupos_page.dart';
import 'reportes_page.dart';

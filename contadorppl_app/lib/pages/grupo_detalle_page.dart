import 'package:flutter/material.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import 'listeros_page.dart';
import 'jornadas_page.dart';

class GrupoDetallePage extends StatefulWidget {
  final String groupId;
  final String nombre;
  final String adminPhone;

  const GrupoDetallePage({
    super.key,
    required this.groupId,
    required this.nombre,
    required this.adminPhone,
  });

  @override
  State<GrupoDetallePage> createState() => _GrupoDetallePageState();
}

class _GrupoDetallePageState extends State<GrupoDetallePage> {
  final _api = ApiService();
  GrupoConfig _config = GrupoConfig();
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final config = await _api.obtenerConfigGrupo(widget.groupId);
    if (mounted) setState(() { _config = config; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.nombre),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () { setState(() => _loading = true); _cargar(); }),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(AppConfig.colorAccent)))
          : RefreshIndicator(
              color: const Color(AppConfig.colorAccent),
              onRefresh: _cargar,
              child: ListView(
                padding: const EdgeInsets.all(14),
                children: [
                  // Acciones rápidas
                  Row(
                    children: [
                      _AccionCard(
                        label: 'Listeros',
                        icon: Icons.people,
                        color: const Color(AppConfig.colorSuccess),
                        onTap: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => ListerosPage(groupId: widget.groupId, nombreGrupo: widget.nombre),
                        )).then((_) => _cargar()),
                      ),
                      const SizedBox(width: 10),
                      _AccionCard(
                        label: 'Jornadas',
                        icon: Icons.history,
                        color: const Color(AppConfig.colorAccent),
                        onTap: () => Navigator.push(context, MaterialPageRoute(
                          builder: (_) => JornadasPage(groupId: widget.groupId, nombreGrupo: widget.nombre),
                        )),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  // Configuración
                  _SectionCard(title: 'Configuración', children: [
                    _InfoRow('Lotería', _config.loteriaActual),
                    _InfoRow('Modo', _config.modo),
                    _InfoRow('Jornada automática', _config.jornadaAutomatica ? 'Sí' : 'No'),
                    _InfoRow('Jornada activa', _config.jornadaActivaId ?? 'Ninguna'),
                  ]),
                  const SizedBox(height: 12),
                  // Premios
                  _SectionCard(title: 'Premios', children: [
                    _InfoRow('Parlet', '\$${_config.configPremios['Parlet'] ?? 400}'),
                    _InfoRow('Centena', '\$${_config.configPremios['Centena'] ?? 400}'),
                    _InfoRow('Fijo', '\$${_config.configPremios['Fijo'] ?? 80}'),
                    _InfoRow('Corrido', '\$${_config.configPremios['Corrido'] ?? 20}'),
                  ]),
                  const SizedBox(height: 12),
                  // Horarios
                  _SectionCard(title: 'Horarios Florida', children: const [
                    _InfoRow('☀ Mañana', '08:00 → 13:10  (resultados 13:36)'),
                    _InfoRow('🌙 Tarde', '14:00 → 21:00  (resultados 21:51)'),
                  ]),
                  const SizedBox(height: 10),
                  // Banco group
                  if (_config.bancoGroupJid != null) ...[
                    _SectionCard(title: 'Grupo Banca', children: [
                      _InfoRow('JID', _config.bancoGroupJid ?? ''),
                    ]),
                  ],
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SectionCard({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15,
                color: Color(AppConfig.colorText))),
            const Divider(height: 20),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(
              child: Text(label,
                  style: const TextStyle(fontSize: 13, color: Color(AppConfig.colorTextSecondary)))),
          Flexible(
              child: Text(value.length > 30 ? '${value.substring(0, 30)}...' : value,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: Color(AppConfig.colorText)),
                  textAlign: TextAlign.right)),
        ],
      ),
    );
  }
}

class _AccionCard extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  const _AccionCard({required this.label, required this.icon, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 90,
          decoration: BoxDecoration(
            color: const Color(AppConfig.colorCard),
            borderRadius: BorderRadius.circular(14),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: color, size: 30),
              const SizedBox(height: 6),
              Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500,
                  color: Color(AppConfig.colorText))),
            ],
          ),
        ),
      ),
    );
  }
}

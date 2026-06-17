import 'package:flutter/material.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class ReportesPage extends StatefulWidget {
  final String adminPhone;

  const ReportesPage({super.key, required this.adminPhone});

  @override
  State<ReportesPage> createState() => _ReportesPageState();
}

class _ReportesPageState extends State<ReportesPage> {
  final _api = ApiService();
  Stats _stats = Stats();
  List<Grupo> _grupos = [];
  BotStatus _status = BotStatus(online: false, mongoActivo: false, timestamp: '', version: '');
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final stats = await _api.estadisticas(widget.adminPhone);
    final grupos = await _api.listarGrupos(widget.adminPhone);
    final st = await _api.status();
    if (mounted) {
      setState(() {
        _stats = stats;
        _grupos = grupos;
        _status = st;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Reportes'),
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
                  // Grid de stats 2x2
                  Row(
                    children: [
                      _StatCard(title: 'Grupos', value: '${_stats.totalGrupos}',
                          icon: Icons.groups, color: const Color(AppConfig.colorPrimary)),
                      const SizedBox(width: 10),
                      _StatCard(title: 'Listeros', value: '${_stats.totalListeros}',
                          icon: Icons.people, color: const Color(AppConfig.colorSuccess)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _StatCard(title: 'J. Activas', value: '${_stats.jornadasActivas}',
                          icon: Icons.play_circle, color: const Color(AppConfig.colorAccent)),
                      const SizedBox(width: 10),
                      _StatCard(title: 'Bot', value: _status.online ? 'Online' : 'Offline',
                          icon: Icons.cloud,
                          color: _status.online ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorError)),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text('Estado por grupo',
                      style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold,
                          color: Color(AppConfig.colorText))),
                  const SizedBox(height: 8),
                  ..._grupos.map((g) => Card(
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          title: Text(g.loteriaActual, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Text(g.groupId.length > 22 ? '${g.groupId.substring(0, 22)}...' : g.groupId,
                              style: const TextStyle(fontSize: 11, color: Color(AppConfig.colorTextSecondary))),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                g.jornadaActiva ? Icons.circle : Icons.circle_outlined,
                                color: g.jornadaActiva ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorTextSecondary),
                                size: 18,
                              ),
                              Text(g.jornadaActiva ? 'Activa' : 'Inactiva',
                                  style: TextStyle(fontSize: 10,
                                      color: g.jornadaActiva ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorTextSecondary))),
                            ],
                          ),
                        ),
                      )),
                  const SizedBox(height: 16),
                  // Sistema
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Información del sistema',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15,
                                  color: Color(AppConfig.colorText))),
                          const Divider(height: 22),
                          _SysRow('MongoDB', _status.mongoActivo ? 'Activo' : 'Inactivo',
                              _status.mongoActivo ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorError)),
                          _SysRow('API', _status.online ? 'Conectado' : 'Error',
                              _status.online ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorError)),
                          _SysRow('Versión bot', _status.version.isNotEmpty ? _status.version : '?',
                              const Color(AppConfig.colorText)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String title, value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(AppConfig.colorCard), borderRadius: BorderRadius.circular(14)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: color, size: 26),
            const SizedBox(height: 10),
            Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            Text(title, style: const TextStyle(fontSize: 12, color: Color(AppConfig.colorTextSecondary))),
          ],
        ),
      ),
    );
  }
}

class _SysRow extends StatelessWidget {
  final String label, value;
  final Color valueColor;

  const _SysRow(this.label, this.value, this.valueColor);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: Color(AppConfig.colorTextSecondary)))),
          Text(value,
              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w500, color: valueColor)),
        ],
      ),
    );
  }
}

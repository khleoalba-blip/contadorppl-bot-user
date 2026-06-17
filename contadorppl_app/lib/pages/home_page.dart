import 'package:flutter/material.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import 'grupo_detalle_page.dart';

class HomePage extends StatefulWidget {
  final String adminPhone;
  final String nombre;

  const HomePage({super.key, required this.adminPhone, required this.nombre});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
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
      body: SafeArea(
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(AppConfig.colorAccent)))
            : RefreshIndicator(
                color: const Color(AppConfig.colorAccent),
                onRefresh: _cargar,
                child: ListView(
                  padding: EdgeInsets.zero,
                  children: [
                    // Header
                    Container(
                      padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
                      color: const Color(AppConfig.colorPrimary),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(Icons.casino, color: Color(AppConfig.colorAccent), size: 24),
                              const SizedBox(width: 8),
                              Text('ContadorPPL',
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                              const Spacer(),
                              IconButton(
                                icon: const Icon(Icons.refresh, color: Colors.white70, size: 20),
                                onPressed: _cargar,
                              ),
                            ],
                          ),
                          Text(widget.nombre.isNotEmpty ? '${widget.nombre} • +${widget.adminPhone}' : 'Admin: +${widget.adminPhone}',
                              style: const TextStyle(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                    // Stats cards
                    Padding(
                      padding: const EdgeInsets.all(14),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              _StatCard(title: 'Grupos', value: '${_stats.totalGrupos}',
                                  icon: Icons.groups, color: const Color(AppConfig.colorPrimary)),
                              const SizedBox(width: 10),
                              _StatCard(title: 'J. Activas', value: '${_stats.jornadasActivas}',
                                  icon: Icons.play_circle, color: const Color(AppConfig.colorAccent)),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              _StatCard(title: 'Listeros', value: '${_stats.totalListeros}',
                                  icon: Icons.people, color: const Color(AppConfig.colorSuccess)),
                              const SizedBox(width: 10),
                              _StatCard(title: 'Bot', value: _status.online ? 'Online' : 'Offline',
                                  icon: Icons.cloud,
                                  color: _status.online
                                      ? const Color(AppConfig.colorSuccess)
                                      : const Color(AppConfig.colorError)),
                            ],
                          ),
                        ],
                      ),
                    ),
                    // Grupos
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 16),
                      child: Text('Tus grupos',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(AppConfig.colorText))),
                    ),
                    const SizedBox(height: 8),
                    ..._grupos.map((g) => _GrupoCard(
                          grupo: g,
                          onTap: () => Navigator.push(context, MaterialPageRoute(
                            builder: (_) => GrupoDetallePage(
                              groupId: g.groupId,
                              nombre: g.loteriaActual,
                              adminPhone: widget.adminPhone,
                            ),
                          )).then((_) => _cargar()),
                        )),
                    if (_grupos.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(40),
                        child: Column(
                          children: [
                            Icon(Icons.group_add_outlined, size: 48, color: Color(AppConfig.colorTextSecondary)),
                            SizedBox(height: 8),
                            Text('No tienes grupos asignados',
                                style: TextStyle(color: Color(AppConfig.colorTextSecondary))),
                          ],
                        ),
                      ),
                    const SizedBox(height: 20),
                  ],
                ),
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
        decoration: BoxDecoration(
          color: const Color(AppConfig.colorCard),
          borderRadius: BorderRadius.circular(14),
        ),
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

class _GrupoCard extends StatelessWidget {
  final Grupo grupo;
  final VoidCallback onTap;

  const _GrupoCard({required this.grupo, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final color = grupo.jornadaActiva ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorTextSecondary);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      child: ListTile(
        onTap: onTap,
        title: Text(grupo.loteriaActual, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(grupo.groupId.length > 20 ? '${grupo.groupId.substring(0, 20)}...' : grupo.groupId,
            style: const TextStyle(fontSize: 11, color: Color(AppConfig.colorTextSecondary))),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(grupo.jornadaActiva ? '● Activa' : '○ Inactiva',
                style: TextStyle(fontSize: 12, color: color)),
            Text('${grupo.listerosCount} listeros',
                style: const TextStyle(fontSize: 11, color: Color(AppConfig.colorTextSecondary))),
          ],
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import 'grupo_detalle_page.dart';

class GruposPage extends StatefulWidget {
  final String adminPhone;

  const GruposPage({super.key, required this.adminPhone});

  @override
  State<GruposPage> createState() => _GruposPageState();
}

class _GruposPageState extends State<GruposPage> {
  final _api = ApiService();
  List<Grupo> _grupos = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final grupos = await _api.listarGrupos(widget.adminPhone);
    if (mounted) setState(() { _grupos = grupos; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mis Grupos'),
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () { setState(() => _loading = true); _cargar(); }),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(AppConfig.colorAccent)))
          : RefreshIndicator(
              color: const Color(AppConfig.colorAccent),
              onRefresh: _cargar,
              child: _grupos.isEmpty
                  ? const Center(
                      child: Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.group_off, size: 48, color: Color(AppConfig.colorTextSecondary)),
                        SizedBox(height: 12),
                        Text('No tienes grupos asignados',
                            style: TextStyle(color: Color(AppConfig.colorTextSecondary))),
                      ]))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      itemCount: _grupos.length,
                      itemBuilder: (_, i) {
                        final g = _grupos[i];
                        final color = g.jornadaActiva
                            ? const Color(AppConfig.colorSuccess)
                            : const Color(AppConfig.colorTextSecondary);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            onTap: () => Navigator.push(context, MaterialPageRoute(
                              builder: (_) => GrupoDetallePage(
                                groupId: g.groupId,
                                nombre: g.loteriaActual,
                                adminPhone: widget.adminPhone,
                              ),
                            )).then((_) => _cargar()),
                            leading: CircleAvatar(
                              backgroundColor: const Color(AppConfig.colorPrimary).withOpacity(0.3),
                              child: const Icon(Icons.groups, color: Color(AppConfig.colorAccent)),
                            ),
                            title: Text(g.loteriaActual,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                            subtitle: Text('Modo: ${g.modo}',
                                style: const TextStyle(fontSize: 12, color: Color(AppConfig.colorTextSecondary))),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(width: 8, height: 8, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
                                    const SizedBox(width: 4),
                                    Text(g.jornadaActiva ? 'Jornada activa' : 'Sin jornada',
                                        style: TextStyle(fontSize: 12, color: color)),
                                  ],
                                ),
                                Text('${g.listerosCount} listeros',
                                    style: const TextStyle(fontSize: 11, color: Color(AppConfig.colorTextSecondary))),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

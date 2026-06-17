import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class JornadasPage extends StatefulWidget {
  final String groupId;
  final String nombreGrupo;

  const JornadasPage({super.key, required this.groupId, required this.nombreGrupo});

  @override
  State<JornadasPage> createState() => _JornadasPageState();
}

class _JornadasPageState extends State<JornadasPage> {
  final _api = ApiService();
  List<Jornada> _jornadas = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final jornadas = await _api.listarJornadas(widget.groupId);
    if (mounted) setState(() { _jornadas = jornadas; _loading = false; });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Jornadas')),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(AppConfig.colorAccent)))
          : RefreshIndicator(
              color: const Color(AppConfig.colorAccent),
              onRefresh: _cargar,
              child: _jornadas.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        Center(child: Text('No hay jornadas registradas',
                            style: TextStyle(color: Color(AppConfig.colorTextSecondary)))),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(10),
                      itemCount: _jornadas.length,
                      itemBuilder: (_, i) {
                        final j = _jornadas[i];
                        Color color;
                        IconData icono;
                        switch (j.estado) {
                          case 'activa':
                            color = const Color(AppConfig.colorSuccess);
                            icono = Icons.play_circle_filled;
                            break;
                          case 'cerrada':
                            color = const Color(AppConfig.colorTextSecondary);
                            icono = Icons.check_circle;
                            break;
                          default:
                            color = const Color(AppConfig.colorWarning);
                            icono = Icons.help;
                        }

                        String fechaStr = '?';
                        try {
                          final dt = DateTime.parse(j.inicio);
                          fechaStr = DateFormat('dd/MM HH:mm').format(dt);
                        } catch (_) {
                          fechaStr = j.inicio.length > 16 ? j.inicio.substring(0, 16) : j.inicio;
                        }

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: Icon(icono, color: color, size: 28),
                            title: Text(
                              j.jornadaId.length > 24 ? '${j.jornadaId.substring(0, 24)}...' : j.jornadaId,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text('Inicio: $fechaStr | Lotería: ${j.loteria}',
                                    style: const TextStyle(fontSize: 11, color: Color(AppConfig.colorTextSecondary))),
                                if (j.estado == 'activa')
                                  Text('${j.mensajesCount} mensajes | ACTIVA',
                                      style: TextStyle(fontSize: 11, color: color)),
                              ],
                            ),
                            trailing: Chip(
                              label: Text(j.estado.toUpperCase(), style: const TextStyle(fontSize: 10)),
                              backgroundColor: color.withOpacity(0.2),
                              labelStyle: TextStyle(color: color),
                            ),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}

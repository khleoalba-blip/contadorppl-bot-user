import 'package:flutter/material.dart';
import '../config.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class ListerosPage extends StatefulWidget {
  final String groupId;
  final String nombreGrupo;

  const ListerosPage({super.key, required this.groupId, required this.nombreGrupo});

  @override
  State<ListerosPage> createState() => _ListerosPageState();
}

class _ListerosPageState extends State<ListerosPage> {
  final _api = ApiService();
  List<Listero> _listeros = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _cargar();
  }

  Future<void> _cargar() async {
    final listeros = await _api.listarListeros(widget.groupId);
    if (mounted) setState(() { _listeros = listeros; _loading = false; });
  }

  Future<void> _toggleActivo(int index) async {
    final l = _listeros[index];
    await _api.actualizarListero(widget.groupId, l.phone, {'activo': !l.activo});
    await _cargar();
  }

  Future<void> _eliminar(int index) async {
    final l = _listeros[index];
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Eliminar listero'),
        content: Text('¿Eliminar a ${l.nombre} (+${l.phone})?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.redAccent),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (ok == true) {
      await _api.eliminarListero(widget.groupId, l.phone);
      await _cargar();
    }
  }

  Future<void> _mostrarDialogoAgregar() async {
    final nombreCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    final porcientoCtrl = TextEditingController(text: '0');
    String horario = 'ambos';

    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: const Text('Agregar Listero'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(controller: nombreCtrl,
                    decoration: const InputDecoration(labelText: 'Nombre', isDense: true)),
                const SizedBox(height: 10),
                TextField(controller: phoneCtrl, keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Teléfono (8 dígitos)',
                        prefixText: '+53 ', isDense: true)),
                const SizedBox(height: 10),
                TextField(controller: porcientoCtrl, keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Porciento (%)', isDense: true)),
                const SizedBox(height: 10),
                DropdownButtonFormField<String>(
                  value: horario,
                  decoration: const InputDecoration(labelText: 'Horario', isDense: true),
                  items: const [
                    DropdownMenuItem(value: 'ambos', child: Text('Ambos')),
                    DropdownMenuItem(value: 'mañana', child: Text('Mañana')),
                    DropdownMenuItem(value: 'tarde', child: Text('Tarde')),
                  ],
                  onChanged: (v) => setDialogState(() => horario = v ?? 'ambos'),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
            ElevatedButton(
              onPressed: () {
                if (nombreCtrl.text.trim().isEmpty || phoneCtrl.text.trim().length < 8) return;
                Navigator.pop(ctx, true);
              },
              child: const Text('Guardar'),
            ),
          ],
        ),
      ),
    );

    if (ok == true) {
      await _api.agregarListero(
        widget.groupId,
        '53${phoneCtrl.text.trim()}',
        nombreCtrl.text.trim(),
        porciento: int.tryParse(porcientoCtrl.text) ?? 0,
        horario: horario,
      );
      await _cargar();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Listeros'),
        actions: [
          IconButton(icon: const Icon(Icons.person_add), onPressed: _mostrarDialogoAgregar),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(AppConfig.colorAccent)))
          : RefreshIndicator(
              color: const Color(AppConfig.colorAccent),
              onRefresh: _cargar,
              child: _listeros.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 100),
                        Center(
                          child: Column(children: [
                            Icon(Icons.person_off, size: 48, color: Color(AppConfig.colorTextSecondary)),
                            SizedBox(height: 12),
                            Text('No hay listeros registrados',
                                style: TextStyle(color: Color(AppConfig.colorTextSecondary))),
                            SizedBox(height: 4),
                            Text('Toca + para agregar',
                                style: TextStyle(fontSize: 12, color: Color(AppConfig.colorTextSecondary))),
                          ]),
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(10),
                      itemCount: _listeros.length,
                      itemBuilder: (_, i) {
                        final l = _listeros[i];
                        final color = l.activo ? const Color(AppConfig.colorSuccess) : const Color(AppConfig.colorError);
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: const Color(AppConfig.colorPrimary).withOpacity(0.3),
                              child: Text(l.nombre.isNotEmpty ? l.nombre[0].toUpperCase() : '?',
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                            title: Text(l.nombre, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('+${l.phone}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('${l.porciento}%',
                                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold,
                                        color: Color(AppConfig.colorAccent))),
                                const SizedBox(width: 4),
                                IconButton(
                                  icon: Icon(l.activo ? Icons.toggle_on : Icons.toggle_off, color: color),
                                  onPressed: () => _toggleActivo(i),
                                  tooltip: 'Activar/Desactivar',
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: Color(AppConfig.colorError)),
                                  onPressed: () => _eliminar(i),
                                  tooltip: 'Eliminar',
                                ),
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

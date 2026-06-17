import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/listero_model.dart';
import '../providers/group_detail_provider.dart';
import '../widgets/loading_overlay.dart';

class ListeroDetailScreen extends StatefulWidget {
  const ListeroDetailScreen({super.key});

  @override
  State<ListeroDetailScreen> createState() => _ListeroDetailScreenState();
}

class _ListeroDetailScreenState extends State<ListeroDetailScreen> {
  late String _groupId;
  late ListeroModel _listero;

  late TextEditingController _nameCtrl;
  late TextEditingController _porcientoCtrl;
  bool _activo = true;
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && !_loaded) {
      _groupId = args['groupId'] as String;
      _listero = args['listero'] as ListeroModel;
      _nameCtrl = TextEditingController(text: _listero.name);
      _porcientoCtrl =
          TextEditingController(text: _listero.porciento.toString());
      _activo = _listero.activo;
      _loaded = true;
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _porcientoCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<GroupDetailProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(_listero.name.isNotEmpty ? _listero.name : _listero.phone),
        actions: [
          IconButton(
            icon: const Icon(Icons.delete, color: Colors.red),
            tooltip: 'Eliminar listero',
            onPressed: () => _confirmDelete(provider),
          ),
        ],
      ),
      body: LoadingOverlay(
        isLoading: provider.isLoadingListeros,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor:
                            theme.colorScheme.primaryContainer,
                        child: Icon(
                          Icons.person,
                          size: 32,
                          color: theme.colorScheme.onPrimaryContainer,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _listero.name.isNotEmpty
                                  ? _listero.name
                                  : 'Sin nombre',
                              style: theme.textTheme.titleLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              _listero.phone,
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: theme.colorScheme.onSurfaceVariant,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Stats cards
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      theme,
                      'Porciento',
                      '${_listero.porciento.toStringAsFixed(1)}%',
                      Icons.percent,
                      Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      theme,
                      'Deuda',
                      '\$${_listero.deuda.toStringAsFixed(2)}',
                      Icons.money_off,
                      Colors.red,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      theme,
                      'Jornadas',
                      '${_listero.jornadasCompletadas}',
                      Icons.event_available,
                      Colors.green,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildStatCard(
                      theme,
                      'Estado',
                      _listero.activo ? 'Activo' : 'Inactivo',
                      _listero.activo ? Icons.check_circle : Icons.cancel,
                      _listero.activo ? Colors.green : Colors.red,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Edit form
              Text('Editar Listero',
                  style: theme.textTheme.titleMedium
                      ?.copyWith(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nameCtrl,
                decoration: InputDecoration(
                  labelText: 'Nombre',
                  prefixIcon: const Icon(Icons.person),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  filled: true,
                ),
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _porcientoCtrl,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Porciento (%)',
                  suffixText: '%',
                  prefixIcon: const Icon(Icons.percent),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  filled: true,
                ),
              ),
              const SizedBox(height: 12),

              SwitchListTile(
                title: const Text('Listero activo'),
                subtitle: const Text(
                    'Desactivar para impedir que participe en jornadas'),
                value: _activo,
                onChanged: (val) => setState(() => _activo = val),
                contentPadding: EdgeInsets.zero,
              ),
              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                child: FilledButton.icon(
                  onPressed: () => _saveChanges(provider),
                  icon: const Icon(Icons.save),
                  label: const Text('Guardar Cambios'),
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatCard(
      ThemeData theme, String label, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(
              value,
              style: theme.textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold, color: color),
            ),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Future<void> _saveChanges(GroupDetailProvider provider) async {
    final porciento = double.tryParse(_porcientoCtrl.text) ?? _listero.porciento;
    final success = await provider.updateListero(
      _groupId,
      _listero.phone,
      {
        'name': _nameCtrl.text.trim(),
        'porciento': porciento,
        'activo': _activo,
      },
    );

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(success
              ? 'Listero actualizado correctamente'
              : provider.errorMessage ?? 'Error al actualizar'),
          backgroundColor: success ? Colors.green : Colors.red,
        ),
      );

      if (success) {
        Navigator.of(context).pop();
      }
    }
  }

  void _confirmDelete(GroupDetailProvider provider) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Eliminar Listero'),
        content: Text(
            '¿Estás seguro de eliminar a ${_listero.name.isNotEmpty ? _listero.name : _listero.phone}?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.of(ctx).pop();
              final success =
                  await provider.deleteListero(_groupId, _listero.phone);
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                        success ? 'Listero eliminado' : 'Error al eliminar'),
                    backgroundColor: success ? Colors.green : Colors.red,
                  ),
                );
                if (success) {
                  Navigator.of(context).pop();
                }
              }
            },
            style: FilledButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
  }
}

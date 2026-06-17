import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/group_model.dart';
import '../providers/group_detail_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/loading_overlay.dart';

class GroupConfigScreen extends StatefulWidget {
  const GroupConfigScreen({super.key});

  @override
  State<GroupConfigScreen> createState() => _GroupConfigScreenState();
}

class _GroupConfigScreenState extends State<GroupConfigScreen> {
  late String _groupId;
  String _groupName = '';

  // Controllers para premios
  final Map<String, TextEditingController> _premioControllers = {};
  bool _jornadaAutomatica = true;
  String _loteriaActual = 'Florida';
  String _modo = 'automatico';

  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && !_loaded) {
      _groupId = args['groupId'] as String;
      _groupName = args['groupName'] as String? ?? '';

      final provider = context.read<GroupDetailProvider>();
      provider.clear();
      provider.loadGroupDetail(_groupId).then((_) {
        _populateFromGroup(provider.group);
      });
      _loaded = true;
    }
  }

  void _populateFromGroup(GroupModel? group) {
    if (group == null) return;
    setState(() {
      _groupName = group.name;
      _loteriaActual = group.lotteryType;
      _modo = group.mode;
      _jornadaAutomatica = group.jornadaAutomatica;

      // Inicializar controllers de premios
      _premioControllers.clear();
      for (final entry in group.config.premiosMap.entries) {
        _premioControllers[entry.key] =
            TextEditingController(text: entry.value.toString());
      }
    });
  }

  @override
  void dispose() {
    for (final c in _premioControllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<GroupDetailProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(_groupName.isNotEmpty ? _groupName : 'Configuración'),
        actions: [
          TextButton.icon(
            onPressed: () => _saveConfig(provider),
            icon: const Icon(Icons.save),
            label: const Text('Guardar'),
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: LoadingOverlay(
        isLoading: provider.isLoadingGroup,
        message: 'Cargando configuración...',
        child: provider.errorMessage != null && provider.group == null
            ? _buildError(theme, provider)
            : _buildConfigForm(theme, provider),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildError(ThemeData theme, GroupDetailProvider provider) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
          const SizedBox(height: 12),
          Text(provider.errorMessage ?? 'Error', textAlign: TextAlign.center),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => provider.loadGroupDetail(_groupId),
            child: const Text('Reintentar'),
          ),
        ],
      ),
    );
  }

  Widget _buildConfigForm(ThemeData theme, GroupDetailProvider provider) {
    final group = provider.group;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Info del grupo
          if (group != null) _buildGroupInfo(theme, group),
          const SizedBox(height: 20),

          // Lotería
          _buildSectionTitle(theme, 'Tipo de Lotería'),
          const SizedBox(height: 8),
          _buildLotterySelector(theme),
          const SizedBox(height: 20),

          // Modo
          _buildSectionTitle(theme, 'Modo de Operación'),
          const SizedBox(height: 8),
          _buildModeSelector(theme),
          const SizedBox(height: 20),

          // Switch jornada automática
          SwitchListTile(
            title: const Text('Jornada Automática'),
            subtitle: const Text(
                'Iniciar y cerrar jornadas automáticamente según horarios'),
            value: _jornadaAutomatica,
            onChanged: (val) => setState(() => _jornadaAutomatica = val),
            contentPadding: EdgeInsets.zero,
          ),
          const SizedBox(height: 12),

          // Configuración de Premios
          _buildSectionTitle(theme, 'Pago de Premios (CUP)'),
          const SizedBox(height: 4),
          Text(
            'Define cuánto paga cada tipo de premio',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
          const SizedBox(height: 12),
          _buildPremiosConfig(theme),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _buildGroupInfo(ThemeData theme, GroupModel group) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.info_outline, color: theme.colorScheme.primary, size: 20),
                const SizedBox(width: 8),
                Text('Información', style: theme.textTheme.titleSmall),
              ],
            ),
            const SizedBox(height: 10),
            _infoRow(theme, 'ID', group.id.length > 20
                ? '${group.id.substring(0, 20)}...' : group.id),
            _infoRow(theme, 'Admin', '+${group.adminPhone}'),
            _infoRow(theme, 'Miembros', '${group.memberCount}'),
            _infoRow(theme, 'Listeros', '${group.listeroCount}'),
            if (group.jornadaActivaId != null) ...[
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.green.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text('🟢 Jornada activa',
                    style: TextStyle(color: Colors.green, fontSize: 13,
                        fontWeight: FontWeight.w500)),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _infoRow(ThemeData theme, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          SizedBox(
            width: 85,
            child: Text(label,
                style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurfaceVariant)),
          ),
          Expanded(
            child: Text(value, style: theme.textTheme.bodyMedium),
          ),
        ],
      ),
    );
  }

  Widget _buildLotterySelector(ThemeData theme) {
    final loterias = ['Florida', 'Georgia', 'New York'];
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      children: loterias.map((name) {
        final selected = _loteriaActual == name;
        return ChoiceChip(
          label: Text(name),
          selected: selected,
          onSelected: (val) {
            if (val) setState(() => _loteriaActual = name);
          },
          selectedColor: theme.colorScheme.primaryContainer,
          labelStyle: TextStyle(
            fontWeight: selected ? FontWeight.bold : FontWeight.normal,
          ),
        );
      }).toList(),
    );
  }

  Widget _buildModeSelector(ThemeData theme) {
    return Row(
      children: [
        Expanded(
          child: RadioListTile<String>(
            title: const Text('Automático'),
            subtitle: const Text('El bot gestiona todo'),
            value: 'automatico',
            groupValue: _modo,
            onChanged: (val) {
              if (val != null) setState(() => _modo = val);
            },
            contentPadding: EdgeInsets.zero,
          ),
        ),
        Expanded(
          child: RadioListTile<String>(
            title: const Text('Manual'),
            subtitle: const Text('Tú controlas las jornadas'),
            value: 'manual',
            groupValue: _modo,
            onChanged: (val) {
              if (val != null) setState(() => _modo = val);
            },
            contentPadding: EdgeInsets.zero,
          ),
        ),
      ],
    );
  }

  Widget _buildPremiosConfig(ThemeData theme) {
    final tipos = ['Parlet', 'Centena', 'Fijo', 'Corrido'];
    final descripciones = {
      'Parlet': '2 últimos dígitos (Pick4) o 1 dígito (Pick3)',
      'Centena': '3 últimos dígitos (Pick4)',
      'Fijo': 'Número exacto jugado',
      'Corrido': 'Cualquier orden de los dígitos',
    };

    return Column(
      children: tipos.map((tipo) {
        if (!_premioControllers.containsKey(tipo)) {
          _premioControllers[tipo] =
              TextEditingController(text: _getDefaultPremio(tipo));
        }
        return Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(
            children: [
              Expanded(
                flex: 3,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(tipo,
                        style: theme.textTheme.bodyLarge
                            ?.copyWith(fontWeight: FontWeight.w600)),
                    Text(descripciones[tipo] ?? '',
                        style: theme.textTheme.bodySmall?.copyWith(
                            color: theme.colorScheme.onSurfaceVariant)),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              SizedBox(
                width: 100,
                child: TextFormField(
                  controller: _premioControllers[tipo],
                  keyboardType: TextInputType.number,
                  textAlign: TextAlign.center,
                  decoration: InputDecoration(
                    suffixText: 'CUP',
                    border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(8)),
                    filled: true,
                    isDense: true,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  String _getDefaultPremio(String tipo) {
    const defaults = {
      'Parlet': '400',
      'Centena': '400',
      'Fijo': '80',
      'Corrido': '20',
    };
    return defaults[tipo] ?? '0';
  }

  Widget _buildSectionTitle(ThemeData theme, String title) {
    return Text(
      title,
      style: theme.textTheme.titleMedium?.copyWith(
        fontWeight: FontWeight.bold,
        color: theme.colorScheme.primary,
      ),
    );
  }

  void _saveConfig(GroupDetailProvider provider) async {
    // Construir mapa de premios
    final premiosMap = <String, int>{};
    for (final entry in _premioControllers.entries) {
      final value = int.tryParse(entry.value.text) ?? 0;
      premiosMap[entry.key] = value;
    }

    // Build body matching API expected fields (top-level)
    final body = {
      'loteriaActual': _loteriaActual,
      'modo': _modo,
      'jornadaAutomatica': _jornadaAutomatica,
      'configPremios': premiosMap,
      'barraInterpretacion': 'error',
      'bancoGroupJid': '',
    };

    try {
      final success = await provider.updateGroupConfig(_groupId, body);

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? '✅ Configuración guardada correctamente'
                : '❌ ${provider.errorMessage ?? "Error al guardar"}'),
            backgroundColor: success ? Colors.green : Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error: $e'),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Widget _buildBottomNav() {
    return BottomNavigationBar(
      currentIndex: 0,
      type: BottomNavigationBarType.fixed,
      onTap: (index) {
        switch (index) {
          case 0:
            break; // Ya en config
          case 1:
            Navigator.of(context).pushNamed('/listeros', arguments: {
              'groupId': _groupId,
              'groupName': _groupName,
            });
            break;
          case 2:
            Navigator.of(context).pushNamed('/jornadas', arguments: {
              'groupId': _groupId,
              'groupName': _groupName,
            });
            break;
        }
      },
      items: const [
        BottomNavigationBarItem(
          icon: Icon(Icons.settings),
          label: 'Config',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.people),
          label: 'Listeros',
        ),
        BottomNavigationBarItem(
          icon: Icon(Icons.event_note),
          label: 'Jornadas',
        ),
      ],
    );
  }
}

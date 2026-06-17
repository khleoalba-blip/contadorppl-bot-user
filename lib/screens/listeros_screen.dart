import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/listero_model.dart';
import '../providers/group_detail_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/listero_card.dart';
import '../widgets/loading_overlay.dart';

class ListerosScreen extends StatefulWidget {
  const ListerosScreen({super.key});

  @override
  State<ListerosScreen> createState() => _ListerosScreenState();
}

class _ListerosScreenState extends State<ListerosScreen> {
  late String _groupId;
  String _groupName = '';
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && !_loaded) {
      _groupId = args['groupId'] as String;
      _groupName = args['groupName'] as String? ?? '';
      _loaded = true;
      context.read<GroupDetailProvider>().loadListeros(_groupId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<GroupDetailProvider>();
    final listeros = provider.listeros;

    return Scaffold(
      appBar: AppBar(
        title: Text('Listeros — $_groupName'),
      ),
      drawer: const AppDrawer(),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _showAddListeroDialog(provider),
        icon: const Icon(Icons.person_add),
        label: const Text('Agregar Listero'),
      ),
      body: LoadingOverlay(
        isLoading: provider.isLoadingListeros,
        message: 'Cargando listeros...',
        child: RefreshIndicator(
          onRefresh: () => provider.loadListeros(_groupId),
          child: provider.errorMessage != null &&
                  listeros.isEmpty &&
                  !provider.isLoadingListeros
              ? _buildError(theme, provider)
              : listeros.isEmpty && !provider.isLoadingListeros
                  ? _buildEmpty(theme)
                  : _buildListeroList(theme, listeros, provider),
        ),
      ),
    );
  }

  Widget _buildError(ThemeData theme, GroupDetailProvider provider) {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Center(
          child: Column(
            children: [
              Icon(Icons.error_outline, size: 48,
                  color: theme.colorScheme.error),
              const SizedBox(height: 12),
              Text(provider.errorMessage ?? 'Error',
                  textAlign: TextAlign.center),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: () => provider.loadListeros(_groupId),
                child: const Text('Reintentar'),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildEmpty(ThemeData theme) {
    return ListView(
      children: [
        const SizedBox(height: 80),
        Center(
          child: Column(
            children: [
              Icon(Icons.person_off, size: 64,
                  color: theme.colorScheme.primary.withOpacity(0.4)),
              const SizedBox(height: 16),
              Text('No hay listeros', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                'Agrega listeros para este grupo',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildListeroList(
    ThemeData theme,
    List<ListeroModel> listeros,
    GroupDetailProvider provider,
  ) {
    final activos = listeros.where((l) => l.activo).toList();
    final inactivos = listeros.where((l) => !l.activo).toList();

    return ListView(
      padding: const EdgeInsets.only(top: 8, bottom: 80),
      children: [
        // Summary
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              _buildMiniStat(theme, 'Total', '${listeros.length}', Icons.people),
              const SizedBox(width: 12),
              _buildMiniStat(theme, 'Activos', '${activos.length}',
                  Icons.check_circle, Colors.green),
              const SizedBox(width: 12),
              _buildMiniStat(theme, 'Total %',
                  '${provider.totalPorciento.toStringAsFixed(1)}%',
                  Icons.percent, Colors.orange),
            ],
          ),
        ),
        const SizedBox(height: 8),

        if (activos.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text('Activos',
                style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.green, fontWeight: FontWeight.w600)),
          ),
          ...activos.map((l) => ListeroCard(
                listero: l,
                onTap: () {
                  Navigator.of(context)
                      .pushNamed('/listero-detail', arguments: {
                    'groupId': _groupId,
                    'groupName': _groupName,
                    'listero': l,
                  });
                },
              )),
        ],

        if (inactivos.isNotEmpty) ...[
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text('Inactivos',
                style: theme.textTheme.titleSmall?.copyWith(
                    color: Colors.red.shade400,
                    fontWeight: FontWeight.w600)),
          ),
          ...inactivos.map((l) => ListeroCard(
                listero: l,
                onTap: () {
                  Navigator.of(context)
                      .pushNamed('/listero-detail', arguments: {
                    'groupId': _groupId,
                    'groupName': _groupName,
                    'listero': l,
                  });
                },
              )),
        ],
      ],
    );
  }

  Widget _buildMiniStat(ThemeData theme, String label, String value,
      IconData icon,
      [Color? color]) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            children: [
              Icon(icon, size: 18,
                  color: color ?? theme.colorScheme.primary),
              const SizedBox(height: 4),
              Text(value,
                  style: theme.textTheme.titleSmall
                      ?.copyWith(fontWeight: FontWeight.bold)),
              Text(label, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
      ),
    );
  }

  void _showAddListeroDialog(GroupDetailProvider provider) {
    final phoneCtrl = TextEditingController();
    final nameCtrl = TextEditingController();
    final pctCtrl = TextEditingController(text: '0');
    final formKey = GlobalKey<FormState>();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Agregar Listero'),
        content: Form(
          key: formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: phoneCtrl,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Teléfono',
                  hintText: '+53 5XXX XXXX',
                  prefixIcon: Icon(Icons.phone),
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Requerido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: nameCtrl,
                decoration: const InputDecoration(
                  labelText: 'Nombre',
                  hintText: 'Nombre del listero',
                  prefixIcon: Icon(Icons.person),
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Requerido' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: pctCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Porciento (%)',
                  suffixText: '%',
                  prefixIcon: Icon(Icons.percent),
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) return 'Requerido';
                  final val = double.tryParse(v);
                  if (val == null || val < 0 || val > 100) {
                    return '0-100';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
          FilledButton(
            onPressed: () async {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.of(ctx).pop();
                final success = await provider.addListero(
                  _groupId,
                  phoneCtrl.text.trim(),
                  nameCtrl.text.trim(),
                  double.tryParse(pctCtrl.text) ?? 0,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(success
                          ? 'Listero agregado'
                          : provider.errorMessage ?? 'Error'),
                      backgroundColor: success ? Colors.green : Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Agregar'),
          ),
        ],
      ),
    );
  }
}

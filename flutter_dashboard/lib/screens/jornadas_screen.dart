import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/jornada_model.dart';
import '../providers/jornadas_provider.dart';
import '../widgets/app_drawer.dart';
import '../widgets/jornada_card.dart';
import '../widgets/loading_overlay.dart';

class JornadasScreen extends StatefulWidget {
  const JornadasScreen({super.key});

  @override
  State<JornadasScreen> createState() => _JornadasScreenState();
}

class _JornadasScreenState extends State<JornadasScreen> {
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
      context.read<JornadasProvider>().loadJornadas(_groupId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<JornadasProvider>();
    final jornadas = provider.jornadas;

    return Scaffold(
      appBar: AppBar(
        title: Text('Jornadas — $_groupName'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.loadJornadas(_groupId),
            tooltip: 'Actualizar',
          ),
        ],
      ),
      drawer: const AppDrawer(),
      body: LoadingOverlay(
        isLoading: provider.isLoading,
        message: 'Cargando jornadas...',
        child: RefreshIndicator(
          onRefresh: () => provider.loadJornadas(_groupId),
          child: provider.errorMessage != null &&
                  jornadas.isEmpty &&
                  !provider.isLoading
              ? _buildError(theme, provider)
              : jornadas.isEmpty && !provider.isLoading
                  ? _buildEmpty(theme)
                  : _buildJornadaList(theme, provider),
        ),
      ),
    );
  }

  Widget _buildError(ThemeData theme, JornadasProvider provider) {
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
                onPressed: () => provider.loadJornadas(_groupId),
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
              Icon(Icons.event_busy, size: 64,
                  color: theme.colorScheme.primary.withOpacity(0.4)),
              const SizedBox(height: 16),
              Text('No hay jornadas', style: theme.textTheme.titleMedium),
              const SizedBox(height: 8),
              Text(
                'Las jornadas se crearán automáticamente\nsegún los horarios configurados.',
                textAlign: TextAlign.center,
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

  Widget _buildJornadaList(ThemeData theme, JornadasProvider provider) {
    final activas = provider.jornadasActivas;
    final cerradas = provider.jornadasCerradas;

    return ListView(
      padding: const EdgeInsets.only(top: 8, bottom: 24),
      children: [
        // Summary
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Row(
            children: [
              Expanded(
                child: _buildSummaryCard(
                  theme,
                  'Total',
                  '${provider.jornadas.length}',
                  Icons.event_note,
                  theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  theme,
                  'Activas',
                  '${activas.length}',
                  Icons.play_circle,
                  Colors.green,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildSummaryCard(
                  theme,
                  'Cerradas',
                  '${cerradas.length}',
                  Icons.check_circle,
                  Colors.blue,
                ),
              ),
            ],
          ),
        ),

        if (activas.isNotEmpty) ...[
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text(
              'Jornadas Activas',
              style: theme.textTheme.titleSmall?.copyWith(
                color: Colors.green,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ...activas.map((j) => JornadaCard(
                jornada: j,
                onTap: () => _openJornadaDetail(j),
              )),
        ],

        if (cerradas.isNotEmpty) ...[
          const SizedBox(height: 12),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Text(
              'Jornadas Cerradas',
              style: theme.textTheme.titleSmall?.copyWith(
                color: Colors.blue,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          ...cerradas.map((j) => JornadaCard(
                jornada: j,
                onTap: () => _openJornadaDetail(j),
              )),
        ],
      ],
    );
  }

  Widget _buildSummaryCard(
    ThemeData theme,
    String label,
    String value,
    IconData icon,
    Color color,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(10),
        child: Column(
          children: [
            Icon(icon, size: 20, color: color),
            const SizedBox(height: 4),
            Text(value,
                style: theme.textTheme.titleSmall
                    ?.copyWith(fontWeight: FontWeight.bold)),
            Text(label, style: theme.textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  void _openJornadaDetail(JornadaModel jornada) {
    Navigator.of(context).pushNamed('/jornada-detail', arguments: {
      'groupId': _groupId,
      'groupName': _groupName,
      'jornadaId': jornada.id,
      'jornada': jornada,
    });
  }
}

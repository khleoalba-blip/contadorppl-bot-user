import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/jornada_model.dart';
import '../providers/jornadas_provider.dart';
import '../widgets/loading_overlay.dart';
import '../widgets/status_badge.dart';
import '../widgets/status_badge.dart';

class JornadaDetailScreen extends StatefulWidget {
  const JornadaDetailScreen({super.key});

  @override
  State<JornadaDetailScreen> createState() => _JornadaDetailScreenState();
}

class _JornadaDetailScreenState extends State<JornadaDetailScreen> {
  late String _groupId;
  late String _jornadaId;
  JornadaModel? _initialJornada;
  bool _loaded = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final args =
        ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    if (args != null && !_loaded) {
      _groupId = args['groupId'] as String;
      _jornadaId = args['jornadaId'] as String;
      _initialJornada = args['jornada'] as JornadaModel?;
      _loaded = true;
      context
          .read<JornadasProvider>()
          .loadJornadaDetail(_groupId, _jornadaId);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<JornadasProvider>();
    final jornada = provider.selectedJornada ?? _initialJornada;
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');

    return Scaffold(
      appBar: AppBar(
        title: Text(jornada != null
            ? 'Jornada ${jornada.turnoLabel}'
            : 'Detalle de Jornada'),
      ),
      body: LoadingOverlay(
        isLoading: provider.isLoadingDetail,
        message: 'Cargando detalles...',
        child: jornada == null
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: () =>
                    provider.loadJornadaDetail(_groupId, _jornadaId),
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header status card
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Jornada ${jornada.turnoLabel}',
                                    style: theme.textTheme.headlineSmall
                                        ?.copyWith(
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                  StatusBadge(
                                      estado: jornada.estado,
                                      fontSize: 12),
                                ],
                              ),
                              const SizedBox(height: 12),
                              Row(
                                children: [
                                  Icon(Icons.category,
                                      size: 16,
                                      color: theme
                                          .colorScheme.onSurfaceVariant),
                                  const SizedBox(width: 6),
                                  Text(
                                    jornada.lottery.isNotEmpty
                                        ? jornada.lottery.toUpperCase()
                                        : 'Sin tipo',
                                    style: theme.textTheme.bodyMedium,
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              _buildDetailRow(
                                theme,
                                'Creada',
                                jornada.fechaCreacion != null
                                    ? dateFormat
                                        .format(jornada.fechaCreacion!)
                                    : '—',
                                Icons.calendar_today,
                              ),
                              const SizedBox(height: 8),
                              _buildDetailRow(
                                theme,
                                'Apertura',
                                jornada.fechaApertura != null
                                    ? dateFormat
                                        .format(jornada.fechaApertura!)
                                    : '—',
                                Icons.play_arrow,
                              ),
                              const SizedBox(height: 8),
                              _buildDetailRow(
                                theme,
                                'Cierre',
                                jornada.fechaCierre != null
                                    ? dateFormat
                                        .format(jornada.fechaCierre!)
                                    : '—',
                                Icons.stop,
                              ),
                              const SizedBox(height: 8),
                              _buildDetailRow(
                                theme,
                                'Recaudado',
                                '\$${jornada.totalRecaudado.toStringAsFixed(2)}',
                                Icons.attach_money,
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),

                      // Results section
                      if (jornada.premios.isNotEmpty) ...[
                        Text(
                          'Resultados',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              children: jornada.premios.map((premio) {
                                return ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor:
                                        theme.colorScheme.primaryContainer,
                                    child: Text(
                                      premio.numero,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: theme.colorScheme
                                            .onPrimaryContainer,
                                      ),
                                    ),
                                  ),
                                  title: Text(premio.premio),
                                  trailing: Text(
                                    '\$${premio.monto.toStringAsFixed(2)}',
                                    style:
                                        theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.bold,
                                      color: Colors.green,
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Picks / Jugadas section
                      Text(
                        'Jugadas (${jornada.picks.length})',
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 8),

                      if (jornada.picks.isEmpty)
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Center(
                              child: Text(
                                'No hay jugadas registradas',
                                style: theme.textTheme.bodyMedium?.copyWith(
                                  color: theme
                                      .colorScheme.onSurfaceVariant,
                                ),
                              ),
                            ),
                          ),
                        )
                      else
                        ...jornada.picks.map((pick) {
                          return Card(
                            margin: const EdgeInsets.only(bottom: 6),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.blue.withOpacity(0.1),
                                child: Text(
                                  pick.numero,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue,
                                  ),
                                ),
                              ),
                              title: Text(
                                pick.ubicacion.isNotEmpty
                                    ? 'Posición: ${pick.ubicacion}'
                                    : 'Sin posición',
                                style: theme.textTheme.bodyMedium,
                              ),
                              subtitle: pick.listero.isNotEmpty
                                  ? Text('Listero: ${pick.listero}')
                                  : null,
                              trailing: Text(
                                '\$${pick.monto.toStringAsFixed(2)}',
                                style: theme.textTheme.titleSmall?.copyWith(
                                  fontWeight: FontWeight.bold,
                                  color: theme.colorScheme.primary,
                                ),
                              ),
                            ),
                          );
                        }),

                      // Resumen section
                      if (jornada.resumen.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Text(
                          'Resumen',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Card(
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Text(
                              jornada.resumen,
                              style: theme.textTheme.bodyMedium,
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(height: 32),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildDetailRow(
      ThemeData theme, String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 16, color: theme.colorScheme.onSurfaceVariant),
        const SizedBox(width: 8),
        SizedBox(
          width: 90,
          child: Text(
            label,
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.colorScheme.onSurfaceVariant,
            ),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: theme.textTheme.bodyMedium?.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),
        ),
      ],
    );
  }
}

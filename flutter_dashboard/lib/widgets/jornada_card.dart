import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/jornada_model.dart';
import 'status_badge.dart';

class JornadaCard extends StatelessWidget {
  final JornadaModel jornada;
  final VoidCallback? onTap;

  const JornadaCard({super.key, required this.jornada, this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final dateFormat = DateFormat('dd/MM/yyyy HH:mm');

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    jornada.turno == 'mañana'
                        ? Icons.wb_sunny
                        : Icons.nights_stay,
                    size: 18,
                    color: jornada.turno == 'mañana'
                        ? Colors.orange
                        : Colors.indigo,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'Jornada ${jornada.turnoLabel}',
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Spacer(),
                  StatusBadge(estado: jornada.estado),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildInfoText(
                    context,
                    Icons.calendar_today,
                    jornada.fechaCreacion != null
                        ? dateFormat.format(jornada.fechaCreacion!)
                        : '—',
                  ),
                  const SizedBox(width: 16),
                  _buildInfoText(
                    context,
                    Icons.numbers,
                    jornada.lottery.isNotEmpty ? jornada.lottery : '—',
                  ),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  _buildInfoText(
                    context,
                    Icons.receipt_long,
                    '${jornada.picks.length} jugadas',
                  ),
                  const SizedBox(width: 16),
                  _buildInfoText(
                    context,
                    Icons.attach_money,
                    '\$${jornada.totalRecaudado.toStringAsFixed(2)}',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoText(BuildContext context, IconData icon, String text) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        const SizedBox(width: 4),
        Text(
          text,
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ],
    );
  }
}

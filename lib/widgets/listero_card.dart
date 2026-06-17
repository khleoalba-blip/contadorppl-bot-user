import 'package:flutter/material.dart';
import '../models/listero_model.dart';

class ListeroCard extends StatelessWidget {
  final ListeroModel listero;
  final VoidCallback? onTap;

  const ListeroCard({super.key, required this.listero, this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: listero.activo
              ? Theme.of(context).colorScheme.primaryContainer
              : Colors.grey.shade200,
          child: Icon(
            Icons.person,
            color: listero.activo
                ? Theme.of(context).colorScheme.onPrimaryContainer
                : Colors.grey,
          ),
        ),
        title: Text(
          listero.name.isNotEmpty ? listero.name : listero.phone,
          style: theme.textTheme.titleSmall?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              listero.phone,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
            const SizedBox(height: 4),
            Row(
              children: [
                _buildChip(
                  '${listero.porciento.toStringAsFixed(1)}%',
                  Colors.blue,
                ),
                const SizedBox(width: 6),
                if (!listero.activo)
                  _buildChip('Inactivo', Colors.red),
                if (listero.activo)
                  _buildChip('Activo', Colors.green),
              ],
            ),
          ],
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: theme.colorScheme.onSurfaceVariant,
        ),
        onTap: onTap,
      ),
    );
  }

  Widget _buildChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

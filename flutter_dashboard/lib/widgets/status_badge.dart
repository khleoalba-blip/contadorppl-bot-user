import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String estado;
  final double fontSize;

  const StatusBadge({super.key, required this.estado, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    final (Color bgColor, Color textColor, String label, IconData icon) =
        _getStatusStyle();

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w600,
              color: textColor,
            ),
          ),
        ],
      ),
    );
  }

  (Color, Color, String, IconData) _getStatusStyle() {
    switch (estado.toLowerCase()) {
      case 'abierta':
        return (
          Colors.green.withOpacity(0.15),
          Colors.green.shade700,
          'Abierta',
          Icons.play_circle,
        );
      case 'pendiente':
        return (
          Colors.orange.withOpacity(0.15),
          Colors.orange.shade700,
          'Pendiente',
          Icons.schedule,
        );
      case 'cerrada':
        return (
          Colors.blue.withOpacity(0.15),
          Colors.blue.shade700,
          'Cerrada',
          Icons.lock,
        );
      case 'procesada':
        return (
          Colors.purple.withOpacity(0.15),
          Colors.purple.shade700,
          'Procesada',
          Icons.check_circle,
        );
      default:
        return (
          Colors.grey.withOpacity(0.15),
          Colors.grey.shade700,
          estado,
          Icons.help,
        );
    }
  }
}

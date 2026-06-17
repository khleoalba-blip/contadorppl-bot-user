class JornadaModel {
  final String id;
  final String lottery; // Lottery type
  final String turno; // 'mañana' or 'tarde'
  final String estado; // 'pendiente', 'abierta', 'cerrada', 'procesada'
  final List<PickEntry> picks; // Ticket picks submitted
  final List<PremioEntry> premios; // Prize results
  final DateTime? fechaApertura;
  final DateTime? fechaCierre;
  final DateTime? fechaCreacion;
  final double totalRecaudado;
  final String resumen;

  JornadaModel({
    required this.id,
    required this.lottery,
    required this.turno,
    required this.estado,
    this.picks = const [],
    this.premios = const [],
    this.fechaApertura,
    this.fechaCierre,
    this.fechaCreacion,
    this.totalRecaudado = 0.0,
    this.resumen = '',
  });

  factory JornadaModel.fromJson(Map<String, dynamic> json) {
    return JornadaModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      lottery: json['lottery'] as String? ?? '',
      turno: json['turno'] as String? ?? 'mañana',
      estado: json['estado'] as String? ?? 'pendiente',
      picks: json['picks'] != null
          ? (json['picks'] as List)
              .map((p) => PickEntry.fromJson(p as Map<String, dynamic>))
              .toList()
          : [],
      premios: json['premios'] != null
          ? (json['premios'] as List)
              .map((p) => PremioEntry.fromJson(p as Map<String, dynamic>))
              .toList()
          : [],
      fechaApertura: json['fechaApertura'] != null
          ? DateTime.tryParse(json['fechaApertura'] as String)
          : null,
      fechaCierre: json['fechaCierre'] != null
          ? DateTime.tryParse(json['fechaCierre'] as String)
          : null,
      fechaCreacion: json['fechaCreacion'] != null
          ? DateTime.tryParse(json['fechaCreacion'] as String)
          : null,
      totalRecaudado:
          (json['totalRecaudado'] as num?)?.toDouble() ?? 0.0,
      resumen: json['resumen'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'lottery': lottery,
      'turno': turno,
      'estado': estado,
      'picks': picks.map((p) => p.toJson()).toList(),
      'premios': premios.map((p) => p.toJson()).toList(),
      'totalRecaudado': totalRecaudado,
      'resumen': resumen,
    };
  }

  String get turnoLabel => turno == 'mañana' ? 'Mañana' : 'Tarde';

  bool get isActive => estado == 'abierta' || estado == 'pendiente';
  bool get isClosed => estado == 'cerrada' || estado == 'procesada';
}

class PickEntry {
  final String numero; // Lottery number
  final double monto; // Amount
  final String ubicacion; // Position
  final String listero; // Listero phone

  PickEntry({
    required this.numero,
    required this.monto,
    this.ubicacion = '',
    this.listero = '',
  });

  factory PickEntry.fromJson(Map<String, dynamic> json) {
    return PickEntry(
      numero: json['numero']?.toString() ?? '',
      monto: (json['monto'] as num?)?.toDouble() ?? 0.0,
      ubicacion: json['ubicacion'] as String? ?? '',
      listero: json['listero'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'numero': numero,
      'monto': monto,
      'ubicacion': ubicacion,
      'listero': listero,
    };
  }
}

class PremioEntry {
  final String numero;
  final String premio;
  final double monto;

  PremioEntry({
    required this.numero,
    required this.premio,
    required this.monto,
  });

  factory PremioEntry.fromJson(Map<String, dynamic> json) {
    return PremioEntry(
      numero: json['numero']?.toString() ?? '',
      premio: json['premio']?.toString() ?? '',
      monto: (json['monto'] as num?)?.toDouble() ?? 0.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'numero': numero,
      'premio': premio,
      'monto': monto,
    };
  }
}

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
  final String pick3; // Pick 3 result
  final String pick4; // Pick 4 result
  final int premiosProcesados;
  final int listerosCount;
  final double totalPremios;

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
    this.pick3 = '',
    this.pick4 = '',
    this.premiosProcesados = 0,
    this.listerosCount = 0,
    this.totalPremios = 0.0,
  });

  factory JornadaModel.fromJson(Map<String, dynamic> json) {
    return JornadaModel(
      id: json['_id'] as String? ?? json['id'] as String? ?? '',
      lottery: json['loteria'] as String? ?? json['lottery'] as String? ?? '',
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
      fechaApertura: _parseDate(json['inicio']) ?? _parseDate(json['fechaApertura']),
      fechaCierre: _parseDate(json['fin']) ?? _parseDate(json['fechaCierre']),
      fechaCreacion: _parseDate(json['fechaCreacion']),
      totalRecaudado:
          (json['totalRecaudado'] as num?)?.toDouble() ?? 0.0,
      resumen: json['resumen'] as String? ?? '',
      pick3: json['pick3'] as String? ?? '',
      pick4: json['pick4'] as String? ?? '',
      premiosProcesados: json['premiosProcesados'] as int? ?? 0,
      listerosCount: json['listerosCount'] as int? ?? 0,
      totalPremios: (json['totalPremios'] as num?)?.toDouble() ?? 0.0,
    );
  }

  static DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    if (value is String) return DateTime.tryParse(value);
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'loteria': lottery,
      'turno': turno,
      'estado': estado,
      'picks': picks.map((p) => p.toJson()).toList(),
      'premios': premios.map((p) => p.toJson()).toList(),
      'totalRecaudado': totalRecaudado,
      'resumen': resumen,
      'pick3': pick3,
      'pick4': pick4,
      'premiosProcesados': premiosProcesados,
      'listerosCount': listerosCount,
      'totalPremios': totalPremios,
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

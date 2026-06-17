class ListeroModel {
  final String phone;
  final String name;
  final double porciento; // Commission percentage
  final double deuda; // Debt amount
  final bool activo;
  final DateTime? fechaIngreso;
  final int jornadasCompletadas;

  ListeroModel({
    required this.phone,
    required this.name,
    this.porciento = 0.0,
    this.deuda = 0.0,
    this.activo = true,
    this.fechaIngreso,
    this.jornadasCompletadas = 0,
  });

  factory ListeroModel.fromJson(Map<String, dynamic> json) {
    return ListeroModel(
      phone: json['phone'] as String? ?? '',
      name: json['nombre'] as String? ?? json['name'] as String? ?? '',
      porciento: (json['porciento'] as num?)?.toDouble() ?? 0.0,
      deuda: (json['deuda'] as num?)?.toDouble() ?? 0.0,
      activo: json['activo'] as bool? ?? true,
      fechaIngreso: json['fechaIngreso'] != null
          ? DateTime.tryParse(json['fechaIngreso'] as String)
          : null,
      jornadasCompletadas: json['jornadasCompletadas'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'phone': phone,
      'name': name,
      'porciento': porciento,
      'deuda': deuda,
      'activo': activo,
    };
  }

  ListeroModel copyWith({
    String? phone,
    String? name,
    double? porciento,
    double? deuda,
    bool? activo,
    int? jornadasCompletadas,
  }) {
    return ListeroModel(
      phone: phone ?? this.phone,
      name: name ?? this.name,
      porciento: porciento ?? this.porciento,
      deuda: deuda ?? this.deuda,
      activo: activo ?? this.activo,
      jornadasCompletadas: jornadasCompletadas ?? this.jornadasCompletadas,
    );
  }

  @override
  String toString() => 'ListeroModel(phone: $phone, name: $name, porciento: $porciento%)';
}

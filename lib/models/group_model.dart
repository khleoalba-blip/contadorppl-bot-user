class GroupModel {
  final String id;
  final String name;
  final String adminPhone;
  final String lotteryType; // Florida, Charada, etc.
  final String mode; // automatico, manual
  final bool jornadaAutomatica;
  final String? jornadaActivaId;
  final GroupConfig config;
  final int listeroCount;
  final int activeJornadas;
  final int memberCount;
  final String? description;
  final bool isGroupBanca;

  GroupModel({
    required this.id,
    required this.name,
    required this.adminPhone,
    required this.lotteryType,
    required this.mode,
    this.jornadaAutomatica = true,
    this.jornadaActivaId,
    required this.config,
    this.listeroCount = 0,
    this.activeJornadas = 0,
    this.memberCount = 0,
    this.description,
    this.isGroupBanca = false,
  });

  factory GroupModel.fromJson(Map<String, dynamic> json) {
    // Mapeo de campos de la API del bot (español) al modelo Flutter
    return GroupModel(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Sin nombre',
      adminPhone: json['adminPhone'] as String? ?? '',
      lotteryType: json['loteriaActual'] as String? ?? 'Florida',
      mode: json['modo'] as String? ?? 'manual',
      jornadaAutomatica: json['jornadaAutomatica'] as bool? ?? true,
      jornadaActivaId: json['jornadaActivaId'] as String?,
      config: GroupConfig.fromApiJson(json),
      listeroCount: json['listerosRegistrados'] is List
          ? (json['listerosRegistrados'] as List).length
          : (json['listerosCount'] as int? ?? 0),
      activeJornadas: json['jornadaActivaId'] != null ? 1 : 0,
      memberCount: json['memberCount'] as int? ?? 0,
      description: json['description'] as String?,
      isGroupBanca: json['isGroupBanca'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'loteriaActual': lotteryType,
      'modo': mode,
      'jornadaAutomatica': jornadaAutomatica,
      'configPremios': config.premiosMap,
      'barraInterpretacion': config.barraInterpretacion,
      'bancoGroupJid': config.bancoGroupJid,
    };
  }

  GroupModel copyWith({
    String? id,
    String? name,
    String? adminPhone,
    String? lotteryType,
    String? mode,
    bool? jornadaAutomatica,
    String? jornadaActivaId,
    GroupConfig? config,
    int? listeroCount,
    int? activeJornadas,
    int? memberCount,
  }) {
    return GroupModel(
      id: id ?? this.id,
      name: name ?? this.name,
      adminPhone: adminPhone ?? this.adminPhone,
      lotteryType: lotteryType ?? this.lotteryType,
      mode: mode ?? this.mode,
      jornadaAutomatica: jornadaAutomatica ?? this.jornadaAutomatica,
      jornadaActivaId: jornadaActivaId ?? this.jornadaActivaId,
      config: config ?? this.config,
      listeroCount: listeroCount ?? this.listeroCount,
      activeJornadas: activeJornadas ?? this.activeJornadas,
      memberCount: memberCount ?? this.memberCount,
    );
  }
}

class GroupConfig {
  // Premios (del bot: { Parlet: 400, Centena: 400, Fijo: 80, Corrido: 20 })
  final Map<String, int> premiosMap;
  final String barraInterpretacion;
  final String? bancoGroupJid;

  // Horarios (simplificado para la app)
  final String horarioMananaInicio;
  final String horarioMananaFin;
  final String horarioMananaResultados;
  final String horarioTardeInicio;
  final String horarioTardeFin;
  final String horarioTardeResultados;

  // Flags
  final bool notificarResultados;
  final bool permitirListerosExternos;
  final double premioMaximo;

  // Lista legacy de premios (para compatibilidad con la UI)
  final List<String> premios;

  GroupConfig({
    Map<String, int>? premiosMap,
    this.barraInterpretacion = 'error',
    this.bancoGroupJid,
    this.horarioMananaInicio = '08:00',
    this.horarioMananaFin = '13:10',
    this.horarioMananaResultados = '13:36',
    this.horarioTardeInicio = '14:00',
    this.horarioTardeFin = '21:00',
    this.horarioTardeResultados = '21:51',
    this.notificarResultados = true,
    this.permitirListerosExternos = false,
    this.premioMaximo = 1000.0,
    List<String>? premios,
  })  : premiosMap = premiosMap ?? {
          'Parlet': 400,
          'Centena': 400,
          'Fijo': 80,
          'Corrido': 20,
        },
        premios = premios ??
            ['Parlet:400', 'Centena:400', 'Fijo:80', 'Corrido:20'];

  factory GroupConfig.fromApiJson(Map<String, dynamic> json) {
    // Parsear configPremios del bot
    Map<String, int> premiosMap = {};
    if (json['configPremios'] is Map) {
      (json['configPremios'] as Map).forEach((k, v) {
        premiosMap[k.toString()] = (v is num) ? v.toInt() : 0;
      });
    }

    // Convertir a lista de strings para UI
    final premiosList = premiosMap.entries
        .map((e) => '${e.key}:${e.value}')
        .toList();

    return GroupConfig(
      premiosMap: premiosMap,
      premios: premiosList.isNotEmpty ? premiosList : ['Parlet:400', 'Centena:400', 'Fijo:80', 'Corrido:20'],
      barraInterpretacion: json['barraInterpretacion'] as String? ?? 'error',
      bancoGroupJid: json['bancoGroupJid'] as String?,
      notificarResultados: json['jornadaAutomatica'] as bool? ?? true,
    );
  }

  factory GroupConfig.fromJson(Map<String, dynamic> json) {
    return GroupConfig(
      premios: json['premios'] != null
          ? List<String>.from(json['premios'] as List)
          : ['Parlet:400', 'Centena:400', 'Fijo:80', 'Corrido:20'],
      horarioMananaInicio: json['horarioMananaInicio'] as String? ?? '08:00',
      horarioMananaFin: json['horarioMananaFin'] as String? ?? '13:10',
      horarioMananaResultados: json['horarioMananaResultados'] as String? ?? '13:36',
      horarioTardeInicio: json['horarioTardeInicio'] as String? ?? '14:00',
      horarioTardeFin: json['horarioTardeFin'] as String? ?? '21:00',
      horarioTardeResultados: json['horarioTardeResultados'] as String? ?? '21:51',
      notificarResultados: json['notificarResultados'] as bool? ?? true,
      permitirListerosExternos: json['permitirListerosExternos'] as bool? ?? false,
      premioMaximo: (json['premioMaximo'] as num?)?.toDouble() ?? 1000.0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'loteriaActual': null, // Se maneja en GroupModel
      'modo': null,
      'jornadaAutomatica': notificarResultados,
      'configPremios': premiosMap,
      'barraInterpretacion': barraInterpretacion,
      'bancoGroupJid': bancoGroupJid,
    };
  }

  GroupConfig copyWith({
    Map<String, int>? premiosMap,
    String? barraInterpretacion,
    String? bancoGroupJid,
    String? horarioMananaInicio,
    String? horarioMananaFin,
    String? horarioMananaResultados,
    String? horarioTardeInicio,
    String? horarioTardeFin,
    String? horarioTardeResultados,
    bool? notificarResultados,
    bool? permitirListerosExternos,
    double? premioMaximo,
    List<String>? premios,
  }) {
    return GroupConfig(
      premiosMap: premiosMap ?? this.premiosMap,
      barraInterpretacion: barraInterpretacion ?? this.barraInterpretacion,
      bancoGroupJid: bancoGroupJid ?? this.bancoGroupJid,
      horarioMananaInicio: horarioMananaInicio ?? this.horarioMananaInicio,
      horarioMananaFin: horarioMananaFin ?? this.horarioMananaFin,
      horarioMananaResultados: horarioMananaResultados ?? this.horarioMananaResultados,
      horarioTardeInicio: horarioTardeInicio ?? this.horarioTardeInicio,
      horarioTardeFin: horarioTardeFin ?? this.horarioTardeFin,
      horarioTardeResultados: horarioTardeResultados ?? this.horarioTardeResultados,
      notificarResultados: notificarResultados ?? this.notificarResultados,
      permitirListerosExternos: permitirListerosExternos ?? this.permitirListerosExternos,
      premioMaximo: premioMaximo ?? this.premioMaximo,
      premios: premios ?? this.premios,
    );
  }
}

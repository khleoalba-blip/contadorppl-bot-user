class Usuario {
  final String telefono;
  final String nombre;
  final bool autorizado;

  Usuario({
    required this.telefono,
    required this.nombre,
    required this.autorizado,
  });

  factory Usuario.fromJson(Map<String, dynamic> json) {
    return Usuario(
      telefono: json['telefono'] ?? '',
      nombre: json['nombre'] ?? '',
      autorizado: json['autorizado'] ?? false,
    );
  }
}

class Grupo {
  final String groupId;
  final String adminPhone;
  final String loteriaActual;
  final String modo;
  final bool jornadaAutomatica;
  final bool jornadaActiva;
  final String? jornadaActivaId;
  final int listerosCount;
  final String? ultimaJornadaCerrada;

  Grupo({
    required this.groupId,
    required this.adminPhone,
    required this.loteriaActual,
    required this.modo,
    required this.jornadaAutomatica,
    required this.jornadaActiva,
    this.jornadaActivaId,
    required this.listerosCount,
    this.ultimaJornadaCerrada,
  });

  factory Grupo.fromJson(Map<String, dynamic> json) {
    return Grupo(
      groupId: json['groupId'] ?? '',
      adminPhone: json['adminPhone'] ?? '',
      loteriaActual: json['loteriaActual'] ?? 'Florida',
      modo: json['modo'] ?? 'manual',
      jornadaAutomatica: json['jornadaAutomatica'] ?? false,
      jornadaActiva: json['jornadaActiva'] ?? false,
      jornadaActivaId: json['jornadaActivaId'],
      listerosCount: json['listerosCount'] ?? 0,
      ultimaJornadaCerrada: json['ultimaJornadaCerrada'],
    );
  }
}

class GrupoConfig {
  final String? adminPhone;
  final String loteriaActual;
  final String modo;
  final bool jornadaAutomatica;
  final List<String> listerosRegistrados;
  final Map<String, dynamic> configPremios;
  final String? bancoGroupJid;
  final String? jornadaActivaId;
  final String? ultimaJornadaCerrada;

  GrupoConfig({
    this.adminPhone,
    this.loteriaActual = 'Florida',
    this.modo = 'automatico',
    this.jornadaAutomatica = true,
    this.listerosRegistrados = const [],
    this.configPremios = const {},
    this.bancoGroupJid,
    this.jornadaActivaId,
    this.ultimaJornadaCerrada,
  });

  factory GrupoConfig.fromJson(Map<String, dynamic> json) {
    return GrupoConfig(
      adminPhone: json['adminPhone'],
      loteriaActual: json['loteriaActual'] ?? 'Florida',
      modo: json['modo'] ?? 'automatico',
      jornadaAutomatica: json['jornadaAutomatica'] ?? true,
      listerosRegistrados: List<String>.from(json['listerosRegistrados'] ?? []),
      configPremios: Map<String, dynamic>.from(json['configPremios'] ?? {}),
      bancoGroupJid: json['bancoGroupJid'],
      jornadaActivaId: json['jornadaActivaId'],
      ultimaJornadaCerrada: json['ultimaJornadaCerrada'],
    );
  }
}

class Listero {
  final String phone;
  final String nombre;
  final int porciento;
  final double deuda;
  final String horarioPermitido;
  bool activo;

  Listero({
    required this.phone,
    required this.nombre,
    this.porciento = 0,
    this.deuda = 0,
    this.horarioPermitido = 'ambos',
    this.activo = true,
  });

  factory Listero.fromJson(Map<String, dynamic> json) {
    return Listero(
      phone: json['phone'] ?? '',
      nombre: json['nombre'] ?? '',
      porciento: json['porciento'] ?? 0,
      deuda: (json['deuda'] ?? 0).toDouble(),
      horarioPermitido: json['horarioPermitido'] ?? 'ambos',
      activo: json['activo'] ?? true,
    );
  }
}

class Jornada {
  final String jornadaId;
  final String estado;
  final String loteria;
  final String inicio;
  final String? finReal;
  final int mensajesCount;
  final bool esActiva;

  Jornada({
    required this.jornadaId,
    required this.estado,
    required this.loteria,
    required this.inicio,
    this.finReal,
    this.mensajesCount = 0,
    this.esActiva = false,
  });

  factory Jornada.fromJson(Map<String, dynamic> json) {
    return Jornada(
      jornadaId: json['jornadaId'] ?? '',
      estado: json['estado'] ?? 'desconocida',
      loteria: json['loteria'] ?? '',
      inicio: json['inicio'] ?? '',
      finReal: json['finReal'],
      mensajesCount: json['mensajesCount'] ?? 0,
      esActiva: json['esActiva'] ?? false,
    );
  }
}

class BotStatus {
  final bool online;
  final bool mongoActivo;
  final String timestamp;
  final String version;

  BotStatus({
    required this.online,
    required this.mongoActivo,
    required this.timestamp,
    required this.version,
  });

  factory BotStatus.fromJson(Map<String, dynamic> json) {
    return BotStatus(
      online: json['online'] ?? false,
      mongoActivo: json['mongoActivo'] ?? false,
      timestamp: json['timestamp'] ?? '',
      version: json['version'] ?? '',
    );
  }
}

class Stats {
  final int gruposActivos;
  final int jornadasActivas;
  final int totalListeros;
  final int totalGrupos;

  Stats({
    this.gruposActivos = 0,
    this.jornadasActivas = 0,
    this.totalListeros = 0,
    this.totalGrupos = 0,
  });

  factory Stats.fromJson(Map<String, dynamic> json) {
    return Stats(
      gruposActivos: json['gruposActivos'] ?? 0,
      jornadasActivas: json['jornadasActivas'] ?? 0,
      totalListeros: json['totalListeros'] ?? 0,
      totalGrupos: json['totalGrupos'] ?? 0,
    );
  }
}

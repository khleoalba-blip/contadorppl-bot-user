import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config.dart';
import '../models/models.dart';

/// Cliente HTTP para la API REST del bot ContadorPPL.
class ApiService {
  static const String _baseUrl = AppConfig.apiBaseUrl;
  static const String _token = AppConfig.apiToken;

  Map<String, String> get _headers => {
        'X-API-Token': _token,
        'Content-Type': 'application/json',
      };

  // ── Auth ──────────────────────────────────────────────────────

  Future<Usuario> login(String phone) async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/auth/$phone'),
      );
      if (r.statusCode == 200) {
        return Usuario.fromJson(jsonDecode(r.body));
      }
      final err = jsonDecode(r.body);
      return Usuario(
        telefono: phone,
        nombre: '',
        autorizado: false,
      );
    } catch (_) {
      return Usuario(telefono: phone, nombre: '', autorizado: false);
    }
  }

  // ── Status ────────────────────────────────────────────────────

  Future<BotStatus> status() async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/status'),
        headers: _headers,
      );
      if (r.statusCode == 200) return BotStatus.fromJson(jsonDecode(r.body));
    } catch (_) {}
    return BotStatus(online: false, mongoActivo: false, timestamp: '', version: '');
  }

  // ── Grupos ────────────────────────────────────────────────────

  Future<List<Grupo>> listarGrupos(String adminPhone) async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/groups?adminPhone=$adminPhone'),
        headers: _headers,
      );
      if (r.statusCode == 200) {
        final List data = jsonDecode(r.body);
        return data.map((j) => Grupo.fromJson(j)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<GrupoConfig> obtenerConfigGrupo(String groupId) async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/groups/$groupId/config'),
        headers: _headers,
      );
      if (r.statusCode == 200) {
        return GrupoConfig.fromJson(jsonDecode(r.body));
      }
    } catch (_) {}
    return GrupoConfig();
  }

  Future<bool> actualizarConfigGrupo(String groupId, Map<String, dynamic> config) async {
    try {
      final r = await http.put(
        Uri.parse('$_baseUrl/groups/$groupId/config'),
        headers: _headers,
        body: jsonEncode(config),
      );
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ── Listeros ──────────────────────────────────────────────────

  Future<List<Listero>> listarListeros(String groupId) async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/groups/$groupId/listeros'),
        headers: _headers,
      );
      if (r.statusCode == 200) {
        final List data = jsonDecode(r.body);
        return data.map((j) => Listero.fromJson(j)).toList();
      }
    } catch (_) {}
    return [];
  }

  Future<bool> agregarListero(String groupId, String phone, String nombre,
      {int porciento = 0, String horario = 'ambos'}) async {
    try {
      final r = await http.post(
        Uri.parse('$_baseUrl/groups/$groupId/listeros'),
        headers: _headers,
        body: jsonEncode({
          'phone': phone,
          'nombre': nombre,
          'porciento': porciento,
          'horarioPermitido': horario,
        }),
      );
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> actualizarListero(String groupId, String phone, Map<String, dynamic> data) async {
    try {
      final r = await http.put(
        Uri.parse('$_baseUrl/groups/$groupId/listeros/$phone'),
        headers: _headers,
        body: jsonEncode(data),
      );
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  Future<bool> eliminarListero(String groupId, String phone) async {
    try {
      final r = await http.delete(
        Uri.parse('$_baseUrl/groups/$groupId/listeros/$phone'),
        headers: _headers,
      );
      return r.statusCode == 200;
    } catch (_) {
      return false;
    }
  }

  // ── Jornadas ──────────────────────────────────────────────────

  Future<List<Jornada>> listarJornadas(String groupId) async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/groups/$groupId/jornadas'),
        headers: _headers,
      );
      if (r.statusCode == 200) {
        final List data = jsonDecode(r.body);
        return data.map((j) => Jornada.fromJson(j)).toList();
      }
    } catch (_) {}
    return [];
  }

  // ── Stats ─────────────────────────────────────────────────────

  Future<Stats> estadisticas(String adminPhone) async {
    try {
      final r = await http.get(
        Uri.parse('$_baseUrl/stats/$adminPhone'),
        headers: _headers,
      );
      if (r.statusCode == 200) return Stats.fromJson(jsonDecode(r.body));
    } catch (_) {}
    return Stats();
  }
}

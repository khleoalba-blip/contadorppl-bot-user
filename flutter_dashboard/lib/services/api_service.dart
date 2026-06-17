import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, {this.statusCode});

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

class ApiService {
  static const _timeout = Duration(seconds: 60);
  String? _token;

  void setToken(String? token) {
    _token = token;
  }

  Map<String, String> get _headers {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  Future<dynamic> post(String endpoint, {Map<String, dynamic>? body}) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final response = await http
          .post(url, headers: _headers, body: body != null ? jsonEncode(body) : null)
          .timeout(_timeout);

      return _handleResponse(response);
    } on SocketException {
      throw ApiException('No se pudo conectar al servidor. Verifica la conexión.');
    } on http.ClientException {
      throw ApiException('Error de conexión con el servidor.');
    }
  }

  Future<dynamic> get(String endpoint) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final response = await http
          .get(url, headers: _headers)
          .timeout(_timeout);

      return _handleResponse(response);
    } on SocketException {
      throw ApiException('No se pudo conectar al servidor. Verifica la conexión.');
    } on http.ClientException {
      throw ApiException('Error de conexión con el servidor.');
    }
  }

  Future<dynamic> put(String endpoint, {Map<String, dynamic>? body}) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final response = await http
          .put(url, headers: _headers, body: body != null ? jsonEncode(body) : null)
          .timeout(_timeout);

      return _handleResponse(response);
    } on SocketException {
      throw ApiException('No se pudo conectar al servidor. Verifica la conexión.');
    } on http.ClientException {
      throw ApiException('Error de conexión con el servidor.');
    }
  }

  Future<dynamic> delete(String endpoint) async {
    try {
      final url = Uri.parse('${ApiConfig.baseUrl}$endpoint');
      final response = await http
          .delete(url, headers: _headers)
          .timeout(_timeout);

      return _handleResponse(response);
    } on SocketException {
      throw ApiException('No se pudo conectar al servidor. Verifica la conexión.');
    } on http.ClientException {
      throw ApiException('Error de conexión con el servidor.');
    }
  }

  dynamic _handleResponse(http.Response response) {
    final body = jsonDecode(response.body);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    } else if (response.statusCode == 401) {
      throw ApiException('Sesión expirada. Inicia sesión nuevamente.', statusCode: 401);
    } else if (response.statusCode == 403) {
      throw ApiException('No tienes permiso para realizar esta acción.', statusCode: 403);
    } else if (response.statusCode == 404) {
      throw ApiException('Recurso no encontrado.', statusCode: 404);
    } else if (response.statusCode == 429) {
      throw ApiException('Demasiadas solicitudes. Intenta de nuevo más tarde.', statusCode: 429);
    } else {
      final message = body is Map ? (body['message'] ?? body['error'] ?? 'Error del servidor') : 'Error del servidor';
      throw ApiException(message.toString(), statusCode: response.statusCode);
    }
  }

  // ============================================================
  // AUTH API
  // ============================================================

  Future<Map<String, dynamic>> requestCode(String phone) async {
    final response = await post(ApiConfig.requestCode, body: {'phone': phone});
    return response as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> verifyCode(String phone, String code) async {
    final response = await post(ApiConfig.verifyCode, body: {'phone': phone, 'code': code});
    return response as Map<String, dynamic>;
  }

  // ============================================================
  // USER API
  // ============================================================

  Future<Map<String, dynamic>> getUserProfile() async {
    final response = await get(ApiConfig.userProfile);
    return response as Map<String, dynamic>;
  }

  // ============================================================
  // GROUPS API
  // ============================================================

  Future<List<dynamic>> getGroups() async {
    final response = await get(ApiConfig.groups);
    if (response is List) return response;
    if (response is Map && response.containsKey('data')) return response['data'] as List;
    return [];
  }

  Future<Map<String, dynamic>> getGroupDetail(String id) async {
    final response = await get(ApiConfig.groupDetail(id));
    return response as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateGroupConfig(
      String id, Map<String, dynamic> body) async {
    final response = await put(ApiConfig.groupConfig(id), body: body);
    return response as Map<String, dynamic>;
  }

  // ============================================================
  // LISTEROS API
  // ============================================================

  Future<List<dynamic>> getListeros(String groupId) async {
    final response = await get(ApiConfig.groupListeros(groupId));
    if (response is List) return response;
    if (response is Map && response.containsKey('data')) return response['data'] as List;
    return [];
  }

  Future<Map<String, dynamic>> addListero(
      String groupId, String phone, String name, double porciento) async {
    final response = await post(
      ApiConfig.groupListeros(groupId),
      body: {
        'phone': phone,
        'nombre': name,
        'porciento': porciento,
        'horarioPermitido': '00:00-23:59',
      },
    );
    return response as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> updateListero(
      String groupId, String phone, Map<String, dynamic> data) async {
    final response = await put(
      ApiConfig.groupListeroDetail(groupId, phone),
      body: data,
    );
    return response as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> deleteListero(
      String groupId, String phone) async {
    final response =
        await delete(ApiConfig.groupListeroDetail(groupId, phone));
    final data = response;
    if (data is Map<String, dynamic>) return data;
    return {'success': true};
  }

  // ============================================================
  // JORNADAS API
  // ============================================================

  Future<List<dynamic>> getJornadas(String groupId) async {
    final response = await get(ApiConfig.groupJornadas(groupId));
    if (response is List) return response;
    if (response is Map && response.containsKey('data')) return response['data'] as List;
    return [];
  }

  Future<Map<String, dynamic>> getJornadaDetail(
      String groupId, String jornadaId) async {
    final response =
        await get(ApiConfig.groupJornadaDetail(groupId, jornadaId));
    return response as Map<String, dynamic>;
  }
}

import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  static const String DEFAULT_URL = 'https://cppl-stble-2.onrender.com';
  static const String API_PATH = '/api';

  static String _baseUrl = DEFAULT_URL;

  static String get baseUrl => '$_baseUrl$API_PATH';

  static Future<void> loadFromPrefs() async {
    final prefs = await SharedPreferences.getInstance();
    _baseUrl = prefs.getString('server_url') ?? DEFAULT_URL;
  }

  static Future<void> setBaseUrl(String url) async {
    // Quitar trailing slash
    if (url.endsWith('/')) url = url.substring(0, url.length - 1);
    _baseUrl = url;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('server_url', _baseUrl);
  }

  static String get host => _baseUrl;

  // Auth endpoints
  static const String requestCode = '/auth/request-code';
  static const String verifyCode = '/auth/verify-code';

  // Groups endpoints
  static const String groups = '/groups';
  static String groupDetail(String id) => '/groups/$id';
  static String groupConfig(String id) => '/groups/$id/config';
  static String groupListeros(String id) => '/groups/$id/listeros';
  static String groupListeroDetail(String groupId, String phone) =>
      '/groups/$groupId/listeros/$phone';
  static String groupJornadas(String id) => '/groups/$id/jornadas';
  static String groupJornadaDetail(String groupId, String jornadaId) =>
      '/groups/$groupId/jornadas/$jornadaId';

  // User endpoints
  static const String userProfile = '/user/profile';
}

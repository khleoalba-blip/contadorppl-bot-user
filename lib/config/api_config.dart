// ignore_for_file: constant_identifier_names

class ApiConfig {
  // Cambiar esta IP por la IP del servidor del bot
  static const String DEFAULT_HOST = '192.168.1.100';
  static const int DEFAULT_PORT = 3000;
  static const String API_PATH = '/api';

  static String _host = DEFAULT_HOST;
  static int _port = DEFAULT_PORT;

  static String get baseUrl => 'http://$_host:$_port$API_PATH';

  static void configure({required String host, int port = 3000}) {
    _host = host;
    _port = port;
  }

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

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user_model.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _apiService;
  final FlutterSecureStorage _secureStorage;

  static const _tokenKey = 'auth_token';
  static const _userPhoneKey = 'user_phone';
  static const _userNameKey = 'user_name';

  AuthService(this._apiService)
      : _secureStorage = const FlutterSecureStorage();

  Future<bool> isLoggedIn() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);
      return token != null && token.isNotEmpty;
    } catch (_) {
      return false;
    }
  }

  Future<UserModel?> getSavedUser() async {
    try {
      final token = await _secureStorage.read(key: _tokenKey);
      final phone = await _secureStorage.read(key: _userPhoneKey);
      final name = await _secureStorage.read(key: _userNameKey);

      if (token != null && phone != null) {
        _apiService.setToken(token);
        return UserModel(
          phone: phone,
          name: name ?? '',
          token: token,
        );
      }
    } catch (_) {}
    return null;
  }

  Future<String> requestCode(String phone) async {
    try {
      final response = await _apiService.requestCode(phone);
      return response['message'] as String? ?? 'Código enviado';
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Error al solicitar código: $e');
    }
  }

  Future<UserModel> verifyCode(String phone, String code) async {
    try {
      final response = await _apiService.verifyCode(phone, code);
      final token = response['token'] as String?;
      final userData = response['user'] as Map<String, dynamic>?;

      if (token == null) {
        throw ApiException('No se recibió token de autenticación');
      }

      final user = UserModel.fromJson(userData ?? {'phone': phone}, token: token);

      // Save credentials
      await _secureStorage.write(key: _tokenKey, value: token);
      await _secureStorage.write(key: _userPhoneKey, value: user.phone);
      await _secureStorage.write(key: _userNameKey, value: user.name);

      _apiService.setToken(token);

      return user;
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException('Error al verificar código: $e');
    }
  }

  Future<void> logout() async {
    _apiService.setToken(null);
    await _secureStorage.delete(key: _tokenKey);
    await _secureStorage.delete(key: _userPhoneKey);
    await _secureStorage.delete(key: _userNameKey);
  }

  String? get currentToken {
    return null; // Token is managed internally
  }
}

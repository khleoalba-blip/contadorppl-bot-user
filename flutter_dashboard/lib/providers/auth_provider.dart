import 'package:flutter/material.dart';
import '../models/user_model.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

enum AuthStatus { initial, loading, authenticated, unauthenticated, error }

class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  AuthStatus _status = AuthStatus.initial;
  UserModel? _user;
  String? _errorMessage;

  AuthProvider(this._authService, this._apiService);

  AuthStatus get status => _status;
  UserModel? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  Future<void> tryAutoLogin() async {
    _status = AuthStatus.loading;
    notifyListeners();

    try {
      final savedUser = await _authService.getSavedUser();
      if (savedUser != null) {
        _user = savedUser;
        _status = AuthStatus.authenticated;
      } else {
        _status = AuthStatus.unauthenticated;
      }
    } catch (_) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }

  Future<void> requestCode(String phone) async {
    // ⚠️ NO cambiar a loading aquí — eso destruiría el LoginScreen
    // y el await en _solicitarCodigo() no podría hacer setState.
    _errorMessage = null;
    // notifyListeners() — mínimo impacto, solo limpia errores previos

    try {
      await _authService.requestCode(phone);
      // Éxito: notificar sin cambiar status
      notifyListeners();
    } on ApiException catch (e) {
      _status = AuthStatus.error;
      _errorMessage = e.message;
      notifyListeners();
    } catch (e) {
      _status = AuthStatus.error;
      _errorMessage = 'Error inesperado: $e';
      notifyListeners();
    }
  }

  Future<void> verifyCode(String phone, String code) async {
    _status = AuthStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final user = await _authService.verifyCode(phone, code);
      _user = user;
      _status = AuthStatus.authenticated;
      notifyListeners();
    } on ApiException catch (e) {
      _status = AuthStatus.error;
      _errorMessage = e.message;
      notifyListeners();
    } catch (e) {
      _status = AuthStatus.error;
      _errorMessage = 'Error inesperado: $e';
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}

import 'package:flutter/material.dart';
import '../models/group_model.dart';
import '../models/listero_model.dart';
import '../services/api_service.dart';

class GroupDetailProvider extends ChangeNotifier {
  final ApiService _apiService;

  GroupModel? _group;
  List<ListeroModel> _listeros = [];
  bool _isLoadingGroup = false;
  bool _isLoadingListeros = false;
  String? _errorMessage;

  GroupDetailProvider(this._apiService);

  GroupModel? get group => _group;
  List<ListeroModel> get listeros => _listeros;
  bool get isLoadingGroup => _isLoadingGroup;
  bool get isLoadingListeros => _isLoadingListeros;
  String? get errorMessage => _errorMessage;

  List<ListeroModel> get listerosActivos =>
      _listeros.where((l) => l.activo).toList();

  double get totalPorciento =>
      _listeros.fold(0.0, (sum, l) => sum + l.porciento);

  Future<void> loadGroupDetail(String groupId) async {
    _isLoadingGroup = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiService.getGroupDetail(groupId);
      _group = GroupModel.fromJson(data);
      _isLoadingGroup = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoadingGroup = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Error al cargar detalles del grupo: $e';
      _isLoadingGroup = false;
      notifyListeners();
    }
  }

  Future<void> loadListeros(String groupId) async {
    _isLoadingListeros = true;
    notifyListeners();

    try {
      final data = await _apiService.getListeros(groupId);
      _listeros =
          data.map((json) => ListeroModel.fromJson(json as Map<String, dynamic>)).toList();
      _isLoadingListeros = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoadingListeros = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Error al cargar listeros: $e';
      _isLoadingListeros = false;
      notifyListeners();
    }
  }

  Future<bool> updateGroupConfig(String groupId, Map<String, dynamic> body) async {
    try {
      await _apiService.updateGroupConfig(groupId, body);
      // Update local state from the saved body
      if (_group != null) {
        final updatedConfig = GroupConfig(
          premiosMap: (body['configPremios'] as Map<String, dynamic>?)
                  ?.map((k, v) => MapEntry(k, (v as num).toInt())) ??
              _group!.config.premiosMap,
          barraInterpretacion:
              body['barraInterpretacion'] as String? ?? _group!.config.barraInterpretacion,
          bancoGroupJid:
              body['bancoGroupJid'] as String? ?? _group!.config.bancoGroupJid,
          notificarResultados:
              body['jornadaAutomatica'] as bool? ?? _group!.config.notificarResultados,
        );
        _group = _group!.copyWith(
          lotteryType: body['loteriaActual'] as String? ?? _group!.lotteryType,
          mode: body['modo'] as String? ?? _group!.mode,
          jornadaAutomatica:
              body['jornadaAutomatica'] as bool? ?? _group!.jornadaAutomatica,
          config: updatedConfig,
        );
        notifyListeners();
      }
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Error al actualizar configuración: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> addListero(
      String groupId, String phone, String name, double porciento) async {
    try {
      await _apiService.addListero(groupId, phone, name, porciento);
      await loadListeros(groupId);
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Error al agregar listero: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> updateListero(
      String groupId, String phone, Map<String, dynamic> data) async {
    try {
      await _apiService.updateListero(groupId, phone, data);
      await loadListeros(groupId);
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Error al actualizar listero: $e';
      notifyListeners();
      return false;
    }
  }

  Future<bool> deleteListero(String groupId, String phone) async {
    try {
      await _apiService.deleteListero(groupId, phone);
      await loadListeros(groupId);
      return true;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'Error al eliminar listero: $e';
      notifyListeners();
      return false;
    }
  }

  void clear() {
    _group = null;
    _listeros = [];
    _isLoadingGroup = false;
    _isLoadingListeros = false;
    _errorMessage = null;
    notifyListeners();
  }
}

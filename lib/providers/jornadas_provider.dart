import 'package:flutter/material.dart';
import '../models/jornada_model.dart';
import '../services/api_service.dart';

class JornadasProvider extends ChangeNotifier {
  final ApiService _apiService;

  List<JornadaModel> _jornadas = [];
  JornadaModel? _selectedJornada;
  bool _isLoading = false;
  bool _isLoadingDetail = false;
  String? _errorMessage;

  JornadasProvider(this._apiService);

  List<JornadaModel> get jornadas => _jornadas;
  JornadaModel? get selectedJornada => _selectedJornada;
  bool get isLoading => _isLoading;
  bool get isLoadingDetail => _isLoadingDetail;
  String? get errorMessage => _errorMessage;

  List<JornadaModel> get jornadasActivas =>
      _jornadas.where((j) => j.isActive).toList();

  List<JornadaModel> get jornadasCerradas =>
      _jornadas.where((j) => j.isClosed).toList();

  int get totalActivas => jornadasActivas.length;

  Future<void> loadJornadas(String groupId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiService.getJornadas(groupId);
      _jornadas = data
          .map((json) => JornadaModel.fromJson(json as Map<String, dynamic>))
          .toList();
      _isLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Error al cargar jornadas: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadJornadaDetail(String groupId, String jornadaId) async {
    _isLoadingDetail = true;
    notifyListeners();

    try {
      final data = await _apiService.getJornadaDetail(groupId, jornadaId);
      _selectedJornada = JornadaModel.fromJson(data);
      _isLoadingDetail = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoadingDetail = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Error al cargar detalle de jornada: $e';
      _isLoadingDetail = false;
      notifyListeners();
    }
  }

  void clear() {
    _jornadas = [];
    _selectedJornada = null;
    _isLoading = false;
    _isLoadingDetail = false;
    _errorMessage = null;
    notifyListeners();
  }
}

import 'package:flutter/material.dart';
import '../models/group_model.dart';
import '../services/api_service.dart';

class GroupsProvider extends ChangeNotifier {
  final ApiService _apiService;

  List<GroupModel> _groups = [];
  bool _isLoading = false;
  String? _errorMessage;

  GroupsProvider(this._apiService);

  List<GroupModel> get groups => _groups;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get hasError => _errorMessage != null;

  int get totalGroups => _groups.length;
  int get activeGroups => _groups.where((g) => g.activeJornadas > 0).length;

  Future<void> loadGroups() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiService.getGroups();
      _groups = data.map((json) => GroupModel.fromJson(json as Map<String, dynamic>)).toList();
      _isLoading = false;
      notifyListeners();
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _errorMessage = 'Error al cargar grupos: $e';
      _isLoading = false;
      notifyListeners();
    }
  }

  GroupModel? getGroupById(String id) {
    try {
      return _groups.firstWhere((g) => g.id == id);
    } catch (_) {
      return null;
    }
  }

  void clear() {
    _groups = [];
    _isLoading = false;
    _errorMessage = null;
    notifyListeners();
  }
}

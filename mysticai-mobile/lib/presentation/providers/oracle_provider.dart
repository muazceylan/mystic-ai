import 'package:flutter/foundation.dart';
import '../../data/models/oracle_response.dart';
import '../../data/repositories/oracle_repository.dart';

enum OracleStatus { initial, loading, success, error }

class OracleProvider extends ChangeNotifier {
  final OracleRepository _repository;

  OracleProvider(this._repository);

  OracleStatus _status = OracleStatus.initial;
  OracleResponse? _oracleResponse;
  String? _errorMessage;

  OracleStatus get status => _status;
  OracleResponse? get oracleResponse => _oracleResponse;
  String? get errorMessage => _errorMessage;

  bool get isLoading => _status == OracleStatus.loading;
  bool get hasData => _status == OracleStatus.success && _oracleResponse != null;
  bool get hasError => _status == OracleStatus.error;

  Future<void> fetchDailySecret({
    bool includeAstrology = true,
    bool includeNumerology = true,
    bool includeDreams = true,
  }) async {
    _status = OracleStatus.loading;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await _repository.getDailySecret(
        includeAstrology: includeAstrology,
        includeNumerology: includeNumerology,
        includeDreams: includeDreams,
      );

      _oracleResponse = response;
      _status = OracleStatus.success;
    } catch (e) {
      _errorMessage = 'Günün sırrı alınırken bir hata oluştu: $e';
      _status = OracleStatus.error;
    }

    notifyListeners();
  }

  void clear() {
    _status = OracleStatus.initial;
    _oracleResponse = null;
    _errorMessage = null;
    notifyListeners();
  }
}

import 'package:dio/dio.dart';
import '../../core/network/dio_client.dart';
import '../models/oracle_response.dart';

abstract class OracleRepository {
  Future<OracleResponse> getDailySecret({
    bool includeAstrology = true,
    bool includeNumerology = true,
    bool includeDreams = true,
  });
}

class OracleRepositoryImpl implements OracleRepository {
  final DioClient _dioClient;

  OracleRepositoryImpl(this._dioClient);

  @override
  Future<OracleResponse> getDailySecret({
    bool includeAstrology = true,
    bool includeNumerology = true,
    bool includeDreams = true,
  }) async {
    final response = await _dioClient.dio.get(
      '/api/v1/oracle/daily-secret',
      queryParameters: {
        'includeAstrology': includeAstrology,
        'includeNumerology': includeNumerology,
        'includeDreams': includeDreams,
      },
      options: Options(
        headers: {
          'X-User-Id': '1', // TODO: Get from auth
        },
      ),
    );

    return OracleResponse.fromJson(response.data);
  }
}

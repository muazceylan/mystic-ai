import 'package:get_it/get_it.dart';
import 'package:provider/provider.dart';
import 'package:provider/single_child_widget.dart';

import '../network/dio_client.dart';
import '../network/websocket_service.dart';
import '../storage/secure_storage.dart';
import '../../data/repositories/oracle_repository.dart';
import '../../presentation/providers/oracle_provider.dart';

final getIt = GetIt.instance;

Future<void> initDependencies() async {
  // Core
  getIt.registerLazySingleton<SecureStorage>(() => SecureStorage());
  
  getIt.registerLazySingleton<DioClient>(
    () => DioClient(getIt<SecureStorage>()),
  );
  
  getIt.registerLazySingleton<WebSocketService>(
    () => WebSocketService(getIt<SecureStorage>()),
  );

  // Repositories
  getIt.registerLazySingleton<OracleRepository>(
    () => OracleRepositoryImpl(getIt<DioClient>()),
  );
}

List<SingleChildWidget> getProviders() {
  return [
    ChangeNotifierProvider(
      create: (_) => OracleProvider(getIt<OracleRepository>()),
    ),
  ];
}

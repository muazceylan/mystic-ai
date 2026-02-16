class AppConstants {
  AppConstants._();

  // API Configuration
  // Oracle Service runs directly on port 8087
  static const String baseUrl = 'http://127.0.0.1:8087';
  static const String apiVersion = '';

  // WebSocket Configuration
  static const String wsUrl = 'ws://127.0.0.1:8080/ws';
  static const int wsHeartbeatInterval = 10000; // 10 seconds
  
  // Storage Keys
  static const String tokenKey = 'auth_token';
  static const String refreshTokenKey = 'refresh_token';
  static const String userIdKey = 'user_id';
  static const String usernameKey = 'username';
  
  // Timeouts
  static const int connectTimeout = 30000;
  static const int receiveTimeout = 30000;
  static const int sendTimeout = 30000;
  
  // Pagination
  static const int defaultPageSize = 20;
  
  // Cache Duration
  static const Duration cacheDuration = Duration(minutes: 5);
}

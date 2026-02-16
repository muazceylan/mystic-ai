import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:logger/logger.dart';
import 'package:stomp_dart_client/stomp_dart_client.dart';
import '../constants/app_constants.dart';
import '../storage/secure_storage.dart';

class WebSocketService {
  final SecureStorage _secureStorage;
  final Logger _logger = Logger();
  
  StompClient? _stompClient;
  final Map<String, StompUnsubscribe> _subscriptions = {};
  final StreamController<Map<String, dynamic>> _messageController = 
      StreamController<Map<String, dynamic>>.broadcast();
  
  final _connectionStateController = StreamController<bool>.broadcast();
  Stream<bool> get connectionState => _connectionStateController.stream;
  Stream<Map<String, dynamic>> get messages => _messageController.stream;
  
  bool get isConnected => _stompClient?.connected ?? false;

  WebSocketService(this._secureStorage);

  Future<void> connect() async {
    if (_stompClient != null && _stompClient!.connected) {
      _logger.w('WebSocket already connected');
      return;
    }

    final token = await _secureStorage.read(AppConstants.tokenKey);
    final userId = await _secureStorage.read(AppConstants.userIdKey);

    if (token == null || userId == null) {
      _logger.e('Cannot connect WebSocket: Missing token or userId');
      return;
    }

    _stompClient = StompClient(
      config: StompConfig(
        url: AppConstants.wsUrl,
        webSocketConnectHeaders: {
          'Authorization': 'Bearer $token',
          'userId': userId,
        },
        stompConnectHeaders: {
          'Authorization': 'Bearer $token',
          'userId': userId,
        },
        onConnect: _onConnect,
        onDisconnect: _onDisconnect,
        onStompError: _onError,
        onWebSocketError: _onWebSocketError,
        onWebSocketDone: _onWebSocketDone,
        heartbeatOutgoing: const Duration(milliseconds: AppConstants.wsHeartbeatInterval),
        heartbeatIncoming: const Duration(milliseconds: AppConstants.wsHeartbeatInterval),
        reconnectDelay: const Duration(seconds: 5),
      ),
    );

    _stompClient!.activate();
    _logger.i('🌐 WebSocket connecting...');
  }

  void _onConnect(StompFrame frame) {
    _logger.i('✅ WebSocket connected');
    _connectionStateController.add(true);
    
    // Subscribe to user-specific notifications
    _subscribeToUserNotifications();
  }

  void _onDisconnect(StompFrame frame) {
    _logger.w('⚠️ WebSocket disconnected');
    _connectionStateController.add(false);
  }

  void _onError(StompFrame frame) {
    _logger.e('❌ STOMP Error: ${frame.body}');
  }

  void _onWebSocketError(dynamic error) {
    _logger.e('❌ WebSocket Error: $error');
    _connectionStateController.add(false);
  }

  void _onWebSocketDone() {
    _logger.w('⚠️ WebSocket connection closed');
    _connectionStateController.add(false);
  }

  void _subscribeToUserNotifications() async {
    final userId = await _secureStorage.read(AppConstants.userIdKey);
    if (userId == null) return;

    final destination = '/topic/notifications/$userId';
    
    final unsubscribe = _stompClient!.subscribe(
      destination: destination,
      callback: (frame) {
        if (frame.body != null) {
          try {
            final message = jsonDecode(frame.body!) as Map<String, dynamic>;
            _messageController.add(message);
            _logger.i('📨 Notification received: ${message['title']}');
          } catch (e) {
            _logger.e('Error parsing notification: $e');
          }
        }
      },
    );

    _subscriptions['notifications'] = unsubscribe;
    _logger.i('📬 Subscribed to notifications for user: $userId');
  }

  // Subscribe to a specific topic
  void subscribeToTopic(String topic, Function(Map<String, dynamic>) onMessage) {
    if (_stompClient == null || !_stompClient!.connected) {
      _logger.e('Cannot subscribe: WebSocket not connected');
      return;
    }

    final unsubscribe = _stompClient!.subscribe(
      destination: topic,
      callback: (frame) {
        if (frame.body != null) {
          try {
            final message = jsonDecode(frame.body!) as Map<String, dynamic>;
            onMessage(message);
          } catch (e) {
            _logger.e('Error parsing message: $e');
          }
        }
      },
    );

    _subscriptions[topic] = unsubscribe;
    _logger.i('📬 Subscribed to topic: $topic');
  }

  // Unsubscribe from a topic
  void unsubscribeFromTopic(String topic) {
    final unsubscribe = _subscriptions.remove(topic);
    if (unsubscribe != null) {
      unsubscribe();
      _logger.i('📭 Unsubscribed from topic: $topic');
    }
  }

  // Send message to a destination
  void sendMessage(String destination, Map<String, dynamic> body) {
    if (_stompClient == null || !_stompClient!.connected) {
      _logger.e('Cannot send: WebSocket not connected');
      return;
    }

    _stompClient!.send(
      destination: destination,
      body: jsonEncode(body),
      headers: {'content-type': 'application/json'},
    );
    _logger.d('📤 Message sent to: $destination');
  }

  // Disconnect
  void disconnect() {
    for (final unsubscribe in _subscriptions.values) {
      unsubscribe();
    }
    _subscriptions.clear();

    _stompClient?.deactivate();
    _stompClient = null;
    
    _logger.i('🔌 WebSocket disconnected');
  }

  void dispose() {
    disconnect();
    _messageController.close();
    _connectionStateController.close();
  }
}

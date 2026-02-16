import 'package:json_annotation/json_annotation.dart';

part 'oracle_response.g.dart';

@JsonSerializable()
class OracleResponse {
  final String mysticalMessage;
  final AggregatedData aggregatedData;
  final String generatedAt;

  OracleResponse({
    required this.mysticalMessage,
    required this.aggregatedData,
    required this.generatedAt,
  });

  factory OracleResponse.fromJson(Map<String, dynamic> json) =>
      _$OracleResponseFromJson(json);
  Map<String, dynamic> toJson() => _$OracleResponseToJson(this);
}

@JsonSerializable()
class AggregatedData {
  final NumerologyData? numerology;
  final AstrologyData? astrology;
  final List<DreamData>? dreams;
  final List<VisionData>? visions;

  AggregatedData({
    this.numerology,
    this.astrology,
    this.dreams,
    this.visions,
  });

  factory AggregatedData.fromJson(Map<String, dynamic> json) =>
      _$AggregatedDataFromJson(json);
  Map<String, dynamic> toJson() => _$AggregatedDataToJson(this);
}

@JsonSerializable()
class NumerologyData {
  final int lifePathNumber;
  final int soulUrgeNumber;
  final String summary;

  NumerologyData({
    required this.lifePathNumber,
    required this.soulUrgeNumber,
    required this.summary,
  });

  factory NumerologyData.fromJson(Map<String, dynamic> json) =>
      _$NumerologyDataFromJson(json);
  Map<String, dynamic> toJson() => _$NumerologyDataToJson(this);
}

@JsonSerializable()
class AstrologyData {
  final String sunSign;
  final String moonSign;
  final String risingSign;
  final String? dailyHoroscope;

  AstrologyData({
    required this.sunSign,
    required this.moonSign,
    required this.risingSign,
    this.dailyHoroscope,
  });

  factory AstrologyData.fromJson(Map<String, dynamic> json) =>
      _$AstrologyDataFromJson(json);
  Map<String, dynamic> toJson() => _$AstrologyDataToJson(this);
}

@JsonSerializable()
class DreamData {
  final String id;
  final String dreamText;
  final String mood;
  final String? interpretation;
  final String createdAt;

  DreamData({
    required this.id,
    required this.dreamText,
    required this.mood,
    this.interpretation,
    required this.createdAt,
  });

  factory DreamData.fromJson(Map<String, dynamic> json) =>
      _$DreamDataFromJson(json);
  Map<String, dynamic> toJson() => _$DreamDataToJson(this);
}

@JsonSerializable()
class VisionData {
  final String id;
  final String visionType;
  final String imageUrl;
  final String? interpretation;
  final String createdAt;

  VisionData({
    required this.id,
    required this.visionType,
    required this.imageUrl,
    this.interpretation,
    required this.createdAt,
  });

  factory VisionData.fromJson(Map<String, dynamic> json) =>
      _$VisionDataFromJson(json);
  Map<String, dynamic> toJson() => _$VisionDataToJson(this);
}

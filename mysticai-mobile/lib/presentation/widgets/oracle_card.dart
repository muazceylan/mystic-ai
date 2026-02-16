import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/oracle_response.dart';

class OracleCard extends StatelessWidget {
  final OracleResponse? response;
  final bool isLoading;
  final VoidCallback? onRefresh;

  const OracleCard({
    super.key,
    this.response,
    this.isLoading = false,
    this.onRefresh,
  });

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return _buildLoadingCard();
    }

    if (response == null) {
      return _buildEmptyCard(context);
    }

    return _buildOracleCard(context);
  }

  Widget _buildLoadingCard() {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.cardGradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppTheme.goldPrimary.withOpacity(0.3),
          width: 1,
        ),
        boxShadow: AppTheme.mysticalShadow,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(height: 40),
          _buildShimmerBox(80, 80, radius: 40),
          const SizedBox(height: 24),
          _buildShimmerBox(200, 24),
          const SizedBox(height: 16),
          _buildShimmerBox(double.infinity, 16),
          const SizedBox(height: 8),
          _buildShimmerBox(double.infinity, 16),
          const SizedBox(height: 8),
          _buildShimmerBox(150, 16),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildShimmerBox(double width, double height, {double radius = 8}) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: AppTheme.goldPrimary.withOpacity(0.1),
        borderRadius: BorderRadius.circular(radius),
      ),
    ).animate(
      onPlay: (controller) => controller.repeat(),
    ).shimmer(
      duration: 1500.ms,
      color: AppTheme.goldPrimary.withOpacity(0.2),
    );
  }

  Widget _buildEmptyCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: AppTheme.cardGradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppTheme.goldPrimary.withOpacity(0.3),
          width: 1,
        ),
        boxShadow: AppTheme.mysticalShadow,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.auto_fix_high,
            size: 64,
            color: AppTheme.goldPrimary,
          ),
          const SizedBox(height: 16),
          Text(
            'Günün Sırrı',
            style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                  color: AppTheme.goldPrimary,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            'Bugün için özel bir mesaj almak için dokunun',
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh),
            label: const Text('Sırrı Açıkla'),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 600.ms).scale(
          begin: const Offset(0.9, 0.9),
          end: const Offset(1, 1),
          duration: 600.ms,
        );
  }

  Widget _buildOracleCard(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: AppTheme.mysticalGradient,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: AppTheme.goldPrimary.withOpacity(0.5),
          width: 2,
        ),
        boxShadow: [
          ...AppTheme.mysticalShadow,
          ...AppTheme.goldShadow,
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Stack(
          children: [
            // Background decoration
            Positioned(
              top: -50,
              right: -50,
              child: Container(
                width: 150,
                height: 150,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.purplePrimary.withOpacity(0.3),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: -30,
              left: -30,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: RadialGradient(
                    colors: [
                      AppTheme.goldPrimary.withOpacity(0.2),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  // Header
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          gradient: AppTheme.goldGradient,
                          shape: BoxShape.circle,
                          boxShadow: AppTheme.goldShadow,
                        ),
                        child: const Icon(
                          Icons.auto_fix_high,
                          color: AppTheme.darkBackground,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Günün Sırrı',
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineSmall
                                  ?.copyWith(
                                    color: AppTheme.goldPrimary,
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                            Text(
                              _formatDate(response!.generatedAt),
                              style: Theme.of(context)
                                  .textTheme
                                  .bodySmall
                                  ?.copyWith(
                                    color: AppTheme.textMuted,
                                  ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: onRefresh,
                        icon: const Icon(
                          Icons.refresh,
                          color: AppTheme.goldPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  // Mystical Message
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.darkCard.withOpacity(0.7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: AppTheme.purplePrimary.withOpacity(0.3),
                      ),
                    ),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.format_quote,
                          color: AppTheme.purpleLight,
                          size: 32,
                        ),
                        const SizedBox(height: 12),
                        Text(
                          response!.mysticalMessage,
                          textAlign: TextAlign.center,
                          style: Theme.of(context)
                              .textTheme
                              .bodyLarge
                              ?.copyWith(
                                color: AppTheme.textPrimary,
                                height: 1.8,
                                fontStyle: FontStyle.italic,
                              ),
                        ),
                        const SizedBox(height: 12),
                        const Icon(
                          Icons.format_quote,
                          color: AppTheme.purpleLight,
                          size: 32,
                          textDirection: TextDirection.rtl,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                  // Aggregated Data Summary
                  if (response!.aggregatedData.numerology != null)
                    _buildDataChip(
                      Icons.calculate,
                      'Yaşam Yolu: ${response!.aggregatedData.numerology!.lifePathNumber}',
                      AppTheme.accentTeal,
                    ),
                  if (response!.aggregatedData.astrology != null) ...[
                    const SizedBox(height: 8),
                    _buildDataChip(
                      Icons.star,
                      '${response!.aggregatedData.astrology!.sunSign} Burcu',
                      AppTheme.accentRose,
                    ),
                  ],
                  if (response!.aggregatedData.dreams?.isNotEmpty ?? false) ...[
                    const SizedBox(height: 8),
                    _buildDataChip(
                      Icons.nights_stay,
                      '${response!.aggregatedData.dreams!.length} Rüya Analizi',
                      AppTheme.purpleLight,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    ).animate().fadeIn(duration: 800.ms).slideY(
          begin: 0.2,
          end: 0,
          duration: 800.ms,
          curve: Curves.easeOutCubic,
        );
  }

  Widget _buildDataChip(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: color.withOpacity(0.3),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: color,
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: TextStyle(
              color: color,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      final now = DateTime.now();
      final diff = now.difference(date);

      if (diff.inDays == 0) {
        return 'Bugün';
      } else if (diff.inDays == 1) {
        return 'Dün';
      } else {
        return '${date.day}/${date.month}/${date.year}';
      }
    } catch (e) {
      return dateString;
    }
  }
}

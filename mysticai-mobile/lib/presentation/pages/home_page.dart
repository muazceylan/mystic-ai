import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:provider/provider.dart';
import '../../core/theme/app_theme.dart';
import '../providers/oracle_provider.dart';
import '../widgets/oracle_card.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  @override
  void initState() {
    super.initState();
    // Fetch daily secret when page loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<OracleProvider>().fetchDailySecret();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar
          SliverAppBar(
            expandedHeight: 200,
            floating: false,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                'Mystic AI',
                style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppTheme.goldPrimary,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 3,
                    ),
              ),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: AppTheme.mysticalGradient,
                ),
                child: Stack(
                  children: [
                    // Decorative elements
                    Positioned(
                      top: 40,
                      right: 20,
                      child: Icon(
                        Icons.star,
                        size: 40,
                        color: AppTheme.goldPrimary.withOpacity(0.3),
                      ),
                    ),
                    Positioned(
                      top: 80,
                      left: 30,
                      child: Icon(
                        Icons.auto_fix_high,
                        size: 30,
                        color: AppTheme.purpleLight.withOpacity(0.3),
                      ),
                    ),
                    Positioned(
                      bottom: 60,
                      right: 60,
                      child: Icon(
                        Icons.nightlight_round,
                        size: 35,
                        color: AppTheme.goldLight.withOpacity(0.2),
                      ),
                    ),
                    // Center content
                    Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const SizedBox(height: 40),
                          Container(
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: AppTheme.goldGradient,
                              boxShadow: AppTheme.goldShadow,
                            ),
                            child: const Icon(
                              Icons.auto_fix_high,
                              size: 40,
                              color: AppTheme.darkBackground,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          // Content
          SliverToBoxAdapter(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 16),
                // Oracle Card
                Consumer<OracleProvider>(
                  builder: (context, provider, child) {
                    return OracleCard(
                      response: provider.oracleResponse,
                      isLoading: provider.isLoading,
                      onRefresh: () => provider.fetchDailySecret(),
                    );
                  },
                ),
                const SizedBox(height: 24),
                // Quick Actions
                _buildSectionTitle(context, 'Hızlı İşlemler'),
                const SizedBox(height: 16),
                _buildQuickActionsGrid(context),
                const SizedBox(height: 24),
                // Recent Activity
                _buildSectionTitle(context, 'Son Aktiviteler'),
                const SizedBox(height: 16),
                _buildRecentActivityList(context),
                const SizedBox(height: 32),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(BuildContext context, String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              gradient: AppTheme.goldGradient,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: 12),
          Text(
            title,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: AppTheme.textPrimary,
                  fontWeight: FontWeight.bold,
                ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideX(
          begin: -0.1,
          end: 0,
          duration: 400.ms,
        );
  }

  Widget _buildQuickActionsGrid(BuildContext context) {
    final actions = [
      _QuickAction(
        icon: Icons.nights_stay,
        label: 'Rüya Yorumu',
        color: AppTheme.purplePrimary,
        onTap: () {
          // Navigate to dream page
        },
      ),
      _QuickAction(
        icon: Icons.coffee,
        label: 'Kahve Falı',
        color: AppTheme.goldPrimary,
        onTap: () {
          // Navigate to vision page
        },
      ),
      _QuickAction(
        icon: Icons.star,
        label: 'Astroloji',
        color: AppTheme.accentTeal,
        onTap: () {
          // Navigate to astrology page
        },
      ),
      _QuickAction(
        icon: Icons.calculate,
        label: 'Numeroloji',
        color: AppTheme.accentRose,
        onTap: () {
          // Navigate to numerology page
        },
      ),
    ];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          childAspectRatio: 1.5,
          crossAxisSpacing: 12,
          mainAxisSpacing: 12,
        ),
        itemCount: actions.length,
        itemBuilder: (context, index) {
          final action = actions[index];
          return _buildQuickActionCard(context, action, index);
        },
      ),
    );
  }

  Widget _buildQuickActionCard(
    BuildContext context,
    _QuickAction action,
    int index,
  ) {
    return GestureDetector(
      onTap: action.onTap,
      child: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              AppTheme.darkCard,
              action.color.withOpacity(0.1),
            ],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: action.color.withOpacity(0.3),
          ),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: action.color.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: Icon(
                action.icon,
                color: action.color,
                size: 28,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              action.label,
              style: Theme.of(context).textTheme.labelLarge?.copyWith(
                    color: AppTheme.textPrimary,
                  ),
            ),
          ],
        ),
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms, delay: (index * 100).ms)
        .scale(
          begin: const Offset(0.9, 0.9),
          end: const Offset(1, 1),
          duration: 400.ms,
          delay: (index * 100).ms,
        );
  }

  Widget _buildRecentActivityList(BuildContext context) {
    // Sample data - will be replaced with real data
    final activities = [
      _Activity(
        icon: Icons.nights_stay,
        title: 'Rüya analizi tamamlandı',
        subtitle: 'Uçan balina rüyanız yorumlandı',
        time: '2 saat önce',
        color: AppTheme.purplePrimary,
      ),
      _Activity(
        icon: Icons.star,
        title: 'Günlük burç yorumu hazır',
        subtitle: 'Koç burcu için günlük yorum',
        time: '5 saat önce',
        color: AppTheme.accentTeal,
      ),
      _Activity(
        icon: Icons.calculate,
        title: 'Numeroloji hesaplaması',
        subtitle: 'Yaşam yolu sayınız: 7',
        time: '1 gün önce',
        color: AppTheme.accentRose,
      ),
    ];

    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: activities.length,
      itemBuilder: (context, index) {
        final activity = activities[index];
        return _buildActivityItem(context, activity, index);
      },
    );
  }

  Widget _buildActivityItem(
    BuildContext context,
    _Activity activity,
    int index,
  ) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.darkCard.withOpacity(0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: activity.color.withOpacity(0.2),
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: activity.color.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: Icon(
              activity.icon,
              color: activity.color,
              size: 20,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  activity.title,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textPrimary,
                        fontWeight: FontWeight.w600,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  activity.subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                ),
              ],
            ),
          ),
          Text(
            activity.time,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppTheme.textMuted,
                ),
          ),
        ],
      ),
    )
        .animate()
        .fadeIn(duration: 400.ms, delay: (index * 100 + 400).ms)
        .slideX(
          begin: 0.1,
          end: 0,
          duration: 400.ms,
          delay: (index * 100 + 400).ms,
        );
  }
}

class _QuickAction {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  _QuickAction({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
}

class _Activity {
  final IconData icon;
  final String title;
  final String subtitle;
  final String time;
  final Color color;

  _Activity({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.time,
    required this.color,
  });
}

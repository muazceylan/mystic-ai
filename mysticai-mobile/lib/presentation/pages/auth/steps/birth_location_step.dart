import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class BirthLocationStep extends StatefulWidget {
  const BirthLocationStep({super.key});

  @override
  State<BirthLocationStep> createState() => _BirthLocationStepState();
}

class _BirthLocationStepState extends State<BirthLocationStep> {
  final _locationController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final provider = context.read<OnboardingProvider>();
    _locationController.text = provider.birthLocation;
  }

  @override
  void dispose() {
    _locationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OnboardingProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Icon
          Icon(
            Icons.location_on_outlined,
            size: 64,
            color: AppTheme.goldPrimary.withOpacity(0.8),
          ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
          
          const SizedBox(height: 24),
          
          // Title
          Text(
            'Doğum Yeriniz',
            style: GoogleFonts.cinzel(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: AppTheme.goldPrimary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(duration: 600.ms).slideY(begin: -0.2, end: 0),
          
          const SizedBox(height: 8),
          
          // Subtitle
          Text(
            'Coğrafi konumunuz astrolojik hesaplamalar için önemli',
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Location Input
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: AppTheme.darkCard.withOpacity(0.5),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: AppTheme.goldPrimary.withOpacity(0.2),
                width: 1,
              ),
            ),
            child: Column(
              children: [
                TextFormField(
                  controller: _locationController,
                  onChanged: (value) {
                    provider.setBirthLocation(value);
                  },
                  style: GoogleFonts.lato(
                    color: AppTheme.textPrimary,
                    fontSize: 18,
                  ),
                  decoration: InputDecoration(
                    labelText: 'Şehir, Ülke',
                    hintText: 'İstanbul, Türkiye',
                    prefixIcon: const Icon(
                      Icons.location_on,
                      color: AppTheme.goldPrimary,
                    ),
                    suffixIcon: _locationController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(
                              Icons.clear,
                              color: AppTheme.textMuted,
                            ),
                            onPressed: () {
                              _locationController.clear();
                              provider.setBirthLocation('');
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(
                        color: AppTheme.goldPrimary.withOpacity(0.3),
                      ),
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: const BorderSide(
                        color: AppTheme.goldPrimary,
                        width: 2,
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Popular Locations
                Text(
                  'Popüler Konumlar',
                  style: GoogleFonts.lato(
                    fontSize: 14,
                    color: AppTheme.textMuted,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                
                const SizedBox(height: 12),
                
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    _buildLocationChip('İstanbul, Türkiye'),
                    _buildLocationChip('Ankara, Türkiye'),
                    _buildLocationChip('İzmir, Türkiye'),
                    _buildLocationChip('Bursa, Türkiye'),
                    _buildLocationChip('Antalya, Türkiye'),
                  ],
                ),
              ],
            ),
          ).animate().fadeIn(delay: 400.ms, duration: 600.ms),
          
          const SizedBox(height: 32),
          
          // Selected Location Display
          if (provider.birthLocation.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
              decoration: BoxDecoration(
                gradient: AppTheme.goldGradient,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: AppTheme.darkBackground,
                  ),
                  const SizedBox(width: 12),
                  Flexible(
                    child: Text(
                      provider.birthLocation,
                      style: GoogleFonts.cinzel(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.darkBackground,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms).scale(),
          
          const SizedBox(height: 24),
          
          // Info Text
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.purplePrimary.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: AppTheme.purplePrimary.withOpacity(0.3),
              ),
            ),
            child: Row(
              children: [
                Icon(
                  Icons.info_outline,
                  color: AppTheme.purpleLight,
                  size: 20,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'Doğum yeriniz, yıldız haritanızın doğruluğu için önemlidir.',
                    style: GoogleFonts.lato(
                      fontSize: 13,
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
          ).animate().fadeIn(delay: 600.ms, duration: 400.ms),
        ],
      ),
    );
  }

  Widget _buildLocationChip(String location) {
    final isSelected = _locationController.text == location;
    
    return ActionChip(
      label: Text(
        location,
        style: GoogleFonts.lato(
          fontSize: 13,
          color: isSelected ? AppTheme.darkBackground : AppTheme.textPrimary,
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      backgroundColor: isSelected ? AppTheme.goldPrimary : AppTheme.darkSurface,
      side: BorderSide(
        color: isSelected ? AppTheme.goldPrimary : AppTheme.textMuted.withOpacity(0.3),
      ),
      onPressed: () {
        setState(() {
          _locationController.text = location;
        });
        context.read<OnboardingProvider>().setBirthLocation(location);
      },
    );
  }
}

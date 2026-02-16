import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../../../providers/onboarding_provider.dart';
import '../../../../core/theme/app_theme.dart';

class EmailRegistrationStep extends StatefulWidget {
  const EmailRegistrationStep({super.key});

  @override
  State<EmailRegistrationStep> createState() => _EmailRegistrationStepState();
}

class _EmailRegistrationStepState extends State<EmailRegistrationStep> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _showManualForm = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    final provider = context.read<OnboardingProvider>();
    _firstNameController.text = provider.firstName;
    _lastNameController.text = provider.lastName;
    _emailController.text = provider.email;
    _passwordController.text = provider.password;
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _updateProvider() {
    final provider = context.read<OnboardingProvider>();
    provider.setFirstName(_firstNameController.text);
    provider.setLastName(_lastNameController.text);
    provider.setEmail(_emailController.text);
    provider.setPassword(_passwordController.text);
  }

  Future<void> _handleGoogleSignIn() async {
    // TODO: Implement Google Sign In
    // Mock implementation for now
    final provider = context.read<OnboardingProvider>();
    
    // Simulate social login
    provider.setSocialUserData(
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      email: 'ahmet.yilmaz@email.com',
    );
    
    _firstNameController.text = 'Ahmet';
    _lastNameController.text = 'Yılmaz';
    _emailController.text = 'ahmet.yilmaz@email.com';
    _passwordController.text = 'social_login_temp_password';
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Google ile giriş başarılı!',
          style: GoogleFonts.lato(),
        ),
        backgroundColor: AppTheme.success,
      ),
    );
  }

  Future<void> _handleAppleSignIn() async {
    // TODO: Implement Apple Sign In
    // Mock implementation for now
    final provider = context.read<OnboardingProvider>();
    
    // Simulate social login
    provider.setSocialUserData(
      firstName: 'Ayşe',
      lastName: 'Demir',
      email: 'ayse.demir@icloud.com',
    );
    
    _firstNameController.text = 'Ayşe';
    _lastNameController.text = 'Demir';
    _emailController.text = 'ayse.demir@icloud.com';
    _passwordController.text = 'social_login_temp_password';
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Apple ile giriş başarılı!',
          style: GoogleFonts.lato(),
        ),
        backgroundColor: AppTheme.success,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<OnboardingProvider>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Title
          Text(
            'Mystic AI\'ye Hoş Geldiniz',
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
            'Yıldızların rehberliğinde yolculuğunuza başlayın',
            style: GoogleFonts.lato(
              fontSize: 16,
              color: AppTheme.textSecondary,
            ),
            textAlign: TextAlign.center,
          ).animate().fadeIn(delay: 200.ms, duration: 600.ms),
          
          const SizedBox(height: 40),
          
          // Social Login Buttons
          if (!_showManualForm) ...[
            _buildSocialLoginButtons(),
            
            const SizedBox(height: 32),
            
            // Divider
            Row(
              children: [
                Expanded(
                  child: Divider(
                    color: AppTheme.textMuted.withOpacity(0.5),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  child: Text(
                    'veya',
                    style: GoogleFonts.lato(
                      color: AppTheme.textMuted,
                      fontSize: 14,
                    ),
                  ),
                ),
                Expanded(
                  child: Divider(
                    color: AppTheme.textMuted.withOpacity(0.5),
                  ),
                ),
              ],
            ).animate().fadeIn(delay: 400.ms, duration: 400.ms),
            
            const SizedBox(height: 32),
            
            // Email Button
            OutlinedButton.icon(
              onPressed: () {
                setState(() {
                  _showManualForm = true;
                });
              },
              icon: const Icon(Icons.email_outlined),
              label: Text(
                'E-posta ile Devam Et',
                style: GoogleFonts.cinzel(
                  fontWeight: FontWeight.w600,
                  fontSize: 16,
                ),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: AppTheme.goldPrimary,
                side: const BorderSide(color: AppTheme.goldPrimary, width: 1.5),
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ).animate().fadeIn(delay: 500.ms, duration: 400.ms),
          ],
          
          // Manual Form
          if (_showManualForm) ...[
            Form(
              key: _formKey,
              child: Column(
                children: [
                  // First Name
                  TextFormField(
                    controller: _firstNameController,
                    onChanged: (_) => _updateProvider(),
                    style: GoogleFonts.lato(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Ad',
                      hintText: 'Adınızı girin',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Ad gerekli';
                      }
                      return null;
                    },
                  ).animate().fadeIn(duration: 400.ms),
                  
                  const SizedBox(height: 16),
                  
                  // Last Name
                  TextFormField(
                    controller: _lastNameController,
                    onChanged: (_) => _updateProvider(),
                    style: GoogleFonts.lato(color: AppTheme.textPrimary),
                    decoration: InputDecoration(
                      labelText: 'Soyad',
                      hintText: 'Soyadınızı girin',
                      prefixIcon: const Icon(Icons.person_outline),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Soyad gerekli';
                      }
                      return null;
                    },
                  ).animate().fadeIn(delay: 100.ms, duration: 400.ms),
                  
                  const SizedBox(height: 16),
                  
                  // Email
                  TextFormField(
                    controller: _emailController,
                    onChanged: (_) => _updateProvider(),
                    style: GoogleFonts.lato(color: AppTheme.textPrimary),
                    keyboardType: TextInputType.emailAddress,
                    decoration: InputDecoration(
                      labelText: 'E-posta',
                      hintText: 'ornek@email.com',
                      prefixIcon: const Icon(Icons.email_outlined),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'E-posta gerekli';
                      }
                      if (!value.contains('@')) {
                        return 'Geçerli bir e-posta girin';
                      }
                      return null;
                    },
                  ).animate().fadeIn(delay: 200.ms, duration: 400.ms),
                  
                  const SizedBox(height: 16),
                  
                  // Password
                  TextFormField(
                    controller: _passwordController,
                    onChanged: (_) => _updateProvider(),
                    style: GoogleFonts.lato(color: AppTheme.textPrimary),
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Şifre',
                      hintText: 'Şifrenizi girin',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscurePassword
                              ? Icons.visibility_outlined
                              : Icons.visibility_off_outlined,
                        ),
                        onPressed: () {
                          setState(() {
                            _obscurePassword = !_obscurePassword;
                          });
                        },
                      ),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    validator: (value) {
                      if (value == null || value.isEmpty) {
                        return 'Şifre gerekli';
                      }
                      if (value.length < 6) {
                        return 'Şifre en az 6 karakter olmalı';
                      }
                      return null;
                    },
                  ).animate().fadeIn(delay: 300.ms, duration: 400.ms),
                  
                  const SizedBox(height: 24),
                  
                  // Back to Social Login
                  TextButton.icon(
                    onPressed: () {
                      setState(() {
                        _showManualForm = false;
                      });
                    },
                    icon: const Icon(Icons.arrow_back),
                    label: Text(
                      'Sosyal Girişe Dön',
                      style: GoogleFonts.lato(),
                    ),
                  ).animate().fadeIn(delay: 400.ms, duration: 400.ms),
                ],
              ),
            ),
          ],
          
          // Success Message for Social Login
          if (provider.isSocialLogin && !_showManualForm) ...[
            const SizedBox(height: 32),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppTheme.success.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: AppTheme.success.withOpacity(0.3),
                ),
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.check_circle,
                    color: AppTheme.success,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Giriş Başarılı',
                          style: GoogleFonts.lato(
                            color: AppTheme.success,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          '${provider.firstName} ${provider.lastName}',
                          style: GoogleFonts.lato(
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        Text(
                          provider.email,
                          style: GoogleFonts.lato(
                            color: AppTheme.textSecondary,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ).animate().fadeIn(duration: 400.ms),
          ],
        ],
      ),
    );
  }

  Widget _buildSocialLoginButtons() {
    return Column(
      children: [
        // Google Sign In
        _buildSocialButton(
          onPressed: _handleGoogleSignIn,
          icon: 'G',
          label: 'Google ile Giriş Yap',
          backgroundColor: Colors.white,
          textColor: Colors.black87,
          delay: 0,
        ),
        
        const SizedBox(height: 12),
        
        // Apple Sign In
        _buildSocialButton(
          onPressed: _handleAppleSignIn,
          icon: '🍎',
          label: 'Apple ile Giriş Yap',
          backgroundColor: Colors.black,
          textColor: Colors.white,
          delay: 100,
        ),
      ],
    );
  }

  Widget _buildSocialButton({
    required VoidCallback onPressed,
    required String icon,
    required String label,
    required Color backgroundColor,
    required Color textColor,
    required int delay,
  }) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: backgroundColor,
        foregroundColor: textColor,
        elevation: 2,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            icon,
            style: const TextStyle(fontSize: 20),
          ),
          const SizedBox(width: 12),
          Text(
            label,
            style: GoogleFonts.lato(
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    ).animate().fadeIn(delay: Duration(milliseconds: delay), duration: 400.ms);
  }
}

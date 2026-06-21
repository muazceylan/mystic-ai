import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  Image,
  useWindowDimensions,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Svg, { Circle, Defs, Line, Path, RadialGradient, Stop } from 'react-native-svg';
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles, UserRound } from 'lucide-react-native';
import { AuthLegalNotice } from '../../components/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { usePendingGuestStore } from '../../store/usePendingGuestStore';
import { socialLogin, login as loginApi, quickStart as quickStartApi } from '../../services/auth';
import { SafeScreen } from '../../components/ui';
import { trackEvent } from '../../services/analytics';
import {
  ProductEventName,
  setProductUserProperties,
  trackProductEvent,
} from '../../services/productAnalytics';
import { needsOnboarding } from '../../utils/authOnboarding';
import { WEB_INPUT_RESET_STYLE } from '../../utils/webInputReset';
import {
  isNativeGoogleSigninConfigurationError,
  signInWithNativeGoogle,
} from '../../services/googleSignIn';
import {
  isGoogleAuthSessionConfigured,
  useGoogleIdTokenAuthRequest,
  type GoogleAuthPromptResult,
} from '../../services/googleAuthSession';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';


const WEB_GOOGLE_POPUP_MESSAGE_TYPE = 'mystic-google-auth';
const CONCEPT_VERSION_LABEL = 'v54.0.8 (416) · dev';
const HERO_PREMIUM_ICON = require('../../../assets/brand/logo/astro-guru-logo-small-optimized.png');
const HERO_DISPLAY_FONT = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});
const AUTH_WEB_TEXT_INPUT_STYLE =
  Platform.OS === 'web'
    ? ({
        background: 'transparent',
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        borderWidth: 0,
        boxShadow: 'none',
        outlineColor: 'transparent',
        outlineStyle: 'none',
        outlineWidth: 0,
        WebkitAppearance: 'none',
        WebkitBoxShadow: 'none',
      } as any)
    : null;

const AUTH_COLORS = {
  bgTop: '#FCFAFF',
  bgMid: '#F6F1FC',
  bgBottom: '#FBF8FF',
  surface: 'rgba(255,255,255,0.92)',
  surfaceSoft: '#F9F4FD',
  inputSurface: '#FBF7FE',
  surfaceGlass: 'rgba(255,255,255,0.72)',
  border: 'rgba(213,194,241,0.76)',
  borderSoft: 'rgba(226,214,247,0.72)',
  text: '#27135C',
  textDeep: '#1F114C',
  subtext: '#8E86A6',
  muted: '#9B94AE',
  primary: '#8542F4',
  primaryDeep: '#4E18B9',
  primarySoft: '#EEE7FF',
  primaryGlow: 'rgba(154,77,255,0.26)',
  pinkGlow: 'rgba(224,100,255,0.2)',
  white: '#FFFFFF',
  error: '#D65274',
  shadow: '#5F30B7',
  icon: '#7B68A8',
} as const;

const SUN_RAYS = Array.from({ length: 22 }, (_, index) => {
  const angle = (-18 + index * 6.8) * (Math.PI / 180);
  return {
    id: `sun-ray-${index}`,
    x1: 18 + Math.cos(angle) * 28,
    y1: 78 + Math.sin(angle) * 28,
    x2: 18 + Math.cos(angle) * 92,
    y2: 78 + Math.sin(angle) * 92,
    opacity: index % 3 === 0 ? 0.28 : 0.16,
  };
});

function CosmicBackdrop() {
  return (
    <View pointerEvents="none" style={cosmicStyles.root}>
      <LinearGradient
        colors={[AUTH_COLORS.bgTop, AUTH_COLORS.bgMid, AUTH_COLORS.bgBottom]}
        locations={[0, 0.54, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={cosmicStyles.topGlow} />
      <View style={cosmicStyles.violetVeil} />
      <View style={cosmicStyles.centerGlow} />
      <View style={cosmicStyles.logoMist} />
      <View style={cosmicStyles.cardMist} />
      <View style={cosmicStyles.lowerGlow} />
      <View style={cosmicStyles.rightMist} />

      <Svg
        pointerEvents="none"
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.88" />
            <Stop offset="0.72" stopColor="#CDBBFF" stopOpacity="0.24" />
            <Stop offset="1" stopColor="#CDBBFF" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {SUN_RAYS.map((ray) => (
          <Line
            key={ray.id}
            x1={ray.x1}
            y1={ray.y1}
            x2={ray.x2}
            y2={ray.y2}
            stroke="#FFFFFF"
            strokeWidth="0.9"
            strokeOpacity={ray.opacity + 0.04}
          />
        ))}
        <Circle cx="18" cy="78" r="35" fill="transparent" stroke="#FFFFFF" strokeWidth="0.8" strokeOpacity="0.27" />
        <Circle cx="18" cy="78" r="50" fill="transparent" stroke="#FFFFFF" strokeWidth="0.7" strokeOpacity="0.18" />

        <Path
          d="M-26 167 C 64 123, 113 83, 116 -28"
          fill="transparent"
          stroke="#FFFFFF"
          strokeWidth="0.9"
          strokeOpacity="0.39"
        />
        <Path
          d="M-38 178 C 76 142, 142 74, 153 -34"
          fill="transparent"
          stroke="#CDBBFF"
          strokeWidth="0.8"
          strokeOpacity="0.26"
        />
        <Circle cx="122" cy="119" r="4.5" fill="transparent" stroke="#FFFFFF" strokeWidth="0.9" strokeOpacity="0.35" />

        <Circle cx="345" cy="184" r="24" fill="rgba(255,255,255,0.64)" />
        <Circle cx="357" cy="176" r="24" fill={AUTH_COLORS.bgMid} opacity="0.94" />

        <Path
          d="M290 823 C 328 773, 373 753, 423 753"
          fill="transparent"
          stroke="#FFFFFF"
          strokeWidth="0.8"
          strokeOpacity="0.4"
        />
        <Path
          d="M270 844 C 310 775, 358 735, 431 724"
          fill="transparent"
          stroke="#CDBBFF"
          strokeWidth="0.7"
          strokeOpacity="0.22"
        />
        <Circle cx="356" cy="776" r="3.8" fill="transparent" stroke="#FFFFFF" strokeOpacity="0.42" />

        <Circle cx="92" cy="66" r="9" fill="url(#starGlow)" opacity="0.72" />
        <Path d="M92 52 L95 63 L106 66 L95 69 L92 80 L89 69 L78 66 L89 63 Z" fill="#FFFFFF" opacity="0.88" />
        <Path d="M322 86 L324 94 L332 96 L324 98 L322 106 L320 98 L312 96 L320 94 Z" fill="#FFFFFF" opacity="0.62" />
        <Path d="M300 271 L302 279 L310 281 L302 283 L300 291 L298 283 L290 281 L298 279 Z" fill="#FFFFFF" opacity="0.58" />
        <Path d="M58 286 L60 294 L68 296 L60 298 L58 306 L56 298 L48 296 L56 294 Z" fill="#BCA6F7" opacity="0.62" />
        <Path d="M146 30 L148 36 L154 38 L148 40 L146 46 L144 40 L138 38 L144 36 Z" fill="#FFFFFF" opacity="0.42" />
        <Path d="M374 779 L376 786 L383 788 L376 790 L374 797 L372 790 L365 788 L372 786 Z" fill="#FFFFFF" opacity="0.72" />
      </Svg>
    </View>
  );
}

function AppleMark() {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" accessibilityRole="image">
      <Path
        fill="#FFFFFF"
        d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
      />
    </Svg>
  );
}

function GoogleMark() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityRole="image">
      <Path fill="#4285F4" d="M22.56 12.25c0-.77-.07-1.5-.2-2.21H12v4.18h5.92a5.06 5.06 0 0 1-2.19 3.32v2.71h3.55c2.08-1.9 3.28-4.71 3.28-8z" />
      <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.75l-3.55-2.71c-.98.65-2.23 1.04-3.73 1.04-2.86 0-5.29-1.9-6.16-4.47H2.18v2.8A10.99 10.99 0 0 0 12 23z" />
      <Path fill="#FBBC05" d="M5.84 14.11a6.54 6.54 0 0 1 0-4.22v-2.8H2.18a10.86 10.86 0 0 0 0 9.82l3.66-2.8z" />
      <Path fill="#EA4335" d="M12 5.42c1.62 0 3.07.55 4.21 1.64l3.15-3.1A10.68 10.68 0 0 0 12 1 10.99 10.99 0 0 0 2.18 7.09l3.66 2.8C6.71 7.32 9.14 5.42 12 5.42z" />
    </Svg>
  );
}

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
}

function extractGoogleIdToken(result: GoogleAuthPromptResult | undefined): string | undefined {
  if (!result || result.type !== 'success') return undefined;
  return result.params?.id_token ?? result.authentication?.idToken ?? undefined;
}

function extractIdTokenFromHash(hash: string): string | undefined {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!normalized) return undefined;
  const params = new URLSearchParams(normalized);
  return params.get('id_token') ?? undefined;
}

function extractIdTokenFromPopupMessage(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const data = payload as Record<string, unknown>;
  if (data.type !== WEB_GOOGLE_POPUP_MESSAGE_TYPE) return undefined;
  const idToken = data.idToken;
  return typeof idToken === 'string' && idToken.trim().length > 0 ? idToken : undefined;
}

const cosmicStyles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AUTH_COLORS.bgMid,
    overflow: 'hidden',
  },
  topGlow: {
    position: 'absolute',
    top: -86,
    left: -74,
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(211,190,255,0.22)',
  },
  violetVeil: {
    position: 'absolute',
    top: -18,
    left: -34,
    width: 190,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(226,211,250,0.23)',
  },
  centerGlow: {
    position: 'absolute',
    top: 88,
    alignSelf: 'center',
    width: 296,
    height: 296,
    borderRadius: 148,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  logoMist: {
    position: 'absolute',
    top: 82,
    alignSelf: 'center',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(211,157,255,0.18)',
  },
  cardMist: {
    position: 'absolute',
    top: 430,
    left: -48,
    width: 260,
    height: 310,
    borderRadius: 160,
    backgroundColor: 'rgba(236,224,252,0.18)',
  },
  lowerGlow: {
    position: 'absolute',
    right: -104,
    bottom: -134,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(198,164,255,0.13)',
  },
  rightMist: {
    position: 'absolute',
    right: -74,
    top: 208,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
});

function makeStyles(compact: boolean) {
  const logoSize = compact ? 84 : 98;
  const logoInner = compact ? 60 : 70;

  return StyleSheet.create({
    safeScreen: {
      backgroundColor: AUTH_COLORS.bgMid,
    },
    container: {
      flex: 1,
      backgroundColor: AUTH_COLORS.bgMid,
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: compact ? 30 : 70,
      paddingBottom: 18,
      paddingHorizontal: 24,
    },
    screenShell: {
      width: '100%',
      maxWidth: 430,
      flexGrow: 1,
      alignSelf: 'center',
      alignItems: 'center',
    },
    heroSection: {
      width: '100%',
      alignItems: 'center',
      paddingTop: compact ? 0 : 12,
    },
    heroMarkWrap: {
      width: logoSize,
      height: logoSize,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: compact ? 22 : 30,
      shadowColor: AUTH_COLORS.primary,
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.2,
      shadowRadius: 26,
      elevation: 10,
    },
    heroMarkHalo: {
      position: 'absolute',
      width: logoSize + 38,
      height: logoSize + 38,
      borderRadius: (logoSize + 38) / 2,
      backgroundColor: AUTH_COLORS.primaryGlow,
      opacity: 0.68,
    },
    heroMarkFrame: {
      width: logoSize,
      height: logoSize,
      borderRadius: compact ? 30 : 34,
      padding: 7,
      borderWidth: 1,
      borderColor: 'rgba(222,204,255,0.85)',
    },
    heroMarkCore: {
      flex: 1,
      borderRadius: compact ? 24 : 28,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: AUTH_COLORS.primaryDeep,
    },
    heroOrbit: {
      position: 'absolute',
      width: logoInner + 22,
      height: logoInner + 22,
      opacity: 0.78,
    },
    heroMarkViewport: {
      width: logoInner,
      height: logoInner,
      borderRadius: compact ? 20 : 23,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    heroMarkImage: {
      width: logoInner + 12,
      height: logoInner + 12,
      resizeMode: 'cover',
      transform: [{ scale: 1.03 }],
    },
    heroTextWrap: {
      width: '100%',
      alignItems: 'center',
    },
    titleRow: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? 8 : 10,
    },
    titleSparkle: {
      opacity: 0.62,
      marginTop: 8,
    },
    heading: {
      fontFamily: HERO_DISPLAY_FONT,
      fontSize: compact ? 38 : 42,
      lineHeight: compact ? 45 : 50,
      fontWeight: Platform.OS === 'ios' ? '700' : '600',
      color: AUTH_COLORS.textDeep,
      textAlign: 'center',
      letterSpacing: 0,
    },
    subheading: {
      marginTop: 4,
      fontFamily: 'MysticInter-Regular',
      fontSize: compact ? 16 : 18,
      lineHeight: compact ? 22 : 25,
      letterSpacing: 0,
      color: AUTH_COLORS.subtext,
      textAlign: 'center',
    },
    card: {
      width: '100%',
      marginTop: compact ? 24 : 34,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: AUTH_COLORS.borderSoft,
      backgroundColor: AUTH_COLORS.surface,
      padding: compact ? 18 : 22,
      gap: compact ? 13 : 15,
      shadowColor: AUTH_COLORS.shadow,
      shadowOffset: { width: 0, height: 22 },
      shadowOpacity: 0.13,
      shadowRadius: 34,
      elevation: 10,
    },
    form: {
      width: '100%',
      gap: compact ? 12 : 14,
    },
    inputContainer: {
      width: '100%',
      minHeight: compact ? 56 : 62,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: AUTH_COLORS.border,
      backgroundColor: AUTH_COLORS.inputSurface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      overflow: 'hidden',
      shadowColor: AUTH_COLORS.primaryDeep,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.025,
      shadowRadius: 9,
      elevation: 1,
    },
    inputIconSlot: {
      width: 30,
      height: 30,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    input: {
      flex: 1,
      minWidth: 0,
      minHeight: compact ? 54 : 60,
      paddingVertical: 0,
      paddingHorizontal: 6,
      fontFamily: 'MysticInter-Regular',
      fontSize: compact ? 17 : 18,
      lineHeight: 24,
      color: AUTH_COLORS.text,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    passwordInput: {
      paddingRight: 52,
    },
    eyeButton: {
      position: 'absolute',
      right: 10,
      top: 0,
      bottom: 0,
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    forgotRow: {
      alignItems: 'flex-end',
      marginTop: -2,
      marginBottom: 4,
    },
    forgotLink: {
      color: AUTH_COLORS.primary,
      fontSize: 15,
      lineHeight: 20,
      fontFamily: 'MysticInter-SemiBold',
      letterSpacing: 0,
    },
    errorText: {
      color: AUTH_COLORS.error,
      fontSize: 13,
      lineHeight: 18,
      fontFamily: 'MysticInter-SemiBold',
      textAlign: 'center',
      marginTop: -2,
    },
    loginButton: {
      width: '100%',
      borderRadius: 18,
      overflow: 'hidden',
      marginTop: 2,
      shadowColor: AUTH_COLORS.primary,
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.3,
      shadowRadius: 28,
      elevation: 11,
    },
    loginButtonDisabled: {
      opacity: 1,
    },
    loginGradient: {
      minHeight: compact ? 56 : 60,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    buttonSparkleLeft: {
      position: 'absolute',
      left: 30,
      top: 18,
      opacity: 0.18,
    },
    buttonSparkleRight: {
      position: 'absolute',
      right: 92,
      bottom: 17,
      opacity: 0.14,
    },
    buttonSheen: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 26,
      opacity: 0.28,
    },
    loginButtonText: {
      fontSize: compact ? 19 : 21,
      lineHeight: 27,
      fontFamily: 'MysticInter-SemiBold',
      color: AUTH_COLORS.white,
      letterSpacing: 0,
      textAlign: 'center',
    },
    buttonArrowWrap: {
      position: 'absolute',
      right: 22,
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    divider: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      paddingVertical: compact ? 2 : 4,
      marginTop: compact ? 2 : 4,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: 'rgba(209,199,230,0.72)',
    },
    dividerText: {
      fontSize: 14,
      lineHeight: 20,
      color: AUTH_COLORS.muted,
      fontFamily: 'MysticInter-SemiBold',
      letterSpacing: 0,
    },
    googleButton: {
      width: '100%',
      minHeight: compact ? 54 : 58,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: AUTH_COLORS.border,
      backgroundColor: 'rgba(255,255,255,0.96)',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 14,
      shadowColor: AUTH_COLORS.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.05,
      shadowRadius: 18,
      elevation: 3,
    },
    appleButton: {
      width: '100%',
      minHeight: compact ? 54 : 58,
      borderRadius: 17,
      backgroundColor: '#1C1C1E',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 14,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.1,
      shadowRadius: 18,
      elevation: 3,
    },
    appleText: {
      fontSize: compact ? 16 : 17,
      lineHeight: 23,
      fontFamily: 'MysticInter-SemiBold',
      color: '#FFFFFF',
      letterSpacing: 0,
    },
    socialText: {
      fontSize: compact ? 16 : 17,
      lineHeight: 23,
      fontFamily: 'MysticInter-SemiBold',
      color: '#17152C',
      letterSpacing: 0,
    },
    guestLink: {
      minHeight: 44,
      marginTop: 20,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    guestText: {
      color: AUTH_COLORS.primary,
      fontSize: 16,
      lineHeight: 22,
      fontFamily: 'MysticInter-SemiBold',
      letterSpacing: 0,
    },
    footerCluster: {
      width: '100%',
      alignItems: 'center',
      marginTop: 6,
    },
    signupPrompt: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: 4,
    },
    signupMuted: {
      color: AUTH_COLORS.subtext,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: 'MysticInter-Regular',
      letterSpacing: 0,
    },
    signupLink: {
      color: AUTH_COLORS.primary,
      fontSize: 15,
      lineHeight: 21,
      fontFamily: 'MysticInter-SemiBold',
      letterSpacing: 0,
    },
    legalNotice: {
      marginTop: 12,
      width: '100%',
      maxWidth: 360,
    },
    versionText: {
      color: AUTH_COLORS.subtext,
      fontSize: 11.5,
      lineHeight: 16,
      fontFamily: 'MysticInter-Regular',
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 0,
      opacity: 0.72,
    },
    loadingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(248,244,252,0.54)',
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
}

function presentGoogleAuthError(title: string, message: string) {
  if (Platform.OS === 'android') {
    setTimeout(() => Alert.alert(title, message), 50);
    return;
  }

  Alert.alert(title, message);
}

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const { height } = useWindowDimensions();
  const storeLogin = useAuthStore((s) => s.login);
  const pendingEmail = useAuthStore((s) => s.pendingEmail);
  const setPendingEmail = useAuthStore((s) => s.setPendingEmail);
  const onboarding = useOnboardingStore();
  const setPendingGuest = usePendingGuestStore((s) => s.set);
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quickStartLoading, setQuickStartLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handledGoogleTokenRef = useRef<string | null>(null);
  const authTransitionRef = useRef(false);
  const styles = makeStyles(height < 900);
  const isFormValid = email.trim().length > 0 && password.length > 0;

  useFocusEffect(
    useCallback(() => {
      authTransitionRef.current = false;
      setLoading(false);
      setQuickStartLoading(false);
    }, [])
  );

  useEffect(() => {
    const prefilledEmail = (firstParam(params.email || undefined) || pendingEmail || '').trim().toLowerCase();
    if (prefilledEmail) {
      setEmail((prev) => prev || prefilledEmail);
    }
  }, [params.email, pendingEmail]);

  const [googleResponse, googlePromptAsync] = useGoogleIdTokenAuthRequest();

  const handleSocialLoginResult = async (provider: string, idToken: string) => {
    if (authTransitionRef.current) return;
    setLoading(true);
    try {
      const linkCredentials =
        provider === 'apple' && email.trim().length > 0 && password.length > 0
          ? { linkEmail: email.trim().toLowerCase(), linkPassword: password }
          : undefined;
      const res = await socialLogin(provider, idToken, linkCredentials);
      const { accessToken, refreshToken, user, isNewUser } = res.data;
      const shouldStartOnboarding = isNewUser || needsOnboarding(user);

      if (shouldStartOnboarding) {
        if (user.firstName) onboarding.setFirstName(user.firstName);
        if (user.lastName) onboarding.setLastName(user.lastName);
        if (user.email) onboarding.setEmail(user.email);
      }

      storeLogin(accessToken, refreshToken, user);
      if (isNewUser) {
        trackProductEvent(ProductEventName.SIGNUP_COMPLETED, {
          'signup method': provider,
          'entry point': 'welcome_screen',
          'is guest upgrade': false,
          'email verification required': false,
        });
        setProductUserProperties({
          'Signup Method': provider,
        });
      }
      trackProductEvent(ProductEventName.LOGIN_COMPLETED, {
        'login method': provider,
        'entry point': 'welcome_screen',
        'is returning user': !isNewUser,
      });
      setProductUserProperties({
        'Login Method': provider,
      });
      authTransitionRef.current = true;
    } catch (error: any) {
      authTransitionRef.current = false;
      const status = error?.response?.status;
      const serverMessage = String(error?.response?.data?.message ?? '');
      const message =
        provider === 'apple' && serverMessage === 'APPLE_ACCOUNT_NOT_LINKED'
          ? t('auth.appleAccountNotLinked')
          : status === 401
            ? t('auth.invalidCredentials')
          : serverMessage || t('auth.loginError');
      Alert.alert(t('common.error'), message);
    } finally {
      if (authTransitionRef.current) return;
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      trackProductEvent(ProductEventName.LOGIN_STARTED, {
        'login method': 'google',
        'entry point': 'welcome_screen',
        'is returning user': true,
      });

      if (Platform.OS !== 'web') {
        const idToken = await signInWithNativeGoogle();
        if (!idToken) return;

        await handleSocialLoginResult('google', idToken);
        return;
      }

      if (!isGoogleAuthSessionConfigured()) {
        presentGoogleAuthError(t('common.error'), t('auth.googleConfigError'));
        return;
      }

      const result = await googlePromptAsync();
      const idToken = extractGoogleIdToken(result) ?? extractGoogleIdToken(googleResponse);

      if (result?.type === 'success' && idToken) {
        handledGoogleTokenRef.current = idToken;
        await handleSocialLoginResult('google', idToken);
      } else if (result?.type === 'success') {
        presentGoogleAuthError(t('common.error'), t('auth.googleLoginError'));
      }
    } catch (error) {
      const message = isNativeGoogleSigninConfigurationError(error)
        ? t('auth.googleConfigError')
        : t('auth.googleLoginError');

      presentGoogleAuthError(t('common.error'), message);
    }
  };

  const handleAppleLogin = async () => {
    try {
      trackProductEvent(ProductEventName.LOGIN_STARTED, {
        'login method': 'apple',
        'entry point': 'welcome_screen',
        'is returning user': true,
      });
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(36),
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });
      if (credential.identityToken) {
        await handleSocialLoginResult('apple', credential.identityToken);
      }
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert(t('common.error'), t('auth.appleLoginError'));
      }
    }
  };

  useEffect(() => {
    const idToken = extractGoogleIdToken(googleResponse);
    if (!idToken) return;
    if (handledGoogleTokenRef.current === idToken) return;

    handledGoogleTokenRef.current = idToken;
    void handleSocialLoginResult('google', idToken);
  }, [googleResponse]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const idToken = extractIdTokenFromHash(window.location.hash);
    if (!idToken) return;

    if (window.opener && window.opener !== window) {
      try {
        window.opener.postMessage(
          { type: WEB_GOOGLE_POPUP_MESSAGE_TYPE, idToken },
          window.location.origin
        );
      } finally {
        window.close();
      }
      return;
    }

    if (handledGoogleTokenRef.current === idToken) return;

    handledGoogleTokenRef.current = idToken;
    void handleSocialLoginResult('google', idToken);
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const handlePopupMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const idToken = extractIdTokenFromPopupMessage(event.data);
      if (!idToken) return;
      if (handledGoogleTokenRef.current === idToken) return;

      handledGoogleTokenRef.current = idToken;
      void handleSocialLoginResult('google', idToken);
    };

    window.addEventListener('message', handlePopupMessage);
    return () => {
      window.removeEventListener('message', handlePopupMessage);
    };
  }, [handleSocialLoginResult]);

  const handleEmailLogin = async () => {
    if (!isFormValid || loading || authTransitionRef.current) return;
    setErrorMessage(null);
    setLoading(true);
    trackProductEvent(ProductEventName.LOGIN_STARTED, {
      'login method': 'email',
      'entry point': 'welcome_screen',
      'is returning user': true,
    });
    try {
      const res = await loginApi({ username: email.trim().toLowerCase(), password });
      const { accessToken, refreshToken, user } = res.data;
      storeLogin(accessToken, refreshToken, user);
      trackProductEvent(ProductEventName.LOGIN_COMPLETED, {
        'login method': 'email',
        'entry point': 'welcome_screen',
        'is returning user': true,
      });
      setProductUserProperties({
        'Login Method': 'email',
      });
      authTransitionRef.current = true;
    } catch (error: any) {
      authTransitionRef.current = false;
      const status = error?.response?.status;
      const message = String(error?.response?.data?.message ?? '');
      const code = String(error?.response?.data?.code ?? '');
      const isEmailNotVerified =
        status === 401 &&
        (message === 'EMAIL_NOT_VERIFIED' ||
          code === 'EMAIL_NOT_VERIFIED' ||
          message.includes('EMAIL_NOT_VERIFIED'));

      if (isEmailNotVerified) {
        trackEvent('auth_login_email_not_verified', { source: 'login' });
        setPendingEmail(email.trim().toLowerCase());
        router.replace({
          pathname: '/(auth)/verify-email-pending',
          params: { email: email.trim().toLowerCase(), source: 'login' },
        });
        return;
      }
      if (status === 401) {
        setErrorMessage(t('auth.invalidCredentials'));
      } else {
        setErrorMessage(t('auth.loginError'));
      }
    } finally {
      if (authTransitionRef.current) return;
      setLoading(false);
    }
  };

  const handleQuickStart = async () => {
    if (loading || quickStartLoading || authTransitionRef.current) return;
    setQuickStartLoading(true);
    try {
      trackEvent('quick_start_clicked', { entry_point: 'welcome', user_type: 'GUEST', auth_provider: 'ANONYMOUS' });
      const res = await quickStartApi();
      const { accessToken, refreshToken, user } = res.data;
      trackEvent('quick_session_created', { user_type: 'GUEST', auth_provider: 'ANONYMOUS' });
      trackProductEvent(ProductEventName.GUEST_MODE_STARTED, {
        'entry point': 'welcome_screen',
        'cta label': 'quick_start',
        'guest limitations shown': false,
      });
      setProductUserProperties({
        'Account Type': 'guest',
      });
      // Save session temporarily — guest-name screen will complete the login
      setPendingGuest({ accessToken, refreshToken: refreshToken ?? null, user });
      router.push('/(auth)/guest-name');
      authTransitionRef.current = true;
    } catch (error: any) {
      authTransitionRef.current = false;
      const message = error?.response?.data?.message || t('quickStart.error');
      Alert.alert(t('common.error'), message);
    } finally {
      if (authTransitionRef.current) return;
      setQuickStartLoading(false);
    }
  };

  const handleRegister = () => {
    router.push({
      pathname: '/(auth)/signup',
      params: { email: email.trim().toLowerCase() },
    });
  };

  const handleForgotPassword = () => {
    router.push({
      pathname: '/(auth)/forgot-password',
      params: { email: email.trim().toLowerCase() },
    });
  };

  return (
    <SafeScreen style={styles.safeScreen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <CosmicBackdrop />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.screenShell}>
            <View style={styles.heroSection}>
              <View style={styles.heroMarkWrap}>
                <View style={styles.heroMarkHalo} />
                <LinearGradient
                  colors={['rgba(255,255,255,0.98)', 'rgba(237,224,255,0.96)', 'rgba(196,151,255,0.74)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.heroMarkFrame}
                >
                  <LinearGradient
                    colors={['#3A118B', '#5A22D6', '#2B0E73']}
                    start={{ x: 0.15, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroMarkCore}
                  >
                    <Svg width="100%" height="100%" viewBox="0 0 92 92" style={styles.heroOrbit}>
                      <Circle cx="46" cy="46" r="31" fill="transparent" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="0.8" />
                      <Circle cx="46" cy="46" r="22" fill="transparent" stroke="#D8C4FF" strokeOpacity="0.2" strokeWidth="0.7" />
                      <Path d="M14 47 C 31 20, 62 18, 78 43" fill="transparent" stroke="#FFFFFF" strokeOpacity="0.22" strokeWidth="0.8" />
                      <Path d="M24 64 C 40 75, 64 71, 76 52" fill="transparent" stroke="#D8C4FF" strokeOpacity="0.18" strokeWidth="0.7" />
                      <Circle cx="73" cy="42" r="1.8" fill="#FFFFFF" opacity="0.76" />
                      <Circle cx="25" cy="65" r="1.3" fill="#FFFFFF" opacity="0.58" />
                    </Svg>
                    <View style={styles.heroMarkViewport}>
                      <Image
                        source={HERO_PREMIUM_ICON}
                        style={styles.heroMarkImage}
                        accessibilityLabel={t('appBrand.logoA11y')}
                        accessibilityRole="image"
                      />
                    </View>
                  </LinearGradient>
                </LinearGradient>
              </View>

              <View style={styles.heroTextWrap}>
                <View style={styles.titleRow}>
                  <Sparkles size={15} color="#B6A0F4" strokeWidth={1.7} style={styles.titleSparkle} />
                  <Text
                    style={styles.heading}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {t('auth.welcomeTitle')}
                  </Text>
                  <Sparkles size={15} color="#B6A0F4" strokeWidth={1.7} style={styles.titleSparkle} />
                </View>
                <Text style={styles.subheading}>{t('auth.welcomeSubtitle')}</Text>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIconSlot}>
                    <Mail size={23} color={AUTH_COLORS.icon} strokeWidth={1.8} />
                  </View>
                  <TextInput
                    style={[styles.input, WEB_INPUT_RESET_STYLE, AUTH_WEB_TEXT_INPUT_STYLE]}
                    placeholder={t('auth.email')}
                    placeholderTextColor={AUTH_COLORS.subtext}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIconSlot}>
                    <Lock size={23} color={AUTH_COLORS.icon} strokeWidth={1.8} />
                  </View>
                  <TextInput
                    style={[styles.input, styles.passwordInput, WEB_INPUT_RESET_STYLE, AUTH_WEB_TEXT_INPUT_STYLE]}
                    placeholder={t('auth.password')}
                    placeholderTextColor={AUTH_COLORS.subtext}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    editable={!loading}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    accessibilityLabel={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    accessibilityRole="button"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    {showPassword ? (
                      <EyeOff size={23} color={AUTH_COLORS.icon} strokeWidth={1.9} />
                    ) : (
                      <Eye size={23} color={AUTH_COLORS.icon} strokeWidth={1.9} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.forgotRow}>
                  <TouchableOpacity
                    onPress={handleForgotPassword}
                    disabled={loading}
                    accessibilityLabel={t('auth.forgotPassword')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.forgotLink}>{t('auth.forgotPassword')}</Text>
                  </TouchableOpacity>
                </View>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <TouchableOpacity
                  style={[styles.loginButton, (!isFormValid || loading) && styles.loginButtonDisabled]}
                  disabled={!isFormValid || loading}
                  onPress={handleEmailLogin}
                  accessibilityLabel={t('auth.loginTitle')}
                  accessibilityRole="button"
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={['#E26BF7', '#A246F3', '#631FCE']}
                    locations={[0, 0.52, 1]}
                    start={{ x: 0, y: 0.08 }}
                    end={{ x: 1, y: 0.9 }}
                    style={styles.loginGradient}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={styles.buttonSheen}
                    />
                    <Sparkles size={19} color="#FFFFFF" strokeWidth={1.5} style={styles.buttonSparkleLeft} />
                    <Sparkles size={17} color="#FFFFFF" strokeWidth={1.4} style={styles.buttonSparkleRight} />
                    {loading ? (
                      <ActivityIndicator color={AUTH_COLORS.white} />
                    ) : (
                      <>
                        <Text style={styles.loginButtonText}>{t('auth.loginTitle')}</Text>
                        <View style={styles.buttonArrowWrap}>
                          <ArrowRight size={30} color={AUTH_COLORS.white} strokeWidth={1.8} />
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t('common.or')}</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.googleButton}
                onPress={handleGoogleLogin}
                disabled={loading || quickStartLoading}
                accessibilityLabel={t('auth.loginWithGoogle')}
                accessibilityRole="button"
                activeOpacity={0.84}
              >
                <GoogleMark />
                <Text style={styles.socialText}>{t('auth.loginWithGoogle')}</Text>
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.appleButton}
                  onPress={handleAppleLogin}
                  disabled={loading || quickStartLoading}
                  accessibilityLabel={t('auth.loginWithApple')}
                  accessibilityRole="button"
                  activeOpacity={0.84}
                >
                  <AppleMark />
                  <Text style={styles.appleText}>{t('auth.loginWithApple')}</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.guestLink}
              onPress={handleQuickStart}
              disabled={loading || quickStartLoading}
              accessibilityLabel={t('quickStart.accessibilityLabel')}
              accessibilityRole="button"
              activeOpacity={0.78}
            >
              {quickStartLoading ? (
                <ActivityIndicator size="small" color={AUTH_COLORS.primary} />
              ) : (
                <UserRound size={22} color={AUTH_COLORS.primary} strokeWidth={1.8} />
              )}
              <Text style={styles.guestText}>{t('auth.quickStartTitle')}</Text>
            </TouchableOpacity>

            <View style={styles.footerCluster}>
              <View style={styles.signupPrompt} pointerEvents={loading ? 'none' : 'auto'}>
                <Text style={styles.signupMuted}>{t('auth.noAccount')}</Text>
                <TouchableOpacity
                  onPress={handleRegister}
                  disabled={loading}
                  accessibilityLabel={t('auth.signUp')}
                  accessibilityRole="button"
                >
                  <Text style={styles.signupLink}>{t('auth.signUp')}</Text>
                </TouchableOpacity>
              </View>

              <AuthLegalNotice variant="inline" style={styles.legalNotice} />
              <Text style={styles.versionText}>{CONCEPT_VERSION_LABEL}</Text>
            </View>
          </View>
        </ScrollView>

        {(loading || quickStartLoading) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={AUTH_COLORS.primary} />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}

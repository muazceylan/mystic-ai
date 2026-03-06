import { useEffect } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

const WEB_GOOGLE_POPUP_MESSAGE_TYPE = 'mystic-google-auth';

function extractIdTokenFromHash(hash: string): string | undefined {
  const normalized = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!normalized) return undefined;
  const params = new URLSearchParams(normalized);
  return params.get('id_token') ?? undefined;
}

export default function OAuthCallbackScreen() {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      router.replace('/(auth)/welcome');
      return;
    }

    const idToken = extractIdTokenFromHash(window.location.hash);

    if (idToken && window.opener && window.opener !== window) {
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

    // Fallback: if callback opened in same window, continue at welcome.
    window.location.replace('/welcome' + window.location.hash);
  }, []);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Giris tamamlanıyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 14,
    color: '#475569',
  },
});

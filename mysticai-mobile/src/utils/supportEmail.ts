import { Alert, Linking } from 'react-native';
import type { TFunction } from 'i18next';

type OpenSupportEmailOptions = {
  email: string;
  t: TFunction;
};

export async function openSupportEmail({
  email,
  t,
}: OpenSupportEmailOptions): Promise<void> {
  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    Alert.alert(t('common.error'), t('common.operationFailed'));
    return;
  }

  const url = `mailto:${normalizedEmail}`;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      throw new Error('MAILTO_UNAVAILABLE');
    }

    await Linking.openURL(url);
  } catch {
    Alert.alert(
      t('common.emailUnavailableTitle'),
      t('common.emailUnavailableDescription', { email: normalizedEmail }),
    );
  }
}

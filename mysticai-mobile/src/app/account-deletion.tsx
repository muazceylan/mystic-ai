import { useTranslation } from 'react-i18next';
import AccountDeletionInfoScreen from '../screens/AccountDeletionInfoScreen';

export default function AccountDeletionPage() {
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr';

  return <AccountDeletionInfoScreen locale={locale} />;
}

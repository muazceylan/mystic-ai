import type { Locale } from './constants';
import { SITE_URL } from './constants';

export const ACCOUNT_DELETION_PATHS = {
  tr: '/account-deletion',
  en: '/en/account-deletion',
} as const satisfies Record<Locale, string>;

type AccountDeletionStep = {
  title: string;
  body: string;
};

type AccountDeletionFaqItem = {
  question: string;
  answer: string;
};

type AccountDeletionLink = {
  href: string;
  label: string;
  description: string;
};

type AccountDeletionContent = {
  metadata: {
    title: string;
    description: string;
    openGraphTitle: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    instructionLabel: string;
    instructionValue: string;
    localizedPathNote?: string;
  };
  ctas: {
    primary: string;
    secondary: string;
  };
  howToDelete: {
    title: string;
    intro: string;
    steps: AccountDeletionStep[];
  };
  afterDeletion: {
    title: string;
    deletedDataTitle: string;
    deletedDataItems: string[];
    retainedNote: string;
    processingTime: string;
  };
  help: {
    title: string;
    intro: string;
    supportCard: {
      title: string;
      body: string;
      mailtoLabel: string;
      mailtoBody: string;
      contactLabel: string;
      contactDescription: string;
    };
    policyLinksTitle: string;
    policyLinks: AccountDeletionLink[];
  };
  reviewNote: {
    title: string;
    body: string;
  };
  faq: AccountDeletionFaqItem[];
};

export const accountDeletionContent = {
  tr: {
    metadata: {
      title: 'AstroGuru Hesap ve Veri Silme',
      description:
        'AstroGuru hesabınızı ve kişisel verilerinizi uygulama içinden kalıcı olarak silebilirsiniz. Silinen veriler, saklanan kayıtlar ve destek seçenekleri hakkında bilgi edinin.',
      openGraphTitle: 'Hesap ve Veri Silme | AstroGuru',
    },
    hero: {
      eyebrow: 'AstroGuru Hesap ve Veri Silme',
      title: 'AstroGuru Hesap ve Veri Silme',
      description:
        'AstroGuru kullanıcıları hesaplarını ve ilişkili kişisel verilerini uygulama içinden kalıcı olarak silebilir.',
      instructionLabel: 'Uygulama içi yol',
      instructionValue: 'Profil → Hesabı Kalıcı Olarak Sil',
      localizedPathNote: undefined,
    },
    ctas: {
      primary: 'Uygulamayı açıp profilden hesabınızı silin',
      secondary: 'Yardıma mı ihtiyacınız var? Destek ile iletişime geçin',
    },
    howToDelete: {
      title: 'Hesabınızı nasıl silebilirsiniz?',
      intro:
        'Hesap silme işlemi web üzerinden değil, AstroGuru mobil uygulaması içinden tamamlanır.',
      steps: [
        {
          title: 'AstroGuru uygulamasını açın ve hesabınıza giriş yapın.',
          body: 'Silme işlemini başlatmak için aktif hesabınızla uygulama içinde olmanız gerekir.',
        },
        {
          title: 'Profil ekranına gidin.',
          body: 'Hesap ayarlarınız ve yasal destek bağlantıları bu bölümde yer alır.',
        },
        {
          title: '"Hesabı Kalıcı Olarak Sil" seçeneğini seçin.',
          body: 'Uygulama, silme işleminin kalıcı olduğunu açıkça gösterir.',
        },
        {
          title: 'Onay ekranını tamamlayın.',
          body: 'Onaydan sonra hesabınız silme sürecine alınır ve uygulamaya erişiminiz sonlanır.',
        },
      ],
    },
    afterDeletion: {
      title: 'Silme sonrası ne olur?',
      deletedDataTitle: 'Silinen veriler',
      deletedDataItems: [
        'Hesap bilgileri ve kayıt durumu',
        'E-posta adresi ve giriş sağlayıcısı bilgisi',
        'Profil detayları (görünen ad, fotoğraf, tercihler)',
        'Doğum tarihi, saati ve doğum yeri',
        'Astroloji, numeroloji, uyumluluk ve kişiselleştirilmiş analiz verileri',
        'Rüya kayıtları ve varsa ses transkriptleri',
        "Bildirim token'ları",
        'Uygulama tercihleri ve ayarlar',
      ],
      retainedNote:
        'Hesap silme işleminden sonra hesabınız aktif kullanıcı hesabı olarak kullanılamaz. Gerekli olmayan kişisel veriler silinir veya anonimleştirilir. Güvenlik, kötüye kullanım önleme, yasal yükümlülük veya işlem/denetim kayıtları gerektiren durumlarda sınırlı kayıtlar belirli bir süre saklanabilir. Bu kayıtlar aktif kullanıcı hesabı olarak kullanılmaz.',
      processingTime:
        'Hesap silme talepleri genellikle 7 gün içinde işleme alınır. Yasal veya güvenlik gereklilikleri nedeniyle bazı kayıtlar daha uzun süre saklanabilir.',
    },
    help: {
      title: 'Yardıma mı ihtiyacınız var?',
      intro:
        'Uygulamaya erişemiyorsanız veya silme sırasında sorun yaşıyorsanız destek kanalını kullanabilirsiniz.',
      supportCard: {
        title: 'Uygulamaya erişemiyorsanız',
        body:
          'Uygulamaya giriş yapamıyorsanız veya silme akışı beklediğiniz gibi çalışmıyorsa, aşağıdaki butona tıklayarak hazır konu ve içerikle e-posta gönderebilirsiniz.',
        mailtoLabel: 'Hesap Silme Talebi Gönder',
        mailtoBody:
          'Merhaba AstroGuru ekibi,\n\nAstroGuru hesabımın ve hesabımla ilişkili kişisel verilerimin silinmesini talep ediyorum.\n\nHesap e-postam: \nGiriş yöntemi: E-posta / Google / Apple',
        contactLabel: 'İletişim sayfasına gidin',
        contactDescription:
          'E-posta gönderirken konu satırına "AstroGuru Hesap Silme Talebi" yazmanız işlemin daha hızlı yönlendirilmesine yardımcı olur.',
      },
      policyLinksTitle: 'İlgili sayfalar',
      policyLinks: [
        {
          href: '/gizlilik',
          label: 'Gizlilik Politikası',
          description: 'Verilerin nasıl toplandığı, kullanıldığı ve korunduğu hakkında bilgi.',
        },
        {
          href: '/kullanim-sartlari',
          label: 'Kullanım Şartları',
          description: 'Hizmet kullanım koşulları ve hesap yönetimiyle ilgili temel kurallar.',
        },
      ],
    },
    reviewNote: {
      title: 'Bilgilendirme notu',
      body:
        'Bu sayfa, AstroGuru içindeki hesap ve veri silme özelliği hakkında bilgilendirme sağlar. Hesap silme işlemi bu web sitesi üzerinden değil, mobil uygulama içindeki Profil → Hesabı Kalıcı Olarak Sil yolundan tamamlanır. Uygulamaya erişemiyorsanız support@astroguru.app adresine "AstroGuru Hesap Silme Talebi" konusuyla e-posta gönderebilirsiniz.',
    },
    faq: [
      {
        question: 'AstroGuru hesabımı nasıl silebilirim?',
        answer:
          'AstroGuru uygulamasını açıp Profil → Hesabı Kalıcı Olarak Sil yolunu izleyerek hesabınızı ve ilişkili kişisel verilerinizi kalıcı olarak silebilirsiniz.',
      },
      {
        question: 'Hesap silme işlemi web sitesinden yapılıyor mu?',
        answer:
          'Hayır. Bu sayfa bilgilendirme amaçlıdır. Hesap silme işlemi mobil uygulama içinden tamamlanır.',
      },
      {
        question: 'Uygulamaya erişemiyorsam ne yapmalıyım?',
        answer:
          'Uygulamaya erişemiyorsanız support@astroguru.app adresine "AstroGuru Hesap Silme Talebi" konusuyla e-posta gönderebilirsiniz. E-postada hesap e-postanızı ve giriş yönteminizi belirtmeniz işleminizin daha hızlı ilerlemesini sağlar.',
      },
      {
        question: 'Hangi verilerim silinir?',
        answer:
          "Hesap silme işlemiyle; hesap bilgileri, e-posta adresi ve giriş sağlayıcısı bilgisi, profil detayları, doğum tarihi/saati/yeri, astroloji ve numeroloji analiz verileri, rüya kayıtları, bildirim token'ları ve uygulama tercihleri silinir veya anonimleştirilir.",
      },
    ],
  },
  en: {
    metadata: {
      title: 'AstroGuru Account and Data Deletion',
      description:
        'AstroGuru users can permanently delete their account and personal data from inside the mobile app. Review deleted data, retained records, and support options.',
      openGraphTitle: 'Account and Data Deletion | AstroGuru',
    },
    hero: {
      eyebrow: 'Account and Data Deletion',
      title: 'AstroGuru Account and Data Deletion',
      description:
        'AstroGuru users can permanently delete their account and associated personal data from inside the app.',
      instructionLabel: 'In-app path',
      instructionValue: 'Profile → Permanently Delete Account',
      localizedPathNote: undefined,
    },
    ctas: {
      primary: 'Open the app and delete your account from Profile',
      secondary: 'Need help? Contact support',
    },
    howToDelete: {
      title: 'How to delete your account',
      intro:
        'Account deletion is completed inside the AstroGuru mobile app, not on this website.',
      steps: [
        {
          title: 'Open AstroGuru and sign in to your account.',
          body: 'You need to be inside the app with access to the account you want to remove.',
        },
        {
          title: 'Go to the Profile screen.',
          body: 'Your account settings and legal support links are available there.',
        },
        {
          title: 'Select "Permanently Delete Account".',
          body: 'The app clearly marks this action as permanent before you continue.',
        },
        {
          title: 'Confirm the deletion request.',
          body: 'After confirmation, your account enters the deletion flow and app access ends.',
        },
      ],
    },
    afterDeletion: {
      title: 'What happens after deletion',
      deletedDataTitle: 'Data that will be deleted',
      deletedDataItems: [
        'Account information and registration status',
        'Email address and sign-in provider information',
        'Profile details (display name, photo, preferences)',
        'Birth date, birth time, and birth place',
        'Astrology, numerology, compatibility, and personalised analysis data',
        'Dream records and voice transcripts, if any',
        'Notification tokens',
        'App preferences and settings',
      ],
      retainedNote:
        'After account deletion, your account can no longer be used as an active user account. Personal data that is no longer required is deleted or anonymised. Security, abuse prevention, legal obligation, or transaction and audit records may be retained for a limited period where required. These records are not used as an active user account.',
      processingTime:
        'Deletion requests are usually processed within 7 days. Some records may be retained longer only where legally or technically required.',
    },
    help: {
      title: 'Need help?',
      intro:
        'If you cannot access the app or run into a problem during deletion, please use the support channel.',
      supportCard: {
        title: 'If you cannot access the app',
        body:
          'If you cannot sign in or the deletion flow is not working as expected, you can send a pre-filled email request using the button below.',
        mailtoLabel: 'Send Account Deletion Request',
        mailtoBody:
          'Hello AstroGuru team,\n\nI request the deletion of my AstroGuru account and associated personal data.\n\nAccount email: \nSign-in method: Email / Google / Apple',
        contactLabel: 'Open the contact page',
        contactDescription:
          'Using the subject line "AstroGuru Account Deletion Request" helps route your message faster.',
      },
      policyLinksTitle: 'Related pages',
      policyLinks: [
        {
          href: '/en/privacy',
          label: 'Privacy Policy',
          description: 'How personal data is collected, used, and protected.',
        },
        {
          href: '/en/terms',
          label: 'Terms of Use',
          description: 'The service rules and account-related usage conditions.',
        },
      ],
    },
    reviewNote: {
      title: 'Informational note',
      body:
        'This page explains the account and data deletion option available in AstroGuru. The deletion action is not performed on this website and must be completed from Profile → Permanently Delete Account inside the mobile app. If you cannot access the app, email support@astroguru.app with the subject "AstroGuru Account Deletion Request".',
    },
    faq: [
      {
        question: 'How do I delete my AstroGuru account?',
        answer:
          'Open the AstroGuru app and follow Profile → Permanently Delete Account to permanently remove your account and associated personal data.',
      },
      {
        question: 'Can I delete my account on the website?',
        answer:
          'No. This page is informational. Account deletion is completed inside the mobile app.',
      },
      {
        question: 'What should I do if I cannot access the app?',
        answer:
          'Email support@astroguru.app with the subject "AstroGuru Account Deletion Request". Include your account email and sign-in method to help us process your request faster.',
      },
      {
        question: 'What data is deleted?',
        answer:
          'Account deletion removes your account information, email address and sign-in provider, profile details, birth date/time/place, astrology and numerology analysis data, dream records, notification tokens, and app preferences.',
      },
    ],
  },
} as const satisfies Record<Locale, AccountDeletionContent>;

export function getAccountDeletionContent(locale: Locale) {
  return accountDeletionContent[locale];
}

export function getAccountDeletionPath(locale: Locale) {
  return ACCOUNT_DELETION_PATHS[locale];
}

export function getAccountDeletionUrl(locale: Locale) {
  return `${SITE_URL}${getAccountDeletionPath(locale)}`;
}

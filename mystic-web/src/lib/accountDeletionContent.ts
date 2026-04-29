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
    items: string[];
  };
  help: {
    title: string;
    intro: string;
    supportCard: {
      title: string;
      body: string;
      mailtoLabel: string;
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
      title: 'Hesap Silme',
      description:
        'Astro Guru kullanicilari hesaplarini uygulama icinden kalici olarak silebilir. Adimlari, veri silme etkilerini ve destek seceneklerini inceleyin.',
      openGraphTitle: 'Hesap Silme | AstroGuru',
    },
    hero: {
      eyebrow: 'Account Deletion',
      title: 'Hesap Silme',
      description:
        'Astro Guru kullanicilari hesaplarini uygulama icinden kalici olarak silebilir.',
      instructionLabel: 'Uygulama ici yol',
      instructionValue: 'Profile -> Permanently Delete Account',
      localizedPathNote:
        'Turkce uygulama arayuzunde ayni yol Profil -> Hesabi Kalici Olarak Sil olarak gorunebilir.',
    },
    ctas: {
      primary: 'Uygulamayi acip profilden hesabinizi silin',
      secondary: 'Yardima mi ihtiyaciniz var? Destek iletisime gecin',
    },
    howToDelete: {
      title: 'Hesabinizi nasil silebilirsiniz?',
      intro:
        'Hesap silme islemi web uzerinden degil, Astro Guru mobil uygulamasi icinden tamamlanir.',
      steps: [
        {
          title: 'Astro Guru uygulamasini acin ve hesabiniza giris yapin.',
          body: 'Silme islemini baslatmak icin aktif hesabinizla uygulama icinde olmaniz gerekir.',
        },
        {
          title: 'Profile ekranina gidin.',
          body: 'Hesap ayarlariniz ve yasal destek baglantilari bu bolumde yer alir.',
        },
        {
          title: 'Permanently Delete Account secenegini secin.',
          body: 'Uygulama, silme isleminin kalici oldugunu acikca gosterir.',
        },
        {
          title: 'Onay ekranini tamamlayin.',
          body: 'Onaydan sonra hesabiniz silme surecine alinir ve uygulamaya erisiminiz sonlanir.',
        },
      ],
    },
    afterDeletion: {
      title: 'Silme sonrasi ne olur?',
      items: [
        'Hesap silme islemi, kullanici hesabinizi ve iliskili kisisel verileri aktif sistemlerden kaldirmak icin kullanilir.',
        'Silme tamamlandiginda hesabiniza yeniden erisemez, ayni hesap durumu ile oturum acamazsiniz.',
        'Yasal yukumlulukler, guvenlik, dolandiricilik onleme, muhasebe veya temel operasyon gerekleri nedeniyle tutulmasi gereken sinirli kayitlar bir sure daha saklanabilir.',
      ],
    },
    help: {
      title: 'Yardima mi ihtiyaciniz var?',
      intro:
        'Uygulamaya erisemiyorsaniz veya silme sirasinda sorun yasiyorsaniz destek kanalini kullanabilirsiniz.',
      supportCard: {
        title: 'Destek ve yedek akis',
        body:
          'Uygulamaya giris yapamiyorsaniz veya silme akisi beklediginiz gibi calismiyorsa, destek ekibiyle iletisime gecin.',
        mailtoLabel: 'support@astroguru.app',
        contactLabel: 'Iletisim sayfasina gidin',
        contactDescription:
          'E-posta gonderirken konu satirina "Hesap Silme Talebi" yazmaniz islemin daha hizli yonlendirilmesine yardimci olur.',
      },
      policyLinksTitle: 'Ilgili sayfalar',
      policyLinks: [
        {
          href: '/gizlilik',
          label: 'Gizlilik Politikasi',
          description: 'Verilerin nasil toplandigi, kullanildigi ve korundugu hakkinda bilgi.',
        },
        {
          href: '/kullanim-sartlari',
          label: 'Kullanim Sartlari',
          description: 'Hizmet kullanim kosullari ve hesap yonetimiyle ilgili temel kurallar.',
        },
      ],
    },
    reviewNote: {
      title: 'Inceleme notu',
      body:
        'Bu sayfa, Astro Guru icindeki hesap silme ozelligi hakkinda bilgilendirme saglar. Hesap silme islemi bu web sitesi uzerinden degil, mobil uygulama icindeki ilgili ayar yolundan tamamlanir.',
    },
    faq: [
      {
        question: 'Astro Guru hesabimi nasil silebilirim?',
        answer:
          'Astro Guru uygulamasini acip Profile -> Permanently Delete Account yolunu izleyerek hesabinizi kalici olarak silebilirsiniz.',
      },
      {
        question: 'Hesap silme islemi web sitesinden yapiliyor mu?',
        answer:
          'Hayir. Bu sayfa bilgilendirme amaciyla yayindadir. Hesap silme islemi mobil uygulama icinden tamamlanir.',
      },
      {
        question: 'Uygulamaya erisemiyorsam ne yapmaliyim?',
        answer:
          'Uygulamaya erisemiyorsaniz iletisim sayfasini kullanabilir veya support@astroguru.app adresine "Hesap Silme Talebi" konusuyla e-posta gonderebilirsiniz.',
      },
    ],
  },
  en: {
    metadata: {
      title: 'Account Deletion',
      description:
        'Astro Guru users can permanently delete their account inside the mobile app. Review the steps, deletion effects, and support options.',
      openGraphTitle: 'Account Deletion | AstroGuru',
    },
    hero: {
      eyebrow: 'Account Deletion',
      title: 'Account Deletion',
      description:
        'Astro Guru users can permanently delete their account from inside the app.',
      instructionLabel: 'In-app path',
      instructionValue: 'Profile -> Permanently Delete Account',
      localizedPathNote: undefined,
    },
    ctas: {
      primary: 'Open the app and delete your account from Profile',
      secondary: 'Need help? Contact support',
    },
    howToDelete: {
      title: 'How to delete your account',
      intro:
        'Account deletion is completed inside the Astro Guru mobile app, not on this website.',
      steps: [
        {
          title: 'Open Astro Guru and sign in to your account.',
          body: 'You need to be inside the app with access to the account you want to remove.',
        },
        {
          title: 'Go to the Profile screen.',
          body: 'Your account settings and legal support links are available there.',
        },
        {
          title: 'Select Permanently Delete Account.',
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
      items: [
        'Account deletion is used to remove your user account and associated personal data from active systems.',
        'Once deletion is completed, you lose access to that account and cannot sign in with the same account state again.',
        'Limited records may be retained for a period where required for legal obligations, security, fraud prevention, accounting, or essential operational needs.',
      ],
    },
    help: {
      title: 'Need help?',
      intro:
        'If you cannot access the app or run into a problem during deletion, please use the support channel.',
      supportCard: {
        title: 'Support fallback',
        body:
          'If you cannot sign in or the deletion flow is not working as expected, contact the support team.',
        mailtoLabel: 'support@astroguru.app',
        contactLabel: 'Open the contact page',
        contactDescription:
          'Using the subject line "Account Deletion Request" helps route your message faster.',
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
      title: 'Review-friendly note',
      body:
        'This page explains the in-app account deletion option available in Astro Guru. The deletion action is not performed on the website and must be completed from the relevant screen inside the mobile app.',
    },
    faq: [
      {
        question: 'How do I delete my Astro Guru account?',
        answer:
          'Open the Astro Guru app and follow Profile -> Permanently Delete Account to permanently remove your account.',
      },
      {
        question: 'Can I delete my account on the website?',
        answer:
          'No. This page is informational. Account deletion is completed inside the mobile app.',
      },
      {
        question: 'What should I do if I cannot access the app?',
        answer:
          'If you cannot access the app, use the contact page or email support@astroguru.app with the subject "Account Deletion Request".',
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

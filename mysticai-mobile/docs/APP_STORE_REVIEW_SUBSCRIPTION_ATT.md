# App Store Review — Subscription and ATT submission checklist

This checklist accompanies the in-app fixes for Guidelines 3.1.2(c) and 2.1.

## App Store Connect metadata (manual, required)

Add these lines to the App Description in every supported localization:

```text
Terms of Use (EULA): https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy Policy: https://astroguru.app/privacy
```

Also set the App Store Connect **Privacy Policy URL** field to:

```text
https://astroguru.app/privacy
```

If Astro Guru's custom terms are submitted as the legal EULA instead of Apple's standard EULA,
enter `https://astroguru.app/terms` in the App Store Connect custom EULA field. Do not leave both
the description/EULA field and Privacy Policy URL incomplete.

## Subscription configuration

For both `astroguru_premium_monthly` and `astroguru_premium_yearly`, confirm in App Store Connect:

- Reference name and localized display name match the in-app plan title.
- Subscription duration matches the in-app monthly/yearly label.
- Current localized price is available in every enabled storefront.
- If a free introductory offer is enabled, its duration matches the offer returned by StoreKit.
- If no introductory offer should be marketed, remove it from App Store Connect. The app does not
  invent a fallback trial; it only displays a trial after StoreKit/RevenueCat confirms both a free
  introductory offer and the current user's eligibility.

## Physical-device ATT recording

1. On an iPhone or iPad, enable **Settings → Privacy & Security → Tracking → Allow Apps to Request to Track**.
2. Delete Astro Guru from the device, then reinstall the review build.
3. Start screen recording before launching the app.
4. Launch Astro Guru and keep the app active. Record the native ATT prompt appearing on the first screen.
5. Select either response and record the app continuing normally.
6. Open Profile → Premium, select each subscription, and record the title, duration, full localized
   price, renewal terms, Restore Purchase, Terms, and Privacy links.
7. Upload the recording and place its link in **App Review Information → Notes**.

Suggested review note:

```text
ATT is requested on first launch while the app is active and before analytics or advertising SDK
collection is enabled. Firebase Analytics auto-collection and ad consent default to disabled; the
runtime applies the user's ATT result before initializing analytics/ads. A physical-device recording
of fresh install → ATT prompt → Premium purchase flow is attached below.

The Premium purchase flow reads the live StoreKit offer through RevenueCat. A free-trial message is
shown only when the product contains a free introductory offer and StoreKit confirms that the user is
eligible. The screen then states the trial duration and the full localized recurring price. Ineligible
users see the normal paid subscription CTA and no trial claim. Terms, Privacy, and Restore Purchase are
available directly from the purchase screen.

Recording: [INSERT APP STORE CONNECT ATTACHMENT OR URL]
```

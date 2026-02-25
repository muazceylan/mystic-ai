# Sharing Setup (Instagram Stories + QR)

## Detailed TR Runbook

Project-level Turkish go-live checklist / action plan:

- `/Users/solvia/Documents/mystcai/mystic-ai/docs/COSMIC_SHARE_GO_LIVE_RUNBOOK_TR.md`

## Environment variables (mobile)

Create `mysticai-mobile/.env` from `mysticai-mobile/.env.example` and set:

- `EXPO_PUBLIC_FACEBOOK_APP_ID`
  - Meta/Facebook App ID used by `react-native-share` for Instagram Stories attribution/sticker integration.
- `EXPO_PUBLIC_META_APP_ID`
  - Optional alias; used as fallback if `EXPO_PUBLIC_FACEBOOK_APP_ID` is not set.
- `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`
  - Google Places + Time Zone API key (companion location autocomplete / place details / timezone lookup).
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
  - Fallback alias; app uses this if `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` is empty.

## Google Places / Maps API Key (Where to get it?)

The app uses these Google endpoints from the mobile client:

- Places Autocomplete API (`/place/autocomplete/json`)
- Place Details API (`/place/details/json`)
- Time Zone API (`/timezone/json`)

Create the key in Google Cloud Console:

1. Go to [Google Cloud Console](https://console.cloud.google.com/).
2. Create/select a project.
3. Enable billing (required for most Google Maps Platform APIs).
4. Open `APIs & Services` -> `Library`.
5. Enable:
   - `Places API` (or the equivalent Places Web Service API in your console view)
   - `Time Zone API`
6. Open `APIs & Services` -> `Credentials`.
7. Click `Create credentials` -> `API key`.
8. Put the generated key into `.env` as:
   - `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=...`

Security note:

- This key is currently used directly from the mobile app (client-side REST requests).
- At minimum, apply **API restrictions** (allow only `Places API` and `Time Zone API`).
- For stronger security and quota control, move Google calls behind your backend later.

## Universal Link redirect (`/dl`)

The QR code points to:

- `https://mysticai.app/dl`

Redirect logic lives in:

- `mysticai-mobile/public/dl/index.html`

Update these constants before production launch:

- `IOS_URL` (real App Store listing URL with your app ID)
- `ANDROID_URL` (real Google Play listing URL; production package)
- `FALLBACK_WEB_URL` (marketing site / download page)

## Notes

- After adding `react-native-share`, rebuild native apps/dev client before testing.
- Test branded QR scanability on real iOS and Android cameras.
- Test Instagram Stories sharing on a real device with Instagram installed.

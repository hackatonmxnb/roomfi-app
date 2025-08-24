# RoomFi

**Find your roomie. Web3 + Monad.**  
Mobile‑first experience built for the Monad L1 hackathon.

## Demos
- Android Apk: https://drive.google.com/file/d/1JKe_R14JLr9jyZubS1sa3auN2hWMESAE/view?usp=share_link
- Video: https://drive.google.com/file/d/1SBO2Q0yp4t3lHAXxz30pKFkD81uh7Iwm/view?usp=share_link

---

## What’s new (Hackathon – Aug 2025)

### 1) Mobile‑first app (Capacitor)
- The existing React web app is wrapped with **Capacitor** to ship a native Android build (APK).

### 2) Voice Search (es‑MX)
- BottomSheet for voice input; **speech‑to‑text** with `@capacitor-community/speech-recognition` (native).  
  Fallback to **Web Speech API** on browsers.
- Auto‑stop on silence/hard cap with “partial results” streaming.
- Sends the final transcript to the NL endpoint and surfaces **chips + suggestions**.

### 3) Natural‑Language Search
- **Endpoint:** `POST /nl-search { text } → { results, suggestions }`

### 4) Wallet & Identity
- **Google Sign‑In (Capacitor)** for SSO.
- After SSO, **PortalHQ (MPC)** auto‑detects/creates the user wallet and returns EVM address (stored backend).
- **Reown AppKit (WalletConnect v2 + ethers v6)** for EIP‑1193 provider and app‑level connect/disconnect.
- Network: **Monad Testnet** (eip155:10143). Read RPC via env.

## Tech Stack (updated)
- **React + TypeScript**, **Material UI**
- **Capacitor** (Android wrapper), **@capacitor-community/speech-recognition** (voice)
- **ethers v6**, **Reown AppKit** (WalletConnect v2), **PortalHQ** (MPC wallets)
- **Google Sign‑In (Capacitor)**
- **Google Maps** (map view)
- Smart contracts (Foundry)

---

> **Notes**
> - Voicesearch needs microphone permission; Capacitor prompts on first use.

---

## Running (Android – dev)
```bash
npm run build               # CRA → /build
npx cap sync android        # copy web assets
npx cap open android        # open Android Studio
# Run on device/emulator (debug)
```

---

## Android Release Build

**A) Keystore**
```bash
keytool -genkey -v -keystore roomfi.keystore -alias roomfi \
  -keyalg RSA -keysize 2048 -validity 10000
```
Create `android/keystore.properties`:
```properties
storeFile=../roomfi.keystore
storePassword=YOUR_PASS
keyAlias=roomfi
keyPassword=YOUR_PASS
```

**B) Gradle (android/app/build.gradle)**
```gradle
def keystoreProps = new Properties()
def propsFile = rootProject.file("keystore.properties")
if (propsFile.exists()) keystoreProps.load(new FileInputStream(propsFile))

android {
  defaultConfig {
    applicationId "com.roomfi.app"
    versionCode 12
    versionName "1.0.12"
  }
  signingConfigs {
    release {
      if (keystoreProps['storeFile']) {
        storeFile file(keystoreProps['storeFile'])
        storePassword keystoreProps['storePassword']
        keyAlias keystoreProps['keyAlias']
        keyPassword keystoreProps['keyPassword']
      } else {
        throw new GradleException("Missing keystore.properties or storeFile")
      }
    }
  }
  buildTypes {
    release {
      signingConfig signingConfigs.release
      minifyEnabled true
      shrinkResources true
      proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
  }
}
```

**C) Build artifacts**
```bash
cd android
./gradlew assembleRelease   # APK → app/build/outputs/apk/release/app-release.apk
./gradlew bundleRelease     # AAB → app/build/outputs/bundle/release/app-release.aab
```

> Remember to bump `versionCode` for each Play upload.

---

## API Contracts (used in mobile flow)

## Open Demo API (ngrok) – Natural‑Language Matching (OpenAI “open” version)

> **Temporary demo endpoint** (ngrok). Do **not** hard‑code in production—move to env and expect rotation/rate limits.

**Endpoint (POST)**
```
https://90f4a12983d3.ngrok-free.app/matchmaking/match/top?user_id=7c74d216-7c65-47e6-b02d-1e6954f39ba7&top_k=3&ai_query=true
```

**Headers**
```http
Content-Type: application/json
```

**Body**
```json
{
  "user_prompt": "Quiero un departamento tranquilo en CDMX con gimnasio; mi presupuesto va de 5000 a 8000."
}
```

**Response (example)**
```json
{
  "roommate_matches": [
    {
      "id": 1011,
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "first_name": "Satoshi",
      "last_name": "Nakamoto",
      "gender": "non-binary",
      "age": 35,
      "budget_min": 5000,
      "budget_max": 10000,
      "location_preference": "CDMX",
      "lifestyle_tags": ["early_bird", "non_smoker"],
      "roomie_preferences": { "gender": "any", "smoking": "no" },
      "bio": "Inventor of blockchain.",
      "profile_image_url": "https://example.com/images/satoshi.png",
      "score": 0.6
    },
    { "id": 143, "first_name": "Thomas", "last_name": "Charles", "score": 0.5 },
    { "id": 588, "first_name": "Sandra", "last_name": "Howard", "score": 0.5 }
  ],
  "property_matches": [
    {
      "id": 769,
      "address": "940 Santos Center Apt. 106, Justinmouth, WV 75593",
      "location": "CDMX",
      "price": 7493,
      "amenities": ["parking", "air_conditioning", "laundry", "pet_friendly"],
      "num_rooms": 2,
      "bathrooms": 2,
      "latitude": null,
      "longitude": null,
      "score": 0.7
    },
    { "id": 192, "price": 7547, "amenities": ["air_conditioning", "wifi", "balcony"], "score": 0.697 },
    { "id": 342, "price": 7451, "amenities": ["parking", "laundry", "air_conditioning", "pet_friendly"], "score": 0.697 }
  ],
  "ai_insights": {
    "suggestions": [
      "Especifique cuántos dormitorios necesita.",
      "Indique los barrios preferidos o la proximidad al trabajo/transporte.",
      "Indique el plazo de mudanza deseado.",
      "Mencione si necesita estacionamiento, balcón u otras comodidades específicas."
    ],
    "missing_critical_info": [
      "número deseado de habitaciones",
      "fecha de mudanza preferida",
      "barrio o zona específica dentro de la CDMX",
      "necesidad de estacionamiento o espacio de almacenamiento"
    ],
    "profile_status": "existing_preferences",
    "has_sufficient_for_matching": true,
    "status": "success"
  }
}
```

**Query params**
- `user_id` (string, required): identificador del usuario solicitante.
- `top_k` (int, optional): número de elementos a retornar por categoría.
- `ai_query` (bool, optional): activa el parseo NL y scoring asistido por IA.

---

## Reown AppKit (WalletConnect v2)
Initialization (React):
```ts
import { createAppKit, useAppKit, AppKit } from '@reown/appkit/react'
import { EthersAdapter } from '@reown/appkit-ethers/react'

createAppKit({
  adapters: [new EthersAdapter()],
  projectId: process.env.REACT_APP_WC_PROJECT_ID!,
  networks: [{ id: 10143, name: 'Monad Testnet', rpcUrl: process.env.REACT_APP_MONAD_RPC! }],
})
```
- Use `useAppKit()` to open the Connect modal; obtain an EIP‑1193 provider and wrap it with `ethers.BrowserProvider`.

---

## Google Sign‑In (Capacitor)
- Use `@codetrix-studio/capacitor-google-auth` (or official `@capacitor/google-signin`).
- Use the **Web OAuth Client ID** in the app config.
- Add **release SHA‑1** to the OAuth client; fixes `code: 10` on signed builds.

---

## Voice Search UX details
- Auto‑stop after **1.5s** of silence; **8s** hard cap; **250ms** grace for final result.
- Drawer closes on “Buscar”; full‑screen overlay until the API responds.
- Suggestions are bubbled up to `App` and rendered as a compact chip bar.

---

## License
Private — not licensed for reuse. Ask for permission before copying or distributing.


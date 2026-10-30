# 🥘 Fusion Food Family Lab
> **Interactive Global Fusion Cuisine & Culinary Science for Kids & Parents**  
> *100% Pure Vegetarian Adaptations with Indian Bazaar Substitutes*

Welcome to the **Fusion Food Family Lab**! This interactive web platform brings together global fusion culinary traditions (Japanese-Peruvian Nikkei, Tex-Mex, Indo-Italian, Indo-French, and Indo-Japanese) and translates them into vegetarian-friendly cooking simulations, food science explorations, phonetic pronunciation challenges, and family trivia.

---

### 5. Hot Potato Rush
- **60-second session:** the timer is visible while playing in the native arena and fullscreen arcade.
- **Pause / resume:** the standard arena freezes the remaining time on pause and continues it on resume.
- **Round end:** when the timer reaches zero, the game stops and presents the final score.

## 🌐 Host on GitHub Pages

This repository includes a GitHub Actions workflow that publishes a static edition of Fusion Food Lab.

**One-time setup**
1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment → Source**, select **GitHub Actions**.
3. Save the setting. The workflow `.github/workflows/github-pages.yml` will publish automatically on pushes to `main`.

**Site address:** `https://shivanktoper.github.io/fusionfood/`

The classic, modern and AI/Vision presets are also available at:
- `https://shivanktoper.github.io/fusionfood/v1/`
- `https://shivanktoper.github.io/fusionfood/v2/`
- `https://shivanktoper.github.io/fusionfood/v3/`

**Static-host limitations:** GitHub Pages serves static HTML, CSS and JavaScript; it does not run the Cloudflare Functions or D1 database used by the original hosted backend. On the GitHub Pages hostname, profiles, progress, reviews and scores stay in the visitor's own browser (local storage/IndexedDB). They do not sync between visitors or devices, and server API-key management is disabled. For a shared global leaderboard, shared feedback or server-backed API features, keep using a backend host such as the existing Cloudflare deployment.

The Pages workflow deliberately publishes only `index.html`, `bundle.js`, `styles.css`, `.nojekyll` and the three version-route wrappers. It does not publish the Cloudflare Worker, Functions, database schema, scripts or repository maintenance files.

## 🚀 Quick Start
1. Double-click **`Start-FusionFood.bat`** or open **`index.html`** in any web browser (Chrome, Edge, Opera, Firefox, Safari).
2. The core app runs without a build step. Google Fonts and optional Three.js visuals load from external CDNs and therefore require an internet connection; core recipes and game fallbacks should remain usable if those assets fail.

---

## 🎮 5 Admin-Toggleable Interactive Games

### 1. 🥘 Build-a-Dish (Pantry Rush & Recipe Simulation)
* **Step-by-Step Cooking Lab**: Observe real ingredient transformations through Base Prep, Marinade, Sizzle/Bake, and Garnish phases.
* **Timed Pantry Rush**: Tap authentic vegetarian ingredients while avoiding non-vegetarian or mismatched impostor ingredients (e.g., fish sauce, blue cheese, raw meat).
* **Cooking Technique Notes**: Each step includes practical technique guidance and sensible hot-surface safety reminders.

### 2. 🗣️ Pronunciation Challenge & Phonetic Matching
* **International Accents**: Master authentic IPA notations and phonetic syllables (`/ti.ɾaˈði.to/` -> *tee-rah-DEE-toh*).
* **Interactive Syllable Builder**: Reorder scrambled syllables into the exact sequence.
* **Audio Speech Synthesis**: Hear authentic pronunciation using the browser's built-in Web Speech API.
* **Voice Practice Mic Check**: Test your speech via the microphone for bonus XP.

### 3. 🧠 Family Tag-Team Trivia Quiz
* **10 Curated Questions**: Dive into culinary history, Indian bazaar substitutes, and food chemistry.
* **Gentle Soft Timer**: Earn bonus speed XP without any negative penalties for taking time to discuss.
* **Chef Hint Button**: Explore helpful real-world cooking and food-science hints.

### 4. 🎡 Spin the Wheel & Culinary Food Science
* **Dynamic Physics Wheel**: Spin across 6 core food chemistry concepts:
  * *Citrus Acid Denaturation* (How lime juice "cooks" ceviche)
  * *The Maillard Reaction* (The browning chemistry behind tandoor naanzas)
  * *Molecular Emulsification* (How cashew paste bonds cream and acidic tomatoes)
  * *Osmosis & Sugar Gradients* (Why gulab jamuns must be balanced in cheesecakes)
  * *Alkaline Starch Chemistry* (Why kansui makes ramen noodles bouncy)
  * *Fat-Soluble Spice Volatiles* (Why tadka in hot oil/ghee awakens spices)
* **Rapid Science Challenge**: Answer an instant food chemistry mini-question to win +50 Bonus XP!

### 5. 🥔 Hot Potato Rush
* **60-second round**: A fixed countdown is visible during both the standard arena and fullscreen arcade.
* **Round controls**: Start and replay begin a fresh 60-second session; pausing freezes the standard arena clock and resume continues from the remaining time.
* **Timed finish**: When the countdown reaches zero, gameplay stops and the final score is presented.

---

## 📖 Kitchen Lab: Replicate in India
Every fusion dish includes a full Indian kitchen adaptation:
* **Nikkei Ceviche**: King Oyster Mushrooms or Hearts of Palm + Yellow Bhavnagri chili + Roasted salted chana.
* **Tofu Tiradito**: Silken firm tofu ribbons + yellow bell pepper puree + toasted sesame oil.
* **Paneer Tikka Tacos**: Charcoal-grilled malai paneer + Makki di Roti / corn tortillas + makhani glaze + hung curd crema.
* **Paneer Tikka Quesadilla**: Amul mozzarella + tawa grilled tortillas + mint-coriander chutney.
* **Creamy Makhani Penne**: Desi plum tomato reduction + cashew paste + kasuri methi + paneer cubes.
* **Naanza (Naan Pizza)**: Garlic butter naan crust + tikka marinara + molten cheese + bell peppers.
* **Eggless Gulab Jamun Cheesecake**: Digestive biscuit crumb crust + saffron cardamom cream cheese + mini gulab jamuns.
* **Spiced Veggie Curry Ramen**: Springy ramen noodles + coconut-curry kombu broth + seared tofu + tandoori chili crisp.
* **One-Click Shopping List**: Copy ingredients directly to clipboard for your next grocery trip.

---

## 🏆 Family Leaderboard & 6-Tier Chef Rank Ladder
* **Single Adult Chef Profile**: One consistent adult difficulty across the cooking games, with no child-profile switching.
* **6 Culinary Ranks**:
  1. *Kitchen Apprentice* (0–250 XP)
  2. *Spice Explorer* (251–600 XP)
  3. *Street Food Alchemist* (601–1100 XP)
  4. *Fusion Sous Chef* (1101–1700 XP)
  5. *Executive Fusion Master* (1701–2500 XP)
  6. *Michelin Star Sorcerer* (2501+ XP)
* **Trophy Badges & Streaks**: Daily streak multipliers and personal best tracking saved automatically to the visitor's profile.

---

## Admin Controls

* Open **Tools → Admin Settings** from the site header.
* Admin sign-in is verified on the server. The session is held in a short-lived, signed, `HttpOnly`, `Secure`, `SameSite=Strict` cookie; no browser-local PIN is used.
* Configure `ADMIN_PIN` and a random `ADMIN_SESSION_SECRET` of at least 32 characters as Cloudflare Pages secrets. Admin feature/version settings are saved in D1 and loaded by every visitor.
* The **API Key Generator** issues scoped `ff_live_...` tokens for `/api/leaderboard` and `/api/feedback`. `read` keys can call GET; `read_write` and `admin` keys can call GET and POST. Only a SHA-256 token hash is stored in D1; the raw token is displayed once at creation.

## 🎨 Visual & Audio System
* **Warm Illustrated Cookbook Styling**: Tactile cream/parchment background, terracotta saffron accents, and recipe tape accents.
* **Theme Modes**: Seamless toggle between **Light Mode** (Parchment & Terracotta) and **Dark Mode** (Cast Iron Espresso & Saffron Glow).
* **Web Audio API Synthesizer**: Chimes, clicks, wheel ticks, error buzzes, and victory fanfares generated via native code (with master mute toggle 🔇).
* **Celebration Confetti**: Full-screen particle physics celebrations on game completions and tier rank-ups!

## Admin and trust notes

Production administrator credentials are Cloudflare secrets, never frontend code or browser storage. Admin sessions are signed, short-lived cookies. Generated API tokens are stored as SHA-256 hashes and should be copied securely when first displayed. Global site settings live in the shared D1 database; personal profile details, progress and theme choices remain local to each browser.

For Cloudflare Pages, add secrets from **Workers & Pages → your Pages project → Settings → Variables and Secrets**:

* `ADMIN_PIN` — the administrator PIN (use a unique, strong value).
* `ADMIN_SESSION_SECRET` — at least 32 random characters, used to sign sessions.

The project uses the `migrations/` directory for new D1 tables and cleanup operations. The deployment workflow applies migrations to the `foodfusionweb` D1 database before deploying the Pages app and API Worker.

For optional provider-backed features, configure these as Cloudflare secrets (on both Pages Functions and the standalone Worker when both hosts are used): `GEMINI_API_KEY`, `CLOUDFLARE_AI_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ELEVENLABS_API_KEY`, and optionally `ELEVENLABS_VOICE_ID`. The app sends prompts and speech text to same-origin API proxies; provider secrets are never stored in local storage or exposed in browser JavaScript.

## Hot Potato round duration

Both the native and fullscreen Hot Potato modes use a fixed 60-second round. The countdown is deadline-based rather than tied to animation-frame count, so device refresh rate does not change the session length.

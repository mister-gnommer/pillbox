# Pillbox

Fill your pillboxes without looking at your phone. The app reads out what goes into each pillbox, slowly and in Polish, while your hands are busy with the pills.

Built as a 1–2 hour recruitment assignment: voice as the interface to something health-related.

## Why this problem

Filling a weekly organiser means going back and forth between a list on a screen and a dozen blister packs. That back-and-forth causes mistakes, and it's hard for older people and their carers. Listening keeps your eyes and hands on the pills. You only touch the phone to say "again" or "next".

<!-- TODO: rejected alternatives and cuts, filled in as we go -->

## Features

### Primary (this version)

- **Pillboxes**: create, rename, delete and reorder. Names are free-form ("Morning", "Mon evening", "Mum"). Add and rename use a modal form; reorder with ↑/↓ buttons.
- **Medications**: create, edit and delete them inside a pillbox, in the order you added them. Each has a name (required) and an amount (optional), both free text (e.g. "1 tabletka", "½"), entered in a modal form. Deleting a pillbox or medication asks for confirmation.
- **Reading**: [ElevenLabs](https://elevenlabs.io) text-to-speech (`eleven_multilingual_v2`, slowed speed) reads a pillbox's contents slowly, as one recording per pillbox. Repeat replays the downloaded file without a new request.
- **Session controls**: three large icon buttons:
  - **Repeat**: read the current pillbox again from the start.
  - **Next**: go to the next pillbox, cutting playback. On the last one, it returns to the list.
  - **Stop**: stop playback, or if nothing is playing, end the session.

  A session can start from the list or from a pillbox screen. An empty pillbox shows a "no medications" warning instead of reading.
- **Your own API key**: you enter your ElevenLabs key in the app and it's stored on the device.

### Secondary (if time allows)

- Voice commands ("powtórz", "dalej", "stop").
- Audio caching across sessions.
- Medication form as a fixed list (tabletka, kapsułka, …) instead of free text.
- User-adjustable reading speed.
- Fallback to on-device speech (`expo-speech`) when ElevenLabs fails.
- "Gotowe ✓" success screen at the end of a session.
- Polish plural agreement in the spoken count ("3 leki", "5 leków") instead of "Liczba leków: 3".
- **Design**
  - Nicer loading indicator (animation or progress bar) instead of the basic spinner.

## Tech stack

- [Expo](https://expo.dev) SDK 58 with [Expo Router](https://docs.expo.dev/router/introduction), React Native and TypeScript
- ElevenLabs text-to-speech API
- `expo-secure-store` for the API key, and AsyncStorage for pillbox data. SecureStore can reject values over about 2 KB.
- React Context as the global store

The UI is in Polish. iOS and Android are both supported. Web isn't, because SecureStore has no web implementation.

## Getting started

```bash
npm install
npx expo start
```

Open the app in [Expo Go](https://expo.dev/go) on your phone. Go to settings, paste your ElevenLabs API key (the free tier works), and add your first pillbox.

## Project structure

```
src/
  app/        # Expo Router screens
  features/   # one folder per feature (pillboxes, reading, settings)
openspec/     # specs and change proposals (spec-driven development)
```

Files are split out when they earn their own place, not in advance.

## Development

```bash
npx tsc --noEmit
npm run lint
```

The decision record from the planning interview and a draft spec are in [docs/context.md](docs/context.md).

Changes are specified with [OpenSpec](https://github.com/Fission-AI/OpenSpec) before they're implemented. See `openspec/`.

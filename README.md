# 🎮 Guess Me If You Can

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg?style=flat&logo=react)](https://reactjs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Realtime-010101.svg?style=flat&logo=socketdotio)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-Modern-38bdf8.svg?style=flat&logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini API](https://img.shields.io/badge/AI-Gemini_Flash-violet.svg?style=flat&logo=google)](https://ai.google.dev/)

**Guess Me If You Can** is an ultra-polished, full-stack, real-time multiplayer and AI-powered deduction game. Think *Akinator* meets competitive quiz arena! One player (or the AI) thinks of a secret object, while other players (or you) attempt to crack the mystery using precise, tactical **Yes/No** queries under a limited question pool. 

Featuring a gorgeous cyber-neon dark aesthetic, floating physical reaction emojis, adaptive soundscapes, and comprehensive stat profiles, this is the ultimate test of lateral thinking!

---

## 🔮 Core Game Modes

### 1. 🧑 Player vs. AI (The Guesser)
*   **The AI Thinks, You Guess**: The Game Master (powered by Google's Gemini API) formulates a top-secret object within a chosen category.
*   **Logical Consistency**: Fire off custom text questions. The AI responds with absolute logical consistency with strict **Yes** or **No** replies, accompanied by witty snark.
*   **Deduction HUD**: Track your remaining queries on a beautiful, reactive, color-shifting segment meter.

### 2. 🤖 AI vs. Player (The Detective)
*   **You Think, AI Guesses**: You decide on a secret object and hold it in your mind.
*   **AI Inquisition**: The AI Detective uses dynamic machine reasoning to query you with tactful questions.
*   **Referee Duty**: Give honest **Yes** or **No** answers and see if the AI can pinpoint your thought!

### 3. 👥 Multiplayer Arena (Real-time Frenzy)
*   **Lobby System 🔑**: Host custom lobbies with private **Room Codes** and customized categories.
*   **Friend vs. Friend**: One player takes the role of the Game Master, defining the secret item and answering questions. Others compete in turn-based combat to crack the answer.
*   **Flash Reactions & Team Comms 💬**: Fire off live chats and trigger floating, bouncy graphical emojis across everyone's screens in real-time.

---

## ⚡ Key Features

*   🎯 **Strict Yes/No Gameplay**: Fully logical, high-consistency answers. No vague, confusing, or ambiguous responses.
*   🧩 **Curated Categories**: Filter the game board by **Animals 🐶**, **Objects 📦**, **Countries 🌍**, **Games 🎮**, **Movies 🎬**, **Science 🔬**, or **Random 😈**.
*   🏆 **Global Arena Rankings**: Climb the interactive live Leaderboard filtered globally, by country, or among friends.
*   🎨 **Immersive Dark Cyber UI**: Polished glassmorphism panel styling, deep midnight backgrounds, glowing cyan/purple borders, and premium typography.
*   🔊 **Futuristic Audio**: Packed with spatial synthesizers, level-up fanfares, tactile coin/tick clickers, and mute switches.
*   👤 **Identity Dossiers**: Track career wins, deduction accuracy percentage, wallet coins, and unlock glowing achievement badges.

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, HTML5 Audio Synthesizers.
*   **Backend**: Node.js, Express server, custom Bundled CommonJS build.
*   **Real-time Communication**: Socket.io for bidirectional, low-latency multiplayer messaging.
*   **Artificial Intelligence**: Google `@google/genai` TypeScript SDK (utilizing `gemini-3.5-flash` with exponential backoff & lite-model fallbacks).
*   **Data Persistence**: Structured file-based JSON DB with real-time transactional syncing.

---

## 🎮 How to Play

### As the Guesser (Cracking the AI)
1. **Initiate Match**: Select **Player vs AI**, choose your category, and set your difficulty level.
2. **Formulate Queries**: Type questions in the terminal box (e.g., *"Is it a physical object?"*, *"Can it fly?"*).
3. **Analyze**: Use the AI's "Yes" or "No" answers and snarky hints to narrow down the target.
4. **Make Your Guess**: When confident, type your guess. If correct, reap massive XP & Coins!

### As the Host (Multiplayer Duel)
1. **Forge Lobby**: Create a room, define your custom category, and set the **Secret Object** (e.g., *"Electric Guitar"*).
2. **Broadcast Code**: Share your 6-digit lobby room code with friends.
3. **Referee**: Once everyone is synchronized, start the game. You will answer your friends' questions with Yes/No/Skip.
4. **Spectate**: Watch who manages to guess your item first and takes the victory!

---

## 🚀 Installation & Local Setup

Get your own local development workspace up and running in under 2 minutes:

### Prerequisites
*   Node.js (v18+)
*   npm or yarn
*   A Gemini API Key (Optional; falls back to offline simulated mock responses seamlessly!)

### Step-by-Step

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-username/guess-me-if-you-can.git
   cd guess-me-if-you-can
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env` file in the root directory:
   ```env
   GEMINI_API_KEY=your_actual_api_key_here
   ```

4. **Boot Up the Development Server**
   ```bash
   npm run dev
   ```
   *Your terminal will boot the full-stack server on `http://localhost:3000`.*

5. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

---

## 🗺️ Future Roadmap

*   🔮 **True Akinator Guessing Engine**: Let the AI automatically guess extremely complex concepts or niche fictional characters.
*   🥊 **Ranked Competitive Matchmaking**: Queue up in automated global matchmaking to find opponents instantly.
*   📆 **Daily Challenging Anomalies**: Solve highly curated, limited-time mystery targets to unlock exclusive profile avatars.
*   📱 **Native Mobile Port**: Compile to Android & iOS app stores using Capacitor/React Native.
*   🕶️ **Rich 3D Avatars**: Custom 3D character cards and interactive particle boards.

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.

---

<p align="center">
  Made with 💜 for competitive thinkers. Think you can stump the AI? <b>Prove it.</b>
</p>

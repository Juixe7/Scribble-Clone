<div align="center">
  <img src="https://raw.githubusercontent.com/skribblio/favicon/master/favicon.ico" alt="Skribbl Clone Logo" width="80" height="80">
  <h1>🎨 Scribble Clone</h1>
  <p><strong>A Real-Time Multiplayer Drawing & Guessing Game</strong></p>
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
  [![Socket.IO](https://img.shields.io/badge/Socket.io-010101?&style=for-the-badge&logo=Socket.io&logoColor=white)](https://socket.io/)
  [![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
</div>

<br />

Scribble Clone is a highly polished, full-stack multiplayer web game inspired by the hit classic Skribbl.io. Join your friends in a private lobby or jump right into public matchmaking. One player draws a chosen word while everyone else races against the clock to guess it!

Packed with robust synchronized game loops, real-time WebSockets, and a stunning "Neo-Brutalist" user interface.

## ✨ Key Features

- **⚡ Real-Time Multiplayer:** Instant low-latency drawing synchronization and live chat using WebSocket technology (Socket.IO).
- **🌍 Public Matchmaking:** Jump straight into the action! An intelligent backend algorithm places you into the most populated public server available, seamlessly handling mid-game joiners.
- **🔒 Private Lobbies:** Host your own game with a unique invite code. The host has full control over game settings (rounds, draw time, custom word lists).
- **✏️ Advanced Canvas:** Fully featured drawing board including multiple brush sizes, vibrant color palettes, a fill bucket, undo, and clear canvas functions.
- **🧠 Smart Chat Engine:** Chat dynamically reveals hints over time. If you guess the exact word, the system automatically congratulates you and censors your message so you don't spoil it for others!
- **⚖️ Moderation:** Vote-kick implementation for public rooms (>50% majority required) and absolute kick permissions for private lobby hosts.
- **🎨 Neo-Brutalist UI:** A trendy, lively design aesthetic using stark borders, dynamic CSS animations, and vibrant accents that feel like a true modern gaming experience.

## 🛠️ Technology Stack

**Frontend**
- **Framework:** React + Vite
- **Language:** TypeScript
- **Styling:** Vanilla CSS (CSS Variables, keyframe animations, responsive media queries)
- **Networking:** Socket.IO-client

**Backend**
- **Environment:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Networking:** Socket.IO
- **State Management:** In-memory native JS objects (designed to easily scale into Redis)

## 🚀 Getting Started

Follow these instructions to run the game locally on your machine.

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v16 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YourUsername/Scribble-Clone.git
   cd Scribble-Clone
   ```

2. **Setup the Server**
   ```bash
   cd server
   npm install
   # Start the development server (runs on port 3001)
   npm run dev
   ```

3. **Setup the Client**
   Open a new terminal window:
   ```bash
   cd client
   npm install
   # Start the Vite development build
   npm run dev
   ```

4. **Play!**
   Open `http://localhost:5173` in your browser. (Open multiple tabs to simulate a multiplayer environment!)

## 🎮 How to Play

1. **Create/Join a Room:** Click **Play** to join an active public lobby, or **Create Private Room** to get an invite code for your friends.
2. **Choose a Word:** When it's your turn to draw, select one of three random words.
3. **Draw:** Use the canvas tools to draw the given word without using any letters or numbers!
4. **Guess:** Type your guesses into the chat on the right. The faster you guess the correct word, the more points you get.
5. **Win:** The player with the most points at the end of the final round wins the game.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/YourUsername/Scribble-Clone/issues).

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

# AB GAME

AB GAME is a sleek, modern Wordle-inspired puzzle game where players guess secret expressions. It features a daily challenge system, an unlimited play mode, and a beautiful, responsive dark-themed interface.

![AB GAME Preview](public/preview.png) *(Note: Add a real preview image if available)*

## ✨ Features

- **Daily Challenge**: A new unique expression every day for everyone to solve.
- **Unlimited Mode**: Play random past expressions anytime.
- **Calendar View**: Track your progress and jump back to previous days' puzzles.
- **Interactive Keyboard**: Custom on-screen keyboard with visual feedback for letter states.
- **Local Progress**: All your game history is saved locally in your browser.
- **Responsive Design**: Optimized for both desktop and mobile devices.
- **Network Hosting**: Easily share the game with your local network.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/abgame.git
   cd abgame
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the development server:
```bash
npm run dev
```
The application will be available at `http://localhost:5173`.

### Hosting on Local Network

To serve the application to your entire local network (e.g., to play on your phone or share with others in the same house):
```bash
npm run dev -- --host
```
Vite will provide a network URL (e.g., `http://192.168.1.100:5173`) that you can access from any device on the same Wi-Fi.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & Vanilla CSS
- **Icons**: [Lucide React](https://lucide.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

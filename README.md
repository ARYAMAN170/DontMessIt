# DontMessIt 🍽️💪

**DontMessIt** is a smart nutrition optimizer designed for students to extract the best possible macros from their hostel mess menu. It automatically analyzes daily menus, suggests personalized plates based on fitness goals (Bulking/Cutting), and tracks protein intake in real-time.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Vite](https://img.shields.io/badge/Vite-6-purple)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-cyan)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-green)

## ✨ Key Features

- **🎯 Smart Plate Builder**: Algorithms that automatically select the optimal combination of mess items to hit your protein targets while managing calories.
- **⚡ Dynamic Strategies**:
  - **Bulk Mode**: Prioritizes calorie density and protein maximization.
  - **Cut Mode**: Focuses on high volume, low calorie fillers, and leaner protein sources.
- **📱 Mobile-First Glassmorphism UI**: A premium, app-like experience optimized for mobile screens with smooth animations and high information density.
- **🧠 Intelligent Caching**: Powered by **TanStack Query** to minimize data usage and provide instant loading speeds even on poor hostel networks.
- **📅 Daily Menu Integration**: Fetches daily menus for different messes automatically.
- **📊 Progress Tracking**: Visual indicators for daily protein and calorie goals.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Custom Glassmorphism utilities)
- **Backend / Auth**: [Supabase](https://supabase.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Error Handling**: [React Error Boundary](https://github.com/bvaughn/react-error-boundary)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/protrack.git
   cd protrack
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 📱 Mobile Optimizations

This app is heavily optimized for mobile web (PWA-ready style):
- **Touch-optimized**: Horizontal scroll containers with snap points.
- **Performance**: Heavy use of CSS GPU accleration (`transform: translateZ(0)`) for smooth scrolling on lower-end devices.
- **Density**: Custom compact UI components to fit maximum information on small screens without clutter.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

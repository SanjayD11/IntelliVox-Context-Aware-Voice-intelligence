# IntelliVox 🎙️
### Context-Aware Voice Intelligence

![IntelliVox Banner](https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=2560&auto=format&fit=crop)

> **Experience the next generation of voice AI. Seamless, real-time, and context-aware conversations directly in your browser.**

IntelliVox is a sophisticated React-based web application that provides a fluid voice interface for AI interaction. Unlike standard chatbots, IntelliVox listens, understands, and speaks back with a personality that remembers context and adapts to you.

---

## ✨ Key Features

### 🗣️ Live Voice Conversation
- **Hands-Free Experience**: Speak naturally to the AI without typing.
- **Real-Time Streaming**: Watch the AI's response type out as it thinks – no waiting for the full block of text.
- **Adaptive TTS (Text-to-Speech)**: High-quality neural voice synthesis that reads responses aloud automatically.

### 🧠 Context-Aware Intelligence
- **Creator Memory**: Knows its origins and creator ("Sanjay Dharmarajou") and answers identity questions accurately and dynamically.
- **Smart Persistence**: Your profile, settings, and preferences are saved instantly. No loading spinners on page refresh.

### 🌍 Multi-Language Support
- **Global Conversations**: Full support for **English, Spanish, French, German, Turkish**, and more.
- **Gendered Voices**: Select between **Male** and **Female** voices for supported languages (English, Spanish, Turkish).
- **Accurate Accents**: Automatically switches voice accents based on the selected language.

### ⚡ Performance & Polish
- **Instant Previews**: See your avatar updates immediately with optimistic UI updates.
- **Captions Toggle**: Choose between a pure audio experience or read along with live transcripts.
- **Beautiful UI**: Glassmorphism design, smooth 60fps animations, and a responsive layout built with Tailwind CSS.

---

## 🛠️ Tech Stack

IntelliVox is built with a modern, type-safe stack designed for performance and scalability.

### **Frontend**
- **Framework**: [React 18](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 3](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **State**: [TanStack Query](https://tanstack.com/query/latest) + React Context

### **Backend & AI**
- **Infrastructure**: [Supabase](https://supabase.com/) (Auth, Database, Storage)
- **Serverless**: Supabase Edge Functions (Deno/TypeScript)
- **AI Model**: [Pollinations.ai](https://pollinations.ai/) (via secure proxy)
- **Realtime**: Server-Sent Events (SSE) for text streaming

---

## 🚀 Getting Started

Follow these steps to run IntelliVox locally.

### Prerequisites
- Node.js 18+ installed
- A Supabase account

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/intellivox.git
    cd intellivox
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:8080](http://localhost:8080) to view the app.

---

## 📦 Deployment

### Database & Functions
IntelliVox uses Supabase Edge Functions for secure AI communication.

1.  **Login to Supabase CLI**
    ```bash
    npx supabase login
    ```

2.  **Deploy Functions**
    ```bash
    npx supabase functions deploy chat
    ```

### Frontend
Deploy easily to Vercel, Netlify, or Request:
*   Build the project: `npm run build`
*   Upload the `dist` folder or connect your Git repository.

---

## 🛡️ Security

- **Database**: Row Level Security (RLS) policies enable secure data access.
- **API Protection**: AI Keys are hidden behind Edge Functions; the frontend never exposes secrets.
- **Authentication**: Robust email/password auth flow with email verification.

---

## 👨‍💻 Credits

**Created by Sanjay Dharmarajou**
*Lead Developer & Architect*

Built with ❤️ using the best of open-source technology.

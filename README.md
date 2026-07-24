# 🚀 NexusAI – Full-Stack Generative AI Chat Application

<p align="center">

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-Visit_NexusAI-blue?style=for-the-badge)](https://nexus-ai-six-mauve.vercel.app/)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=for-the-badge&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css)
![Groq API](https://img.shields.io/badge/Groq_API-LLM-F55036?style=for-the-badge)

</p>

---

## 📖 Overview

**NexusAI** is a modern **full-stack Generative AI chat application** built using the **MERN Stack**. It delivers real-time AI conversations through the **Groq API** with streaming responses, supports multiple LLMs, and provides a clean ChatGPT-inspired user experience.

The project focuses on scalable backend architecture, secure authentication, efficient state management, and an intuitive UI for seamless AI interactions.

---

# ✨ Features

### 🤖 AI Chat Experience

- ⚡ Real-time AI response streaming using **Server-Sent Events (SSE)**
- 🧠 Switch between multiple AI models (Llama 3.3 70B & GPT-OSS)
- 💬 ChatGPT-inspired conversational interface
- 🎙️ Voice-to-text input using the **Web Speech API**

### 🔐 Authentication & Security

- JWT-based user authentication
- Password hashing with **bcrypt**
- Protected API routes using Express middleware
- Secure backend configuration with CORS & Helmet

### 💾 Chat Management

- Create and manage multiple chat sessions
- Persistent conversation history using MongoDB
- Automatic session management
- Cascading deletion of associated messages

### 🎨 User Experience

- Beautiful Markdown rendering
- VS Code-style syntax highlighting for code blocks
- Copy messages with one click
- Download complete conversations as Markdown (`.md`)
- Responsive design for desktop and mobile

### ⚙️ Performance

- Zustand state management with LocalStorage persistence
- Optimized API communication using Axios & Fetch
- Fast frontend powered by **Vite**

---

# 🛠️ Tech Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| React.js (Vite) | Frontend Framework |
| Tailwind CSS | Styling |
| React Router DOM | Routing |
| Zustand | State Management |
| Axios | API Requests |
| React Markdown | Markdown Rendering |
| React Syntax Highlighter | Code Highlighting |
| React Hot Toast | Notifications |
| Lucide React | Icons |

---

## Backend

| Technology | Purpose |
|------------|---------|
| Node.js | Runtime |
| Express.js | REST API |
| MongoDB Atlas | Database |
| Mongoose | ODM |
| Groq SDK | AI Integration |
| JWT | Authentication |
| bcryptjs | Password Hashing |
| Helmet | Security |
| CORS | Cross-Origin Requests |

---

# 🚀 Live Demo

| Service | Deployment |
|---------|------------|
| 🌐 Frontend | https://nexus-ai-six-mauve.vercel.app |
| ⚙️ Backend | Render |

---

# 💻 Local Installation

Follow these steps to run **NexusAI** locally.

---

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/AmarMultiverse/NexusAI.git
cd NexusAI
```

---

## 2️⃣ Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the backend folder:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
GROQ_API_KEY=your_groq_api_key
```

Start the backend server:

```bash
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

---

## 3️⃣ Frontend Setup

Open a new terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# 📂 Project Structure

```text
NexusAI/
│
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── store/
│   │   ├── hooks/
│   │   └── assets/
│   └── vite.config.js
│
└── README.md
```

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push the branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

# ⭐ Support

If you found this project useful, consider giving it a **⭐ Star** on GitHub.

It motivates future improvements and helps others discover the project.

---

<p align="center">
Made with ❤️ by <b>Amar Kumar</b>
</p>

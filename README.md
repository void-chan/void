# void.chan

> Anonymous imageboard & discussion platform. No email. No tracking. No noise.

---

## What is this

void.chan is a privacy-first anonymous board. You can read, browse and chat without creating an account. If you want to send a message to admin or get a persistent identity, you register with just a username and password — no email required.

Account recovery works like a crypto wallet: you get a **12-word recovery phrase** on registration. Lose it, lose access. Simple.

---

## Features

- **No email registration** — username + password only
- **12-word recovery phrase** — crypto-wallet style account recovery
- **Anonymous chat** — public room, resets every hour, no logs kept
- **Admin blog** — transmissions from the operator
- **Zero tracking** — no analytics, no cookies beyond auth

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | SQLite |
| Auth | JWT (HTTP-only cookies) + bcrypt |
| Hosting | Railway (backend) + Vercel (frontend) |

---

## Running locally

**Backend**
```bash
cd backend
cp .env.example .env     # fill in values
npm install
npm run db:seed          # create admin account
npm start
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Backend runs on `http://localhost:4000`
Frontend runs on `http://localhost:5173`

---

## License

Do whatever you want with it.

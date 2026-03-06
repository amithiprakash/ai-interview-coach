# AI-Powered Interview Assistant

Interactive, browser-first interview simulator built with **React + TypeScript + Vite**. Candidates practice a timed, full-stack interview while interviewers monitor real-time analytics, review transcripts, and manage leaderboard rankings. All data persists in the browser so sessions survive refreshes, accidental closes, and device sleep.

<img width="1905" height="891" alt="image" src="https://github.com/user-attachments/assets/7dd22007-0b9d-4be7-a34f-357ce4293510" />

<img width="1874" height="868" alt="image" src="https://github.com/user-attachments/assets/236641a5-3d8b-4a5f-b6e7-80931d15c4dd" />

<img width="1845" height="887" alt="image" src="https://github.com/user-attachments/assets/5c36e98c-c5e7-4a65-8bb2-179877835dd6" />

<img width="1879" height="865" alt="image" src="https://github.com/user-attachments/assets/df21f9f5-084e-4206-8f5c-8ef13244aa3f" />

<img width="1875" height="878" alt="image" src="https://github.com/user-attachments/assets/b4ad87d0-86cc-450f-a1ba-e6adfa610054" />



## ✨ Features

- **Resume intake** – drag-and-drop PDF/DOCX, client-side parsing (PDF.js + Mammoth) with smart extraction of name, email, and phone.
- **Profile completion flow** – conversational prompts request any missing contact fields before the interview starts.
- **AI-driven questions** – integrates with **Google Gemini 1.5 Pro** to generate six progressive questions (2 easy → 2 medium → 2 hard) for React/Node roles. Automatic local fallback question bank if the API is unavailable.
- **Timed chat interview** – single-question focus, difficulty-based timers, auto-submit on timeout, and friendly assistant feedback after every answer.
- **Scoring & summary** – heuristic scoring engine evaluates coverage, depth, and keyword alignment, then produces a concise AI summary.
- **Interviewer dashboard** – sortable/searchable candidate table, detailed drawer with profile, chat history, and full transcript (questions, answers, scores, feedback).
- **Persistence + welcome-back modal** – full Redux state stored via `redux-persist`. Returning users are greeted with a resume modal to continue or restart.

## 🧱 Architecture overview

| Layer | Responsibilities |
| --- | --- |
| `src/app` | Redux store, typed hooks, persistence bootstrap. |
| `src/features/candidates` | Slices, selectors, and thunks orchestrating resume ingestion, question flow, timers, scoring, and summaries. |
| `src/features/interviewee` | Interview chat experience + resume upload UI. |
| `src/features/interviewer` | Dashboard, filtering, drawer detail views. |
| `src/components` | Shared UI (chat log, timers, modals, upload card). |
| `src/services/gemini.ts` | Google Generative AI client with automatic fallback. |
| `src/utils` | Resume parsing, question bank, scoring heuristics. |

State is normalized in Redux (`candidatesSlice`, `uiSlice`) and persisted to `localStorage`. Timers are stored as serializable metadata so interviews can pause/resume without drift.

## 🚀 Getting started

> **Prerequisites**
>
> - Node.js **20.19.0+** (Vite 7 requirement – upgrade if you see an engine warning)
> - npm 10+

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create an `.env.local` file in the project root and add your Gemini API key:

   ```env
   VITE_GEMINI_API_KEY=your_google_generative_ai_key
   ```

   The key must have access to the Google Generative Language API. Since this runs fully client-side, rotate the key periodically or use domain restrictions when deploying.

3. Start the dev server:

   ```powershell
   npm run dev
   ```

   Visit http://localhost:5173.

4. Build for production:

   ```powershell
   npm run build
   ```

5. Optional lint check:

   ```powershell
   npm run lint
   ```

## 🧭 Interview flow

1. **Upload resume** → automatic parsing & extraction.
2. **Fill missing details** → assistant asks for name/email/phone if absent or invalid.
3. **Start interview** → six AI-generated questions delivered in order of increasing difficulty. Timers auto-submit responses.
4. **Per-question feedback** → assistant shares reasoning, keyword coverage, and pacing advice.
5. **Completion summary** → final score (0–100), strengths, areas to improve, and executive remark.
6. **Dashboard sync** → interviewer tab updates instantly with new candidate, transcript, and analytics.

## 🔐 Gemini usage & fallbacks

- API access flows through `@google/generative-ai` using the `gemini-pro` model.
- Responses are requested in JSON and normalized before hitting the store.
- If the API key is missing, invalid, or times out, the app gracefully falls back to a curated local question bank.

## 🧪 Testing & validation

- `npm run build` — TypeScript project references + Vite production bundle (used for verification in this submission).
- `npm run lint` — ESLint with the default Vite/React rules (optional but recommended before shipping).

## 🌐 Deployment checklist

1. Build the app (`npm run build`).
2. Deploy the `dist/` folder to Netlify, Vercel, or any static host.
3. Set the `VITE_GEMINI_API_KEY` environment variable in your hosting provider.
4. Record a 2–5 minute walkthrough video covering both tabs and the resume persistence flow.
5. Share the GitHub repo + live demo + video link via the Swipe submission form.

## ☁️ Deploying on Render

Render can host the bundled Vite output as a **Static Site** while running the build for you. After pushing your latest changes to GitHub:

1. Sign in to [render.com](https://render.com) and click **New ➜ Static Site**.
2. Connect the GitHub repository that contains this project and select the default branch you want Render to deploy from.
3. Configure the build settings:
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `dist`
   - **Node Version:** set an environment variable `NODE_VERSION=20.19.0` (Render reads this and installs the matching runtime required by Vite 7).
4. In the **Environment Variables** section, add your Gemini key:
   - `VITE_GEMINI_API_KEY=your_google_generative_ai_key`
5. Click **Create Static Site** and wait for the initial deploy to finish. Render will automatically run the build, upload the `dist/` directory, and serve it over HTTPS.
6. (Optional) Enable **Auto-Deploy** so every push to the selected branch triggers a new build. You can also add protected preview environments by creating additional Static Sites from feature branches.

Once deployed, visit the Render-provided URL to verify the interviewee and interviewer flows, and capture your submission demo from the hosted instance.

## 📂 Project tree (excerpt)

```
src/
├── app/
│   ├── hooks.ts
│   └── store.ts
├── components/
│   ├── ChatMessages.tsx
│   ├── QuestionTimer.tsx
│   ├── ResumeUploadCard.tsx
│   └── WelcomeBackModal.tsx
├── features/
│   ├── candidates/
│   │   ├── candidatesSlice.ts
│   │   ├── selectors.ts
│   │   └── thunks.ts
│   ├── interviewee/IntervieweeView.tsx
│   └── interviewer/InterviewerView.tsx
├── services/gemini.ts
├── utils/
│   ├── questionBank.ts
│   ├── resumeParser.ts
│   └── scoring.ts
└── types/index.ts
```

## 🙌 Credits
Sumit Ranjan 



# 🤱 Mumzworld Companion

A personalized parenting OS built as a technical assessment for Mumzworld. The product reorganizes itself around each user's exact week of pregnancy or child's age, their language preference, budget, and city — every time they return, it picks up exactly where they left off.

---

## ✨ Features

The app is organized into 9 modules:

| Module | Description |
|--------|-------------|
| **Profile & Journey Setup** | Onboarding wizard with due date / child DOBs, language, budget, and city. Supports multiple children simultaneously. |
| **This Week Dashboard** | Auto-calculates current week on every visit. Hero card with developmental milestone, progress ring, and quick-action strip. |
| **AI Lifecycle Feed** | Week-by-week AI agent feed showing current week ± context window. Expandable cards with milestone → product reasoning. |
| **Smart Product Recommendations** | Filtered by week, budget, and save history. Confidence badges, wishlist, purchase tracking, and WhatsApp-shareable cards. |
| **Checklist Engine** | AI-generated stage-aware checklists (Hospital Bag, Nursery Setup, Baby-Proofing, etc.) that auto-activate at the right week. |
| **Ask the Companion** | Persistent AI chat grounded in the user's profile. Bilingual, cites sources, and always defers medical questions to a doctor. |
| **Notifications & Nudges** | In-app notification center for week changes, checklist reminders, and product resurfaces. |
| **Bilingual Everything** | Full English / Arabic toggle with RTL layout, Noto Sans Arabic font, and Arabic-Indic numerals. |
| **Onboarding & Empty States** | 4-step onboarding, guest mode, AI-generated empty-state hints, and stage celebration moments. |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| UI Components | Radix UI + `class-variance-authority` |
| Icons | Lucide React |
| AI / LLM | OpenAI API (`openai` SDK) |
| Validation | Zod |
| Embeddings | Custom script (`scripts/build-embeddings.ts`) |
| Evals | Vitest + custom eval runner (`scripts/run-evals.ts`) |
| Deployment | Netlify (via `@netlify/plugin-nextjs`) |

---

## 📁 Project Structure

```
.
├── data/               # Raw milestone, product, and checklist data
├── evals/              # Evaluation test cases for AI outputs
├── scripts/
│   ├── build-embeddings.ts   # Generates vector embeddings from data
│   └── run-evals.ts          # Runs evals against the AI agent
├── src/                # Next.js app source (pages, components, API routes)
├── .env.example        # Environment variable template
├── netlify.toml        # Netlify deployment config
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- An OpenAI API key

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Twist-Turn/MumzWorld-Assessment-Dinesh.git
cd MumzWorld-Assessment-Dinesh

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Add your OpenAI API key to .env.local
```

### Environment Variables

```env
OPENAI_API_KEY=sk-your-api-key-here
```

### Running Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building Embeddings

Before running the app for the first time, generate the vector embeddings from the data files:

```bash
npm run embed
```

### Running Evals

To evaluate AI output quality against the test suite:

```bash
npm run eval
```

### Other Commands

```bash
npm run build       # Production build
npm run start       # Start production server
npm run lint        # Lint the codebase
npm run typecheck   # TypeScript type checking
```

---

## 🌍 Deployment

This project is configured for deployment on **Netlify** using the Next.js plugin. Push to your connected branch and Netlify handles the rest via `netlify.toml`.

---

## 🗺 Product Vision

The full product vision — "Mumzworld Companion" — is a personalized parenting OS designed for mothers in the GCC region. Key design principles:

- **Profile-first**: She sets up once; the entire product reorganizes around her exact week and children.
- **Bilingual by default**: Full Arabic/English parity with RTL layout support.
- **GCC-aware**: AED/SAR currency, city-based localization, WhatsApp sharing as a first-class feature.
- **AI grounded in safety**: The companion never diagnoses — it always defers medical questions to a doctor and cites its sources.

---

## 🗂 Class Diagram

The core domain model showing all entities and their relationships.

```mermaid
classDiagram
    direction TB

    class UserProfile {
        +string id
        +string name
        +string email
        +string language
        +string city
        +number budgetTotal
        +string dueDate
        +string[] childDOBs
    }

    class Journey {
        +string id
        +string userId
        +string type
        +Date startDate
        +getCurrentWeek() number
        +getStage() string
    }

    class Milestone {
        +number week
        +string summary_en
        +string summary_ar
        +string snapshot_en
        +string snapshot_ar
        +string[] tags
    }

    class Product {
        +string id
        +string name
        +string category
        +number price
        +string currency
        +number week
        +string relevance
        +string reasoningHint
    }

    class SavedProduct {
        +string userId
        +string productId
        +boolean purchased
        +Date savedAt
    }

    class Checklist {
        +string id
        +string name
        +number activationWeek
        +string stage
        +getProgress() number
    }

    class ChecklistItem {
        +string id
        +string checklistId
        +string text
        +boolean checked
        +string productId
    }

    class BudgetTracker {
        +string userId
        +number total
        +number spent
        +Map categoryBreakdown
        +addSpend(category, amount) void
        +getInsight() string
    }

    class JournalEntry {
        +string id
        +string userId
        +number week
        +string text
        +string photoUrl
        +Date createdAt
    }

    class Notification {
        +string id
        +string userId
        +string type
        +string message
        +boolean dismissed
        +Date createdAt
    }

    class ChatMessage {
        +string id
        +string userId
        +string role
        +string content
        +string language
        +string citedSource
        +Date timestamp
    }

    class AICompanion {
        +UserProfile profile
        +Journey journey
        +ask(query) Promise~string~
        +getWeekFeed() Promise~Milestone[]~
        +recommendProducts() Promise~Product[]~
        +generateChecklist(stage) Promise~Checklist~
        +getBudgetInsight() Promise~string~
    }

    class EmbeddingStore {
        +buildEmbeddings(data) void
        +similaritySearch(query, k) Result[]
    }

    UserProfile "1" --> "1..*" Journey : has
    Journey "1" --> "1" Milestone : resolves to
    Milestone "1" --> "0..*" Product : surfaces
    UserProfile "1" --> "0..*" SavedProduct : saves
    SavedProduct "0..*" --> "1" Product : references
    UserProfile "1" --> "0..*" Checklist : owns
    Checklist "1" --> "1..*" ChecklistItem : contains
    ChecklistItem "0..1" --> "0..1" Product : links to
    UserProfile "1" --> "1" BudgetTracker : tracks
    SavedProduct --> BudgetTracker : updates
    UserProfile "1" --> "0..*" JournalEntry : writes
    UserProfile "1" --> "0..*" Notification : receives
    UserProfile "1" --> "0..*" ChatMessage : exchanges
    AICompanion --> UserProfile : grounded in
    AICompanion --> Journey : reads
    AICompanion --> EmbeddingStore : retrieves context
    AICompanion --> ChatMessage : persists
```

---

## 🔁 Sequence Diagrams

### 1 — Dashboard Load

What happens when a user opens the app and the weekly dashboard renders.

```mermaid
sequenceDiagram
    actor User
    participant UI as Next.js UI
    participant API as /api/feed
    participant AI as OpenAI API
    participant DB as Supabase

    User->>UI: Open app / navigate to dashboard
    UI->>DB: Fetch UserProfile + Journey
    DB-->>UI: Profile data (dueDate, language, budget)
    UI->>UI: Auto-calculate current week from dueDate
    UI->>API: GET /api/feed?week=28&lang=en&userId=xxx
    API->>DB: Fetch milestone record for week 28
    DB-->>API: Raw milestone data
    API->>AI: Prompt — generate week snapshot + product rationale (grounded in milestone data)
    AI-->>API: Generated snapshot + reasoning text
    API->>DB: Cache generated content
    API-->>UI: Week card payload (milestone, products, reasoning)
    UI-->>User: Render hero card, progress ring, product strip
```

---

### 2 — AI Companion Chat

What happens when the user asks the AI companion a question.

```mermaid
sequenceDiagram
    actor User
    participant Chat as Chat UI
    participant API as /api/chat
    participant Embed as EmbeddingStore
    participant AI as OpenAI API
    participant DB as Supabase

    User->>Chat: "Is this nursing pillow safe for week 30?"
    Chat->>API: POST /api/chat {message, userId, history[]}
    API->>DB: Fetch UserProfile (week, children, budget, language)
    DB-->>API: Profile context
    API->>Embed: Similarity search — query against milestone + product embeddings
    Embed-->>API: Top-k relevant chunks with source references
    API->>AI: System prompt (profile + safety rules) + retrieved context + conversation history + user message
    AI-->>API: Grounded answer with cited source, defers if medical
    API->>DB: Persist user message + assistant reply to chat history
    API-->>Chat: {response, citedSource, language}
    Chat-->>User: Display reply with source badge (EN / AR)
```

---

### 3 — Smart Product Recommendation

How the app resurfaces a product the user saved weeks ago at exactly the right moment.

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard / Feed UI
    participant API as /api/recommendations
    participant AI as OpenAI API
    participant DB as Supabase

    Note over UI: User reaches week 34 (new session)
    UI->>DB: Fetch SavedProducts for userId
    DB-->>UI: [nursing pillow — saved at week 20, not purchased]
    UI->>API: POST /api/recommendations {userId, week=34, savedProducts}
    API->>DB: Fetch products relevant to week 34 + user budget
    DB-->>API: Candidate product list
    API->>AI: Rank candidates + identify resurface candidates from saved list
    AI-->>API: Ranked list with confidence badges + resurface flag
    API-->>UI: Recommendations payload
    UI-->>User: "You saved this at week 20 — you'll need it soon 🔔" card
```

---

### 4 — Checklist Auto-Activation

How a stage-specific checklist activates when the user crosses a milestone week.

```mermaid
sequenceDiagram
    actor User
    participant UI as UI
    participant API as /api/checklists
    participant AI as OpenAI API
    participant DB as Supabase
    participant Notif as Notification Service

    Note over UI: Week advances to 35 (detected on login)
    UI->>API: GET /api/checklists?userId=xxx&week=35
    API->>DB: Query checklists WHERE activationWeek <= 35 AND userId
    DB-->>API: Hospital Bag checklist not yet active for this user
    API->>AI: Generate Hospital Bag checklist items tailored to profile
    AI-->>API: 24 personalised checklist items
    API->>DB: Create Checklist + ChecklistItems records
    API->>Notif: Emit notification — "Hospital Bag checklist is now active"
    Notif->>DB: Persist notification record
    API-->>UI: Activated checklist payload
    UI-->>User: New checklist card appears + bell notification
```

---

## 📄 License

This project was built as a technical assessment and is not intended for production use.

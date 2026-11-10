# Smart Mailbox – Landing Page & Demo

The official landing page and interactive web demo for the **Smart Mailbox** project in the *ICT Business Management* module.

---

### Visit the live website
Open the published version here:

👉 **[ictsmartmailbox.vercel.app](https://ictsmartmailbox.vercel.app)** 👈

### GitHub repository
👉 **[github.com/alimosahamod/ICT_SmartMailbox](https://github.com/alimosahamod/ICT_SmartMailbox)**

---

## Week 10 documents (Participant Brief & Researcher Guide)

The requested documents are in the [`docs/week10`](docs/week10) folder:

- [Participant Brief – Resident](docs/week10/01_Participant_Brief_Resident.docx)
- [Participant Brief – Caretaker](docs/week10/01_Participant_Brief_Caretaker.docx)
- [Researcher Guide](docs/week10/02_Researcher_Guide.docx)

---

## About the project

Smart Mailbox is a weatherproof sensor with a connected app. It sends notifications when letters or packages arrive, gives neighbors time-limited access to the mailbox, and helps building managers record large packages in secure storage rooms.

### Landing page features:
- **Hero section and value proposition**: An overview of the main benefits for tenants and building managers.
- **Interactive demo (`demo.html`)**: A simulation of the Smart Mailbox workflow and user interface.
- **How it works and specifications**: Technical details, battery life, connectivity, and sensors.
- **FAQ and ROI calculator**: Answers to common questions and the benefits for residential buildings.

---

## Project structure

```plaintext
landingpageV2/
├── index.html       # Main landing page
├── demo.html        # Interactive demo page
├── css/             # Stylesheets (tokens.css, landing.css, demo.css)
├── js/              # JavaScript files (landing.js, demo.js)
├── assets/          # Images, graphics, and icons
├── docs/            # Project documents
│   └── week10/      # Participant Briefs and Researcher Guide
└── README.md        # Project documentation
```

---

## 🚀 Run locally

This is a static web application, so you can run it without complex build steps:

1. **Clone or download the repository**
2. **Start a local server** (for example, with Python, Node.js, or VS Code Live Server):

```bash
# With Python 3:
python3 -m http.server 8000
```

3. Open `http://localhost:8000` in your browser. You can also open `index.html` directly by double-clicking it.

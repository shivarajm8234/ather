# 🏍️ Ather Voice Intelligence

A multilingual AI-powered voice agent for Ather Energy, built on **Asterisk PBX** with **Sarvam AI** for Speech-to-Text, LLM, and Text-to-Speech — all in Indian languages.

![Architecture](https://img.shields.io/badge/Architecture-Asterisk%20%2B%20Sarvam%20AI-blueviolet?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-English%20%7C%20Kannada%20%7C%20Hindi-green?style=for-the-badge)
![Telegram](https://img.shields.io/badge/Knowledge%20Update-Telegram%20Bot-blue?style=for-the-badge)

---

## 🎯 What This Does

1. **Customer calls 3000** on a SIP phone
2. **IVR Menu**: Press 1 (English), 2 (Kannada), 3 (Hindi)
3. **AI listens** (Sarvam STT → `saarika:v2.5`)
4. **AI thinks** using a **Knowledge Graph** + Sarvam LLM (`sarvam-105b`)
5. **AI speaks** the answer back (Sarvam TTS → `bulbul:v3`)
6. **Knowledge is updated live** via a Telegram bot

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  SIP Phone   │────▶│   Asterisk   │────▶│ voice_agent  │
│  (PortSIP)   │◀────│   PBX        │◀────│   .py (AGI)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                     ┌────────────────────────────┼────────────────┐
                     │                            │                │
              ┌──────▼──────┐  ┌─────────────▼──────┐  ┌──────▼──────┐
              │ Sarvam STT  │  │   Sarvam LLM       │  │ Sarvam TTS  │
              │ saarika:v2.5│  │   sarvam-105b       │  │ bulbul:v3   │
              └─────────────┘  │ + knowledge_graph   │  └─────────────┘
                               └─────────────────────┘
                                          ▲
                               ┌──────────┴──────────┐
                               │   Telegram Bot       │
                               │  (Live KG Updates)   │
                               └──────────────────────┘
```

---

## 📁 Project Structure

```
ather/
├── voice_agent.py          # Main AGI script (STT → LLM → TTS)
├── telegram_bot.py         # Telegram bot for live knowledge updates
├── knowledge_graph.json    # AI's brain — editable via Telegram
├── start.sh                # One-command startup script
├── extensions.conf         # Asterisk dialplan config
├── pjsip.conf              # SIP endpoint config
├── requirements.txt        # Python dependencies
├── .env.example            # Template for API keys
└── dashboard/
    ├── index.html          # Web dashboard
    ├── style.css           # Dashboard styles
    └── script.js           # Dashboard logic
```

---

## 🚀 Quick Start

### Prerequisites
- Ubuntu/Debian Linux
- Asterisk PBX installed (`sudo apt install asterisk`)
- Python 3.10+
- Sarvam AI API key ([sarvam.ai](https://sarvam.ai))
- Telegram Bot Token (from [@BotFather](https://t.me/BotFather))

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/shivarajm8234/ather.git
cd ather

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure API keys
cp .env.example .env
# Edit .env and add your SARVAM_API_KEY and TELEGRAM_BOT_TOKEN

# 4. Start everything
chmod +x start.sh
./start.sh
```

### What `start.sh` does:
- ✅ Deploys `voice_agent.py` to Asterisk AGI directory
- ✅ Copies Asterisk configs (`extensions.conf`, `pjsip.conf`)
- ✅ Starts the Telegram Knowledge Bot in background
- ✅ Starts the Web Dashboard on port 8000

---

## 📞 Usage

### Voice Agent
1. Register a SIP phone (e.g., PortSIP) to your Asterisk server
2. Dial **3000**
3. Choose your language (1/2/3)
4. Ask about Ather products — the AI answers using the knowledge graph!

### Telegram Bot
Send messages to your bot to update the AI's knowledge in real-time:
- `"Ather 450X price is now 1.5 Lakhs"` → Updates price in knowledge graph
- `/view` → See current knowledge graph
- `/logs` → See last 5 messages

### Dashboard
Open `http://localhost:8000` to see the system status.

---

## 🧠 Knowledge Graph

The file `knowledge_graph.json` is the AI's brain. It contains structured data about:
- **Business Info**: Name, location, timings
- **Products**: Models, prices, range, colors, discounts
- **FAQ**: Charging time, warranty

Update it via:
1. **Telegram Bot** — Send a message, AI merges it automatically
2. **Manual Edit** — Edit the JSON file directly

---

## 🌐 Supported Languages

| Language | Code  | STT | LLM | TTS |
|----------|-------|-----|-----|-----|
| English  | en-IN | ✅  | ✅  | ✅  |
| Kannada  | kn-IN | ✅  | ✅  | ✅  |
| Hindi    | hi-IN | ✅  | ✅  | ✅  |

---

## 🔧 API Stack

| Component | Service | Model |
|-----------|---------|-------|
| Speech-to-Text | Sarvam AI | `saarika:v2.5` |
| LLM (Brain) | Sarvam AI | `sarvam-105b` |
| Text-to-Speech | Sarvam AI | `bulbul:v3` |
| Knowledge Update | Sarvam AI | `sarvam-105b` |

---

## 📄 License

MIT License — feel free to use and modify.

---

## 👤 Author

**Shivaraj M**
- GitHub: [@shivarajm8234](https://github.com/shivarajm8234)

# 🏍️ Ather Intelligence Hub

An enterprise-grade, multilingual AI ecosystem for Ather Energy. This suite combines a **Multilingual Voice Agent**, a **Proactive Service Outreach Engine**, and a **Real-time Management Dashboard** to automate sales, service, and customer feedback.

![Architecture](https://img.shields.io/badge/Architecture-Asterisk%20%2B%20Sarvam%20AI%20%2B%20React-blueviolet?style=for-the-badge)
![Languages](https://img.shields.io/badge/Languages-English%20%7C%20Kannada%20%7C%20Hindi-green?style=for-the-badge)
![Security](https://img.shields.io/badge/Security-2FA%20Admin%20Login-red?style=for-the-badge)

---

## 🎯 Core Capabilities

### 1. Multilingual Voice AI (Inbound)
*   **Customer Calls**: Dial **3000** on any SIP phone.
*   **IVR Navigation**: Multilingual greeting with language selection (English, Kannada, Hindi).
*   **Cognitive Reasoning**: Uses **Sarvam LLM** (`sarvam-105b`) integrated with a **Knowledge Graph** to answer complex queries about Ather products, pricing, and service.
*   **Native Speech**: STT via `saarika:v2.5` and TTS via `bulbul:v3` for natural Indian language interactions.

### 2. Proactive Service Outreach (Outbound)
*   **Autonomous Follow-ups**: Automatically identifies customers due for service (5k/10k km intervals).
*   **Dynamic Engagement**: Simulates/executes outreach calls to schedule appointments.
*   **Lead Recovery**: Tracks "Not Reachable" or "Switched Off" status for automated retries.

### 3. Enterprise Admin Dashboard
*   **Real-time Monitoring**: Live tracking of call logs, customer leads, and service bookings.
*   **Feedback Analytics**: Aggregates customer feedback for service quality improvements.
*   **Staff Management**: Digital persona management for AI agents.
*   **Security**: Professional 2FA authentication for administrative access.

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│  SIP Phone   │────▶│   Asterisk   │────▶│  voice_agent.py  │
│  (Inbound)   │◀────│     PBX      │◀────│      (AGI)       │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
┌──────────────┐     ┌──────────────┐     ┌────────▼─────────┐
│  Customer    │◀────│ Proactive    │◀────│  Retail Utils    │
│  (Outreach)  │     │ Agent        │     │  (Logic Layer)   │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
┌──────────────┐     ┌──────────────┐     ┌────────▼─────────┐
│  Telegram    │────▶│ Knowledge    │────▶│  knowledge_graph │
│  Update Bot  │◀────│ Management   │◀────│      .json       │
└──────────────┘     └──────────────┘     └────────┬─────────┘
                                                   │
┌──────────────┐     ┌──────────────┐     ┌────────▼─────────┐
│  React/Vite  │────▶│  Flask/HTTP  │────▶│  Data Persistence│
│  Dashboard   │◀────│  API Server  │◀────│ (Leads/Service)  │
└──────────────┘     └──────────────┘     └──────────────────┘
```

---

## 📁 Project Structure

```
ather/
├── voice_agent.py          # Main Inbound AGI script
├── proactive_agent.py      # Outbound service outreach agent
├── server.py               # Flask-based API backend & Dashboard host
├── telegram_bot.py         # Knowledge update bot
├── retail_agent_utils.py   # Business logic & data management
├── knowledge_graph.json    # AI's dynamic brain
├── dashboard-new/          # Modern React/Vite Admin UI
├── dashboard/              # Legacy/Simple Admin UI
├── leads.json              # CRM for sales leads
├── service_records.json    # Maintenance & service database
├── feedback.json           # Customer feedback storage
├── .env                    # API Keys & Secrets
└── start.sh                # Unified system startup script
```

---

## 🚀 Getting Started

### Prerequisites
- **OS**: Ubuntu/Debian
- **System**: Asterisk PBX (`sudo apt install asterisk`)
- **Python**: 3.10+
- **API Keys**: Sarvam AI, Telegram Bot Token

### Installation & Launch

```bash
# 1. Clone & Enter
git clone https://github.com/shivarajm8234/ather.git
cd ather

# 2. Setup Environment
cp .env.example .env
# Add SARVAM_API_KEY and TELEGRAM_BOT_TOKEN to .env

# 3. Unified Startup
chmod +x start.sh
./start.sh
```

### What `start.sh` handles:
- ✅ **AGI Deployment**: Moves voice scripts to `/var/lib/asterisk/agi-bin/`.
- ✅ **PBX Config**: Synchronizes `extensions.conf` and `pjsip.conf`.
- ✅ **Service Agents**: Launches Telegram Bot and Proactive Outreach Agent.
- ✅ **Admin Hub**: Starts the Flask API server and Dashboard on Port 8001.

---

## 📞 Key Workflows

### Dynamic Knowledge Updates
Send natural language messages to the **Telegram Bot** (e.g., *"Ather 450S price is now 1.3L"*). The bot uses Sarvam LLM to parse and merge the new information into the `knowledge_graph.json` instantly.

### Proactive Scheduling
The `proactive_agent.py` monitors `service_records.json`. If a vehicle is due for service, it initiates an outreach flow, tracking success or failure in the sales pipeline.

### Admin Dashboard
Access `http://localhost:8001` for the full enterprise suite:
- **Login**: `admin` / `ather123`
- **2FA**: Default `123456` (or scan QR if configured via `setup_auth.py`).

---

## 📄 License
MIT License.

## 👤 Maintainer
**Shivaraj M** - [@shivarajm8234](https://github.com/shivarajm8234)

import os
import telebot
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

# Load credentials
ENV_PATH = "/home/satoru/Desktop/ds/.env"
load_dotenv(ENV_PATH)
TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")

if not TOKEN:
    print("ERROR: TELEGRAM_BOT_TOKEN not found in .env")
    exit(1)

bot = telebot.TeleBot(TOKEN)
KG_PATH = "/home/satoru/Desktop/ds/knowledge_graph.json"
MSG_LOG_PATH = "/home/satoru/Desktop/ds/telegram_messages.json"

def get_current_kg():
    with open(KG_PATH, "r") as f:
        return json.load(f)

def save_kg(data):
    with open(KG_PATH, "w") as f:
        json.dump(data, f, indent=4)
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Knowledge Graph saved.")

def log_message(user, text, status):
    """Store EVERY message to telegram_messages.json"""
    try:
        if os.path.exists(MSG_LOG_PATH):
            with open(MSG_LOG_PATH, "r") as f:
                logs = json.load(f)
        else:
            logs = []
        
        logs.append({
            "timestamp": datetime.now().isoformat(),
            "user": user,
            "message": text,
            "status": status
        })
        
        with open(MSG_LOG_PATH, "w") as f:
            json.dump(logs, f, indent=4)
    except Exception as e:
        print(f"WARNING: Could not log message: {e}")

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "🚀 Ather Knowledge Bot Active!\n\nCommands:\n/view - See current knowledge graph\n/logs - See all stored messages\n\nJust send any text to update the knowledge!")

@bot.message_handler(commands=['view'])
def view_knowledge(message):
    kg = get_current_kg()
    text = json.dumps(kg, indent=2)
    # Telegram has a 4096 char limit
    if len(text) > 3800:
        bot.reply_to(message, f"Knowledge Graph (truncated):\n```json\n{text[:3800]}\n```", parse_mode="Markdown")
    else:
        bot.reply_to(message, f"Current Knowledge Graph:\n```json\n{text}\n```", parse_mode="Markdown")

@bot.message_handler(commands=['logs'])
def view_logs(message):
    if os.path.exists(MSG_LOG_PATH):
        with open(MSG_LOG_PATH, "r") as f:
            logs = json.load(f)
        last_5 = logs[-5:] if len(logs) > 5 else logs
        text = "\n".join([f"• [{l['timestamp'][:19]}] {l['message'][:60]}... → {l['status']}" for l in last_5])
        bot.reply_to(message, f"📋 Last {len(last_5)} messages:\n{text}")
    else:
        bot.reply_to(message, "No messages logged yet.")

@bot.message_handler(func=lambda message: True)
def update_knowledge(message):
    user_text = message.text
    user_name = message.from_user.first_name or "Unknown"
    kg = get_current_kg()
    
    print(f"[{datetime.now().strftime('%H:%M:%S')}] Received from {user_name}: {user_text}")
    bot.send_chat_action(message.chat.id, 'typing')
    
    # Use Sarvam LLM to merge the new information into the JSON
    prompt = f"""TASK: Update the following JSON Knowledge Graph with the NEW INFORMATION provided.

CURRENT JSON:
{json.dumps(kg)}

NEW INFORMATION:
{user_text}

CRITICAL INSTRUCTIONS:
1. Output ONLY the valid JSON.
2. Do NOT include any markdown formatting.
3. Do NOT include any explanations.
4. MUST ADD the new information. Do not ignore it!"""
    
    headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}
    payload = {
        "model": "sarvam-105b",
        "messages": [{"role": "user", "content": prompt}]
    }
    
    try:
        response = requests.post("https://api.sarvam.ai/v1/chat/completions", json=payload, headers=headers, timeout=30)
        if response.status_code == 200:
            raw_content = response.json()["choices"][0]["message"].get("content")
            
            if not raw_content:
                kg.setdefault("updates", []).append({"text": user_text, "time": datetime.now().isoformat()})
                save_kg(kg)
                log_message(user_name, user_text, "saved_fallback")
                bot.reply_to(message, "⚠️ AI busy — saved your update directly!")
                return

            # Robust JSON extraction
            content_clean = raw_content.strip()
            if "{" in content_clean and "}" in content_clean:
                content_clean = "{" + content_clean.split("{", 1)[1].rsplit("}", 1)[0] + "}"
            
            try:
                new_kg = json.loads(content_clean)
                save_kg(new_kg)
                log_message(user_name, user_text, "ai_merged")
                bot.reply_to(message, "✅ Knowledge Graph updated!")
            except Exception:
                kg.setdefault("updates", []).append({"text": user_text, "time": datetime.now().isoformat()})
                save_kg(kg)
                log_message(user_name, user_text, "saved_fallback")
                bot.reply_to(message, "⚠️ AI formatting issue — saved your update directly!")
        else:
            kg.setdefault("updates", []).append({"text": user_text, "time": datetime.now().isoformat()})
            save_kg(kg)
            log_message(user_name, user_text, "saved_api_error")
            bot.reply_to(message, "⚠️ API issue — saved your update directly!")
    except Exception as e:
        kg.setdefault("updates", []).append({"text": user_text, "time": datetime.now().isoformat()})
        save_kg(kg)
        log_message(user_name, user_text, "saved_exception")
        bot.reply_to(message, "⚠️ Connection issue — saved your update directly!")

print("Telegram Bot is running...")
bot.infinity_polling()

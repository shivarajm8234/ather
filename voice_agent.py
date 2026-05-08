#!/usr/bin/env python3
import sys
import os
import requests
import base64
import time
import json
from datetime import datetime
from dotenv import load_dotenv
from asterisk.agi import AGI
import retail_agent_utils

# Load environment variables from absolute path
ENV_PATH = "/home/satoru/Desktop/ds/.env"
load_dotenv(ENV_PATH)

SARVAM_API_KEY = os.getenv("SARVAM_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not SARVAM_API_KEY:
    # Fallback if env fails
    import sys
    sys.stderr.write("ERROR: SARVAM_API_KEY not found in .env\n")

SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech"
SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

class MultilingualVoiceAgent:
    def __init__(self):
        self.agi = AGI()
        self.language = "en-IN"
        self.recording_path = "/tmp/user_input"
        self.conversation = []
        self.caller_id = self.agi.get_variable("CALLERID(num)") or "Unknown"
        self.load_active_agent()
        
    def load_active_agent(self):
        """Load the active AI persona configuration."""
        try:
            # Check for a specific 'active_agent.json' or default to the first one in staff.json
            active_path = "/home/satoru/Desktop/ds/active_agent.json"
            if os.path.exists(active_path):
                with open(active_path, "r") as f:
                    self.active_agent = json.load(f)
            else:
                with open("/home/satoru/Desktop/ds/staff.json", "r") as f:
                    staff = json.load(f)
                    self.active_agent = staff[0]
            self.log(f"Active Persona: {self.active_agent['name']} ({self.active_agent['voice_gender']})")
        except Exception as e:
            self.log(f"Failed to load agent: {e}")
            self.active_agent = {
                "name": "Aura", 
                "voice_gender": "Female", 
                "instructions": "Be professional and helpful."
            }
        
    def log(self, message):
        """Styled logging for Asterisk console."""
        self.agi.verbose(f" \033[1;34m[Agent]\033[0m {message}")

    def say(self, text, lang_code=None):
        """TTS using Sarvam AI."""
        if not text:
            self.log("Attempted to say empty text, skipping.")
            return
            
        lang_code = lang_code or self.language
        self.log(f"Responding in {lang_code}: {text}")
        self.conversation.append({"role": "agent", "content": text, "lang": lang_code})
        
        # Select speaker based on persona voice_gender
        speaker = "priya" if self.active_agent.get("voice_gender") == "Female" else "mani"
        
        payload = {
            "inputs": [text],
            "target_language_code": lang_code,
            "speaker": speaker,
            "speech_sample_rate": 8000,
            "enable_preprocessing": True,
            "model": "bulbul:v3"
        }
        headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}

        try:
            response = requests.post(SARVAM_TTS_URL, json=payload, headers=headers)
            if response.status_code == 200:
                audio_content = response.json().get("audios", [])[0]
                with open("/tmp/resp.wav", "wb") as f:
                    f.write(base64.b64decode(audio_content))
                self.agi.stream_file("/tmp/resp")
            else:
                self.log(f"TTS Error: {response.text}")
        except Exception as e:
            self.log(f"TTS Exception: {str(e)}")

    def listen_and_transcribe(self):
        """Record audio and use Sarvam STT to transcribe."""
        self.log("Listening...")
        # Record for 5 seconds or until '#' is pressed
        self.agi.record_file(self.recording_path, "wav", "#", 5000)
        
        if not os.path.exists(f"{self.recording_path}.wav"):
            return None

        self.log("Transcribing...")
        try:
            with open(f"{self.recording_path}.wav", "rb") as f:
                files = {"file": (f"{self.recording_path}.wav", f, "audio/wav")}
                data = {"language_code": self.language, "model": "saarika:v2.5"}
                headers = {"api-subscription-key": SARVAM_API_KEY}
                
                response = requests.post(SARVAM_STT_URL, files=files, data=data, headers=headers)
                if response.status_code == 200:
                    transcript = response.json().get("transcript", "")
                    self.log(f"User said: {transcript}")
                    self.conversation.append({"role": "user", "content": transcript, "lang": self.language})
                    return transcript
                else:
                    self.log(f"STT Error: {response.text}")
        except Exception as e:
            self.log(f"STT Exception: {str(e)}")
        return None

    def get_llm_response(self, text):
        """Get response from Sarvam AI LLM with Knowledge Graph context."""
        self.log("Thinking (Sales & Retail Brain)...")
        
        # Load Knowledge Graph
        try:
            with open("/home/satoru/Desktop/ds/knowledge_graph.json", "r") as f:
                knowledge = f.read()
        except:
            knowledge = "No additional knowledge available."

        headers = {
            "api-subscription-key": SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        
        # Load User History
        history_context = ""
        if self.user_profile.get("history"):
            last_chats = self.user_profile["history"][-2:] # Get last 2 summaries
            history_context = "PREVIOUS CONVERSATIONS:\n" + "\n".join(last_chats)

        # Extract offers from knowledge graph if available
        offers_text = "Check current availability."
        try:
            kg_data = json.loads(knowledge)
            offers = []
            for p in kg_data.get("products", []):
                if p.get("current_offers"):
                    offers.append(f"- {p['name']}: {p['current_offers']}")
            if offers:
                offers_text = "\n".join(offers)
        except:
            pass

        prompt = f"""
        You are a highly professional sales and service assistant for Ather Energy.
        
        IDENTITY:
        Today's Date: {datetime.now().strftime('%Y-%m-%d')}
        Customer Name: {self.user_profile.get('name', 'Unknown')}
        Customer Phone: {self.caller_id}
        
        CONTEXT:
        {knowledge}
        
        {history_context}
        
        USER QUERY: {text}

        AVAILABLE OFFERS (Mention these voluntarily if appropriate):
        {offers_text}

        RETAIL RULES & PERSONA GUIDELINES:
        Agent Name: {self.active_agent['name']}
        Behavioral Directives: {self.active_agent.get('instructions', '')}
        
        1. If the user wants to BUY or asks for PRICE/DISCOUNT, answer and then say: "I have noted your interest. Our specialist will call you back shortly."
        2. If the user asks for a service or says their vehicle is due, remind them about the 5k/10k km checkups and mention that regular service extends battery life.
        3. If the user wants to book a service, check if they have a preferred date/time. If so, use the tag [BOOK_SERVICE: YYYY-MM-DD HH:MM] where HH:MM is on the hour (e.g. 10:00, 11:00).
        4. If the user asks to speak to a person and specialists are busy, offer to schedule a priority callback.
        5. Be very concise (max 2 sentences).
        6. Speak in {self.language}.
        
        INTERNAL TAGGING (MUST INCLUDE AT THE END):
        [HOT_LEAD] if interested in buying or high-value offers.
        [SERVICE_QUERY] if interested in service.
        [BOOK_SERVICE: YYYY-MM-DD HH:MM] for booking.
        [UPDATE_NAME: <name>] if the user tells you their name.
        """
        
        payload = {
            "model": "sarvam-105b",
            "messages": [{"role": "user", "content": prompt}]
        }
        
        try:
            response = requests.post("https://api.sarvam.ai/v1/chat/completions", json=payload, headers=headers)
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"].get("content")
                if content:
                    # Logic to log leads based on tags
                    if "[HOT_LEAD]" in content:
                        retail_agent_utils.add_lead(self.user_profile.get("name", "Unknown"), self.caller_id, notes=text, priority="Hot")
                        content = content.replace("[HOT_LEAD]", "").strip()
                    
                    if "[BOOK_SERVICE:" in content:
                        # Extract date/time: [BOOK_SERVICE: 2026-05-09 14:00]
                        try:
                            booking_info = content.split("[BOOK_SERVICE:")[1].split("]")[0].strip()
                            b_date, b_time = booking_info.split(" ")
                            success, msg = retail_agent_utils.book_service_slot(self.user_profile.get("name", "Unknown"), self.caller_id, b_date, b_time)
                            if success:
                                content = content.split("[BOOK_SERVICE:")[0] + f" (Confirmed: {msg}) " + content.split("]")[1]
                            else:
                                content = content.split("[BOOK_SERVICE:")[0] + " (Slot Full, try another time) " + content.split("]")[1]
                        except:
                            pass
                        content = content.strip()

                    if "[UPDATE_NAME:" in content:
                        # Extract name: [UPDATE_NAME: John]
                        try:
                            new_name = content.split("[UPDATE_NAME:")[1].split("]")[0].strip()
                            self.user_profile["name"] = new_name
                            content = content.split("[UPDATE_NAME:")[0] + content.split("]")[1]
                        except:
                            pass
                        content = content.strip()

                    if "[SERVICE_QUERY]" in content:
                        content = content.replace("[SERVICE_QUERY]", "").strip()
                        
                    return content
                else:
                    self.log("LLM returned empty content.")
            else:
                self.log(f"Sarvam LLM Error: {response.text}")
        except Exception as e:
            self.log(f"LLM Exception: {str(e)}")
            
        # Multilingual fallback messages
        if self.language == "kn-IN":
            return "ಕ್ಷಮಿಸಿ, ಈ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ."
        elif self.language == "hi-IN":
            return "ಕ್ಷಮಿಸಿ, ಈ ಮಾಹಿತಿಯನ್ನು ಒದಗಿಸಲು ಸಾಧ್ಯವಾಗುತ್ತಿಲ್ಲ."
        return "I'm sorry, I couldn't process that."

    def run(self):
        try:
            self.agi.answer()
            time.sleep(1) # Wait for audio channel to stabilize
            
            # Initial Greeting
            self.log("Starting initial greeting...")
            self.say("Welcome. For English press 1. ಕನ್ನಡಕ್ಕಾಗಿ 2 ಒತ್ತಿರಿ. हिंदी के लिए 3 दबाएं.", "en-IN")
            
            digit = self.agi.wait_for_digit(4000)
            self.log(f"Digit received: {digit}")
            
            # Load User Profile
            self.user_profile = retail_agent_utils.get_user_profile(self.caller_id)

            if digit == '2':
                self.language = "kn-IN"
                if self.user_profile.get("name") == "Unknown":
                    self.say("ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಹೆಸರೇನು?")
                else:
                    self.say(f"ಹಲೋ {self.user_profile['name']}, ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?")
            elif digit == '3':
                self.language = "hi-IN"
                if self.user_profile.get("name") == "Unknown":
                    self.say("धन्यवाद। आपका नाम क्या है?")
                else:
                    self.say(f"नमस्ते {self.user_profile['name']}, मैं आपकी क्या सहायता कर सकता हूँ?")
            else:
                # Default to English (1 or timeout)
                self.language = "en-IN"
                if self.user_profile.get("name") == "Unknown":
                    self.say("Thank you. May I know your name please?")
                else:
                    self.say(f"Hello {self.user_profile['name']}. How can I help you today?")
                
            # Conversation Loop (3 turns)
            for i in range(3):
                self.log(f"Turn {i+1} starting...")
                user_text = self.listen_and_transcribe()
                if user_text:
                    llm_reply = self.get_llm_response(user_text)
                    self.say(llm_reply)
                else:
                    self.log("No input detected. Prompting user...")
                    if self.language == "kn-IN":
                        self.say("ದಯವಿಟ್ಟು ಮತ್ತೆ ಹೇಳಿ.")
                    elif self.language == "hi-IN":
                        self.say("कृपया फिर से कहें।")
                    else:
                        self.say("Please say that again.")
                    # Don't break, allow the loop to try the next turn
        except Exception as e:
            self.log(f"CRITICAL ERROR in Run: {str(e)}")
        finally:
            # Save conversation to JSON
            try:
                unique_id = self.agi.get_variable("UNIQUEID") or datetime.now().strftime("%Y%m%d_%H%M%S")
                log_dir = "/home/satoru/Desktop/ds/calls"
                
                # Ensure directory exists
                if not os.path.exists(log_dir):
                    os.makedirs(log_dir, exist_ok=True)
                
                log_file = f"{log_dir}/call_{unique_id}.json"
                
                # Create human language summary
                human_summary = retail_agent_utils.summarize_conversation(self.conversation)
                
                call_data = {
                    "unique_id": unique_id,
                    "phone": self.caller_id,
                    "customer_name": self.user_profile.get("name", "Unknown"),
                    "timestamp": datetime.now().isoformat(),
                    "language": self.language,
                    "summary": human_summary,
                    "conversation": self.conversation
                }
                
                with open(log_file, "w") as f:
                    json.dump(call_data, f, indent=4)
                
                # Update user profile history
                self.user_profile["history"].append(f"Call on {datetime.now().strftime('%Y-%m-%d')}: {human_summary[:100]}...")
                retail_agent_utils.save_user_profile(self.user_profile)
                    
                self.log(f"Conversation saved and user profile updated.")
            except Exception as json_e:
                self.log(f"Failed to save JSON: {str(json_e)}")
                
            self.agi.hangup()

if __name__ == "__main__":
    agent = MultilingualVoiceAgent()
    agent.run()

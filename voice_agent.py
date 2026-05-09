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
import logging
import urllib3

# Suppress SSL warnings for verify=False
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Setup file logging for debugging
logging.basicConfig(
    filename='/home/satoru/Desktop/ather/voice_agent.log',
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Load environment variables from absolute path
ENV_PATH = "/home/satoru/Desktop/ather/.env"
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
        self.conversation = []
        raw_id = self.agi.get_variable("CALLERID(num)") or "Unknown"
        self.unique_id = self.agi.get_variable("UNIQUEID") or str(time.time())
        self.caller_id = "".join(filter(str.isdigit, str(raw_id)))[-10:] if raw_id != "Unknown" else "Unknown"
        self.recording_path = f"/tmp/user_input_{self.unique_id}"
        self.resp_path = f"/tmp/resp_{self.unique_id}"
        
        self.user_profile = retail_agent_utils.get_user_profile(self.caller_id)
        self.load_active_agent()
        self._cache_knowledge()

    def _cache_knowledge(self):
        """Cache knowledge graph in memory for sub-second LLM processing."""
        try:
            with open("/home/satoru/Desktop/ather/knowledge_graph.json", "r") as f:
                self.knowledge_base = f.read()
        except:
            self.knowledge_base = "No additional knowledge available."
        
    def load_active_agent(self):
        """Load the active AI persona configuration."""
        try:
            with open("/home/satoru/Desktop/ather/staff.json", "r") as f:
                self.staff_list = json.load(f)
            
            # Check for a specific 'active_agent.json'
            active_path = "/home/satoru/Desktop/ather/active_agent.json"
            if os.path.exists(active_path):
                with open(active_path, "r") as f:
                    self.active_agent = json.load(f)
            else:
                self.active_agent = self.staff_list[0]
            self.log(f"Active Persona: {self.active_agent['name']} ({self.active_agent['voice_gender']})")
        except Exception as e:
            self.log(f"Failed to load agent: {e}")
            self.active_agent = {
                "name": "Aura", 
                "voice_gender": "Female", 
                "instructions": "Be professional and helpful."
            }
            self.staff_list = [self.active_agent]
        
    def log(self, message):
        """Styled logging for Asterisk console and file."""
        logging.debug(f"[{self.caller_id}] {message}")
        self.agi.verbose(f" \033[1;34m[Agent]\033[0m {message}")

    def _format_knowledge(self, knowledge_json):
        """Convert JSON knowledge into a human-readable text manual for the LLM."""
        try:
            data = json.loads(knowledge_json)
            lines = ["ATHER ENERGY KNOWLEDGE BASE:"]
            
            # Business Info
            biz = data.get("business_info", {})
            lines.append(f"Showroom: {biz.get('name')} in {biz.get('location')}. Hours: {biz.get('timings')}.")
            
            # Products
            lines.append("\nPRODUCTS & SPECS:")
            for p in data.get("products", []):
                lines.append(f"- {p['name']}: Range {p.get('true_range','N/A')}, Top Speed {p.get('top_speed','N/A')}, Price {p.get('price_starting')}. Offer: {p.get('current_offers','None')}")
            
            # Service
            svc = data.get("service_info", {})
            lines.append("\nSERVICE POLICY:")
            lines.append(f"Milestones: {', '.join([m['milestone'] for m in svc.get('intervals', [])])}")
            lines.append(f"Battery Warranty: {svc.get('battery_warranty')}")
            
            return "\n".join(lines)
        except:
            return str(knowledge_json)
            
    def _switch_agent(self, name):
        """Switch the active persona during a call based on staff.json."""
        try:
            with open("/home/satoru/Desktop/ather/staff.json", "r") as f:
                staff = json.load(f)
                for s in staff:
                    if s["name"].lower() == name.lower():
                        self.active_agent = s
                        # Sync with active_agent.json for dashboard
                        try:
                            with open("/home/satoru/Desktop/ather/active_agent.json", "w") as f_act:
                                json.dump(s, f_act, indent=4)
                        except:
                            pass
                        self.log(f"Shifted to persona: {s['name']} ({s['voice_gender']})")
                        return True
        except Exception as e:
            self.log(f"Failed to switch agent: {e}")
        return False
            
    def _preprocess_numbers(self, text):
        """Convert digits to English words to ensure they are spoken in English."""
        import re
        num_map = {
            '0': 'zero', '1': 'one', '2': 'two', '3': 'three', '4': 'four',
            '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine'
        }
        # Simple replacement for standalone digits and grouped numbers
        def replace_num(match):
            val = match.group(0)
            return " ".join([num_map.get(d, d) for d in val])
        
        return re.sub(r'\d+', replace_num, text)

    def say(self, text, lang_code=None):
        """TTS using Sarvam AI."""
        if not text:
            self.log("Attempted to say empty text, skipping.")
            return
            
        lang_code = lang_code or self.language
        
        # Ensure numbers are spoken in English
        text_for_tts = self._preprocess_numbers(text)
        
        self.log(f"Responding in {lang_code}: {text}")
        self.conversation.append({"role": "agent", "content": text, "lang": lang_code})
        
        # Updated Speaker Mapping for bulbul:v3
        speaker_map = {
            "Male": "shubh",
            "Female": "shreya",
            "shreya": "shreya",
            "shubh": "shubh",
            "kabir": "kabir",
            "amit": "amit"
        }
        
        # Determine best speaker
        gender = self.active_agent.get("voice_gender", "Female")
        agent_name = self.active_agent.get("name", "Aura")
        
        # If name is in map, use it, otherwise use gender
        speaker = speaker_map.get(agent_name, speaker_map.get(gender, "shreya"))
        
        # Handle specific name overrides for bulbul:v3
        if agent_name == "Aura" and gender == "Male":
            speaker = "shubh"
        elif agent_name == "Aura" and gender == "Female":
            speaker = "shreya"
        elif agent_name == "Kavi":
            speaker = "kabir"
        elif agent_name == "Zephyr":
            speaker = "amit"
        
        payload = {
            "inputs": [text_for_tts],
            "target_language_code": lang_code,
            "speaker": speaker,
            "speech_sample_rate": 8000,
            "enable_preprocessing": False, 
            "model": "bulbul:v3" 
        }
        headers = {"api-subscription-key": SARVAM_API_KEY, "Content-Type": "application/json"}

        try:
            # Added verify=False to bypass SSL issues in restricted environments
            response = requests.post(SARVAM_TTS_URL, json=payload, headers=headers, verify=False)
            if response.status_code == 200:
                resp_json = response.json()
                logging.debug(f"TTS Response: {resp_json.keys()}")
                audios = resp_json.get("audios", [])
                if audios:
                    audio_content = audios[0]
                    with open(f"{self.resp_path}.wav", "wb") as f:
                        f.write(base64.b64decode(audio_content))
                    self.agi.stream_file(self.resp_path)
                else:
                    self.log(f"TTS Error: No audio in response. Body: {response.text}")
            else:
                self.log(f"TTS Error {response.status_code}: {response.text}")
        except Exception as e:
            self.log(f"TTS Exception: {str(e)}")
        finally:
            # Ensure we never hang up here
            pass
    def _get_transition_msg(self, name, role):
        phrases = {
            "en-IN": f"Please wait while I connect you to {name}, our {role}.",
            "kn-IN": f"ದಯವಿಟ್ಟು ನಿರೀಕ್ಷಿಸಿ, ನಾನು ನಿಮ್ಮನ್ನು ನಮ್ಮ {role} {name} ಅವರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತಿದ್ದೇನೆ.",
            "hi-IN": f"कृपया प्रतीक्षा करें, मैं आपको हमारे {role} {name} से जोड़ रहा हूँ।"
        }
        return phrases.get(self.language, phrases["en-IN"])

    def listen_and_transcribe(self):
        """Record audio with aggressive silence detection for low latency."""
        # Increased timeout to 8s and silence to 3s for better stability
        self.agi.record_file(self.recording_path, "wav", "#", 8000, 0, True, 3)
        
        if not os.path.exists(f"{self.recording_path}.wav"):
            return None

        self.log("Transcribing...")
        start_stt = time.time()
        try:
            with open(f"{self.recording_path}.wav", "rb") as f:
                files = {"file": (f"{self.recording_path}.wav", f, "audio/wav")}
                data = {"language_code": self.language, "model": "saarika:v2.5"}
                headers = {"api-subscription-key": SARVAM_API_KEY}
                
                # Added verify=False
                response = requests.post(SARVAM_STT_URL, files=files, data=data, headers=headers, verify=False)
                logging.debug(f"STT Response Status: {response.status_code}")
                if response.status_code == 200:
                    resp_json = response.json()
                    logging.debug(f"STT Response: {resp_json}")
                    self.log(f"STT Latency: {time.time() - start_stt:.2f}s")
                    transcript = resp_json.get("transcript", "")
                    self.log(f"User said: {transcript}")
                    self.conversation.append({"role": "user", "content": transcript, "lang": self.language})
                    return transcript
                else:
                    self.log(f"STT Error {response.status_code}: {response.text}")
        except Exception as e:
            self.log(f"STT Exception: {str(e)}")
        return None

    def get_llm_response(self, text):
        """Get response from Sarvam AI LLM using cached knowledge."""
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
            kg_data = json.loads(self.knowledge_base)
            offers = []
            for p in kg_data.get("products", []):
                if p.get("current_offers"):
                    offers.append(f"- {p['name']}: {p['current_offers']}")
            if offers:
                offers_text = "\n".join(offers)
        except:
            pass

        # Load Staff list for availability check (Name and Role)
        staff_context = []
        available_staff_names = []
        try:
            with open("/home/satoru/Desktop/ather/staff.json", "r") as f:
                staff_data = json.load(f)
                for s in staff_data:
                    staff_context.append(f"{s['name']} ({s.get('role', 'Specialist')})")
                    available_staff_names.append(s["name"])
        except:
            staff_context = ["Aura (Sales Specialist)", "Kavi (Product Specialist)", "Zephyr (Operations Manager)"]
            available_staff_names = ["Aura", "Kavi", "Zephyr"]

        prompt = f"""
        You are a PROACTIVE MULTILINGUAL assistant for Ather Energy.
        Languages: English, Kannada, Hindi.
        
        RULES:
        1. Respond STRICTLY in {self.language}.
        2. NUMBERS: Always write prices, model numbers, and counts in English digits (e.g., 450, 2024).
        3. If they want to talk to a manager or human, explain that you are the digital assistant and can handle most queries.
        4. PERSONA SHIFT: If they ask for a specific person OR a role (e.g. manager, technical expert), check the AVAILABLE STAFF: {', '.join(staff_context)}. 
           - If a matching person or role is in the list: Say "Certainly, connecting you to our {{{{role}}}} [Name] now..." and include [SHIFT_TO: Name]. 
           - If NOT in the list: Politely state they are currently out of office or unavailable.
        5. If they want service, BOOK it immediately using [BOOK_SERVICE: YYYY-MM-DD HH:MM].
        6. If they want to buy, answer and mark as [HOT_LEAD].
        7. Solve the problem in this call regardless of the language.
        8. If the customer provides their name, include it in your response as [UPDATE_NAME: CustomerName].
        9. If the customer asks for a manager or expert, use [SHIFT_TO: Name] to switch to that persona (Available: Aura, Kavi, Zephyr).

        CURRENT IDENTITY:
        Agent Name: {self.active_agent['name']}
        Role: {self.active_agent.get('role', 'Specialist')}
        Today's Date: {datetime.now().strftime('%Y-%m-%d')}
        Customer Name: {self.user_profile.get('name', 'Unknown')}
        Customer Phone: {self.caller_id}
        
        CONTEXT:
        {self._format_knowledge(self.knowledge_base)}
        
        CUSTOMER HISTORY:
        {self.user_profile.get('history', 'No previous history.')}
        
        {history_context}
        
        USER QUERY: {text}

        RETAIL RULES:
        1. NEVER say 'we will call you back'. Handle everything NOW.
        2. If they want to buy, answer questions and mark as [HOT_LEAD].
        3. If they want service, check availability and BOOK it immediately using [BOOK_SERVICE: YYYY-MM-DD HH:MM].
        4. If the intent shifts, use [SHIFT_TO: Name].
        5. Stay concise, crisp, and professional.
        
        INTERNAL TAGS (APPEND IF NEEDED):
        [SHIFT_TO: Name], [HOT_LEAD], [SERVICE_QUERY], [BOOK_SERVICE: YYYY-MM-DD HH:MM], [UPDATE_NAME: <name>], [FEEDBACK: <text>]
        """
        
        self.log("LLM Thinking (Groq)...")
        start_llm = time.time()
        
        # Build prompt with explicit language instruction
        lang_map = {"en-IN": "English", "kn-IN": "Kannada", "hi-IN": "Hindi"}
        target_lang = lang_map.get(self.language, "English")
        
        system_instr = f"""
        STRICT LANGUAGE LOCK: You must respond ONLY in {target_lang}. NEVER use other languages.
        CUSTOMER IDENTIFIED: {self.user_profile.get('name', 'Unknown')}
        
        MANDATORY OPERATIONAL TAGS:
        - If customer wants to buy, asks price, or shows high interest: ALWAYS include [HOT_LEAD] in your response.
        - If customer gives an opinion or feedback: ALWAYS include [FEEDBACK: "summary of feedback"] in your response.
        - If customer says their name: ALWAYS include [UPDATE_NAME: "Correct Name"] in your response.
        - If booking a service: YOU MUST FIRST ASK FOR THEIR PREFERRED DATE AND TIME. After they provide it, include [BOOK_SERVICE: YYYY-MM-DD HH:MM] in your response. NEVER book without asking for a specific time.
        
        RULES:
        1. IF NAME IS KNOWN (not 'Unknown'), NEVER ASK FOR IT. USE IT TO ADDRESS THEM.
        2. NEVER change the language from {target_lang}.
        3. Solve everything in this call.
        """
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": system_instr},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.0
        }
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        try:
            # Added verify=False
            response = requests.post(GROQ_URL, json=payload, headers=headers, verify=False)
            if response.status_code == 200:
                self.log(f"LLM Latency: {time.time() - start_llm:.2f}s")
                content = response.json()["choices"][0]["message"].get("content")
                if not content:
                    self.log("Groq returned empty. Falling back...")
                    return "I am listening. How can I help you?"
                
                self.log(f"AI Response: {content[:50]}...")
                if content:
                    # 1. Passive Interest Detection (Safety Net for Dashboard Updates)
                    lower_text = text.lower()
                    if any(word in lower_text for word in ["buy", "price", "booking", "interested", "cost", "showroom", "test ride"]):
                        if "[HOT_LEAD]" not in content:
                            content += " [HOT_LEAD]"
                    
                    if any(word in lower_text for word in ["good", "bad", "problem", "excellent", "worst", "feedback", "service is"]):
                        if "[FEEDBACK:" not in content:
                            content += f" [FEEDBACK: Customer opinion: {text[:60]}]"

                    # 2. Logic to log leads based on tags
                    if "[SWITCH_AGENT:" in content:
                        try:
                            agent_name = content.split("[SWITCH_AGENT:")[1].split("]")[0].strip()
                            for staff in self.staff_list:
                                if staff['name'].lower() == agent_name.lower():
                                    transition_msg = self._get_transition_msg(staff['name'], staff.get('role', 'Specialist'))
                                    self.say(transition_msg)
                                    self.active_agent = staff
                                    self.log(f"Switched to Persona: {staff['name']} ({staff['voice_gender']})")
                                    # Update active_agent.json for persistence
                                    with open("/home/satoru/Desktop/ather/active_agent.json", "w") as f:
                                        json.dump(staff, f, indent=4)
                                    break
                            content = content.replace(f"[SWITCH_AGENT: {agent_name}]", "").replace(f"[SWITCH_AGENT:{agent_name}]", "").strip()
                        except:
                            pass

                    if "[HOT_LEAD]" in content:
                        # Determine stage based on context
                        stage = "New Enquiry"
                        if any(w in lower_text for w in ["test ride", "drive", "visit", "showroom"]):
                            stage = "Test Ride"
                        elif any(w in lower_text for w in ["discount", "price", "offer", "negotiate"]):
                            stage = "Negotiation"
                        elif any(w in lower_text for w in ["book", "order", "purchase"]):
                            stage = "Booking"
                        elif any(w in lower_text for w in ["contact", "called", "speak"]):
                            stage = "Contacted"
                            
                        retail_agent_utils.add_lead(
                            self.user_profile.get("name", "Unknown"), 
                            self.caller_id, 
                            notes=text, 
                            priority="Hot",
                            status=stage
                        )
                        content = content.replace("[HOT_LEAD]", "").strip()
                    
                    if "[FEEDBACK:" in content:
                        try:
                            fb_text = content.split("[FEEDBACK:")[1].split("]")[0].strip()
                            retail_agent_utils.save_feedback(self.user_profile.get("name", "Unknown"), self.caller_id, fb_text)
                            content = content.split("[FEEDBACK:")[0] + content.split("]")[1]
                        except:
                            pass
                        content = content.strip()
                    
                    if "[BOOK_SERVICE:" in content:
                        # Extract date/time: [BOOK_SERVICE: 2026-05-09 14:00]
                        try:
                            booking_info = content.split("[BOOK_SERVICE:")[1].split("]")[0].strip()
                            parts = booking_info.split(" ")
                            b_date = parts[0]
                            # Robust date check: if only day is given (e.g. "20"), add current month/year
                            if "-" not in b_date:
                                b_date = f"{datetime.now().year}-{datetime.now().month:02d}-{int(b_date):02d}"
                            
                            b_time = parts[1] if len(parts) > 1 else "10:00"
                            success, msg = retail_agent_utils.book_service_slot(self.user_profile.get("name", "Unknown"), self.caller_id, b_date, b_time)
                            if success:
                                content = content.split("[BOOK_SERVICE:")[0] + f" (Confirmed: {msg}) " + content.split("]")[1]
                            else:
                                content = content.split("[BOOK_SERVICE:")[0] + " (Slot Full, try another time) " + content.split("]")[1]
                        except:
                            pass
                        content = content.strip()

                    if "[SHIFT_TO:" in content:
                        try:
                            target_name = content.split("[SHIFT_TO:")[1].split("]")[0].strip()
                            if self._switch_agent(target_name):
                                content = content.split("[SHIFT_TO:")[0] + content.split("]")[1]
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

                    if "[FEEDBACK:" in content:
                        try:
                            fb_text = content.split("[FEEDBACK:")[1].split("]")[0].strip()
                            retail_agent_utils.save_feedback(self.user_profile.get("name", "Unknown"), self.caller_id, fb_text)
                            content = content.split("[FEEDBACK:")[0] + content.split("]")[1]
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
        fallbacks = {
            "kn-IN": "\u0c95\u0ccd\u0cb7\u0cae\u0cbf\u0cb8\u0cbf, \u0ca8\u0ca8\u0c97\u0cc6 \u0c85\u0ca6\u0ca8\u0ccd\u0ca8\u0cc1 \u0caa\u0ccd\u0cb0\u0cbe\u0cb8\u0cc6\u0cb8\u0ccd \u0cae\u0cbe\u0ca1\u0cb2\u0cc1 \u0cb8\u0cbe\u0ca7\u0ccd\u0caf\u0cb5\u0cbe\u0c97\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0cae\u0ca4\u0ccd\u0ca4\u0cca\u0cae\u0ccd\u0cae\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf.",
            "hi-IN": "\u0915\u094d\u0937\u092e\u093e \u0915\u0930\u0947\u0902, \u092e\u0948\u0902 \u0909\u0938\u0947 \u0938\u0902\u0938\u093e\u0927\u093f\u0924 \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092b\u093f\u0930 \u0938\u0947 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
            "en-IN": "I'm sorry, I couldn't process that right now. Could you please repeat?"
        }
        return fallbacks.get(self.language, fallbacks["en-IN"])

    def run(self):
        try:
            self.agi.answer()
            time.sleep(0.5)
            
            # 1. ALWAYS ask for language preference at the start
            self.log("Playing initial language selection menu...")
            # We use English for the initial menu
            self.say("Welcome to Ather Energy. For English, press 1. \u0c95\u0ca8\u0ccd\u0ca8\u0ca1\u0c95\u0ccd\u0c95\u0cbe\u0c97\u0cbf 2 \u0c92\u0ca4\u0ccd\u0ca4\u0cbf\u0cb0\u0cbf. \u0939\u093f\u0902\u0926\u0940 \u0915\u0947 \u0932\u093f\u090f 3 \u0926\u092c\u093e\u090f\u0902.", "en-IN")
            
            digit = self.agi.wait_for_digit(8000)
            if digit == '2':
                self.language = "kn-IN"
            elif digit == '3':
                self.language = "hi-IN"
            else:
                self.language = "en-IN" # Default to English
            
            self.user_profile["language"] = self.language
            self.log(f"Language selected: {self.language}")

            # 2. Personalized Greeting based on selection
            customer_name = self.user_profile.get("name", "Unknown")
            agent_name = self.active_agent.get("name", "Aura")
            
            if customer_name != "Unknown":
                if self.language == "kn-IN":
                    self.say(f"\u0ca8\u0cae\u0cb8\u0ccd\u0c95\u0cbe\u0cb0 {customer_name} \u0c85\u0cb5\u0cb0\u0cc7, \u0ca8\u0cbe\u0ca8\u0cc1 {agent_name}. \u0ca8\u0cbf\u0cae\u0c97\u0cc6 \u0cb9\u0cc7\u0c97\u0cc6 \u0cb8\u0cb9\u0cbe\u0caf \u0cae\u0cbe\u0ca1\u0cac\u0cb2\u0ccd\u0cb2\u0cc6?")
                elif self.language == "hi-IN":
                    self.say(f"नमस्ते {customer_name} जी, मैं {agent_name} हूँ। मैं आपकी क्या मदद कर सकता हूँ?")
                else:
                    self.say(f"Hello {customer_name}! I am {agent_name}. How can I assist you with your Ather scooter today?")
            else:
                # Ask for name if unknown
                if self.language == "kn-IN":
                    self.say(f"\u0ca8\u0cae\u0ccd\u0cae \u0c85\u0ca5\u0cb0\u0ccd \u0c8e\u0ca8\u0cb0\u0ccd\u0c9c\u0cbf\u0c97\u0cc6 \u0cb8\u0ccd\u0cb5\u0cbe\u0c97\u0ca4. \u0ca8\u0cbe\u0ca8\u0cc1 {agent_name}, \u0ca8\u0cbf\u0cae\u0ccd\u0cae \u0cb9\u0cc6\u0cb8\u0cb0\u0cc7\u0ca8\u0cc1?")
                elif self.language == "hi-IN":
                    self.say(f"एथर एनर्जी में आपका स्वागत है। मैं {agent_name} हूँ, आपका नाम क्या है?")
                else:
                    self.say(f"Welcome to Ather Energy. I am {agent_name}. May I know your name please?")
            
            # Global Conversation Loop
            while True:
                user_text = self.listen_and_transcribe()
                # Continue if user text is empty string (just didn't catch speech)
                # But break if it's None (error or actual hangup)
                if user_text is not None:
                    if user_text.strip():
                        llm_reply = self.get_llm_response(user_text)
                        self.say(llm_reply)
                    else:
                        # User was silent or STT failed to find words
                        # Instead of breaking, we could ask "Are you still there?"
                        # But for now, we'll just listen again or break after multiple silences.
                        # For simplicity, let's just listen again.
                        continue
                else:
                    break # End call on error or hangup
        except Exception as e:
            self.log(f"CRITICAL ERROR in Run: {str(e)}")
    def _save_call_log(self):
        """Save the conversation log in real-time to the calls directory."""
        try:
            log_dir = "/home/satoru/Desktop/ather/calls"
            if not os.path.exists(log_dir):
                os.makedirs(log_dir, exist_ok=True)
            
            log_file = f"{log_dir}/call_{self.caller_id}.json"
            
            all_calls = []
            if os.path.exists(log_file):
                try:
                    with open(log_file, "r") as f:
                        all_calls = json.load(f)
                except:
                    all_calls = []
            
            # Find if this unique call is already in the list
            found_idx = -1
            for i, c in enumerate(all_calls):
                if c.get("unique_id") == self.unique_id:
                    found_idx = i
                    break
            
            human_summary = retail_agent_utils.summarize_conversation(self.conversation)
            
            new_call_data = {
                "unique_id": self.unique_id,
                "phone": self.caller_id,
                "customer_name": self.user_profile.get("name", "Unknown"),
                "timestamp": datetime.now().isoformat(),
                "language": self.language,
                "summary": human_summary,
                "conversation": self.conversation,
                "active_agent": self.active_agent.get("name", "Aura")
            }
            
            if found_idx >= 0:
                all_calls[found_idx] = new_call_data
            else:
                all_calls.insert(0, new_call_data)
            
            with open(log_file, "w") as f:
                json.dump(all_calls, f, indent=4)
            return True
        except Exception as e:
            self.log(f"Real-time save failed: {e}")
            return False

    def run(self):
        try:
            self.agi.answer()
            time.sleep(0.5)
            
            # 1. ALWAYS ask for language preference at the start
            self.log("Playing initial language selection menu...")
            # We use English for the initial menu
            self.say("Welcome to Ather Energy. For English, press 1. \u0c95\u0ca8\u0ccd\u0ca8\u0ca1\u0c95\u0ccd\u0c95\u0cbe\u0c97\u0cbf 2 \u0c92\u0ca4\u0ccd\u0ca4\u0cbf\u0cb0\u0cbf. \u0939\u093f\u0902\u0926\u0940 \u0915\u0947 \u0932\u093f\u090f 3 \u0926\u092c\u093e\u090f\u0902.", "en-IN")
            
            digit = self.agi.wait_for_digit(8000)
            self.log(f"Digit received: {digit}")
            if digit == '2':
                self.language = "kn-IN"
            elif digit == '3':
                self.language = "hi-IN"
            else:
                self.language = "en-IN" # Default to English
            
            self.user_profile["language"] = self.language
            self.log(f"Language selected: {self.language}")

            # 2. Personalized Greeting based on selection
            customer_name = self.user_profile.get("name", "Unknown")
            agent_name = self.active_agent.get("name", "Aura")
            
            if customer_name != "Unknown":
                if self.language == "kn-IN":
                    self.say(f"ನಮಸ್ಕಾರ {customer_name} ಅವರೇ, ನಾನು {agent_name}. ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ?")
                elif self.language == "hi-IN":
                    self.say(f"नमस्ते {customer_name} जी, मैं {agent_name} हूँ। मैं आपकी क्या मदद कर सकता हूँ?")
                else:
                    self.say(f"Hello {customer_name}! I am {agent_name}. How can I assist you with your Ather scooter today?")
            else:
                # Ask for name if unknown
                if self.language == "kn-IN":
                    self.say(f"ನಮ್ಮ ಅಥರ್ ಎನರ್ಜಿಗೆ ಸ್ವಾಗತ. ನಾನು {agent_name}, ನಿಮ್ಮ ಹೆಸರೇನು?")
                elif self.language == "hi-IN":
                    self.say(f"एथर एनर्जी में आपका स्वागत है। मैं {agent_name} हूँ, आपका नाम क्या है?")
                else:
                    self.say(f"Welcome to Ather Energy. I am {agent_name}. May I know your name please?")
            
            # Real-time save after greeting
            self._save_call_log()

            # 3. Main Conversation Loop
            while True:
                user_text = self.listen_and_transcribe()
                
                if user_text is not None:
                    if user_text.strip():
                        llm_reply = self.get_llm_response(user_text)
                        self.say(llm_reply)
                        # Real-time save after each turn
                        self._save_call_log()
                    else:
                        continue
                else:
                    break
        except Exception as e:
            self.log(f"CRITICAL ERROR in Run: {str(e)}")
        finally:
            self.log("Finalizing call log and updating profile history...")
            self._save_call_log()
            try:
                # Update user profile history once at the end
                human_summary = retail_agent_utils.summarize_conversation(self.conversation)
                if "history" not in self.user_profile or not isinstance(self.user_profile["history"], list):
                    self.user_profile["history"] = []
                self.user_profile["history"].append(f"Call on {datetime.now().strftime('%Y-%m-%d')}: {human_summary[:100]}...")
                retail_agent_utils.save_user_profile(self.user_profile)
                self.log("User profile history updated.")
            except Exception as e:
                self.log(f"Error finalizing profile history: {e}")
                
            try:
                self.agi.hangup()
            except:
                pass

if __name__ == "__main__":
    agent = MultilingualVoiceAgent()
    agent.run()

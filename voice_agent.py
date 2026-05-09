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
import re

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
        """No longer preprocessing numbers here to allow native TTS engine to handle them correctly in Kannada/Hindi."""
        return text

    def say(self, text, lang_code=None):
        """TTS using Sarvam AI."""
        if not text:
            self.log("Attempted to say empty text, skipping.")
            return
            
        lang_code = lang_code or self.language
        
        # Strip internal tags like [...] and (...) from speech
        # Using more aggressive regex to handle unclosed tags
        text_for_tts = re.sub(r'\[[^\]]*\]?', '', text)
        text_for_tts = re.sub(r'\([^)]*\)?', '', text_for_tts)
        
        # Ensure numbers are spoken in English
        text_for_tts = self._preprocess_numbers(text_for_tts)
        
        self.log(f"Responding in {lang_code}: {text}")
        self.conversation.append({"role": "agent", "content": text, "lang": lang_code})

        # Split long text to avoid Sarvam 500-char limit
        sentences = re.split(r'([.!?।])', text_for_tts)
        chunks = []
        current_chunk = ""
        
        # Process sentence and punctuation pairs
        for i in range(0, len(sentences) - 1, 2):
            s = sentences[i] + sentences[i+1]
            if len(current_chunk) + len(s) < 450:
                current_chunk += s
            else:
                if current_chunk: chunks.append(current_chunk)
                current_chunk = s
                
        # Handle the last piece if there was no trailing punctuation
        if len(sentences) % 2 != 0 and sentences[-1]:
            if len(current_chunk) + len(sentences[-1]) < 450:
                current_chunk += sentences[-1]
            else:
                if current_chunk: chunks.append(current_chunk)
                current_chunk = sentences[-1]

        if current_chunk: chunks.append(current_chunk)
        if not chunks and text_for_tts: chunks = [text_for_tts]

        digit = None
        for chunk in chunks:
            digit = self._say_chunk(chunk, lang_code)
            if digit: return digit
        return digit

    def _say_chunk(self, text_for_tts, lang_code):
        if not text_for_tts.strip(): return
        
        # Determine best speaker
        gender = self.active_agent.get("voice_gender", "Female")
        agent_name = self.active_agent.get("name", "Aura")
        
        # Updated Speaker Mapping for bulbul:v3
        speaker_map = {
            "Male": "shubh",
            "Female": "shreya",
            "shreya": "shreya",
            "shubh": "shubh",
            "kabir": "kabir",
            "amit": "amit"
        }
        
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
            response = requests.post(SARVAM_TTS_URL, json=payload, headers=headers, verify=False, timeout=20)
            if response.status_code == 200:
                resp_json = response.json()
                logging.debug(f"TTS Response: {resp_json.keys()}")
                audios = resp_json.get("audios", [])
                if audios:
                    audio_content = audios[0]
                    with open(f"{self.resp_path}.wav", "wb") as f:
                        f.write(base64.b64decode(audio_content))
                    # Allow DTMF interruption for language selection menu
                    digit = self.agi.stream_file(self.resp_path, escape_digits="123")
                    if digit:
                        # Asterisk returns the digit as a string
                        return digit
                else:
                    self.log(f"TTS Error: No audio in response. Body: {response.text}")
            else:
                self.log(f"TTS Error {response.status_code}: {response.text}")
        except Exception as e:
            self.log(f"TTS Exception: {str(e)}")
            # Don't crash the script if TTS fails
            pass
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
                response = requests.post(SARVAM_STT_URL, files=files, data=data, headers=headers, verify=False, timeout=10)
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

        # Load Personal Service Records for Status Queries
        personal_service_context = "No specific service record found."
        try:
            with open("/home/satoru/Desktop/ather/service_records.json", "r") as f:
                all_services = json.load(f)
                user_services = [s for s in all_services if str(s.get("phone")) == str(self.caller_id)]
                if user_services:
                    # Sort by date and take last 3
                    user_services.sort(key=lambda x: str(x.get('appointment_date', '0000-00-00')), reverse=True)
                    details = []
                    for s in user_services[:3]:
                        details.append(f"- {s.get('service_type')} | Status: {s.get('status')} | Date: {s.get('appointment_date', 'TBD')} at {s.get('appointment_time', 'TBD')}")
                    personal_service_context = "USER SERVICE STATUS (RECENT):\n" + "\n".join(details)
        except:
            pass

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

        # Load Service Availability (Busy Slots)
        busy_slots = []
        try:
            with open("/home/satoru/Desktop/ather/service_availability.json", "r") as f:
                busy_data = json.load(f)
                busy_slots = [f"{b['date']} at {b['time']}" for b in busy_data]
        except:
            pass

        # Map language codes to names for better LLM adherence
        lang_name_map = {"en-IN": "English", "kn-IN": "Kannada", "hi-IN": "Hindi"}
        prompt_language = lang_name_map.get(self.language, "English")

        prompt = f"""
        You are a PROACTIVE MULTILINGUAL assistant for Ather Energy.
        Languages: English, Kannada, Hindi.
        
        CONTEXT FOR THIS SPECIFIC CUSTOMER:
        {history_context}
        {personal_service_context}
        
        RULES:
        1. ABSOLUTE LANGUAGE LOCK: You MUST respond STRICTLY in {prompt_language}. Even if the customer speaks in English, Hindi, or gibberish, your output MUST ALWAYS be in {prompt_language}. Do not translate the customer's language; enforce your own.
        2. NO REPETITIVE GREETINGS: You have already greeted the customer. Do NOT say "Namaste", "Hello", or "Namasakra" again in your response. Get straight to the point.
        3. NUMBERS & DATES: When speaking to the customer, ALWAYS spell out dates and times naturally in {prompt_language} (e.g., 'ನಾಳೆ ಬೆಳಿಗ್ಗೆ 10 ಗಂಟೆಗೆ' or 'Tomorrow at 10 AM'). ONLY use the YYYY-MM-DD format INSIDE the [BOOK_SERVICE] tag.
        4. SELECTIVE PERSONA SHIFT (STABLE): Only shift persona if the customer explicitly asks for a different person OR if the topic changes completely. 
           - Avoid shifting if you can handle the query yourself.
           - Technical/Battery deep-dives or general "Technical Experts" -> SHIFT_TO: Kavi
           - Pricing/Offers/Escalations or complaints -> SHIFT_TO: Zephyr
           - Software/HUD/Maps -> SHIFT_TO: Arya
           - Accessories/Community -> SHIFT_TO: Isha
        5. If they ask for an expert, use [SHIFT_TO: <Name>] based on the mapping above. DO NOT default to Zephyr for technical issues.
        6. SERVICE BOOKING & SCHEDULING (STRICT LOGIC): 
           - EXPLICIT CONFIRMATION REQUIRED: If the customer asks to book a slot OR cancel a slot, you MUST first ask for their explicit confirmation (e.g., "Shall I confirm this booking for 10 AM?" or "Are you sure you want to cancel?"). Do NOT use the tags yet.
           - ONLY append the [BOOK_SERVICE: YYYY-MM-DD HH:MM] or [CANCEL_SERVICE] tag IF the customer has explicitly said "Yes", "Confirm", or clearly agreed in their PREVIOUS turn.
           - If the customer asks "When is my schedule?", read their 'USER SERVICE STATUS'. Do NOT attempt to create a new booking.
           - Check the BUSY SLOTS: {', '.join(busy_slots) if busy_slots else 'None'}. Suggest available times if their requested time is busy.
           - DOUBLE BOOKING PREVENTION: Check the 'USER SERVICE STATUS' above. If they have a 'Scheduled' appointment, REFUSE to book a new one. Tell them they must cancel first.
           - TECHNICAL SUPPORT RULE: If the customer describes a problem (e.g., "headlight not working", "battery issue"), you MUST answer their question using your knowledge base. DO NOT suggest booking a service slot unless they explicitly ask to book an appointment.
           - NEVER say "I have booked it" or "I have cancelled it" without the appropriate tag. If you say it, you MUST include the tag.
        7. If they want to buy, answer and mark as [HOT_LEAD].
        8. TAG PLACEMENT: Always place tags like [BOOK_SERVICE:...], [CANCEL_SERVICE], [HOT_LEAD], or [SHIFT_TO:...] at the VERY END of your response.
        9. ONE-SENTENCE LIMIT (CRITICAL): Speak naturally but be EXTREMELY BRIEF. You MUST keep your response to EXACTLY ONE short sentence. Long responses cause critical system crashes. DO NOT output more than one sentence!
        10. If the customer provides their name, include it in your response as [UPDATE_NAME: CustomerName].

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
        
        # Build messages including history
        messages = [{"role": "system", "content": prompt}]
        
        # Add past context (last 10 turns for tokens)
        for turn in self.conversation[-10:]:
            role = "assistant" if turn["role"] == "agent" else "user"
            messages.append({"role": role, "content": turn["content"]})
            
        # Add current query
        messages.append({"role": "user", "content": text})
        
        payload = {
            "model": "qwen/qwen3-32b",
            "messages": messages,
            "temperature": 0.3
        }
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        try:
            # Added verify=False
            response = requests.post(GROQ_URL, json=payload, headers=headers, verify=False, timeout=10)
            if response.status_code == 200:
                self.log(f"LLM Latency: {time.time() - start_llm:.2f}s")
                content = response.json()["choices"][0]["message"].get("content")
                if content:
                    # Strip <think> tags for Qwen reasoning models
                    content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                    
                    self.conversation.append({"role": "agent", "content": content, "lang": self.language})
                    # 1. Passive Interest Detection (Safety Net for Dashboard Updates)
                    lower_text = text.lower()
                    if any(word in lower_text for word in ["buy", "price", "booking", "interested", "cost", "showroom", "test ride"]):
                        if "[HOT_LEAD]" not in content:
                            content += " [HOT_LEAD]"
                    
                    if any(word in lower_text for word in ["good", "bad", "problem", "excellent", "worst", "feedback", "service is"]):
                        if "[FEEDBACK:" not in content:
                            content += f" [FEEDBACK: Customer opinion: {text[:60]}]"

                    # 2. Logic to log leads based on tags
                    if "[SWITCH_AGENT:" in content or "[SHIFT_TO:" in content:
                        try:
                            tag = "[SWITCH_AGENT:" if "[SWITCH_AGENT:" in content else "[SHIFT_TO:"
                            agent_name = content.split(tag)[1].split("]")[0].strip()
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
                            content = content.replace(f"{tag}{agent_name}]", "").strip()
                        except Exception as e:
                            self.log(f"Persona shift failed: {e}")

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

                    if "[CANCEL_SERVICE]" in content:
                        try:
                            success, msg = retail_agent_utils.cancel_service_slot(self.caller_id)
                            content = content.replace("[CANCEL_SERVICE]", "").strip()
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
                        try:
                            new_name = content.split("[UPDATE_NAME:")[1].split("]")[0].strip()
                            self.user_profile["name"] = new_name
                        except:
                            pass

                    if "[FEEDBACK:" in content:
                        try:
                            fb_text = content.split("[FEEDBACK:")[1].split("]")[0].strip()
                            # Deep AI Analysis for Feedback
                            analysis = self.analyze_feedback_with_ai(fb_text)
                            retail_agent_utils.save_feedback(
                                self.user_profile.get("name", "Unknown"), 
                                self.caller_id, 
                                fb_text,
                                sentiment=analysis.get("sentiment", "Neutral"),
                                rating=analysis.get("rating", 3),
                                summary=analysis.get("summary", ""),
                                churn_risk=analysis.get("churn_risk", "Low"),
                                purchase_probability=analysis.get("purchase_probability", "Medium"),
                                tone=analysis.get("tone", "Neutral"),
                                recommendation=analysis.get("recommendation", "Follow up")
                            )
                        except:
                            pass
                    
                    # Final clean of all tags before returning to say()
                    content = re.sub(r'\[[^\]]*\]?', '', content).strip()
                    content = re.sub(r'\([^)]*\)?', '', content).strip()
                    
                    return content

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

    def analyze_feedback_with_ai(self, text):
        """Analyze feedback text for sentiment, rating, and churn risk using Groq."""
        try:
            prompt = f"""
            Analyze the following customer feedback for an Ather Energy showroom:
            "{text}"
            
            Return ONLY a valid JSON object with these keys:
            - sentiment: "Positive", "Neutral", or "Negative"
            - rating: integer 1 to 5
            - summary: one-line professional summary of the core issue/praise
            - churn_risk: "Low", "Moderate", or "Critical"
            - purchase_probability: "High", "Medium", or "Low" (likelihood to buy)
            - tone: One or two words describing their emotion (e.g., "Frustrated", "Excited", "Hesitant")
            - recommendation: Actionable advice for the sales/service team to improve this user's experience
            
            Strictly JSON only.
            """
            
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama-3.1-8b-instant", # Use faster model for analysis
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
                "response_format": {"type": "json_object"}
            }
            
            response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=5)
            if response.status_code == 200:
                return json.loads(response.json()["choices"][0]["message"]["content"])
        except:
            pass
        return {"sentiment": "Neutral", "rating": 3, "summary": text[:60], "churn_risk": "Low"}

    def generate_llm_summary(self):
        """Generate a professional one-line summary using Groq at the end of the call."""
        if not self.conversation:
            return "No interaction recorded."
            
        dialogue = ""
        for msg in self.conversation:
            role = "Agent" if msg["role"] == "agent" else "Customer"
            dialogue += f"{role}: {msg['content']}\n"
            
        prompt = f"Summarize this customer interaction in exactly one professional line (no dialogue): \n\n{dialogue}"
        
        payload = {
            "model": "llama-3.1-8b-instant",
            "messages": [
                {"role": "system", "content": "You are a professional showroom manager. Summarize the following call in one short line."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.1,
            "max_tokens": 100
        }
        
        try:
            headers = {
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            response = requests.post(GROQ_URL, json=payload, headers=headers, timeout=5)
            if response.ok:
                summary = response.json()['choices'][0]['message']['content'].strip()
                return summary.replace('"', '')
        except:
            pass
            
        return retail_agent_utils.summarize_conversation(self.conversation)

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
    def _save_call_log(self, is_final=False):
        """Save the conversation log in real-time. Use LLM summary only at the end."""
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

            # Use LLM summary ONLY if it's the final save of the call
            if is_final:
                human_summary = self.generate_llm_summary()
            else:
                # Fast local summary for real-time dashboard updates
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
            # We use English for the initial menu, and capture any DTMF interrupt
            digit = self.say("Welcome to Ather Energy. For English, press 1. \u0c95\u0ca8\u0ccd\u0ca8\u0ca1\u0c95\u0ccd\u0c95\u0cbe\u0c97\u0cbf 2 \u0c92\u0ca4\u0ccd\u0ca4\u0cbf\u0cb0\u0cbf. \u0939\u093f\u0902\u0926\u0940 \u0915\u0947 \u0932\u093f\u090f 3 \u0926\u092c\u093e\u090f\u0902.", "en-IN")
            
            # If digit wasn't pressed during the audio, wait for it
            if not digit:
                digit = self.agi.wait_for_digit(8000)
                
            # pyst returns ascii code for stream_file, but string for wait_for_digit. Ensure it's a string.
            if isinstance(digit, int):
                digit = chr(digit)

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
                        self.conversation.append({"role": "user", "content": user_text})
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
            self._save_call_log(is_final=True)
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

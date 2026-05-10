#!/home/satoru/Desktop/ather/venv/bin/python3
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
from google import genai


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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")


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
        
        # Initialize Gemini Client
        self.gemini_client = genai.Client(api_key=GEMINI_API_KEY)


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
        res = self.agi.record_file(self.recording_path, "wav", "#", 8000, 0, True, 3)
        if isinstance(res, dict):
            if res.get('result') == '-1':
                self.log("Hangup detected during recording.")
                return None
        elif isinstance(res, str) and "hangup" in res.lower():
            self.log("Hangup detected during recording (string).")
            return None
        if not os.path.exists(f"{self.recording_path}.wav"):
            self.log("Recording file not found.")
            return ""

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
                    self.log(f"STT Latency: {time.time() - start_stt:.2f}s")
                    transcript = resp_json.get("transcript", "")
                    self.log(f"User said: {transcript}")
                    # Remove redundant conversation append here, it's done in run()
                    return transcript
                else:
                    self.log(f"STT Error {response.status_code}: {response.text}")
                    return ""
        except Exception as e:
            self.log(f"STT Exception: {str(e)}")
            return ""

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
                    # Prioritize 'Scheduled' then sort by date and time
                    user_services.sort(key=lambda x: (
                        0 if x.get('status') == 'Scheduled' else 1,
                        x.get('appointment_date', '0000-00-00'),
                        x.get('appointment_time', '00:00')
                    ))
                    details = []
                    # Take up to 5 records to be safe
                    for s in user_services[:5]:
                        details.append(f"- {s.get('service_type')} | Status: {s.get('status')} | Date: {s.get('appointment_date', 'TBD')} at {s.get('appointment_time', 'TBD')}")
                    personal_service_context = "USER SERVICE STATUS (ACTIVE & RECENT):\n" + "\n".join(details)
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
        
        PROMPT PRIORITY:
        1. BACKEND TAGS: Your primary duty is to trigger system actions. If an action (Book/Cancel/Lead) is confirmed, you MUST include the corresponding tag.
        2. BREVITY: Keep your verbal response to exactly ONE short sentence.
        3. LANGUAGE: Always speak in {prompt_language}.

        SERVICE BOOKING PROTOCOL:
        - PHASE 1 (Inquiry): If the user wants to book, ask: "Which date and time would you prefer?"
        - PHASE 2 (Confirmation): Once they provide a time, ask: "Shall I confirm your booking for [Time]?"
        - PHASE 3 (Execution): IF AND ONLY IF they say "Yes", "Confirm", or "Do it", you MUST respond with: "[Verbal Confirmation Sentence] [BOOK_SERVICE: YYYY-MM-DD HH:MM]".
        - NEVER skip Phase 3 tags if you say "It is booked".

        RULES:
        1. ABSOLUTE LANGUAGE LOCK: Respond ONLY in {prompt_language}.
        2. NO REPETITIVE GREETINGS.
        3. NUMBERS & DATES: Spell out dates/times naturally in the sentence, but use YYYY-MM-DD HH:MM in the tag.
        4. RESCHEDULING: If they want to change a time, use BOTH [CANCEL_SERVICE] AND [BOOK_SERVICE: YYYY-MM-DD HH:MM].
        5. ONE-SENTENCE LIMIT: Tags do NOT count as a sentence. Always put them at the end.
        6. TECHNICAL SUPPORT: Answer tech questions first. Don't push booking unless asked.
        
        INTERNAL TAGS (APPEND TO END):
        [BOOK_SERVICE: YYYY-MM-DD HH:MM], [CANCEL_SERVICE], [HOT_LEAD], [SHIFT_TO: Name], [UPDATE_NAME: Name], [FEEDBACK: Text]
        """
        
        self.log("LLM Thinking (Gemini Deep Research)...")
        start_llm = time.time()
        
        # Build prompt including history and context
        history_text = ""
        for turn in self.conversation[-4:]:
            role = "Assistant" if turn["role"] == "agent" else "User"
            history_text += f"{role}: {turn['content']}\n"
        
        full_input = f"{prompt}\n\nCONVERSATION HISTORY:\n{history_text}\nUSER: {text}"

        try:
            # Use flash model for voice interaction speed
            response = self.gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=full_input,
                config={'system_instruction': prompt, 'temperature': 0.3}
            )
            content = response.text

            if content:
                self.log(f"LLM Latency: {time.time() - start_llm:.2f}s")
                
                # Strip <think> tags or reasoning artifacts
                content = re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()
                
                self.conversation.append({"role": "agent", "content": content, "lang": self.language})
                
                # 1. Passive Interest Detection
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
                                with open("/home/satoru/Desktop/ather/active_agent.json", "w") as f:
                                    json.dump(staff, f, indent=4)
                                break
                        content = content.replace(f"{tag}{agent_name}]", "").strip()
                    except Exception as e:
                        self.log(f"Persona shift failed: {e}")

                if "[HOT_LEAD]" in content:
                    retail_agent_utils.add_lead(
                        self.user_profile.get("name", "Unknown"), 
                        self.caller_id, 
                        notes=text, 
                        priority="Hot"
                    )
                    content = content.replace("[HOT_LEAD]", "").strip()
                
                if "[CANCEL_SERVICE]" in content:
                    retail_agent_utils.cancel_service_slot(self.caller_id)
                    content = content.replace("[CANCEL_SERVICE]", "").strip()

                if "[BOOK_SERVICE:" in content:
                    try:
                        booking_info = content.split("[BOOK_SERVICE:")[1].split("]")[0].strip()
                        parts = booking_info.split(" ")
                        b_date = parts[0]
                        if "-" not in b_date:
                            b_date = f"{datetime.now().year}-{datetime.now().month:02d}-{int(b_date):02d}"
                        b_time = parts[1] if len(parts) > 1 else "10:00"
                        success, msg = retail_agent_utils.book_service_slot(self.user_profile.get("name", "Unknown"), self.caller_id, b_date, b_time)
                        if success:
                            content = content.split("[BOOK_SERVICE:")[0] + f" (Confirmed: {msg}) " + content.split("]")[1]
                    except: pass

                if "[FEEDBACK:" in content:
                    try:
                        fb_text = content.split("[FEEDBACK:")[1].split("]")[0].strip()
                        analysis = self.analyze_feedback_with_ai(fb_text)
                        retail_agent_utils.save_feedback(
                            self.user_profile.get("name", "Unknown"), 
                            self.caller_id, 
                            fb_text,
                            sentiment=analysis.get("sentiment", "Neutral"),
                            rating=analysis.get("rating", 3)
                        )
                    except: pass
                
                content = re.sub(r'\[[^\]]*\]?', '', content).strip()
                content = re.sub(r'\([^)]*\)?', '', content).strip()
                
                return content
        except Exception as e:
            self.log(f"Gemini Deep Research failed: {e}")

        
        # Multilingual fallback messages
        fallbacks = {
            "kn-IN": "\u0c95\u0ccd\u0cb7\u0cae\u0cbf\u0cb8\u0cbf, \u0ca8\u0ca8\u0c97\u0cc6 \u0c85\u0ca6\u0ca8\u0ccd\u0ca8\u0cc1 \u0caa\u0ccd\u0cb0\u0cbe\u0cb8\u0cc6\u0cb8\u0ccd \u0cae\u0cbe\u0ca1\u0cb2\u0cc1 \u0cb8\u0cbe\u0ca7\u0ccd\u0caf\u0cb5\u0cbe\u0c97\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0cae\u0ca4\u0ccd\u0ca4\u0cca\u0cae\u0ccd\u0cae\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf.",
            "hi-IN": "\u0915\u094d\u0937\u092e\u093e \u0915\u0930\u0947\u0902, \u092e\u0948\u0902 \u0909\u0938\u0947 \u0938\u0902\u0938\u093e\u0927\u093f\u0924 \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092b\u093f\u0930 \u0938\u0947 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
            "en-IN": "I'm sorry, I couldn't process that right now. Could you please repeat?"
        }
        return fallbacks.get(self.language, fallbacks["en-IN"])

        
        # Multilingual fallback messages
        fallbacks = {
            "kn-IN": "\u0c95\u0ccd\u0cb7\u0cae\u0cbf\u0cb8\u0cbf, \u0ca8\u0ca8\u0c97\u0cc6 \u0c85\u0ca6\u0ca8\u0ccd\u0ca8\u0cc1 \u0caa\u0ccd\u0cb0\u0cbe\u0cb8\u0cc6\u0cb8\u0ccd \u0cae\u0cbe\u0ca1\u0cb2\u0cc1 \u0cb8\u0cbe\u0ca7\u0ccd\u0caf\u0cb5\u0cbe\u0c97\u0cb2\u0cbf\u0cb2\u0ccd\u0cb2. \u0ca6\u0caf\u0cb5\u0cbf\u0c9f\u0ccd\u0c9f\u0cc1 \u0cae\u0ca4\u0ccd\u0ca4\u0cca\u0cae\u0ccd\u0cae\u0cc6 \u0caa\u0ccd\u0cb0\u0caf\u0ca4\u0ccd\u0ca8\u0cbf\u0cb8\u0cbf.",
            "hi-IN": "\u0915\u094d\u0937\u092e\u093e \u0915\u0930\u0947\u0902, \u092e\u0948\u0902 \u0909\u0938\u0947 \u0938\u0902\u0938\u093e\u0927\u093f\u0924 \u0928\u0939\u0940\u0902 \u0915\u0930 \u0938\u0915\u093e\u0964 \u0915\u0943\u092a\u092f\u093e \u092b\u093f\u0930 \u0938\u0947 \u092a\u094d\u0930\u092f\u093e\u0938 \u0915\u0930\u0947\u0902\u0964",
            "en-IN": "I'm sorry, I couldn't process that right now. Could you please repeat?"
        }
        return fallbacks.get(self.language, fallbacks["en-IN"])

    def analyze_feedback_with_ai(self, text):
        """Analyze feedback text for sentiment, rating, and churn risk using Gemini 2.5 Flash."""
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
            
            response = self.gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'temperature': 0.0,
                }
            )
            if response.text:
                return json.loads(response.text)
        except Exception as e:
            self.log(f"Feedback analysis failed: {e}")
        return {"sentiment": "Neutral", "rating": 3, "summary": text[:60], "churn_risk": "Low"}


    def generate_llm_summary(self):
        """Generate a professional one-line summary using Gemini 2.5 Flash at the end of the call."""
        if not self.conversation:
            return "No interaction recorded."
            
        dialogue = ""
        for msg in self.conversation:
            role = "Agent" if msg["role"] == "agent" else "Customer"
            dialogue += f"{role}: {msg['content']}\n"
            
        prompt = f"Summarize this customer interaction in exactly one professional line (no dialogue): \n\n{dialogue}"
        
        try:
            response = self.gemini_client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt,
                config={
                    'system_instruction': "You are a professional showroom manager. Summarize the following call in one short line.",
                    'temperature': 0.1,
                }
            )
            if response.text:
                summary = response.text.strip()
                return summary.replace('"', '')
        except Exception as e:
            self.log(f"Summary generation failed: {e}")
            
        return retail_agent_utils.summarize_conversation(self.conversation)


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
            consecutive_silence = 0
            while True:
                user_text = self.listen_and_transcribe()
                
                if user_text is not None:
                    if user_text.strip():
                        consecutive_silence = 0
                        self.conversation.append({"role": "user", "content": user_text})
                        llm_reply = self.get_llm_response(user_text)
                        self.say(llm_reply)
                        # Real-time save after each turn
                        self._save_call_log()
                    else:
                        consecutive_silence += 1
                        if consecutive_silence >= 2:
                            self.say("I haven't heard from you in a while. Are you still there?")
                            if consecutive_silence >= 3:
                                self.say("Since I am not getting any response, I will end the call now. Thank you for calling Ather Energy!")
                                break
                        continue
                else:
                    # Potential hangup or STT error
                    self.log("No input or STT error detected.")
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

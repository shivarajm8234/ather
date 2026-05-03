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
        
        payload = {
            "inputs": [text],
            "target_language_code": lang_code,
            "speaker": "priya",
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
        self.log("Thinking (Sarvam LLM + Knowledge Graph)...")
        
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
        
        prompt = f"""
        You are a highly professional sales assistant for Ather Energy.
        Use the following Knowledge Graph (Categorized Data) to answer the user:
        {knowledge}
        
        CRITICAL INSTRUCTIONS:
        1. Answer ONLY using the facts from the Knowledge Graph above. Do not guess or make up details.
        2. If the user asks about something NOT in the graph, say "I don't have that information right now, but I can check for you."
        3. Speak in {self.language}.
        4. Be very concise (phone call style, max 1 or 2 sentences).
        
        USER QUERY: {text}
        """
        
        payload = {
            "model": "sarvam-105b",
            "messages": [{"role": "user", "content": prompt}]
        }
        
        try:
            # Using Sarvam's chat endpoint
            response = requests.post("https://api.sarvam.ai/v1/chat/completions", json=payload, headers=headers)
            if response.status_code == 200:
                content = response.json()["choices"][0]["message"].get("content")
                if content:
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
            return "क्षमा करें, मैं इस समय इसका उत्तर नहीं दे सकता।"
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
            
            if digit == '2':
                self.language = "kn-IN"
                self.say("ಧನ್ಯವಾದಗಳು. ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?")
            elif digit == '3':
                self.language = "hi-IN"
                self.say("धन्यवाद। मैं आपकी क्या सहायता कर सकता हूँ?")
            else:
                # Default to English (1 or timeout)
                self.language = "en-IN"
                self.say("Thank you. How can I help you today?")
                
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
                
                # Ensure directory exists (will fail if no permissions, caught by except)
                if not os.path.exists(log_dir):
                    os.makedirs(log_dir, exist_ok=True)
                
                log_file = f"{log_dir}/call_{unique_id}.json"
                
                call_data = {
                    "unique_id": unique_id,
                    "timestamp": datetime.now().isoformat(),
                    "language": self.language,
                    "conversation": self.conversation
                }
                
                with open(log_file, "w") as f:
                    json.dump(call_data, f, indent=4)
                    
                self.log(f"Conversation saved to {log_file}")
            except Exception as json_e:
                self.log(f"Failed to save JSON: {str(json_e)}")
                self.log("TIP: Run 'sudo chmod 777 /home/satoru/Desktop/ds' to fix permissions.")
                
            self.agi.hangup()

if __name__ == "__main__":
    agent = MultilingualVoiceAgent()
    agent.run()

import os
import json
import re
from datetime import datetime

BASE_DIR = "/home/satoru/Desktop/ds"
CALLS_DIR = os.path.join(BASE_DIR, "calls")
LEADS_FILE = os.path.join(BASE_DIR, "leads.json")
FEEDBACK_FILE = os.path.join(BASE_DIR, "feedback.json")
SERVICE_FILE = os.path.join(BASE_DIR, "service_records.json")

def load_json(path):
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return []
    return []

def save_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def detect_stage(summary):
    s = summary.lower()
    if any(w in s for w in ["booked", "booking", "bought", "order"]):
        return "Booking"
    if any(w in s for w in ["test ride", "drive", "trial", "visit"]):
        return "Test Ride"
    if any(w in s for w in ["discount", "price", "offer", "negotiate", "deal"]):
        return "Negotiation"
    if any(w in s for w in ["called", "spoke", "interaction", "contacted"]):
        return "Contacted"
    return "New Enquiry"

def sync():
    print("🔄 Dynamic Pipeline Sync Running...")
    
    leads = load_json(LEADS_FILE)
    feedbacks = load_json(FEEDBACK_FILE)
    services = load_json(SERVICE_FILE)
    
    # Track existing IDs to avoid duplicates
    existing_call_ids = {l.get('unique_id') for l in leads}
    
    for filename in os.listdir(CALLS_DIR):
        if not filename.endswith(".json"): continue
        path = os.path.join(CALLS_DIR, filename)
        
        try:
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                call_list = data if isinstance(data, list) else [data]
                
                for call in call_list:
                    uid = call.get('unique_id', f"sync_{filename}")
                    if uid in existing_call_ids:
                        # Update status of existing leads if they are in the list
                        for lead in leads:
                            if lead.get('unique_id') == uid:
                                lead['status'] = detect_stage(call.get('summary', ''))
                        continue
                    
                    phone = call.get('phone', 'Unknown')
                    name = call.get('customer_name', 'Unknown')
                    summary = call.get('summary', 'AI Interaction Summary')
                    timestamp = call.get('timestamp', datetime.now().isoformat())
                    
                    stage = detect_stage(summary)
                    print(f"➕ Syncing {name} -> {stage}")
                    
                    leads.append({
                        "id": f"L{len(leads) + 101}",
                        "unique_id": uid,
                        "customer_name": name,
                        "phone": phone,
                        "source": "AI Interaction Sync",
                        "priority": "Hot" if stage in ["Booking", "Test Ride", "Negotiation"] else "Medium",
                        "status": stage,
                        "timestamp": timestamp,
                        "notes": summary[:300]
                    })
                    existing_call_ids.add(uid)
                    
        except Exception as e:
            print(f"❌ Error: {e}")

    save_json(LEADS_FILE, leads)
    print("✅ Dynamic Pipeline Sync Complete!")

if __name__ == "__main__":
    sync()

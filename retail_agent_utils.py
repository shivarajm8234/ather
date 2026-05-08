import json
import os
import uuid
from datetime import datetime

LEADS_FILE = "/home/satoru/Desktop/ds/leads.json"
SERVICE_FILE = "/home/satoru/Desktop/ds/service_records.json"

def load_data(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r') as f:
        try:
            return json.load(f)
        except:
            return []

def save_data(file_path, data):
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

def add_lead(name, phone, source="Voice Call", notes="", priority="Medium"):
    leads = load_data(LEADS_FILE)
    new_lead = {
        "id": str(uuid.uuid4())[:8],
        "customer_name": name,
        "phone": phone,
        "source": source,
        "priority": priority,
        "status": "New Enquiry",
        "timestamp": datetime.now().isoformat(),
        "notes": notes
    }
    leads.insert(0, new_lead)
    save_data(LEADS_FILE, leads)
    return new_lead

def update_lead_status(lead_id, status):
    leads = load_data(LEADS_FILE)
    for lead in leads:
        if lead["id"] == lead_id:
            lead["status"] = status
            break
    save_data(LEADS_FILE, leads)

def get_due_services():
    records = load_data(SERVICE_FILE)
    return [r for r in records if r["status"] in ["Due Soon", "Overdue"]]

def mark_missed_service(vehicle_no):
    records = load_data(SERVICE_FILE)
    for record in records:
        if record["vehicle_no"] == vehicle_no:
            record["missed"] = True
            record["status"] = "Overdue"
    save_data(SERVICE_FILE, records)

def get_user_profile(phone):
    """Load or create a user profile based on phone number."""
    profile_path = f"/home/satoru/Desktop/ds/users/user_{phone}.json"
    if not os.path.exists("/home/satoru/Desktop/ds/users"):
        os.makedirs("/home/satoru/Desktop/ds/users", exist_ok=True)
    
    if os.path.exists(profile_path):
        with open(profile_path, 'r') as f:
            return json.load(f)
    return {"phone": phone, "name": "Unknown", "history": [], "preferences": {}}

def save_user_profile(profile):
    """Save user profile to its own JSON file."""
    phone = profile.get("phone", "unknown")
    profile_path = f"/home/satoru/Desktop/ds/users/user_{phone}.json"
    save_data(profile_path, profile)

def summarize_conversation(conversation):
    """Convert a technical conversation log into a human-readable summary."""
    summary_parts = []
    for msg in conversation:
        role = "Agent" if msg["role"] == "agent" else "Customer"
        summary_parts.append(f"{role}: {msg['content']}")
    return "\n".join(summary_parts)

if __name__ == "__main__":
    print("Retail Agent Utils Loaded.")

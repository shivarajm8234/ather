import json
import os
import uuid
from datetime import datetime

LEADS_FILE = "/home/satoru/Desktop/ather/leads.json"
SERVICE_FILE = "/home/satoru/Desktop/ather/service_records.json"
AVAILABILITY_FILE = "/home/satoru/Desktop/ather/service_availability.json"

STATIONS = ["Station A", "Station B", "Station C"]
WORKING_HOURS = ["10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"]

def load_data(file_path):
    if not os.path.exists(file_path):
        return []
    with open(file_path, 'r') as f:
        try:
            return json.load(f)
        except:
            return []

def save_data(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def add_lead(name, phone, source="Voice Call", notes="", priority="Medium", status="New Enquiry"):
    leads = load_data(LEADS_FILE)
    
    # Check for existing lead with same phone to update instead of creating new one
    existing_lead = None
    for l in leads:
        if l.get('phone') == phone:
            existing_lead = l
            break
            
    if existing_lead:
        # Update name if it was unknown
        if existing_lead.get('customer_name') == "Unknown" and name != "Unknown":
            existing_lead['customer_name'] = name
            
        existing_lead['status'] = status
        existing_lead['priority'] = priority
        
        # Append new notes with timestamp instead of overwriting
        old_notes = existing_lead.get('notes', '')
        new_entry = f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M')}] {notes}"
        existing_lead['notes'] = old_notes + new_entry
        
        existing_lead['timestamp'] = datetime.now().isoformat()
        save_data(LEADS_FILE, leads)
        return existing_lead

    # --- Agentic Allotment Logic ---
    staff_file = "/home/satoru/Desktop/ather/staff.json"
    staff_members = load_data(staff_file)
    assigned_to = "Unassigned"
    
    if staff_members:
        # Sort by conversion rate descending and take the best one
        best_agent = sorted(staff_members, key=lambda x: x.get('conversion_rate', 0), reverse=True)[0]
        assigned_to = best_agent.get('name', 'Unassigned')
    
    new_lead = {
        "id": str(uuid.uuid4())[:8],
        "customer_name": name,
        "phone": phone,
        "source": source,
        "priority": priority,
        "status": status,
        "timestamp": datetime.now().isoformat(),
        "notes": notes,
        "assigned_to": assigned_to
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
    """Load or create a user profile based on phone number (normalized)."""
    # Normalize: remove +, spaces, and leading zeros for better matching
    clean_phone = "".join(filter(str.isdigit, str(phone)))[-10:]
    profile_path = f"/home/satoru/Desktop/ather/users/user_{clean_phone}.json"
    
    # 1. Check if profile exists in users/
    if os.path.exists(profile_path):
        with open(profile_path, 'r') as f:
            return json.load(f)
    
    # 2. Secondary check: look for this phone in leads.json to recover name
    leads = load_data(LEADS_FILE)
    recovered_name = "Unknown"
    for lead in leads:
        lead_phone = "".join(filter(str.isdigit, str(lead.get('phone', ''))))[-10:]
        if lead_phone == clean_phone and lead.get('customer_name') != "Unknown":
            recovered_name = lead.get('customer_name')
            break
            
    new_profile = {
        "phone": clean_phone, 
        "name": recovered_name, 
        "history": [], 
        "preferences": {}, 
        "language": "en-IN"
    }
    save_user_profile(new_profile)
    return new_profile

def save_user_profile(profile):
    """Save user profile to its own JSON file."""
    phone = profile.get("phone", "unknown")
    clean_phone = "".join(filter(str.isdigit, str(phone)))[-10:]
    profile_path = f"/home/satoru/Desktop/ather/users/user_{clean_phone}.json"
    save_data(profile_path, profile)

def summarize_conversation(conversation):
    """Convert a technical conversation log into a human-readable summary."""
    summary_parts = []
    for msg in conversation:
        role = "Agent" if msg["role"] == "agent" else "Customer"
        summary_parts.append(f"{role}: {msg['content']}")
    return "\n".join(summary_parts)

def get_available_slots(date_str):
    """Check availability across 3 stations for a specific date."""
    bookings = load_data(AVAILABILITY_FILE)
    date_bookings = [b for b in bookings if b["date"] == date_str]
    
    available = {}
    for hour in WORKING_HOURS:
        hour_bookings = [b for b in date_bookings if b["time"] == hour]
        busy_stations = [b["station"] for b in hour_bookings]
        free_stations = [s for s in STATIONS if s not in busy_stations]
        if free_stations:
            available[hour] = free_stations
            
    return available

def book_service_slot(name, phone, date_str, time_str):
    """Autonomous allotment: Find first free station and book it."""
    # Normalize time: "10:00 AM" -> "10:00"
    clean_time = time_str.split(" ")[0].strip()
    if ":" not in clean_time:
        clean_time = f"{int(clean_time):02d}:00"
    
    available = get_available_slots(date_str)
    
    # If the exact slot is missing, try to find the closest working hour
    if clean_time not in available:
        # Simple fallback to first available slot if any
        if available:
            clean_time = list(available.keys())[0]
        else:
            return False, f"No slots available on {date_str}"
    
    station = available[clean_time][0] # Pick the first available station
    
    # Update Availability
    bookings = load_data(AVAILABILITY_FILE)
    bookings.append({
        "date": date_str,
        "time": time_str,
        "station": station,
        "customer": name
    })
    save_data(AVAILABILITY_FILE, bookings)
    
    # Update Service Records
    records = load_data(SERVICE_FILE)
    new_service = {
        "id": f"S{str(uuid.uuid4())[:4].upper()}",
        "customer_name": name,
        "phone": phone,
        "vehicle_no": "KA-MN-NEW",
        "current_km": 0,
        "service_type": "Autonomous Allotment",
        "status": "Scheduled",
        "appointment_date": date_str,
        "appointment_time": clean_time,
        "station": station
    }
    records.append(new_service)
    save_data(SERVICE_FILE, records)
    
    return True, f"Booked at {station} for {clean_time}"

def save_feedback(name, phone, feedback_text):
    feedback_file = "/home/satoru/Desktop/ather/feedback.json"
    data = load_data(feedback_file)
    new_fb = {
        "id": str(uuid.uuid4())[:8],
        "customer_name": name,
        "phone": phone,
        "feedback": feedback_text,
        "sentiment": "Positive" if "good" in feedback_text.lower() or "happy" in feedback_text.lower() else "Neutral",
        "timestamp": datetime.now().isoformat()
    }
    data.insert(0, new_fb)
    save_data(feedback_file, data)
    return new_fb

if __name__ == "__main__":
    print("Retail Agent Utils Loaded.")

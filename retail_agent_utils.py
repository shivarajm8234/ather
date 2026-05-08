import json
import os
import uuid
from datetime import datetime

LEADS_FILE = "/home/satoru/Desktop/ds/leads.json"
SERVICE_FILE = "/home/satoru/Desktop/ds/service_records.json"
AVAILABILITY_FILE = "/home/satoru/Desktop/ds/service_availability.json"

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
    with open(file_path, 'w') as f:
        json.dump(data, f, indent=4)

def add_lead(name, phone, source="Voice Call", notes="", priority="Medium"):
    leads = load_data(LEADS_FILE)
    
    # --- Agentic Allotment Logic ---
    staff_file = "/home/satoru/Desktop/ds/staff.json"
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
        "status": "New Enquiry",
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
    available = get_available_slots(date_str)
    if time_str not in available:
        return False, "Slot unavailable"
    
    station = available[time_str][0] # Pick the first available station
    
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
        "appointment_time": time_str,
        "station": station
    }
    records.append(new_service)
    save_data(SERVICE_FILE, records)
    
    return True, f"Booked at {station} for {time_str}"

if __name__ == "__main__":
    print("Retail Agent Utils Loaded.")

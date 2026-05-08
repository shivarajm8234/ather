#!/usr/bin/env python3
import time
import json
from retail_agent_utils import get_due_services

def run_outreach():
    print("--- Proactive Service Outreach Agent ---")
    due_customers = get_due_services()
    
    if not due_customers:
        print("No customers due for service today.")
        return

    for customer in due_customers:
        print(f"\n[Outreach] Contacting {customer['customer_name']} ({customer['phone']})")
        print(f"[Reason] Vehicle {customer['vehicle_no']} is reaching {customer['service_type']}")
        
        # Simulate call/message status
        status_options = ["Not Picking", "Not Reachable", "Switched Off", "Appointment Scheduled"]
        import random
        result = random.choice(status_options)
        
        print(f"[Result] {result}")
        
        if result in ["Not Picking", "Not Reachable", "Switched Off"]:
            print(f"[Action] Adding to 'Pending Follow-up' list.")
            # In a real system, we'd update a separate 'follow_up' table
        else:
            print(f"[Action] Service scheduled.")

if __name__ == "__main__":
    while True:
        run_outreach()
        print("\nWaiting for next batch...")
        time.sleep(30) # Run every 30 seconds for demo

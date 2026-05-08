import pyotp
import json
import os
import hashlib

# Configuration
USERNAME = "admin@ather.energy"
PASSWORD = "Ather@2026!"
ISSUER = "AtherAI"

def setup():
    # 1. Generate TOTP Secret
    secret = pyotp.random_base32()
    
    # 2. Generate Provisioning URI (for QR Code)
    totp = pyotp.TOTP(secret)
    provisioning_uri = totp.provisioning_uri(name=USERNAME, issuer_name=ISSUER)
    
    # 3. Save to users.json
    # In a real app, use bcrypt. Here we use sha256 for simplicity in this demo environment.
    password_hash = hashlib.sha256(PASSWORD.encode()).hexdigest()
    
    auth_data = {
        "username": USERNAME,
        "password_hash": password_hash,
        "totp_secret": secret
    }
    
    with open("users.json", "w") as f:
        json.dump(auth_data, f, indent=4)
    
    print("\n" + "="*50)
    print("🔐 ATHER AI AUTHENTICATOR CONFIGURATION")
    print("="*50)
    print(f"👤 Username: {USERNAME}")
    print(f"🔑 Password: {PASSWORD}")
    print("-"*50)
    print(f"📟 TOTP Secret (Manual Entry): {secret}")
    print(f"🔗 Provisioning URL (for QR Code):")
    print(provisioning_uri)
    print("="*50)
    print("✅ Configuration saved to users.json")
    print("Please enter the Secret into your Google Authenticator app.")
    print("="*50 + "\n")

if __name__ == "__main__":
    setup()

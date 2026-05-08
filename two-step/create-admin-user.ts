
import bcrypt from "bcryptjs";
import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import speakeasy from "speakeasy";
import { adminAccounts } from "../db/schema";

// DB Access (Direct, not via server/db which needs server env context)
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error("❌ DATABASE_URL or SUPABASE_DB_URL is required");
    process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client);

async function createAdmin() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.error("Usage: tsx scripts/create-admin-user.ts <email> <password>");
        process.exit(1);
    }

    console.log(`Creating admin user: ${email}`);

    // 1. Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 2. Generate TOTP secret
    const secret = speakeasy.generateSecret({ length: 20 });
    const totpSecret = secret.base32;

    try {
        // 3. Insert into DB
        const [admin] = await db
            .insert(adminAccounts)
            .values({
                email: email.toLowerCase(),
                passwordHash,
                totpSecret,
                twoFaEnabled: true, // Auto-enable 2FA for safety
                role: "SUPER_ADMIN",
            })
            .returning();

        console.log(`
✅ Admin user created successfully!

Email: ${admin.email}
Role: ${admin.role}
2FA: Enabled

⚠️  IMPORTANT: YOU MUST CONFIGURE YOUR AUTHENTICATOR APP NOW ⚠️

TOTP Secret: ${totpSecret}
(Enter this code manually into Google Authenticator or Authy)

OTP Auth URL (for QR code generators):
${secret.otpauth_url}
`);
    } catch (e: any) {
        if (e.code === "23505") {
            console.error("❌ Error: Admin with this email already exists.");
        } else {
            console.error("❌ Error creating admin:", e);
        }
    } finally {
        await client.end();
    }
}

createAdmin();

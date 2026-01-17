import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Firebase project config
const FIREBASE_PROJECT_ID = "studdy-buddy-bd";
const FIREBASE_API_KEY = "AIzaSyBlg8zpozVE_21wnoR8zan1w376U6_hm-4";

// Firestore REST API base URL
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// Helper to create Firestore document via REST API
async function setFirestoreDoc(
  collectionPath: string,
  docId: string,
  data: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const url = `${FIRESTORE_URL}/${collectionPath}/${docId}?key=${FIREBASE_API_KEY}`;
  
  // Convert data to Firestore format
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === null) {
      fields[key] = { nullValue: null };
    } else if (typeof value === "string") {
      fields[key] = { stringValue: value };
    } else if (typeof value === "number") {
      if (Number.isInteger(value)) {
        fields[key] = { integerValue: String(value) };
      } else {
        fields[key] = { doubleValue: value };
      }
    } else if (typeof value === "boolean") {
      fields[key] = { booleanValue: value };
    } else if (value instanceof Date) {
      fields[key] = { timestampValue: value.toISOString() };
    } else if (typeof value === "object" && "timestampValue" in (value as object)) {
      fields[key] = value;
    }
  }

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorData}` };
    }

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

// Helper to create timestamp value
function timestamp(dateString: string): { timestampValue: string } {
  return { timestampValue: new Date(dateString).toISOString() };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Starting user data migration: Lovable DB → Firebase Firestore");

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // STEP 1: Fetch all data from Lovable DB
    // ============================================
    console.log("📖 Reading from Lovable DB (READ-ONLY)...");

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*");

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    // Fetch all coachings
    const { data: coachings, error: coachingsError } = await supabase
      .from("coachings")
      .select("*");

    if (coachingsError) {
      throw new Error(`Failed to fetch coachings: ${coachingsError.message}`);
    }

    // Fetch auth users for emails
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`);
    }

    const authUsers = authData.users;
    console.log(`📊 Found ${profiles?.length || 0} profiles, ${coachings?.length || 0} coachings, ${authUsers.length} auth users`);

    // Create email lookup map
    const emailMap = new Map<string, string>();
    for (const authUser of authUsers) {
      emailMap.set(authUser.id, authUser.email || "");
    }

    // ============================================
    // STEP 2: Migrate to Firebase collections
    // ============================================
    const migrationReport = {
      users: { success: 0, failed: 0, errors: [] as string[] },
      students: { success: 0, failed: 0, errors: [] as string[] },
      teachers: { success: 0, failed: 0, errors: [] as string[] },
      coachings: { success: 0, failed: 0, errors: [] as string[] },
    };

    // Migrate coachings first (needed for references)
    console.log("📝 Migrating coachings...");
    for (const coaching of coachings || []) {
      const result = await setFirestoreDoc("coachings", coaching.id, {
        coachingId: coaching.id,
        name: coaching.name,
        teacherUid: coaching.teacher_id,
        inviteToken: coaching.invite_token,
        ...timestamp(coaching.created_at),
      });

      if (result.success) {
        migrationReport.coachings.success++;
        console.log(`  ✅ Coaching: ${coaching.name} (${coaching.id})`);
      } else {
        migrationReport.coachings.failed++;
        migrationReport.coachings.errors.push(`${coaching.id}: ${result.error}`);
        console.error(`  ❌ Coaching ${coaching.id}:`, result.error);
      }
    }

    // Migrate users, students, and teachers
    console.log("📝 Migrating users...");
    for (const profile of profiles || []) {
      const uid = profile.user_id;
      const email = emailMap.get(uid) || "";
      const role = profile.role as "student" | "teacher";
      const status = profile.student_status === "approved" 
        ? "active" 
        : profile.student_status === "rejected" 
        ? "rejected" 
        : "pending";

      // 1. Create users/{uid} document
      const userResult = await setFirestoreDoc("users", uid, {
        uid,
        email,
        name: profile.full_name,
        role,
        coachingId: profile.coaching_id || null,
        createdAt: timestamp(profile.created_at).timestampValue,
        updatedAt: timestamp(profile.updated_at).timestampValue,
      });

      if (userResult.success) {
        migrationReport.users.success++;
        console.log(`  ✅ User: ${profile.full_name} (${role})`);
      } else {
        migrationReport.users.failed++;
        migrationReport.users.errors.push(`${uid}: ${userResult.error}`);
        console.error(`  ❌ User ${uid}:`, userResult.error);
      }

      // 2. Create role-specific document
      if (role === "student") {
        const studentResult = await setFirestoreDoc("students", uid, {
          uid,
          coachingId: profile.coaching_id || null,
          status,
          class: profile.student_class || null,
          board: profile.board || null,
          tone: profile.tone || "chill-bro",
          enrolledAt: timestamp(profile.created_at).timestampValue,
        });

        if (studentResult.success) {
          migrationReport.students.success++;
          console.log(`    ✅ Student record: ${profile.full_name} (${status})`);
        } else {
          migrationReport.students.failed++;
          migrationReport.students.errors.push(`${uid}: ${studentResult.error}`);
          console.error(`    ❌ Student ${uid}:`, studentResult.error);
        }
      } else if (role === "teacher") {
        const teacherResult = await setFirestoreDoc("teachers", uid, {
          uid,
          coachingId: profile.coaching_id || null,
          createdAt: timestamp(profile.created_at).timestampValue,
        });

        if (teacherResult.success) {
          migrationReport.teachers.success++;
          console.log(`    ✅ Teacher record: ${profile.full_name}`);
        } else {
          migrationReport.teachers.failed++;
          migrationReport.teachers.errors.push(`${uid}: ${teacherResult.error}`);
          console.error(`    ❌ Teacher ${uid}:`, teacherResult.error);
        }
      }
    }

    // ============================================
    // STEP 3: Generate migration report
    // ============================================
    console.log("\n📊 MIGRATION COMPLETE\n");
    console.log("============================================");
    console.log("Firebase Collection Counts:");
    console.log(`  users: ${migrationReport.users.success} documents`);
    console.log(`  students: ${migrationReport.students.success} documents`);
    console.log(`  teachers: ${migrationReport.teachers.success} documents`);
    console.log(`  coachings: ${migrationReport.coachings.success} documents`);
    console.log("============================================");
    console.log("\n✅ Lovable DB is now READ-ONLY for user data");

    const response = {
      success: true,
      message: "User data migration completed successfully",
      firebaseCollections: {
        users: migrationReport.users.success,
        students: migrationReport.students.success,
        teachers: migrationReport.teachers.success,
        coachings: migrationReport.coachings.success,
      },
      errors: {
        users: migrationReport.users.errors,
        students: migrationReport.students.errors,
        teachers: migrationReport.teachers.errors,
        coachings: migrationReport.coachings.errors,
      },
      lovableDbStatus: "READ-ONLY",
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Migration failed:", message);
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

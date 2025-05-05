
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.8.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 204,
    });
  }

  try {
    console.log("Starting getAllUserEmails function...");
    
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase URL or Service Role Key");
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client created");

    // Get all users from the auth.users table
    console.log("Fetching auth users...");
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      console.error("Error fetching auth users:", authError);
      return new Response(JSON.stringify({ error: "Failed to fetch users", details: authError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    console.log(`Found ${authUsers.users.length} auth users`);
    
    // Create a map of user IDs to emails
    const userEmailMap = {};
    authUsers.users.forEach((user) => {
      userEmailMap[user.id] = user.email;
      console.log(`User ID: ${user.id}, Email: ${user.email}`);
    });

    // Return all users data for debugging
    return new Response(JSON.stringify({ 
      userEmails: userEmailMap,
      totalUsers: authUsers.users.length,
      usersData: authUsers.users.map(u => ({ 
        id: u.id, 
        email: u.email,
        createdAt: u.created_at
      }))
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Error stack:", error.stack);
    return new Response(JSON.stringify({ error: "Server error", details: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});


import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestBody = await req.json()
    console.log("Request body received:", requestBody)

    const { email, password, fullName, role, accountNames = [] } = requestBody

    console.log("Creating user:", { email, fullName, role, accountNames })

    // Validate required fields
    if (!email || !password || !fullName || !role) {
      console.error("Missing required fields:", { email: !!email, password: !!password, fullName: !!fullName, role: !!role })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: email, password, fullName, role' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create user with Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    })

    if (authError) {
      console.error("Auth error:", authError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: authError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log("User created in auth:", authUser.user.id)

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authUser.user.id,
        full_name: fullName,
        role: role,
        language: 'es'
      })

    if (profileError) {
      console.error("Profile error:", profileError)
      // Try to delete the auth user if profile creation fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      } catch (e) {
        console.error("Error cleaning up auth user:", e)
      }
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: profileError.message 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log("Profile created")

    // Get account IDs by names if provided
    if (accountNames && accountNames.length > 0) {
      const { data: accounts, error: accountsError } = await supabaseAdmin
        .from('accounts')
        .select('id, name')
        .in('name', accountNames)

      if (accountsError) {
        console.error("Accounts error:", accountsError)
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: accountsError.message 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      console.log("Found accounts:", accounts)

      // Assign user to accounts
      if (accounts && accounts.length > 0) {
        const userAccountsData = accounts.map(account => ({
          user_id: authUser.user.id,
          account_id: account.id
        }))

        const { error: userAccountsError } = await supabaseAdmin
          .from('user_accounts')
          .insert(userAccountsData)

        if (userAccountsError) {
          console.error("User accounts error:", userAccountsError)
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: userAccountsError.message 
            }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }

        console.log("User assigned to accounts")
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: authUser.user,
        message: "Usuario creado exitosamente"
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error("Error creating user:", error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || "Error interno del servidor"
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

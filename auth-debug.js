const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://gbtozqgisxjdrjxubftq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdidG96cWdpc3hqZHJqeHViZnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTg3MjMsImV4cCI6MjA2NjMzNDcyM30.k_y_yXVYC7aCR2wWA-cZkzr-y3tjHWxAiBMIWSBc54M';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Deep authentication debugging
 */

async function checkAuthSettings() {
  console.log('🔧 Checking authentication configuration...');
  
  try {
    // Try to get current session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    console.log('Current session:', sessionData?.session ? 'EXISTS' : 'NONE');
    
    if (sessionError) {
      console.error('Session error:', sessionError);
    }
    
    // Get auth user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    console.log('Current user:', userData?.user ? userData.user.email : 'NONE');
    
    if (userError) {
      console.error('User error:', userError);
    }
    
  } catch (error) {
    console.error('❌ Auth check error:', error);
  }
}

async function listAllAuthUsers() {
  console.log('👥 Checking users in auth.users (via admin API)...');
  
  try {
    // This won't work with anon key, but let's try
    console.log('Note: This requires admin privileges - checking what we can see...');
    
    // Check our users table instead
    const { data, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error('❌ Error accessing users table:', error);
    } else {
      console.log(`📊 Found ${data.length} users in database:`);
      data.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.full_name} (${user.email}) - ID: ${user.id}`);
        console.log(`     Created: ${user.created_at}`);
        console.log(`     Avatar: ${user.avatar_url || 'None'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error listing users:', error);
  }
}

async function testSpecificCredentials(email, password) {
  console.log(`🔑 Testing specific credentials: ${email}`);
  
  try {
    // First, let's see if we can find any info about this email
    console.log('Step 1: Checking if user exists in our database...');
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (dbError) {
      if (dbError.code === 'PGRST116') {
        console.log('❌ User not found in database');
      } else {
        console.error('❌ Database error:', dbError);
      }
    } else {
      console.log('✅ User found in database:', dbUser.full_name);
      console.log('   User ID:', dbUser.id);
      console.log('   Created:', dbUser.created_at);
    }
    
    console.log('\nStep 2: Attempting sign in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('❌ Sign in failed:', authError);
      console.log('Error details:');
      console.log('  - Code:', authError.code || 'N/A');
      console.log('  - Status:', authError.status || 'N/A');
      console.log('  - Message:', authError.message);
      
      // Provide specific guidance based on error
      if (authError.message.includes('Invalid login credentials')) {
        console.log('\n💡 This could mean:');
        console.log('   1. Wrong password');
        console.log('   2. User doesn\'t exist in auth.users table');
        console.log('   3. Email verification required');
        console.log('   4. Account disabled/locked');
      } else if (authError.message.includes('Email not confirmed')) {
        console.log('\n💡 Email verification is required');
        console.log('   - Go to Supabase Dashboard > Auth > Users');
        console.log('   - Find the user and mark as "Email Confirmed"');
      }
      
      return false;
    }

    console.log('✅ Sign in successful!');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);
    console.log('Email verified:', authData.user.email_confirmed_at ? 'YES' : 'NO');
    console.log('Last sign in:', authData.user.last_sign_in_at);
    
    return true;
  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function createFreshTestUser() {
  console.log('👤 Creating a fresh test user...');
  
  const email = `test${Date.now()}@beautify.app`;
  const password = 'testpass123';
  const fullName = 'Fresh Test User';
  
  try {
    console.log(`Creating user: ${email}`);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        }
      }
    });

    if (error) {
      console.error('❌ Sign up failed:', error);
      return null;
    }

    console.log('✅ User created successfully');
    console.log('User ID:', data.user.id);
    console.log('Email verified:', data.user.email_confirmed_at ? 'YES' : 'NO');
    console.log('Session created:', data.session ? 'YES' : 'NO');
    
    return { email, password, user: data.user };
  } catch (error) {
    console.error('❌ Error creating user:', error);
    return null;
  }
}

async function diagnoseAuthIssue() {
  console.log('🔍 COMPREHENSIVE AUTHENTICATION DIAGNOSIS');
  console.log('=' .repeat(60));
  
  // Step 1: Check basic auth state
  await checkAuthSettings();
  
  console.log('\n' + '='.repeat(60));
  
  // Step 2: List users in database
  await listAllAuthUsers();
  
  console.log('\n' + '='.repeat(60));
  
  // Step 3: Test with known credentials
  console.log('🧪 Testing with known credentials...');
  const testResult = await testSpecificCredentials('test@beautify.app', 'testpass123');
  
  if (!testResult) {
    console.log('\n' + '='.repeat(60));
    
    // Step 4: Create fresh user and test immediately
    console.log('🆕 Creating fresh user for testing...');
    const newUser = await createFreshTestUser();
    
    if (newUser) {
      console.log('\n🔄 Testing with fresh user...');
      await testSpecificCredentials(newUser.email, newUser.password);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 DIAGNOSIS COMPLETE');
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Check Supabase Dashboard > Auth > Settings');
  console.log('   - Disable "Enable email confirmations" for development');
  console.log('2. Check Supabase Dashboard > Auth > Users');
  console.log('   - Verify users exist and are confirmed');
  console.log('3. Check Supabase Dashboard > Auth > Policies');
  console.log('   - Ensure RLS policies allow authentication');
  console.log('4. Use fresh credentials created by this script');
}

// Run the diagnosis
diagnoseAuthIssue().catch(console.error); 
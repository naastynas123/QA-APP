// Supabase Configuration
console.log('[config.js] Starting Supabase initialization...');
const SUPABASE_URL = 'https://rpsxigsbyvyrzpvaukvv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwc3hpZ3NieXZ5cnpwdmF1a3Z2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2NzAwMjEsImV4cCI6MjA4MjI0NjAyMX0.lZEM_To2ld1LB_G-MqWN4kv9X5L-rn2a0zLRR4070x4';

// Global supabase client
window.supabaseClient = null;
let supabaseReady = false;

// Try to initialize Supabase
function initializeSupabaseClient() {
    if (!window.supabase || !window.supabase.createClient) {
        console.log('[config.js] Waiting for Supabase library to load...');
        setTimeout(initializeSupabaseClient, 100);
        return;
    }
    
    try {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        });
        supabaseReady = true;
        console.log('[config.js] ✓ Supabase client initialized successfully');
        console.log('[config.js] supabaseClient:', window.supabaseClient);
    } catch (e) {
        console.error('[config.js] Failed to initialize Supabase:', e);
    }
}

// Start initialization immediately
initializeSupabaseClient();

// Also initialize on DOMContentLoaded as a backup
document.addEventListener('DOMContentLoaded', function() {
    if (!supabaseReady) {
        console.log('DOMContentLoaded triggered, re-checking Supabase...');
        initializeSupabaseClient();
    }
});

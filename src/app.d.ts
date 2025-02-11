declare global {
	namespace App {
		interface Locals {
			supabase: import('@supabase/supabase-js').SupabaseClient
		}
		interface PageData {
			session: import('@supabase/supabase-js').Session | null
		}
		interface Platform {}
	}
	interface ImportMetaEnv {
		PUBLIC_SUPABASE_URL: string
		PUBLIC_SUPABASE_ANON_KEY: string
	}
}

export {};
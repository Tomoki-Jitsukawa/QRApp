import { SupabaseClient } from '@supabase/supabase-js';

// MVPフェーズではSupabaseを実際には使用しないため、モックのクライアントを作成
const mockClient = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (callback: (event: any, session: any) => void) => {
      // Auth state changeイベントをモック化
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signUp: async () => ({ data: null, error: null }),
    signInWithPassword: async () => ({ data: null, error: null }),
    signOut: async () => ({ error: null })
  },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        order: () => ({ data: [], error: null })
      }),
      order: () => ({ data: [], error: null })
    }),
    insert: () => ({ data: null, error: null }),
    update: () => ({
      eq: () => ({ data: null, error: null })
    }),
    delete: () => ({
      eq: () => ({ data: null, error: null })
    })
  })
};

// MVPフェーズでは常にモッククライアントを使用
// 将来的には環境変数の設定に基づいて実際のSupabaseクライアントを使用する
export const supabase = mockClient as unknown as SupabaseClient;

/* 実際にSupabaseを使用する場合は以下のコードを使用
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Using mock client.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
*/ 
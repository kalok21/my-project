export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          user_id: string
          type_id: number
          name: string
          currency: string
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type_id: number
          name: string
          currency?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type_id?: number
          name?: string
          currency?: string
          balance?: number
          created_at?: string
          updated_at?: string
        }
      }
      account_types: {
        Row: {
          id: number
          user_id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          user_id: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          user_id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      accounting_entries: {
        Row: {
          id: string
          user_id: string
          type: 'income' | 'expense' | 'transfer'
          amount: number
          currency: string
          category: string
          subcategory: string | null
          payment_method: string
          description: string | null
          exchange_rate: number
          transaction_date: string
          account_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'income' | 'expense' | 'transfer'
          amount: number
          currency?: string
          category: string
          subcategory?: string | null
          payment_method: string
          description?: string | null
          exchange_rate?: number
          transaction_date: string
          account_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'income' | 'expense' | 'transfer'
          amount?: number
          currency?: string
          category?: string
          subcategory?: string | null
          payment_method?: string
          description?: string | null
          exchange_rate?: number
          transaction_date?: string
          account_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_credentials: {
        Row: {
          id: string
          username: string
          password_hash: string
          name: string
          avatar: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          username: string
          password_hash: string
          name: string
          avatar?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          password_hash?: string
          name?: string
          avatar?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_user: {
        Args: {
          input_username: string
          input_password: string
        }
        Returns: {
          user_id: string
          username: string
          name: string
          avatar: string | null
        }[]
      }
      create_user_credential: {
        Args: {
          input_username: string
          input_password: string
          input_name: string
          input_avatar?: string | null
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
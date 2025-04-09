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
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_matches: {
        Row: {
          away_team: string
          created_at: string
          home_team: string
          id: string
          league: string
          league_id: string
          match_date: string
          match_id: string
          user_id: string
        }
        Insert: {
          away_team: string
          created_at?: string
          home_team: string
          id?: string
          league: string
          league_id: string
          match_date: string
          match_id: string
          user_id: string
        }
        Update: {
          away_team?: string
          created_at?: string
          home_team?: string
          id?: string
          league?: string
          league_id?: string
          match_date?: string
          match_id?: string
          user_id?: string
        }
        Relationships: []
      }
      favorite_teams: {
        Row: {
          created_at: string
          id: string
          team_id: string
          team_logo: string
          team_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          team_logo: string
          team_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          team_logo?: string
          team_name?: string
          user_id?: string
        }
        Relationships: []
      }
      match_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: []
      }
      match_odds: {
        Row: {
          bookmaker: string
          created_at: string
          home_odds: number
          draw_odds: number
          away_odds: number
          id: string
          match_id: string
        }
        Insert: {
          bookmaker: string
          created_at?: string
          home_odds: number
          draw_odds: number
          away_odds: number
          id?: string
          match_id: string
        }
        Update: {
          bookmaker?: string
          created_at?: string
          home_odds?: number
          draw_odds?: number
          away_odds?: number
          id?: string
          match_id?: string
        }
        Relationships: []
      }
      match_predictions: {
        Row: {
          created_at: string
          id: string
          match_id: string
          prediction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: string
          prediction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string
          prediction?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          subscription_tier: string | null
          total_predictions: number | null
          winning_predictions: number | null
          total_profit: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          subscription_tier?: string | null
          total_predictions?: number | null
          winning_predictions?: number | null
          total_profit?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          subscription_tier?: string | null
          total_predictions?: number | null
          winning_predictions?: number | null
          total_profit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_predictions: {
        Row: {
          id: string
          user_id: string
          match_id: string
          prediction: string
          odds: number
          stake: number
          result: string | null
          created_at: string
          match_date: string
          home_team: string
          away_team: string
          league: string
          final_score: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          match_id: string
          prediction: string
          odds: number
          stake: number
          result?: string | null
          created_at?: string
          match_date: string
          home_team: string
          away_team: string
          league: string
          final_score?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          match_id?: string
          prediction?: string
          odds?: number
          stake?: number
          result?: string | null
          created_at?: string
          match_date?: string
          home_team?: string
          away_team?: string
          league?: string
          final_score?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "user_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_rankings: {
        Row: {
          accuracy_rate: number
          correct_predictions: number
          id: string
          league_id: string
          total_predictions: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy_rate: number
          correct_predictions: number
          id?: string
          league_id: string
          total_predictions: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy_rate?: number
          correct_predictions?: number
          id?: string
          league_id?: string
          total_predictions?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

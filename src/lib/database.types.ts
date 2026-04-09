export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      competitions: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          admin_id: string;
          status: 'active' | 'finished' | 'draft';
          settings: Json;
          invite_code: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          admin_id: string;
          status?: 'active' | 'finished' | 'draft';
          settings?: Json;
          invite_code?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          admin_id?: string;
          status?: 'active' | 'finished' | 'draft';
          settings?: Json;
          invite_code?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'competitions_admin_id_fkey';
            columns: ['admin_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      competition_members: {
        Row: {
          id: string;
          competition_id: string;
          user_id: string;
          status: 'pending' | 'accepted' | 'rejected';
          total_points: number;
          joined_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          user_id: string;
          status?: 'pending' | 'accepted' | 'rejected';
          total_points?: number;
          joined_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string;
          user_id?: string;
          status?: 'pending' | 'accepted' | 'rejected';
          total_points?: number;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'competition_members_competition_id_fkey';
            columns: ['competition_id'];
            isOneToOne: false;
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'competition_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      game_days: {
        Row: {
          id: string;
          competition_id: string;
          scheduled_date: string;
          game_name: string;
          base_points: number;
          multiplier: number;
          bonus_config: Json;
          status: 'upcoming' | 'open' | 'closed' | 'validated';
          created_at: string;
        };
        Insert: {
          id?: string;
          competition_id: string;
          scheduled_date: string;
          game_name: string;
          base_points?: number;
          multiplier?: number;
          bonus_config?: Json;
          status?: 'upcoming' | 'open' | 'closed' | 'validated';
          created_at?: string;
        };
        Update: {
          id?: string;
          competition_id?: string;
          scheduled_date?: string;
          game_name?: string;
          base_points?: number;
          multiplier?: number;
          bonus_config?: Json;
          status?: 'upcoming' | 'open' | 'closed' | 'validated';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_days_competition_id_fkey';
            columns: ['competition_id'];
            isOneToOne: false;
            referencedRelation: 'competitions';
            referencedColumns: ['id'];
          }
        ];
      };
      game_results: {
        Row: {
          id: string;
          game_day_id: string;
          player_id: string;
          claimed_place: number | null;
          claimed_points: number | null;
          validated_points: number | null;
          status: 'pending' | 'validated' | 'rejected';
          created_at: string;
        };
        Insert: {
          id?: string;
          game_day_id: string;
          player_id: string;
          claimed_place?: number | null;
          claimed_points?: number | null;
          validated_points?: number | null;
          status?: 'pending' | 'validated' | 'rejected';
          created_at?: string;
        };
        Update: {
          id?: string;
          game_day_id?: string;
          player_id?: string;
          claimed_place?: number | null;
          claimed_points?: number | null;
          validated_points?: number | null;
          status?: 'pending' | 'validated' | 'rejected';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'game_results_game_day_id_fkey';
            columns: ['game_day_id'];
            isOneToOne: false;
            referencedRelation: 'game_days';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'game_results_player_id_fkey';
            columns: ['player_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'join_request' | 'join_accepted' | 'join_rejected' | 'result_validated' | 'game_day_upcoming';
          data: Json;
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'join_request' | 'join_accepted' | 'join_rejected' | 'result_validated' | 'game_day_upcoming';
          data?: Json;
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'join_request' | 'join_accepted' | 'join_rejected' | 'result_validated' | 'game_day_upcoming';
          data?: Json;
          read?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_member_points: {
        Args: { p_competition_id: string; p_user_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Competition = Database['public']['Tables']['competitions']['Row'];
export type CompetitionMember = Database['public']['Tables']['competition_members']['Row'];
export type GameDay = Database['public']['Tables']['game_days']['Row'];
export type GameResult = Database['public']['Tables']['game_results']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];

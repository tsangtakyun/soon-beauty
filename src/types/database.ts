// Database types for Neaty Beauty
// To regenerate: npm run db:types (after setting your Supabase project ID)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SuitableShades = {
  lip: string[];
  blush: string[];
  eyeshadow: string[];
  foundation: string[];
};

export type ColorAnalysisScores = {
  warmth: number;
  contrast: number;
  clarity: number;
};

export type ColorSample = {
  label: string;
  hex: string;
};

export type ColorRecommendations = {
  best_colors: string[];
  secondary_colors: string[];
  avoid_colors: string[];
  base_makeup: string[];
  blush: string[];
  eyeshadow: string[];
  lip: string[];
  hair_colors: string[];
  nail_colors: string[];
  clothing_colors: string[];
  jewelry_metals: string[];
  jewelry_styles: string[];
  quick_tips: string[];
};

export type ColorProfile = {
  analysis_method?: 'guided' | 'quick';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  warm_cool: 'warm' | 'cool' | 'neutral';
  skin_depth: 'fair' | 'light' | 'medium' | 'tan' | 'deep';
  undertone: 'yellow' | 'pink' | 'olive' | 'neutral';
  suitable_shades: SuitableShades;
  avoid_shades: string[];
  season_description: string;
  analysed_at?: string;
  selfie_url?: string | null;
  season_confidence?: 'high' | 'medium' | 'low';
  overall_impression?: string;
  celebrity_references?: string[];
  key_traits?: string[];
  notes?: string;
  photo_observation?: string | null;
  scores?: ColorAnalysisScores;
  recommendations?: ColorRecommendations;
  color_samples?: ColorSample[];
};

type ProfilesRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  locale: string;
  tier: 'free' | 'pro' | 'pro_plus';
  item_limit: number;
  color_profile: ColorProfile | null;
  created_at: string;
  updated_at: string;
};

type CategoriesRow = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number;
  is_default: boolean;
  parent_id: string | null;
  group_name: string | null;
  shade: string | null;
  created_at: string;
};

type ProductsRow = {
  id: string;
  user_id: string;
  category_id: string | null;
  tags: string[] | null;
  on_watchlist: boolean | null;
  ingredients_analysis: Json | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  production_date: string | null;
  expiry_date: string | null;
  opened_date: string | null;
  pao_months: number | null;
  status: 'unopened' | 'in_use' | 'finished' | 'discarded';
  photo_url: string | null;
  notes: string | null;
  location: string | null;
  price: number | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

type RecentMakeupLogsRow = {
  id: string;
  user_id: string;
  title: string | null;
  notes: string | null;
  selfie_url: string | null;
  share_image_url: string | null;
  share_template_id: string | null;
  used_product_ids: string[];
  created_at: string;
};

type ProductPanLogsRow = {
  id: string;
  user_id: string;
  product_id: string;
  month_key: string;
  logged_date: string;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
};

type ProductLogsRow = {
  id: string;
  user_id: string;
  product_id: string;
  logged_date: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          locale?: string;
          tier?: 'free' | 'pro' | 'pro_plus';
          item_limit?: number;
          color_profile?: ColorProfile | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      categories: {
        Row: CategoriesRow;
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          icon?: string | null;
          sort_order?: number;
          is_default?: boolean;
          parent_id?: string | null;
          group_name?: string | null;
          shade?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'categories_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      products: {
        Row: ProductsRow;
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          tags?: string[] | null;
          on_watchlist?: boolean | null;
          ingredients_analysis?: Json | null;
          name: string;
          brand?: string | null;
          barcode?: string | null;
          production_date?: string | null;
          expiry_date?: string | null;
          opened_date?: string | null;
          pao_months?: number | null;
          status?: 'unopened' | 'in_use' | 'finished' | 'discarded';
          photo_url?: string | null;
          notes?: string | null;
          location?: string | null;
          price?: number | null;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'products_with_expiry';
            referencedColumns: ['category_id'];
          },
          {
            foreignKeyName: 'products_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      recent_makeup_logs: {
        Row: RecentMakeupLogsRow;
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          notes?: string | null;
          selfie_url?: string | null;
          share_image_url?: string | null;
          share_template_id?: string | null;
          used_product_ids?: string[];
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recent_makeup_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'recent_makeup_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      product_pan_logs: {
        Row: ProductPanLogsRow;
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          month_key: string;
          logged_date?: string;
          photo_url?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_pan_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'product_pan_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_pan_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products_with_expiry';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_pan_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      product_logs: {
        Row: ProductLogsRow;
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          logged_date: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['product_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'product_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_logs_product_id_fkey';
            columns: ['product_id'];
            isOneToOne: false;
            referencedRelation: 'products_with_expiry';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'product_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      products_with_expiry: {
        Row: ProductsRow & {
          category_name: string | null;
          category_color: string | null;
          category_icon: string | null;
          effective_expiry_date: string | null;
          days_until_expiry: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'products_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      user_product_stats: {
        Args: { target_user_id: string };
        Returns: {
          total_count: number;
          unopened_count: number;
          in_use_count: number;
          finished_count: number;
          expiring_soon_count: number;
          expired_count: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductWithExpiry = Database['public']['Views']['products_with_expiry']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type RecentMakeupLog = Database['public']['Tables']['recent_makeup_logs']['Row'];
export type ProductPanLog = Database['public']['Tables']['product_pan_logs']['Row'];
export type ProductLog = Database['public']['Tables']['product_logs']['Row'];

export type CategoryGroup = {
  parent: Category;
  children: Category[];
};

// Database types for Neaty Beauty
// To regenerate: npm run db:types (after setting your Supabase project ID)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
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
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          locale?: string;
          tier?: 'free' | 'pro' | 'pro_plus';
          item_limit?: number;
          color_profile?: ColorProfile | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      categories: {
        Row: {
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
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          category_id: string | null;
          tags: string[] | null;
          on_watchlist: boolean | null;
          ingredients_analysis: Record<string, unknown> | null;
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
        Insert: {
          id?: string;
          user_id: string;
          category_id?: string | null;
          tags?: string[] | null;
          on_watchlist?: boolean | null;
          ingredients_analysis?: Record<string, unknown> | null;
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
        };
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      recent_makeup_logs: {
        Row: {
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
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          notes?: string | null;
          selfie_url?: string | null;
          share_image_url?: string | null;
          share_template_id?: string | null;
          used_product_ids?: string[];
        };
        Update: Partial<Database['public']['Tables']['recent_makeup_logs']['Insert']>;
      };
      product_pan_logs: {
        Row: {
          id: string;
          user_id: string;
          product_id: string;
          month_key: string;
          logged_date: string;
          photo_url: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id: string;
          month_key: string;
          logged_date?: string;
          photo_url?: string | null;
          notes?: string | null;
        };
        Update: Partial<Database['public']['Tables']['product_pan_logs']['Insert']>;
      };
    };
    Views: {
      products_with_expiry: {
        Row: Database['public']['Tables']['products']['Row'] & {
          tags: string[] | null;
          category_name: string | null;
          category_color: string | null;
          category_icon: string | null;
          effective_expiry_date: string | null;
          days_until_expiry: number | null;
        };
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
  };
};

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
  key_traits?: string[];
  notes?: string;
  photo_observation?: string | null;
  scores?: ColorAnalysisScores;
  recommendations?: ColorRecommendations;
  color_samples?: ColorSample[];
};

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductWithExpiry = Database['public']['Views']['products_with_expiry']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type RecentMakeupLog = Database['public']['Tables']['recent_makeup_logs']['Row'];
export type ProductPanLog = Database['public']['Tables']['product_pan_logs']['Row'];

export type CategoryGroup = {
  parent: Category;
  children: Category[];
};

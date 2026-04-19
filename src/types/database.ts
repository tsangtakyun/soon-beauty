// Database types for SOON-Beauty
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
    };
    Views: {
      products_with_expiry: {
        Row: Database['public']['Tables']['products']['Row'] & {
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

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductWithExpiry = Database['public']['Views']['products_with_expiry']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export type CategoryGroup = {
  parent: Category;
  children: Category[];
};

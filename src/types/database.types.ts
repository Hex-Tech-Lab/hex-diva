/**
 * Auto-generated Supabase types
 * Generated from schema: migrations/003_schema_complete.sql + 004_uppromote_integration.sql
 * DO NOT EDIT MANUALLY - regenerate via: supabase gen types typescript --schema public
 */

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
      collections: {
        Row: {
          id: string
          shopify_id: string | null
          title: string
          handle: string
          description: string | null
          image_url: string | null
          position: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shopify_id?: string | null
          title: string
          handle: string
          description?: string | null
          image_url?: string | null
          position?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shopify_id?: string | null
          title?: string
          handle?: string
          description?: string | null
          image_url?: string | null
          position?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_collections: {
        Row: {
          id: string
          product_id: string
          collection_id: string
          sort_order: number | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          collection_id: string
          sort_order?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          collection_id?: string
          sort_order?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_collections_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          referral_code: string | null
          tier: string
          monthly_spend: number
          is_b2b: boolean
          affiliate_tier: string
          affiliate_custom_commission: number | null
          affiliate_status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          referral_code?: string | null
          tier?: string
          monthly_spend?: number
          is_b2b?: boolean
          affiliate_tier?: string
          affiliate_custom_commission?: number | null
          affiliate_status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          referral_code?: string | null
          tier?: string
          monthly_spend?: number
          is_b2b?: boolean
          affiliate_tier?: string
          affiliate_custom_commission?: number | null
          affiliate_status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          shopify_id: string | null
          title: string
          description: string | null
          price: number
          compare_at_price: number | null
          cost: number | null
          supplier_cost: number | null
          gross_margin_percent: number | null
          supplier_name: string | null
          b2b_bronze_price: number | null
          b2b_silver_price: number | null
          b2b_gold_price: number | null
          trending_on_tiktok: boolean
          trending_on_instagram: boolean
          viral_score: number | null
          image_url: string | null
          sku: string | null
          inventory_quantity: number
          inventory: number | null
          inventory_updated_at: string | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shopify_id?: string | null
          title: string
          description?: string | null
          price: number
          compare_at_price?: number | null
          cost?: number | null
          supplier_cost?: number | null
          gross_margin_percent?: number | null
          supplier_name?: string | null
          b2b_bronze_price?: number | null
          b2b_silver_price?: number | null
          b2b_gold_price?: number | null
          trending_on_tiktok?: boolean
          trending_on_instagram?: boolean
          viral_score?: number | null
          image_url?: string | null
          sku?: string | null
          inventory_quantity?: number
          inventory?: number | null
          inventory_updated_at?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shopify_id?: string | null
          title?: string
          description?: string | null
          price?: number
          compare_at_price?: number | null
          cost?: number | null
          supplier_cost?: number | null
          gross_margin_percent?: number | null
          supplier_name?: string | null
          b2b_bronze_price?: number | null
          b2b_silver_price?: number | null
          b2b_gold_price?: number | null
          trending_on_tiktok?: boolean
          trending_on_instagram?: boolean
          viral_score?: number | null
          image_url?: string | null
          sku?: string | null
          inventory_quantity?: number
          inventory?: number | null
          inventory_updated_at?: string | null
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          id: string
          product_id: string
          shopify_variant_id: string | null
          title: string | null
          sku: string | null
          barcode: string | null
          price: number | null
          compare_at_price: number | null
          cost: number | null
          inventory_quantity: number
          weight: number | null
          weight_unit: string | null
          option_values: Json | null
          image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          shopify_variant_id?: string | null
          title?: string | null
          sku?: string | null
          barcode?: string | null
          price?: number | null
          compare_at_price?: number | null
          cost?: number | null
          inventory_quantity?: number
          weight?: number | null
          weight_unit?: string | null
          option_values?: Json | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          shopify_variant_id?: string | null
          title?: string | null
          sku?: string | null
          barcode?: string | null
          price?: number | null
          compare_at_price?: number | null
          cost?: number | null
          inventory_quantity?: number
          weight?: number | null
          weight_unit?: string | null
          option_values?: Json | null
          image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      inventory_sync_log: {
        Row: {
          id: string
          product_id: string
          variant_id: string | null
          quantity_before: number | null
          quantity_after: number | null
          sync_source: string | null
          sync_timestamp: string | null
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          variant_id?: string | null
          quantity_before?: number | null
          quantity_after?: number | null
          sync_source?: string | null
          sync_timestamp?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          variant_id?: string | null
          quantity_before?: number | null
          quantity_after?: number | null
          sync_source?: string | null
          sync_timestamp?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_sync_log_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_sync_log_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          }
        ]
      }
      product_embeddings: {
        Row: {
          id: string
          product_id: string
          embedding: string | null
          embedding_model: string
          search_text: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          embedding?: string | null
          embedding_model?: string
          search_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          embedding?: string | null
          embedding_model?: string
          search_text?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_embeddings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      search_tags: {
        Row: {
          id: string
          product_id: string
          tag: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          tag: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          tag?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      orders: {
        Row: {
          id: string
          user_id: string
          order_number: string
          total: number
          subtotal: number | null
          tax: number | null
          shipping: number | null
          status: string
          payment_status: string | null
          stripe_session_id: string | null
          stripe_payment_intent_id: string | null
          payment_method: string | null
          tracked_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          order_number: string
          total: number
          subtotal?: number | null
          tax?: number | null
          shipping?: number | null
          status?: string
          payment_status?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          payment_method?: string | null
          tracked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          order_number?: string
          total?: number
          subtotal?: number | null
          tax?: number | null
          shipping?: number | null
          status?: string
          payment_status?: string | null
          stripe_session_id?: string | null
          stripe_payment_intent_id?: string | null
          payment_method?: string | null
          tracked_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          price: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          price: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          price?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          }
        ]
      }
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_user_id: string | null
          referral_code: string
          referral_token?: string
          status: string
          clicks: number
          conversions: number
          commission_amount: number
          claimed_at: string | null
          created_at: string
          expires_at: string | null
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_user_id?: string | null
          referral_code: string
          referral_token?: string
          status?: string
          clicks?: number
          conversions?: number
          commission_amount?: number
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_user_id?: string | null
          referral_code?: string
          referral_token?: string
          status?: string
          clicks?: number
          conversions?: number
          commission_amount?: number
          claimed_at?: string | null
          created_at?: string
          expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_clicks: {
        Row: {
          id: string
          referral_id: string
          clicked_at: string
        }
        Insert: {
          id?: string
          referral_id: string
          clicked_at?: string
        }
        Update: {
          id?: string
          referral_id?: string
          clicked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_clicks_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          }
        ]
      }
      commissions: {
        Row: {
          id: string
          referrer_id: string
          order_id: string
          referral_id: string | null
          amount: number
          rate: number
          tier: string
          tier_multiplier: number
          status: string
          order_total: number
          paid_at: string | null
          uppromote_order_id: string | null
          uppromote_synced_at: string | null
          webhook_id: string | null
          idempotency_key: string | null
          webhook_processed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          order_id: string
          referral_id?: string | null
          amount: number
          rate: number
          tier?: string
          tier_multiplier?: number
          status?: string
          order_total: number
          paid_at?: string | null
          uppromote_order_id?: string | null
          uppromote_synced_at?: string | null
          webhook_id?: string | null
          idempotency_key?: string | null
          webhook_processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          order_id?: string
          referral_id?: string | null
          amount?: number
          rate?: number
          tier?: string
          tier_multiplier?: number
          status?: string
          order_total?: number
          paid_at?: string | null
          uppromote_order_id?: string | null
          uppromote_synced_at?: string | null
          webhook_id?: string | null
          idempotency_key?: string | null
          webhook_processed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          }
        ]
      }
      commission_payouts: {
        Row: {
          id: string
          referrer_id: string
          user_id?: string
          amount: number
          status: string
          stripe_transfer_id?: string | null
          payout_date: string | null
          period_start: string | null
          period_end: string | null
          paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          user_id?: string
          amount: number
          status?: string
          stripe_transfer_id?: string | null
          payout_date?: string | null
          period_start?: string | null
          period_end?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          user_id?: string
          amount?: number
          status?: string
          stripe_transfer_id?: string | null
          payout_date?: string | null
          period_start?: string | null
          period_end?: string | null
          paid_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commission_payouts_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      referral_stats: {
        Row: {
          id: string
          referrer_id: string
          total_referrals: number
          active_referrals: number
          total_clicks: number
          total_conversions: number
          total_commission_earned: number
          total_paid: number
          current_tier: string
          volume_ytd: number
          volume_month: number
          volume_month_reset_at: string
          uppromote_affiliate_id: string | null
          uppromote_synced_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          total_referrals?: number
          active_referrals?: number
          total_clicks?: number
          total_conversions?: number
          total_commission_earned?: number
          total_paid?: number
          current_tier?: string
          volume_ytd?: number
          volume_month?: number
          volume_month_reset_at?: string
          uppromote_affiliate_id?: string | null
          uppromote_synced_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          total_referrals?: number
          active_referrals?: number
          total_clicks?: number
          total_conversions?: number
          total_commission_earned?: number
          total_paid?: number
          current_tier?: string
          volume_ytd?: number
          volume_month?: number
          volume_month_reset_at?: string
          uppromote_affiliate_id?: string | null
          uppromote_synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_stats_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      uppromote_sync_log: {
        Row: {
          id: string
          event_type: string
          payload: Json | null
          status: string
          error_message: string | null
          processed_at: string
          created_at: string
        }
        Insert: {
          id?: string
          event_type: string
          payload?: Json | null
          status?: string
          error_message?: string | null
          processed_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          event_type?: string
          payload?: Json | null
          status?: string
          error_message?: string | null
          processed_at?: string
          created_at?: string
        }
        Relationships: []
      }
      orders_audit: {
        Row: {
          id: string
          order_id: string
          user_id: string
          action: string
          previous_state: Json | null
          new_state: Json | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id: string
          action: string
          previous_state?: Json | null
          new_state?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string
          action?: string
          previous_state?: Json | null
          new_state?: Json | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_audit_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      audit_log: {
        Row: {
          id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          changes: Json | null
          deployment_id: string | null
          deployment_status: string | null
          deployed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          changes?: Json | null
          deployment_id?: string | null
          deployment_status?: string | null
          deployed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          changes?: Json | null
          deployment_id?: string | null
          deployment_status?: string | null
          deployed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      update_referral_stats_atomic: {
        Args: {
          p_referrer_id: string
          p_commission_amount: number
          p_order_total: number
        }
        Returns: undefined
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

// Type helpers for common table operations
export type CommissionRecord = Database['public']['Tables']['commissions']['Row']
export type CommissionInsert = Database['public']['Tables']['commissions']['Insert']
export type CommissionUpdate = Database['public']['Tables']['commissions']['Update']

export type ReferralRecord = Database['public']['Tables']['referrals']['Row']
export type ReferralInsert = Database['public']['Tables']['referrals']['Insert']
export type ReferralUpdate = Database['public']['Tables']['referrals']['Update']

export type ReferralStatsRecord = Database['public']['Tables']['referral_stats']['Row']
export type ReferralStatsInsert = Database['public']['Tables']['referral_stats']['Insert']
export type ReferralStatsUpdate = Database['public']['Tables']['referral_stats']['Update']

export type CommissionPayoutRecord = Database['public']['Tables']['commission_payouts']['Row']
export type CommissionPayoutInsert = Database['public']['Tables']['commission_payouts']['Insert']
export type CommissionPayoutUpdate = Database['public']['Tables']['commission_payouts']['Update']

export type ProductRecord = Database['public']['Tables']['products']['Row']
export type ProductInsert = Database['public']['Tables']['products']['Insert']
export type ProductUpdate = Database['public']['Tables']['products']['Update']

export type OrderRecord = Database['public']['Tables']['orders']['Row']
export type OrderInsert = Database['public']['Tables']['orders']['Insert']
export type OrderUpdate = Database['public']['Tables']['orders']['Update']

export type UserRecord = Database['public']['Tables']['users']['Row']
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type UserUpdate = Database['public']['Tables']['users']['Update']

export type UserProfileRecord = Database['public']['Tables']['user_profiles']['Row']
export type UserProfileInsert = Database['public']['Tables']['user_profiles']['Insert']
export type UserProfileUpdate = Database['public']['Tables']['user_profiles']['Update']

export type ProductCollectionRecord = Database['public']['Tables']['product_collections']['Row']
export type UpPromoteSyncLogRecord = Database['public']['Tables']['uppromote_sync_log']['Row']

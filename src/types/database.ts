export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      demo_storage_ledger: {
        Row: {
          bucket: string
          created_at: string
          dataset: string
          id: number
          last_error: string | null
          operation_id: string
          path: string
          sha256: string | null
          state: string
          updated_at: string
        }
        Insert: {
          bucket: string
          created_at?: string
          dataset: string
          id?: never
          last_error?: string | null
          operation_id: string
          path: string
          sha256?: string | null
          state: string
          updated_at?: string
        }
        Update: {
          bucket?: string
          created_at?: string
          dataset?: string
          id?: never
          last_error?: string | null
          operation_id?: string
          path?: string
          sha256?: string | null
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: Json | null
          previous_value: Json | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
        }
        Relationships: []
      }
      email_deliveries: {
        Row: {
          created_at: string
          email_type: string
          error_message: string | null
          id: string
          notification_id: string | null
          provider_message_id: string | null
          recipient: string
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
        }
        Insert: {
          created_at?: string
          email_type: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider_message_id?: string | null
          recipient: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
        }
        Update: {
          created_at?: string
          email_type?: string
          error_message?: string | null
          id?: string
          notification_id?: string | null
          provider_message_id?: string | null
          recipient?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          category: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          category: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          category?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          agent_status: Database["public"]["Enums"]["agent_status"]
          buying_stage: Database["public"]["Enums"]["buying_stage"]
          created_at: string
          deleted_at: string | null
          email: string
          first_name: string
          id: string
          idempotency_key: string | null
          inquiry_type: Database["public"]["Enums"]["inquiry_type"]
          last_name: string
          lead_status: Database["public"]["Enums"]["lead_status"]
          message: string | null
          phone: string | null
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          property_id: string | null
          seller_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_status?: Database["public"]["Enums"]["agent_status"]
          buying_stage?: Database["public"]["Enums"]["buying_stage"]
          created_at?: string
          deleted_at?: string | null
          email: string
          first_name: string
          id?: string
          idempotency_key?: string | null
          inquiry_type?: Database["public"]["Enums"]["inquiry_type"]
          last_name: string
          lead_status?: Database["public"]["Enums"]["lead_status"]
          message?: string | null
          phone?: string | null
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          property_id?: string | null
          seller_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_status?: Database["public"]["Enums"]["agent_status"]
          buying_stage?: Database["public"]["Enums"]["buying_stage"]
          created_at?: string
          deleted_at?: string | null
          email?: string
          first_name?: string
          id?: string
          idempotency_key?: string | null
          inquiry_type?: Database["public"]["Enums"]["inquiry_type"]
          last_name?: string
          lead_status?: Database["public"]["Enums"]["lead_status"]
          message?: string | null
          phone?: string | null
          preferred_contact_method?: Database["public"]["Enums"]["contact_method"]
          property_id?: string | null
          seller_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activity: {
        Row: {
          activity_type: string
          created_at: string
          created_by: string | null
          id: string
          inquiry_id: string
          new_value: string | null
          previous_value: string | null
          seller_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          created_by?: string | null
          id?: string
          inquiry_id: string
          new_value?: string | null
          previous_value?: string | null
          seller_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          inquiry_id?: string
          new_value?: string | null
          previous_value?: string | null
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activity_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activity_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_notes: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          inquiry_id: string
          note: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          inquiry_id: string
          note: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          inquiry_id?: string
          note?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_notes_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_notes_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_followed_coming_soon: boolean
          email_followed_new_properties: boolean
          email_followed_open_houses: boolean
          email_new_leads: boolean
          email_open_house_rsvps: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          email_followed_coming_soon?: boolean
          email_followed_new_properties?: boolean
          email_followed_open_houses?: boolean
          email_new_leads?: boolean
          email_open_house_rsvps?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          email_followed_coming_soon?: boolean
          email_followed_new_properties?: boolean
          email_followed_open_houses?: boolean
          email_new_leads?: boolean
          email_open_house_rsvps?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      open_house_rsvps: {
        Row: {
          agent_status: Database["public"]["Enums"]["rsvp_agent_status"]
          created_at: string
          email: string
          first_name: string
          id: string
          idempotency_key: string | null
          last_name: string
          message: string | null
          open_house_id: string
          party_size: number
          phone: string | null
          status: Database["public"]["Enums"]["rsvp_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_status?: Database["public"]["Enums"]["rsvp_agent_status"]
          created_at?: string
          email: string
          first_name: string
          id?: string
          idempotency_key?: string | null
          last_name: string
          message?: string | null
          open_house_id: string
          party_size?: number
          phone?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_status?: Database["public"]["Enums"]["rsvp_agent_status"]
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          idempotency_key?: string | null
          last_name?: string
          message?: string | null
          open_house_id?: string
          party_size?: number
          phone?: string | null
          status?: Database["public"]["Enums"]["rsvp_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_house_rsvps_open_house_id_fkey"
            columns: ["open_house_id"]
            isOneToOne: false
            referencedRelation: "open_houses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_house_rsvps_open_house_id_fkey"
            columns: ["open_house_id"]
            isOneToOne: false
            referencedRelation: "public_open_houses"
            referencedColumns: ["id"]
          },
        ]
      }
      open_houses: {
        Row: {
          demo_dataset: string | null
          is_demo: boolean
          seed_key: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string
          host_type: Database["public"]["Enums"]["host_type"]
          id: string
          instructions: string | null
          property_id: string
          registration_type: Database["public"]["Enums"]["registration_type"]
          seller_id: string
          starts_at: string
          status: Database["public"]["Enums"]["open_house_status"]
          timezone: string
          updated_at: string
        }
        Insert: {
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at: string
          host_type?: Database["public"]["Enums"]["host_type"]
          id?: string
          instructions?: string | null
          property_id: string
          registration_type?: Database["public"]["Enums"]["registration_type"]
          seller_id: string
          starts_at: string
          status?: Database["public"]["Enums"]["open_house_status"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          ends_at?: string
          host_type?: Database["public"]["Enums"]["host_type"]
          id?: string
          instructions?: string | null
          property_id?: string
          registration_type?: Database["public"]["Enums"]["registration_type"]
          seller_id?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["open_house_status"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_houses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_houses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_houses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_houses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          demo_dataset: string | null
          is_demo: boolean
          seed_key: string | null
          address_line_1: string
          address_line_2: string | null
          address_visibility: Database["public"]["Enums"]["address_visibility"]
          asking_price_cents: number | null
          basement_type: string | null
          bedrooms: number | null
          city: string
          cooling_type: string | null
          county: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          expected_price_max_cents: number | null
          expected_price_min_cents: number | null
          full_bathrooms: number | null
          garage_spaces: number | null
          half_bathrooms: number | null
          heating_type: string | null
          hoa_fee_cents: number | null
          id: string
          latitude: number | null
          lead_recipient: Database["public"]["Enums"]["lead_recipient"]
          listing_status: Database["public"]["Enums"]["property_status"]
          longitude: number | null
          lot_size: number | null
          lot_size_unit: Database["public"]["Enums"]["lot_size_unit"] | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          number_of_units: number | null
          parking_spaces: number | null
          parking_type: string | null
          paused_from_status:
            | Database["public"]["Enums"]["property_status"]
            | null
          postal_code: string
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          property_taxes_annual_cents: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          publish_acknowledged_at: string | null
          published_at: string | null
          sale_method: Database["public"]["Enums"]["sale_method"]
          seller_id: string
          slug: string | null
          sold_price_cents: number | null
          square_feet: number | null
          state: string
          stories: number | null
          target_listing_status:
            | Database["public"]["Enums"]["property_status"]
            | null
          title: string | null
          updated_at: string
          video_url: string | null
          virtual_tour_url: string | null
          wizard_last_step: number
          year_built: number | null
        }
        Insert: {
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          address_line_1?: string
          address_line_2?: string | null
          address_visibility?: Database["public"]["Enums"]["address_visibility"]
          asking_price_cents?: number | null
          basement_type?: string | null
          bedrooms?: number | null
          city?: string
          cooling_type?: string | null
          county?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expected_price_max_cents?: number | null
          expected_price_min_cents?: number | null
          full_bathrooms?: number | null
          garage_spaces?: number | null
          half_bathrooms?: number | null
          heating_type?: string | null
          hoa_fee_cents?: number | null
          id?: string
          latitude?: number | null
          lead_recipient?: Database["public"]["Enums"]["lead_recipient"]
          listing_status?: Database["public"]["Enums"]["property_status"]
          longitude?: number | null
          lot_size?: number | null
          lot_size_unit?: Database["public"]["Enums"]["lot_size_unit"] | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          number_of_units?: number | null
          parking_spaces?: number | null
          parking_type?: string | null
          paused_from_status?:
            | Database["public"]["Enums"]["property_status"]
            | null
          postal_code?: string
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          property_taxes_annual_cents?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          publish_acknowledged_at?: string | null
          published_at?: string | null
          sale_method?: Database["public"]["Enums"]["sale_method"]
          seller_id: string
          slug?: string | null
          sold_price_cents?: number | null
          square_feet?: number | null
          state?: string
          stories?: number | null
          target_listing_status?:
            | Database["public"]["Enums"]["property_status"]
            | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
          virtual_tour_url?: string | null
          wizard_last_step?: number
          year_built?: number | null
        }
        Update: {
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          address_line_1?: string
          address_line_2?: string | null
          address_visibility?: Database["public"]["Enums"]["address_visibility"]
          asking_price_cents?: number | null
          basement_type?: string | null
          bedrooms?: number | null
          city?: string
          cooling_type?: string | null
          county?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          expected_price_max_cents?: number | null
          expected_price_min_cents?: number | null
          full_bathrooms?: number | null
          garage_spaces?: number | null
          half_bathrooms?: number | null
          heating_type?: string | null
          hoa_fee_cents?: number | null
          id?: string
          latitude?: number | null
          lead_recipient?: Database["public"]["Enums"]["lead_recipient"]
          listing_status?: Database["public"]["Enums"]["property_status"]
          longitude?: number | null
          lot_size?: number | null
          lot_size_unit?: Database["public"]["Enums"]["lot_size_unit"] | null
          moderation_status?: Database["public"]["Enums"]["moderation_status"]
          number_of_units?: number | null
          parking_spaces?: number | null
          parking_type?: string | null
          paused_from_status?:
            | Database["public"]["Enums"]["property_status"]
            | null
          postal_code?: string
          pricing_type?: Database["public"]["Enums"]["pricing_type"]
          property_taxes_annual_cents?: number | null
          property_type?: Database["public"]["Enums"]["property_type"]
          publish_acknowledged_at?: string | null
          published_at?: string | null
          sale_method?: Database["public"]["Enums"]["sale_method"]
          seller_id?: string
          slug?: string | null
          sold_price_cents?: number | null
          square_feet?: number | null
          state?: string
          stories?: number | null
          target_listing_status?:
            | Database["public"]["Enums"]["property_status"]
            | null
          title?: string | null
          updated_at?: string
          video_url?: string | null
          virtual_tour_url?: string | null
          wizard_last_step?: number
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_activity: {
        Row: {
          created_at: string
          created_by: string | null
          event_type: string
          id: string
          metadata: Json | null
          property_id: string
          seller_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          property_id: string
          seller_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          property_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_activity_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activity_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activity_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_activity_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_agents: {
        Row: {
          brokerage: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          property_id: string
          show_contact_publicly: boolean
          updated_at: string
        }
        Insert: {
          brokerage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          property_id: string
          show_contact_publicly?: boolean
          updated_at?: string
        }
        Update: {
          brokerage?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          property_id?: string
          show_contact_publicly?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_custom_features: {
        Row: {
          created_at: string
          id: string
          name: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_custom_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_custom_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_features: {
        Row: {
          feature_id: string
          property_id: string
        }
        Insert: {
          feature_id: string
          property_id: string
        }
        Update: {
          feature_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "public_property_features"
            referencedColumns: ["feature_id"]
          },
          {
            foreignKeyName: "property_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          credit: string | null
          demo_dataset: string | null
          is_demo: boolean
          seed_key: string | null
          alt_text: string | null
          created_at: string
          display_order: number
          height: number | null
          id: string
          is_cover: boolean
          property_id: string
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          credit?: string | null
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          alt_text?: string | null
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_cover?: boolean
          property_id: string
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          credit?: string | null
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          alt_text?: string | null
          created_at?: string
          display_order?: number
          height?: number | null
          id?: string
          is_cover?: boolean
          property_id?: string
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_saves: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_saves_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_saves_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_hits: {
        Row: {
          bucket_key: string
          created_at: string
          id: number
        }
        Insert: {
          bucket_key: string
          created_at?: string
          id?: never
        }
        Update: {
          bucket_key?: string
          created_at?: string
          id?: never
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_resolution_note: string | null
          created_at: string
          description: string | null
          id: string
          idempotency_key: string | null
          property_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_email: string | null
          reporter_user_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          admin_resolution_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          property_id?: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          admin_resolution_note?: string | null
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          property_id?: string | null
          reason?: Database["public"]["Enums"]["report_reason"]
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          seller_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_usernames: {
        Row: {
          username: string
        }
        Insert: {
          username: string
        }
        Update: {
          username?: string
        }
        Relationships: []
      }
      seller_entitlements: {
        Row: {
          additional_listing_slots: number
          billing_status: Database["public"]["Enums"]["billing_status"]
          created_at: string
          free_active_listing_limit: number
          seller_id: string
          updated_at: string
        }
        Insert: {
          additional_listing_slots?: number
          billing_status?: Database["public"]["Enums"]["billing_status"]
          created_at?: string
          free_active_listing_limit?: number
          seller_id: string
          updated_at?: string
        }
        Update: {
          additional_listing_slots?: number
          billing_status?: Database["public"]["Enums"]["billing_status"]
          created_at?: string
          free_active_listing_limit?: number
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_entitlements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_entitlements_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: true
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_follows: {
        Row: {
          created_at: string
          follower_user_id: string
          id: string
          notify_coming_soon: boolean
          notify_new_properties: boolean
          notify_open_houses: boolean
          seller_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          id?: string
          notify_coming_soon?: boolean
          notify_new_properties?: boolean
          notify_open_houses?: boolean
          seller_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          id?: string
          notify_coming_soon?: boolean
          notify_new_properties?: boolean
          notify_open_houses?: boolean
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_follows_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_follows_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          demo_dataset: string | null
          is_demo: boolean
          seed_key: string | null
          account_type: Database["public"]["Enums"]["seller_account_type"]
          bio: string | null
          city: string
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          instagram_url: string | null
          profile_image_path: string | null
          state: string
          status: Database["public"]["Enums"]["seller_status"]
          updated_at: string
          user_id: string | null
          username: string
          website_url: string | null
        }
        Insert: {
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          account_type: Database["public"]["Enums"]["seller_account_type"]
          bio?: string | null
          city: string
          created_at?: string
          deleted_at?: string | null
          display_name: string
          id?: string
          instagram_url?: string | null
          profile_image_path?: string | null
          state: string
          status?: Database["public"]["Enums"]["seller_status"]
          updated_at?: string
          user_id?: string | null
          username: string
          website_url?: string | null
        }
        Update: {
          demo_dataset?: string | null
          is_demo?: boolean
          seed_key?: string | null
          account_type?: Database["public"]["Enums"]["seller_account_type"]
          bio?: string | null
          city?: string
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          id?: string
          instagram_url?: string | null
          profile_image_path?: string | null
          state?: string
          status?: Database["public"]["Enums"]["seller_status"]
          updated_at?: string
          user_id?: string | null
          username?: string
          website_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_open_houses: {
        Row: {
          is_demo: boolean | null
          asking_price_cents: number | null
          city: string | null
          cover_image_path: string | null
          display_address_line_1: string | null
          display_postal_code: string | null
          ends_at: string | null
          host_type: Database["public"]["Enums"]["host_type"] | null
          id: string | null
          instructions: string | null
          property_id: string | null
          property_slug: string | null
          property_title: string | null
          registration_type:
            | Database["public"]["Enums"]["registration_type"]
            | null
          seller_display_name: string | null
          seller_id: string | null
          seller_username: string | null
          starts_at: string | null
          state: string | null
          timezone: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_houses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_houses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_houses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_houses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_properties: {
        Row: {
          is_demo: boolean | null
          address_visibility:
            | Database["public"]["Enums"]["address_visibility"]
            | null
          asking_price_cents: number | null
          basement_type: string | null
          bedrooms: number | null
          city: string | null
          cooling_type: string | null
          county: string | null
          cover_image_path: string | null
          created_at: string | null
          description: string | null
          display_address_line_1: string | null
          display_address_line_2: string | null
          display_latitude: number | null
          display_line: string | null
          display_longitude: number | null
          display_postal_code: string | null
          expected_price_max_cents: number | null
          expected_price_min_cents: number | null
          full_bathrooms: number | null
          garage_spaces: number | null
          half_bathrooms: number | null
          has_upcoming_open_house: boolean | null
          heating_type: string | null
          hoa_fee_cents: number | null
          id: string | null
          listing_status: Database["public"]["Enums"]["property_status"] | null
          lot_size: number | null
          lot_size_unit: Database["public"]["Enums"]["lot_size_unit"] | null
          number_of_units: number | null
          parking_spaces: number | null
          parking_type: string | null
          photo_count: number | null
          pricing_type: Database["public"]["Enums"]["pricing_type"] | null
          property_taxes_annual_cents: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          published_at: string | null
          seller_display_name: string | null
          seller_id: string | null
          seller_profile_image_path: string | null
          seller_username: string | null
          slug: string | null
          sold_price_cents: number | null
          square_feet: number | null
          state: string | null
          stories: number | null
          title: string | null
          video_url: string | null
          virtual_tour_url: string | null
          year_built: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "public_seller_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_property_agents: {
        Row: {
          brokerage: string | null
          email: string | null
          id: string | null
          name: string | null
          phone: string | null
          property_id: string | null
        }
        Insert: {
          brokerage?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          property_id?: string | null
        }
        Update: {
          brokerage?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          phone?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_agents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      public_property_custom_features: {
        Row: {
          id: string | null
          name: string | null
          property_id: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          property_id?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_custom_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_custom_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      public_property_features: {
        Row: {
          category: string | null
          feature_id: string | null
          name: string | null
          property_id: string | null
          slug: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_features_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      public_property_images: {
        Row: {
          credit: string | null
          alt_text: string | null
          display_order: number | null
          height: number | null
          id: string | null
          is_cover: boolean | null
          property_id: string | null
          storage_path: string | null
          width: number | null
        }
        Insert: {
          credit?: string | null
          alt_text?: string | null
          display_order?: number | null
          height?: number | null
          id?: string | null
          is_cover?: boolean | null
          property_id?: string | null
          storage_path?: string | null
          width?: number | null
        }
        Update: {
          credit?: string | null
          alt_text?: string | null
          display_order?: number | null
          height?: number | null
          id?: string | null
          is_cover?: boolean | null
          property_id?: string | null
          storage_path?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "public_properties"
            referencedColumns: ["id"]
          },
        ]
      }
      public_seller_profiles: {
        Row: {
          is_demo: boolean | null
          account_type:
            | Database["public"]["Enums"]["seller_account_type"]
            | null
          bio: string | null
          city: string | null
          coming_soon_count: number | null
          created_at: string | null
          display_name: string | null
          follower_count: number | null
          for_sale_count: number | null
          has_upcoming_open_house: boolean | null
          id: string | null
          instagram_url: string | null
          profile_image_path: string | null
          state: string | null
          username: string | null
          website_url: string | null
        }
        Insert: {
          is_demo?: boolean | null
          account_type?:
            | Database["public"]["Enums"]["seller_account_type"]
            | null
          bio?: string | null
          city?: string | null
          coming_soon_count?: never
          created_at?: string | null
          display_name?: string | null
          follower_count?: never
          for_sale_count?: never
          has_upcoming_open_house?: never
          id?: string | null
          instagram_url?: string | null
          profile_image_path?: string | null
          state?: string | null
          username?: string | null
          website_url?: string | null
        }
        Update: {
          is_demo?: boolean | null
          account_type?:
            | Database["public"]["Enums"]["seller_account_type"]
            | null
          bio?: string | null
          city?: string | null
          coming_soon_count?: never
          created_at?: string | null
          display_name?: string | null
          follower_count?: never
          for_sale_count?: never
          has_upcoming_open_house?: never
          id?: string | null
          instagram_url?: string | null
          profile_image_path?: string | null
          state?: string | null
          username?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_apply_demo_dataset: {
        Args: { p_dataset: string; p_operation_id: string; p_payload: Json }
        Returns: Json
      }
      admin_refresh_demo_open_house_dates: {
        Args: { p_dataset: string; p_rows: Json }
        Returns: number
      }
      admin_remove_demo_dataset: {
        Args: { p_dataset: string }
        Returns: { bucket: string; path: string }[]
      }
      admin_remove_dev_fixtures: {
        Args: { p_manifest: Json; p_operation_id: string }
        Returns: Json
      }
      admin_set_demo_visibility: { Args: { p_visible: boolean }; Returns: boolean }
      demo_content_visible: { Args: never; Returns: boolean }
      has_confirmed_rsvp_for_open_house: { Args: { p_open_house_id: string }; Returns: boolean }
      has_confirmed_rsvp_for_property: { Args: { p_property_id: string }; Returns: boolean }
      add_lead_note: {
        Args: { p_inquiry_id: string; p_note: string }
        Returns: {
          created_at: string
          deleted_at: string | null
          id: string
          inquiry_id: string
          note: string
          seller_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lead_notes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_grant_listing_slots: {
        Args: { p_additional_slots: number; p_seller_id: string }
        Returns: {
          additional_listing_slots: number
          billing_status: Database["public"]["Enums"]["billing_status"]
          created_at: string
          free_active_listing_limit: number
          seller_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "seller_entitlements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_resolve_report: {
        Args: {
          p_note?: string
          p_report_id: string
          p_status: Database["public"]["Enums"]["report_status"]
        }
        Returns: {
          admin_resolution_note: string | null
          created_at: string
          description: string | null
          id: string
          idempotency_key: string | null
          property_id: string | null
          reason: Database["public"]["Enums"]["report_reason"]
          reporter_email: string | null
          reporter_user_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          seller_id: string | null
          status: Database["public"]["Enums"]["report_status"]
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_property_moderation: {
        Args: {
          p_property_id: string
          p_status: Database["public"]["Enums"]["moderation_status"]
        }
        Returns: {
          address_line_1: string
          address_line_2: string | null
          address_visibility: Database["public"]["Enums"]["address_visibility"]
          asking_price_cents: number | null
          basement_type: string | null
          bedrooms: number | null
          city: string
          cooling_type: string | null
          county: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          expected_price_max_cents: number | null
          expected_price_min_cents: number | null
          full_bathrooms: number | null
          garage_spaces: number | null
          half_bathrooms: number | null
          heating_type: string | null
          hoa_fee_cents: number | null
          id: string
          latitude: number | null
          lead_recipient: Database["public"]["Enums"]["lead_recipient"]
          listing_status: Database["public"]["Enums"]["property_status"]
          longitude: number | null
          lot_size: number | null
          lot_size_unit: Database["public"]["Enums"]["lot_size_unit"] | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          number_of_units: number | null
          parking_spaces: number | null
          parking_type: string | null
          paused_from_status:
            | Database["public"]["Enums"]["property_status"]
            | null
          postal_code: string
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          property_taxes_annual_cents: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          publish_acknowledged_at: string | null
          published_at: string | null
          sale_method: Database["public"]["Enums"]["sale_method"]
          seller_id: string
          slug: string | null
          sold_price_cents: number | null
          square_feet: number | null
          state: string
          stories: number | null
          title: string | null
          updated_at: string
          video_url: string | null
          virtual_tour_url: string | null
          wizard_last_step: number
          year_built: number | null
        }
        SetofOptions: {
          from: "*"
          to: "properties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_seller_status: {
        Args: {
          p_seller_id: string
          p_status: Database["public"]["Enums"]["seller_status"]
        }
        Returns: {
          account_type: Database["public"]["Enums"]["seller_account_type"]
          bio: string | null
          city: string
          created_at: string
          deleted_at: string | null
          display_name: string
          id: string
          instagram_url: string | null
          profile_image_path: string | null
          state: string
          status: Database["public"]["Enums"]["seller_status"]
          updated_at: string
          user_id: string
          username: string
          website_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "seller_profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_open_house: {
        Args: { p_open_house_id: string; p_reason?: string }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          ends_at: string
          host_type: Database["public"]["Enums"]["host_type"]
          id: string
          instructions: string | null
          property_id: string
          registration_type: Database["public"]["Enums"]["registration_type"]
          seller_id: string
          starts_at: string
          status: Database["public"]["Enums"]["open_house_status"]
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "open_houses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      change_property_status: {
        Args: {
          p_property_id: string
          p_sold_price_cents?: number
          p_target_status: Database["public"]["Enums"]["property_status"]
        }
        Returns: {
          address_line_1: string
          address_line_2: string | null
          address_visibility: Database["public"]["Enums"]["address_visibility"]
          asking_price_cents: number | null
          basement_type: string | null
          bedrooms: number | null
          city: string
          cooling_type: string | null
          county: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          expected_price_max_cents: number | null
          expected_price_min_cents: number | null
          full_bathrooms: number | null
          garage_spaces: number | null
          half_bathrooms: number | null
          heating_type: string | null
          hoa_fee_cents: number | null
          id: string
          latitude: number | null
          lead_recipient: Database["public"]["Enums"]["lead_recipient"]
          listing_status: Database["public"]["Enums"]["property_status"]
          longitude: number | null
          lot_size: number | null
          lot_size_unit: Database["public"]["Enums"]["lot_size_unit"] | null
          moderation_status: Database["public"]["Enums"]["moderation_status"]
          number_of_units: number | null
          parking_spaces: number | null
          parking_type: string | null
          paused_from_status:
            | Database["public"]["Enums"]["property_status"]
            | null
          postal_code: string
          pricing_type: Database["public"]["Enums"]["pricing_type"]
          property_taxes_annual_cents: number | null
          property_type: Database["public"]["Enums"]["property_type"]
          publish_acknowledged_at: string | null
          published_at: string | null
          sale_method: Database["public"]["Enums"]["sale_method"]
          seller_id: string
          slug: string | null
          sold_price_cents: number | null
          square_feet: number | null
          state: string
          stories: number | null
          title: string | null
          updated_at: string
          video_url: string | null
          virtual_tour_url: string | null
          wizard_last_step: number
          year_built: number | null
        }
        SetofOptions: {
          from: "*"
          to: "properties"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      check_rate_limit: {
        Args: {
          p_bucket_key: string
          p_max_hits: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      is_admin: { Args: { check_user_id?: string }; Returns: boolean }
      is_own_seller: { Args: { check_seller_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      update_lead_status: {
        Args: {
          p_inquiry_id: string
          p_new_status: Database["public"]["Enums"]["lead_status"]
        }
        Returns: {
          agent_status: Database["public"]["Enums"]["agent_status"]
          buying_stage: Database["public"]["Enums"]["buying_stage"]
          created_at: string
          deleted_at: string | null
          email: string
          first_name: string
          id: string
          idempotency_key: string | null
          inquiry_type: Database["public"]["Enums"]["inquiry_type"]
          last_name: string
          lead_status: Database["public"]["Enums"]["lead_status"]
          message: string | null
          phone: string | null
          preferred_contact_method: Database["public"]["Enums"]["contact_method"]
          property_id: string | null
          seller_id: string
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "inquiries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      address_visibility: "full" | "city_zip" | "city_only"
      agent_status: "yes" | "no" | "prefer_not_to_say"
      app_role: "user" | "admin"
      billing_status: "none" | "active" | "past_due"
      buying_stage:
        | "pre_approved"
        | "planning_to_get_pre_approved"
        | "cash_buyer"
        | "just_starting"
        | "prefer_not_to_say"
      contact_method: "email" | "phone" | "text"
      email_status: "pending" | "sent" | "failed"
      host_type: "seller" | "agent" | "both"
      inquiry_type:
        | "question"
        | "showing_request"
        | "more_information"
        | "offer_interest"
        | "open_house_question"
        | "future_property_interest"
        | "general_seller_question"
        | "other"
      lead_recipient: "seller" | "agent" | "both"
      lead_status:
        | "new"
        | "contacted"
        | "showing_scheduled"
        | "interested"
        | "offer_stage"
        | "closed"
        | "not_interested"
      lot_size_unit: "sqft" | "acres"
      moderation_status: "clear" | "flagged" | "hidden"
      notification_type:
        | "new_property"
        | "coming_soon_property"
        | "open_house_created"
        | "open_house_updated"
        | "open_house_cancelled"
        | "new_lead"
        | "open_house_rsvp"
        | "listing_moderated"
        | "account_moderated"
      open_house_status: "scheduled" | "cancelled"
      pricing_type: "asking_price" | "expected_range" | "price_undecided"
      property_status:
        | "draft"
        | "coming_soon"
        | "for_sale"
        | "under_contract"
        | "sold"
        | "paused"
        | "archived"
      property_type:
        | "single_family"
        | "multi_family"
        | "condo"
        | "townhouse"
        | "co_op"
        | "land"
        | "manufactured_home"
        | "other"
      registration_type: "none" | "optional" | "required"
      report_reason:
        | "fraud"
        | "incorrect_information"
        | "discriminatory_content"
        | "stolen_photos"
        | "duplicate_listing"
        | "spam"
        | "other"
      report_status: "open" | "reviewing" | "resolved" | "dismissed"
      rsvp_agent_status:
        | "working_with_agent"
        | "not_working_with_agent"
        | "prefer_not_to_say"
      rsvp_status: "confirmed" | "cancelled"
      sale_method: "independent" | "agent_assisted"
      seller_account_type: "individual" | "business"
      seller_status: "active" | "suspended" | "deactivated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      address_visibility: ["full", "city_zip", "city_only"],
      agent_status: ["yes", "no", "prefer_not_to_say"],
      app_role: ["user", "admin"],
      billing_status: ["none", "active", "past_due"],
      buying_stage: [
        "pre_approved",
        "planning_to_get_pre_approved",
        "cash_buyer",
        "just_starting",
        "prefer_not_to_say",
      ],
      contact_method: ["email", "phone", "text"],
      email_status: ["pending", "sent", "failed"],
      host_type: ["seller", "agent", "both"],
      inquiry_type: [
        "question",
        "showing_request",
        "more_information",
        "offer_interest",
        "open_house_question",
        "future_property_interest",
        "general_seller_question",
        "other",
      ],
      lead_recipient: ["seller", "agent", "both"],
      lead_status: [
        "new",
        "contacted",
        "showing_scheduled",
        "interested",
        "offer_stage",
        "closed",
        "not_interested",
      ],
      lot_size_unit: ["sqft", "acres"],
      moderation_status: ["clear", "flagged", "hidden"],
      notification_type: [
        "new_property",
        "coming_soon_property",
        "open_house_created",
        "open_house_updated",
        "open_house_cancelled",
        "new_lead",
        "open_house_rsvp",
        "listing_moderated",
        "account_moderated",
      ],
      open_house_status: ["scheduled", "cancelled"],
      pricing_type: ["asking_price", "expected_range", "price_undecided"],
      property_status: [
        "draft",
        "coming_soon",
        "for_sale",
        "under_contract",
        "sold",
        "paused",
        "archived",
      ],
      property_type: [
        "single_family",
        "multi_family",
        "condo",
        "townhouse",
        "co_op",
        "land",
        "manufactured_home",
        "other",
      ],
      registration_type: ["none", "optional", "required"],
      report_reason: [
        "fraud",
        "incorrect_information",
        "discriminatory_content",
        "stolen_photos",
        "duplicate_listing",
        "spam",
        "other",
      ],
      report_status: ["open", "reviewing", "resolved", "dismissed"],
      rsvp_agent_status: [
        "working_with_agent",
        "not_working_with_agent",
        "prefer_not_to_say",
      ],
      rsvp_status: ["confirmed", "cancelled"],
      sale_method: ["independent", "agent_assisted"],
      seller_account_type: ["individual", "business"],
      seller_status: ["active", "suspended", "deactivated"],
    },
  },
} as const

// Generated from the live Supabase project (utnywpbtqalrfdezudtg) via MCP
// generate_typescript_types on 2026-06-29. Regenerate after schema changes:
//   pnpm dlx supabase gen types typescript --project-id utnywpbtqalrfdezudtg > types/database.ts
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
      activity_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          metadata: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: number
          metadata?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: number
          metadata?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_holds: {
        Row: {
          check_in: string
          check_out: string
          created_at: string | null
          expires_at: string
          id: string
          room_type_id: string
          session_id: string
        }
        Insert: {
          check_in: string
          check_out: string
          created_at?: string | null
          expires_at?: string
          id?: string
          room_type_id: string
          session_id: string
        }
        Update: {
          check_in?: string
          check_out?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          room_type_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_holds_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rooms: {
        Row: {
          booking_id: string
          id: string
          nights: number
          rate_per_night: number
          room_id: string | null
          room_type_id: string
          subtotal: number | null
        }
        Insert: {
          booking_id: string
          id?: string
          nights: number
          rate_per_night: number
          room_id?: string | null
          room_type_id: string
          subtotal?: number | null
        }
        Update: {
          booking_id?: string
          id?: string
          nights?: number
          rate_per_night?: number
          room_id?: string | null
          room_type_id?: string
          subtotal?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_rooms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_check_in: string | null
          actual_check_out: string | null
          additional_guests: string | null
          advance_paid: number
          backdated_reason: string | null
          balance_due: number | null
          booking_ref: string
          check_in: string
          check_out: string
          created_at: string | null
          created_by: string | null
          day_use_from: string | null
          day_use_to: string | null
          deleted_at: string | null
          deleted_by: string | null
          discount_amount: number
          discount_by: string | null
          discount_reason: string | null
          group_ref: string | null
          gst_amount: number
          guest_id: string
          id: string
          idempotency_key: string | null
          is_backdated: boolean | null
          nights: number | null
          phone_verified_at: string | null
          reminder_sent_at: string | null
          source: Database["public"]["Enums"]["booking_source"]
          special_requests: string | null
          status: Database["public"]["Enums"]["booking_status"]
          stay_type: Database["public"]["Enums"]["stay_type"]
          total_amount: number
          updated_at: string | null
          updated_by: string | null
          vehicle_number: string | null
          vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Insert: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          additional_guests?: string | null
          advance_paid?: number
          backdated_reason?: string | null
          balance_due?: number | null
          booking_ref: string
          check_in: string
          check_out: string
          created_at?: string | null
          created_by?: string | null
          day_use_from?: string | null
          day_use_to?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_amount?: number
          discount_by?: string | null
          discount_reason?: string | null
          group_ref?: string | null
          gst_amount?: number
          guest_id: string
          id?: string
          idempotency_key?: string | null
          is_backdated?: boolean | null
          nights?: number | null
          phone_verified_at?: string | null
          reminder_sent_at?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stay_type?: Database["public"]["Enums"]["stay_type"]
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
          vehicle_number?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Update: {
          actual_check_in?: string | null
          actual_check_out?: string | null
          additional_guests?: string | null
          advance_paid?: number
          backdated_reason?: string | null
          balance_due?: number | null
          booking_ref?: string
          check_in?: string
          check_out?: string
          created_at?: string | null
          created_by?: string | null
          day_use_from?: string | null
          day_use_to?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discount_amount?: number
          discount_by?: string | null
          discount_reason?: string | null
          group_ref?: string | null
          gst_amount?: number
          guest_id?: string
          id?: string
          idempotency_key?: string | null
          is_backdated?: boolean | null
          nights?: number | null
          phone_verified_at?: string | null
          reminder_sent_at?: string | null
          source?: Database["public"]["Enums"]["booking_source"]
          special_requests?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          stay_type?: Database["public"]["Enums"]["stay_type"]
          total_amount?: number
          updated_at?: string | null
          updated_by?: string | null
          vehicle_number?: string | null
          vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_discount_by_fkey"
            columns: ["discount_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cleaning_locks: {
        Row: {
          auto_release_at: string
          locked_at: string | null
          locked_by: string
          room_id: string
        }
        Insert: {
          auto_release_at?: string
          locked_at?: string | null
          locked_by: string
          room_id: string
        }
        Update: {
          auto_release_at?: string
          locked_at?: string | null
          locked_by?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cleaning_locks_locked_by_fkey"
            columns: ["locked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cleaning_locks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: true
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      gallery_media: {
        Row: {
          alt_text: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          external_url: string | null
          id: string
          is_active: boolean
          media_type: string
          public_id: string | null
          sort_order: number
          updated_at: string
          url: string | null
          video_kind: string | null
        }
        Insert: {
          alt_text?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          media_type: string
          public_id?: string | null
          sort_order?: number
          updated_at?: string
          url?: string | null
          video_kind?: string | null
        }
        Update: {
          alt_text?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          external_url?: string | null
          id?: string
          is_active?: boolean
          media_type?: string
          public_id?: string | null
          sort_order?: number
          updated_at?: string
          url?: string | null
          video_kind?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_media_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          fullname: string
          id: string
          id_number: string | null
          id_proof_url: string | null
          id_type: Database["public"]["Enums"]["id_proof_type"] | null
          last_stayed_at: string | null
          last_vehicle_number: string | null
          last_vehicle_type: Database["public"]["Enums"]["vehicle_type"] | null
          lifetime_value: number | null
          notes: string | null
          phone: string
          phone_verified: boolean | null
          preferred_language: string | null
          tags: string[] | null
          total_stays: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          fullname: string
          id?: string
          id_number?: string | null
          id_proof_url?: string | null
          id_type?: Database["public"]["Enums"]["id_proof_type"] | null
          last_stayed_at?: string | null
          last_vehicle_number?: string | null
          last_vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          lifetime_value?: number | null
          notes?: string | null
          phone: string
          phone_verified?: boolean | null
          preferred_language?: string | null
          tags?: string[] | null
          total_stays?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          fullname?: string
          id?: string
          id_number?: string | null
          id_proof_url?: string | null
          id_type?: Database["public"]["Enums"]["id_proof_type"] | null
          last_stayed_at?: string | null
          last_vehicle_number?: string | null
          last_vehicle_type?: Database["public"]["Enums"]["vehicle_type"] | null
          lifetime_value?: number | null
          notes?: string | null
          phone?: string
          phone_verified?: boolean | null
          preferred_language?: string | null
          tags?: string[] | null
          total_stays?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      hotel_settings: {
        Row: {
          address: string
          advance_percent: number | null
          auto_cancel_hours_after_booking: number | null
          check_in_time: string | null
          check_out_time: string | null
          city: string
          email: string | null
          fee_passthrough_enabled: boolean | null
          fee_passthrough_percent: number | null
          gst_enabled: boolean | null
          gst_number: string | null
          gst_rate: number | null
          id: string
          min_hours_before_checkin: number | null
          name: string
          phone: string
          phone_alt: string | null
          razorpay_enabled: boolean | null
          seo_meta: Json | null
          state: string
          updated_at: string | null
          upi_id: string | null
          upi_qr_url: string | null
          whatsapp: string | null
        }
        Insert: {
          address: string
          advance_percent?: number | null
          auto_cancel_hours_after_booking?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          email?: string | null
          fee_passthrough_enabled?: boolean | null
          fee_passthrough_percent?: number | null
          gst_enabled?: boolean | null
          gst_number?: string | null
          gst_rate?: number | null
          id?: string
          min_hours_before_checkin?: number | null
          name: string
          phone: string
          phone_alt?: string | null
          razorpay_enabled?: boolean | null
          seo_meta?: Json | null
          state?: string
          updated_at?: string | null
          upi_id?: string | null
          upi_qr_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          address?: string
          advance_percent?: number | null
          auto_cancel_hours_after_booking?: number | null
          check_in_time?: string | null
          check_out_time?: string | null
          city?: string
          email?: string | null
          fee_passthrough_enabled?: boolean | null
          fee_passthrough_percent?: number | null
          gst_enabled?: boolean | null
          gst_number?: string | null
          gst_rate?: number | null
          id?: string
          min_hours_before_checkin?: number | null
          name?: string
          phone?: string
          phone_alt?: string | null
          razorpay_enabled?: boolean | null
          seo_meta?: Json | null
          state?: string
          updated_at?: string | null
          upi_id?: string | null
          upi_qr_url?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      maintenance_blocks: {
        Row: {
          created_at: string | null
          created_by: string | null
          from_date: string
          id: string
          is_active: boolean | null
          reason: string
          room_id: string
          to_date: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          from_date: string
          id?: string
          is_active?: boolean | null
          reason: string
          room_id: string
          to_date: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          from_date?: string
          id?: string
          is_active?: boolean | null
          reason?: string
          room_id?: string
          to_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_blocks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      otp_attempts: {
        Row: {
          attempt_count: number | null
          expires_at: string
          id: string
          otp_hash: string | null
          phone: string
          sent_at: string | null
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number | null
          expires_at?: string
          id?: string
          otp_hash?: string | null
          phone: string
          sent_at?: string | null
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number | null
          expires_at?: string
          id?: string
          otp_hash?: string | null
          phone?: string
          sent_at?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_signature: string | null
          recorded_by: string | null
          reference_note: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          recorded_by?: string | null
          reference_note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          paid_at?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_signature?: string | null
          recorded_by?: string | null
          reference_note?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_overrides: {
        Row: {
          created_at: string | null
          created_by: string | null
          end_date: string
          id: string
          label: string | null
          rate: number
          room_type_id: string
          start_date: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          end_date: string
          id?: string
          label?: string | null
          rate: number
          room_type_id: string
          start_date: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          end_date?: string
          id?: string
          label?: string | null
          rate?: number
          room_type_id?: string
          start_date?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_overrides_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_overrides_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rate_overrides_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      room_photos: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          public_id: string
          room_type_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          public_id: string
          room_type_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          public_id?: string
          room_type_id?: string
          sort_order?: number | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_photos_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      room_types: {
        Row: {
          amenities: Json | null
          base_rate: number
          bed_type: string | null
          created_at: string | null
          created_by: string | null
          day_use_rate: number | null
          deleted_at: string | null
          deleted_by: string | null
          description: Json | null
          id: string
          is_active: boolean | null
          max_guests: number
          name: Json
          number_of_beds: number | null
          sort_order: number | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          amenities?: Json | null
          base_rate: number
          bed_type?: string | null
          created_at?: string | null
          created_by?: string | null
          day_use_rate?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: Json | null
          id?: string
          is_active?: boolean | null
          max_guests?: number
          name: Json
          number_of_beds?: number | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          amenities?: Json | null
          base_rate?: number
          bed_type?: string | null
          created_at?: string | null
          created_by?: string | null
          day_use_rate?: number | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: Json | null
          id?: string
          is_active?: boolean | null
          max_guests?: number
          name?: Json
          number_of_beds?: number | null
          sort_order?: number | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_types_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_types_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          floor: number | null
          id: string
          room_number: string
          room_type_id: string
          status: Database["public"]["Enums"]["room_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          floor?: number | null
          id?: string
          room_number: string
          room_type_id: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          floor?: number | null
          id?: string
          room_number?: string
          room_type_id?: string
          status?: Database["public"]["Enums"]["room_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_room_type_id_fkey"
            columns: ["room_type_id"]
            isOneToOne: false
            referencedRelation: "room_types"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string
          created_at: string | null
          created_by: string | null
          fullname: string
          id: string
          is_active: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          auth_user_id: string
          created_at?: string | null
          created_by?: string | null
          fullname: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          auth_user_id?: string
          created_at?: string | null
          created_by?: string | null
          fullname?: string
          id?: string
          is_active?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      booking_source: "website" | "walkin" | "phone" | "whatsapp"
      booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "checked_out"
        | "cancelled"
        | "not_arrived"
      id_proof_type: "aadhaar" | "pan" | "passport" | "driving_license"
      payment_method: "razorpay" | "upi" | "cash" | "card" | "bank"
      payment_status: "pending" | "success" | "failed" | "refunded"
      room_status: "available" | "occupied" | "cleaning" | "maintenance"
      stay_type: "overnight" | "day_use"
      user_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "receptionist"
        | "housekeeping"
      vehicle_type:
        | "two_wheeler"
        | "car"
        | "bus_tempo"
        | "auto"
        | "other"
        | "none"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      booking_source: ["website", "walkin", "phone", "whatsapp"],
      booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "checked_out",
        "cancelled",
        "not_arrived",
      ],
      id_proof_type: ["aadhaar", "pan", "passport", "driving_license"],
      payment_method: ["razorpay", "upi", "cash", "card", "bank"],
      payment_status: ["pending", "success", "failed", "refunded"],
      room_status: ["available", "occupied", "cleaning", "maintenance"],
      stay_type: ["overnight", "day_use"],
      user_role: [
        "super_admin",
        "admin",
        "manager",
        "receptionist",
        "housekeeping",
      ],
      vehicle_type: [
        "two_wheeler",
        "car",
        "bus_tempo",
        "auto",
        "other",
        "none",
      ],
    },
  },
} as const

// Convenience enum aliases used across the app
export type UserRole = Enums<"user_role">
export type RoomStatus = Enums<"room_status">
export type BookingStatus = Enums<"booking_status">
export type BookingSource = Enums<"booking_source">
export type PaymentMethod = Enums<"payment_method">
export type PaymentStatus = Enums<"payment_status">
export type IdProofType = Enums<"id_proof_type">

// Convenience row alias for the curated gallery (migration 013_gallery_media.sql)
export type GalleryMedia = Tables<"gallery_media">

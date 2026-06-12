export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_contexts: {
        Row: {
          context: Json
          conversation_id: string
          created_at: string
          embedding: string | null
          id: string
          intent: string | null
          pending_action: Json | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          context?: Json
          conversation_id: string
          created_at?: string
          embedding?: string | null
          id?: string
          intent?: string | null
          pending_action?: Json | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          context?: Json
          conversation_id?: string
          created_at?: string
          embedding?: string | null
          id?: string
          intent?: string | null
          pending_action?: Json | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_contexts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_contexts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          metadata: Json
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          tenant_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_resources: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          resource_id: string
          tenant_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          resource_id: string
          tenant_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          resource_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_resources_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_resources_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount_paid: number
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          notes: string | null
          payment_status: string
          price_charged: number | null
          service_id: string
          source: string
          start_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          notes?: string | null
          payment_status?: string
          price_charged?: number | null
          service_id: string
          source?: string
          start_at: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          notes?: string | null
          payment_status?: string
          price_charged?: number | null
          service_id?: string
          source?: string
          start_at?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          category: string
          client_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          deleted_at: string | null
          description: string | null
          id: string
          payment_method: string
          tenant_id: string
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          payment_method: string
          tenant_id: string
          transaction_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          payment_method?: string
          tenant_id?: string
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          full_name: string
          gdpr_consent_at: string | null
          guest_converted_at: string | null
          id: string
          is_anonymized: boolean
          is_guest: boolean
          marketing_consent: boolean
          nif: string | null
          notes: string | null
          phone: string | null
          tags: string[]
          tax_id: string | null
          tax_id_type: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          gdpr_consent_at?: string | null
          guest_converted_at?: string | null
          id?: string
          is_anonymized?: boolean
          is_guest?: boolean
          marketing_consent?: boolean
          nif?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          tax_id?: string | null
          tax_id_type?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          gdpr_consent_at?: string | null
          guest_converted_at?: string | null
          id?: string
          is_anonymized?: boolean
          is_guest?: boolean
          marketing_consent?: boolean
          nif?: string | null
          notes?: string | null
          phone?: string | null
          tags?: string[]
          tax_id?: string | null
          tax_id_type?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_channels: {
        Row: {
          channel: string
          config: Json
          created_at: string
          id: string
          is_active: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string
          config?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_channels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_logs: {
        Row: {
          body: string
          booking_id: string | null
          channel: string
          client_id: string | null
          created_at: string
          error: string | null
          event_type: string
          id: string
          recipient: string
          sent_at: string | null
          status: string
          template_id: string | null
          tenant_id: string
        }
        Insert: {
          body: string
          booking_id?: string | null
          channel: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          event_type: string
          id?: string
          recipient: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id: string
        }
        Update: {
          body?: string
          booking_id?: string | null
          channel?: string
          client_id?: string | null
          created_at?: string
          error?: string | null
          event_type?: string
          id?: string
          recipient?: string
          sent_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communication_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          body: string
          channel: string
          created_at: string
          event_type: string
          id: string
          is_active: boolean
          locale: string
          meta_category: string | null
          meta_language_code: string | null
          meta_status: string
          meta_template_name: string | null
          name: string
          provider: string | null
          tenant_id: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body: string
          channel: string
          created_at?: string
          event_type: string
          id?: string
          is_active?: boolean
          locale?: string
          meta_category?: string | null
          meta_language_code?: string | null
          meta_status?: string
          meta_template_name?: string | null
          name: string
          provider?: string | null
          tenant_id: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          is_active?: boolean
          locale?: string
          meta_category?: string | null
          meta_language_code?: string | null
          meta_status?: string
          meta_template_name?: string | null
          name?: string
          provider?: string | null
          tenant_id?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "communication_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_metrics: {
        Row: {
          bookings_cancelled: number
          bookings_completed: number
          bookings_no_show: number
          bookings_total: number
          created_at: string
          date: string
          id: string
          new_clients: number
          revenue_total: number
          tenant_id: string
          updated_at: string
          whatsapp_messages_received: number
          whatsapp_messages_sent: number
        }
        Insert: {
          bookings_cancelled?: number
          bookings_completed?: number
          bookings_no_show?: number
          bookings_total?: number
          created_at?: string
          date: string
          id?: string
          new_clients?: number
          revenue_total?: number
          tenant_id: string
          updated_at?: string
          whatsapp_messages_received?: number
          whatsapp_messages_sent?: number
        }
        Update: {
          bookings_cancelled?: number
          bookings_completed?: number
          bookings_no_show?: number
          bookings_total?: number
          created_at?: string
          date?: string
          id?: string
          new_clients?: number
          revenue_total?: number
          tenant_id?: string
          updated_at?: string
          whatsapp_messages_received?: number
          whatsapp_messages_sent?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json
          created_at: string
          flag_name: string
          id: string
          is_enabled: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          flag_name: string
          id?: string
          is_enabled?: boolean
          tenant_id: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_consents: {
        Row: {
          client_id: string
          consent_type: string
          consent_version: string
          consented: boolean
          consented_at: string
          id: string
          ip_address: unknown
          revoked_at: string | null
          tenant_id: string
          user_agent: string | null
        }
        Insert: {
          client_id: string
          consent_type: string
          consent_version: string
          consented: boolean
          consented_at?: string
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          tenant_id: string
          user_agent?: string | null
        }
        Update: {
          client_id?: string
          consent_type?: string
          consent_version?: string
          consented?: boolean
          consented_at?: string
          id?: string
          ip_address?: unknown
          revoked_at?: string | null
          tenant_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_consents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_consents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string
          features: Json
          id: string
          is_active: boolean
          max_bookings_month: number | null
          max_clients: number | null
          max_messages: number | null
          max_resources: number | null
          max_users: number | null
          name: string
          price_monthly: number | null
          price_yearly: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_bookings_month?: number | null
          max_clients?: number | null
          max_messages?: number | null
          max_resources?: number | null
          max_users?: number | null
          name: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_bookings_month?: number | null
          max_clients?: number | null
          max_messages?: number | null
          max_resources?: number | null
          max_users?: number | null
          name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          phone: string | null
          role: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          phone?: string | null
          role?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_availability: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          resource_id: string
          start_time: string
          tenant_id: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          resource_id: string
          start_time: string
          tenant_id: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          resource_id?: string
          start_time?: string
          tenant_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resource_availability_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_availability_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resource_blocks: {
        Row: {
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          reason: string | null
          resource_id: string
          start_at: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          end_at: string
          id?: string
          reason?: string | null
          resource_id: string
          start_at: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          end_at?: string
          id?: string
          reason?: string | null
          resource_id?: string
          start_at?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resource_blocks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_blocks_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resource_blocks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          avatar_url: string | null
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean
          metadata: Json
          name: string
          profile_id: string | null
          tenant_id: string
          type: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          profile_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          profile_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          color: string
          created_at: string
          deleted_at: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          metadata: Json
          name: string
          price: number | null
          requires_resource_type: string | null
          sort_order: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes: number
          id?: string
          is_active?: boolean
          metadata?: Json
          name: string
          price?: number | null
          requires_resource_type?: string | null
          sort_order?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          metadata?: Json
          name?: string
          price?: number | null
          requires_resource_type?: string | null
          sort_order?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_profile_id: string | null
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          target_tenant_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_profile_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          target_tenant_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_profile_id?: string | null
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          target_tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_audit_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_audit_logs_target_tenant_id_fkey"
            columns: ["target_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          resource_id: string | null
          role: string
          status: string
          tenant_id: string
          token: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          resource_id?: string | null
          role: string
          status?: string
          tenant_id: string
          token?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          resource_id?: string | null
          role?: string
          status?: string
          tenant_id?: string
          token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_resource_id_fkey"
            columns: ["resource_id"]
            isOneToOne: false
            referencedRelation: "resources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: Json | null
          business_type: string
          country: string
          created_at: string
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          onboarding_completed: boolean
          onboarding_step: number
          phone: string | null
          plan_id: string | null
          plan_started_at: string | null
          settings: Json
          slug: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: Json | null
          business_type: string
          country?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          settings?: Json
          slug: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: Json | null
          business_type?: string
          country?: string
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          onboarding_completed?: boolean
          onboarding_step?: number
          phone?: string | null
          plan_id?: string | null
          plan_started_at?: string | null
          settings?: Json
          slug?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          assigned_to: string | null
          client_id: string | null
          created_at: string
          id: string
          internal_notes: string | null
          last_message_at: string | null
          status: string
          tenant_id: string
          updated_at: string
          wa_contact_name: string | null
          wa_phone_number: string
        }
        Insert: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          last_message_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          wa_contact_name?: string | null
          wa_phone_number: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          internal_notes?: string | null
          last_message_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          wa_contact_name?: string | null
          wa_phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string
          delivered_at: string | null
          direction: string
          id: string
          is_ai_generated: boolean
          media_url: string | null
          message_type: string
          payload: Json | null
          processed_status: string
          read_at: string | null
          sent_by: string | null
          tenant_id: string
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string
          delivered_at?: string | null
          direction: string
          id?: string
          is_ai_generated?: boolean
          media_url?: string | null
          message_type?: string
          payload?: Json | null
          processed_status?: string
          read_at?: string | null
          sent_by?: string | null
          tenant_id: string
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string
          delivered_at?: string | null
          direction?: string
          id?: string
          is_ai_generated?: boolean
          media_url?: string | null
          message_type?: string
          payload?: Json | null
          processed_status?: string
          read_at?: string | null
          sent_by?: string | null
          tenant_id?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_tenants: {
        Args: never
        Returns: {
          booking_count: number
          business_type: string
          client_count: number
          country: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          onboarding_completed: boolean
          owner_created_at: string
          owner_email: string
          owner_id: string
          owner_is_active: boolean
          owner_last_login: string
          owner_name: string
          plan_id: string
          slug: string
          user_count: number
        }[]
      }
      admin_tenant_metrics: {
        Args: never
        Returns: {
          active_tenants: number
          suspended_tenants: number
          total_bookings: number
          total_clients: number
          total_tenants: number
          total_users: number
          trial_tenants: number
        }[]
      }
      anonymize_client: {
        Args: { p_client_id: string; p_tenant_id: string }
        Returns: undefined
      }
      auth_tenant_id: { Args: never; Returns: string }
      auth_user_role: { Args: never; Returns: string }
      create_booking: {
        Args: {
          p_client_id: string
          p_end_at: string
          p_notes?: string
          p_resource_ids: string[]
          p_service_id: string
          p_start_at: string
        }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          notes: string | null
          price_charged: number | null
          service_id: string
          source: string
          start_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_marketing_consent_version: { Args: never; Returns: string }
      ensure_tenant_for_current_user: { Args: never; Returns: string }
      get_available_slots: {
        Args: {
          p_end_date: string
          p_resource_ids: string[]
          p_service_id: string
          p_slot_interval_minutes?: number
          p_start_date: string
          p_tenant_id: string
        }
        Returns: {
          resource_id: string
          slot_end: string
          slot_start: string
        }[]
      }
      get_tenant_feature_flag: {
        Args: { p_flag_name: string; p_tenant_id: string }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
          p_record_id: string
          p_table_name: string
          p_tenant_id: string
        }
        Returns: undefined
      }
      provision_tenant_for_user: {
        Args: { p_email: string; p_full_name?: string; p_user_id: string }
        Returns: string
      }
      record_audit_log: {
        Args: {
          p_action: string
          p_metadata?: Json
          p_record_id?: string
          p_table_name?: string
        }
        Returns: string
      }
      record_system_audit_log: {
        Args: {
          p_action: string
          p_description?: string
          p_entity_id?: string
          p_entity_type?: string
          p_metadata?: Json
          p_target_tenant_id?: string
        }
        Returns: string
      }
      reschedule_booking: {
        Args: {
          p_booking_id: string
          p_end_at: string
          p_notes?: string
          p_resource_ids: string[]
          p_start_at: string
        }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          client_id: string
          created_at: string
          created_by: string | null
          end_at: string
          id: string
          notes: string | null
          price_charged: number | null
          service_id: string
          source: string
          start_at: string
          status: string
          tenant_id: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      soft_delete_client: { Args: { p_id: string }; Returns: string }
      soft_delete_resource: { Args: { p_id: string }; Returns: string }
      soft_delete_service: { Args: { p_id: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const


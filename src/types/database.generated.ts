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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      article_authors: {
        Row: {
          article_id: string
          created_at: string
          display_order: number
          person_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          display_order?: number
          person_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          display_order?: number
          person_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_authors_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_authors_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      article_relations: {
        Row: {
          created_at: string
          display_order: number
          related_article_id: string
          source_article_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          related_article_id: string
          source_article_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          related_article_id?: string
          source_article_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_relations_related_article_id_fkey"
            columns: ["related_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_relations_source_article_id_fkey"
            columns: ["source_article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      article_sectors: {
        Row: {
          article_id: string
          created_at: string
          sector_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          sector_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_sectors_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_sectors_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      article_services: {
        Row: {
          article_id: string
          created_at: string
          service_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          service_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_services_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      article_tags: {
        Row: {
          article_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_tags_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      article_translations: {
        Row: {
          article_id: string
          content: Json
          created_at: string
          excerpt: string | null
          locale: string
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          sources: Json
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          article_id: string
          content?: Json
          created_at?: string
          excerpt?: string | null
          locale: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          sources?: Json
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          article_id?: string
          content?: Json
          created_at?: string
          excerpt?: string | null
          locale?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          sources?: Json
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_translations_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      articles: {
        Row: {
          cover_media_id: string | null
          created_at: string
          created_by: string | null
          external_media_url: string | null
          featured_order: number
          id: string
          is_featured: boolean
          kind: string
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          external_media_url?: string | null
          featured_order?: number
          id?: string
          is_featured?: boolean
          kind?: string
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cover_media_id?: string | null
          created_at?: string
          created_by?: string | null
          external_media_url?: string | null
          featured_order?: number
          id?: string
          is_featured?: boolean
          kind?: string
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "articles_cover_media_id_fkey"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "articles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          display_order: number
          flag_media_id: string | null
          is_covered: boolean
          last_reviewed_on: string | null
          map_config: Json
          outline_media_id: string | null
          region_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          flag_media_id?: string | null
          is_covered?: boolean
          last_reviewed_on?: string | null
          map_config?: Json
          outline_media_id?: string | null
          region_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          flag_media_id?: string | null
          is_covered?: boolean
          last_reviewed_on?: string | null
          map_config?: Json
          outline_media_id?: string | null
          region_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "countries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "countries_flag_media_id_fkey"
            columns: ["flag_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "countries_outline_media_id_fkey"
            columns: ["outline_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "countries_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "countries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      country_offices: {
        Row: {
          country_code: string
          created_at: string
          display_order: number
          office_id: string
        }
        Insert: {
          country_code: string
          created_at?: string
          display_order?: number
          office_id: string
        }
        Update: {
          country_code?: string
          created_at?: string
          display_order?: number
          office_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_offices_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "country_offices_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      country_people: {
        Row: {
          country_code: string
          created_at: string
          display_order: number
          person_id: string
          relationship: string
        }
        Insert: {
          country_code: string
          created_at?: string
          display_order?: number
          person_id: string
          relationship?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          display_order?: number
          person_id?: string
          relationship?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_people_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "country_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      country_service_translations: {
        Row: {
          content: Json
          country_code: string
          created_at: string
          locale: string
          service_id: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          country_code: string
          created_at?: string
          locale: string
          service_id: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          country_code?: string
          created_at?: string
          locale?: string
          service_id?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_service_translations_country_code_service_id_fkey"
            columns: ["country_code", "service_id"]
            isOneToOne: false
            referencedRelation: "country_services"
            referencedColumns: ["country_code", "service_id"]
          },
          {
            foreignKeyName: "country_service_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      country_services: {
        Row: {
          country_code: string
          coverage_level: string | null
          created_at: string
          display_order: number
          service_id: string
          updated_at: string
        }
        Insert: {
          country_code: string
          coverage_level?: string | null
          created_at?: string
          display_order?: number
          service_id: string
          updated_at?: string
        }
        Update: {
          country_code?: string
          coverage_level?: string | null
          created_at?: string
          display_order?: number
          service_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_services_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "country_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      country_statistic_translations: {
        Row: {
          created_at: string
          display_value: string | null
          label: string
          locale: string
          statistic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_value?: string | null
          label: string
          locale: string
          statistic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_value?: string | null
          label?: string
          locale?: string
          statistic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_statistic_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "country_statistic_translations_statistic_id_fkey"
            columns: ["statistic_id"]
            isOneToOne: false
            referencedRelation: "country_statistics"
            referencedColumns: ["id"]
          },
        ]
      }
      country_statistics: {
        Row: {
          country_code: string
          created_at: string
          display_order: number
          id: string
          metric_key: string
          numeric_value: number | null
          source_url: string | null
          statistic_year: number | null
          unit: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          display_order?: number
          id?: string
          metric_key: string
          numeric_value?: number | null
          source_url?: string | null
          statistic_year?: number | null
          unit?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          display_order?: number
          id?: string
          metric_key?: string
          numeric_value?: number | null
          source_url?: string | null
          statistic_year?: number | null
          unit?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_statistics_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
        ]
      }
      country_translations: {
        Row: {
          content: Json
          country_code: string
          coverage_summary: string | null
          created_at: string
          locale: string
          name: string
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          country_code: string
          coverage_summary?: string | null
          created_at?: string
          locale: string
          name: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          country_code?: string
          coverage_summary?: string | null
          created_at?: string
          locale?: string
          name?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "country_translations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "country_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      endorsement_translations: {
        Row: {
          attribution_title: string | null
          created_at: string
          endorsement_id: string
          locale: string
          published_at: string | null
          quote: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          attribution_title?: string | null
          created_at?: string
          endorsement_id: string
          locale: string
          published_at?: string | null
          quote: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          attribution_title?: string | null
          created_at?: string
          endorsement_id?: string
          locale?: string
          published_at?: string | null
          quote?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsement_translations_endorsement_id_fkey"
            columns: ["endorsement_id"]
            isOneToOne: false
            referencedRelation: "endorsements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsement_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
        ]
      }
      endorsements: {
        Row: {
          attribution_name: string
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          partner_id: string | null
          portrait_media_id: string | null
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          attribution_name: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          partner_id?: string | null
          portrait_media_id?: string | null
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          attribution_name?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          partner_id?: string | null
          portrait_media_id?: string | null
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_portrait_media_id_fkey"
            columns: ["portrait_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "endorsements_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      locales: {
        Row: {
          code: string
          created_at: string
          display_order: number
          is_active: boolean
          is_default: boolean
          label: string
          native_label: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          display_order?: number
          is_active?: boolean
          is_default?: boolean
          label: string
          native_label: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          display_order?: number
          is_active?: boolean
          is_default?: boolean
          label?: string
          native_label?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_asset_translations: {
        Row: {
          alt_text: string
          caption: string | null
          created_at: string
          locale: string
          media_asset_id: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          locale: string
          media_asset_id: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          caption?: string | null
          created_at?: string
          locale?: string
          media_asset_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "media_asset_translations_media_asset_id_fkey"
            columns: ["media_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bucket_id: string
          checksum: string | null
          created_at: string
          file_size_bytes: number | null
          height: number | null
          id: string
          is_public: boolean
          mime_type: string | null
          object_path: string
          original_filename: string | null
          updated_at: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          bucket_id?: string
          checksum?: string | null
          created_at?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          object_path: string
          original_filename?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          bucket_id?: string
          checksum?: string | null
          created_at?: string
          file_size_bytes?: number | null
          height?: number | null
          id?: string
          is_public?: boolean
          mime_type?: string | null
          object_path?: string
          original_filename?: string | null
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      office_translations: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          locale: string
          name: string
          office_id: string
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          locale: string
          name: string
          office_id: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          locale?: string
          name?: string
          office_id?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "office_translations_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "offices"
            referencedColumns: ["id"]
          },
        ]
      }
      offices: {
        Row: {
          country_code: string | null
          created_at: string
          created_by: string | null
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          phone: string | null
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offices_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "offices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offices_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_translations: {
        Row: {
          alt_text: string
          created_at: string
          description: string | null
          locale: string
          partner_id: string
          published_at: string | null
          scheduled_for: string | null
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          description?: string | null
          locale: string
          partner_id: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          description?: string | null
          locale?: string
          partner_id?: string
          published_at?: string | null
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "partner_translations_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          logo_media_id: string | null
          name: string
          stable_key: string
          updated_at: string
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_media_id?: string | null
          name: string
          stable_key: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          logo_media_id?: string | null
          name?: string
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partners_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_logo_media_id_fkey"
            columns: ["logo_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partners_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          created_at: string
          created_by: string | null
          display_name: string
          display_order: number
          email: string | null
          id: string
          is_active: boolean
          is_author: boolean
          is_team_member: boolean
          phone: string | null
          portrait_media_id: string | null
          social_links: Json
          stable_key: string
          updated_at: string
          updated_by: string | null
          website_url: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_name: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_author?: boolean
          is_team_member?: boolean
          phone?: string | null
          portrait_media_id?: string | null
          social_links?: Json
          stable_key: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_name?: string
          display_order?: number
          email?: string | null
          id?: string
          is_active?: boolean
          is_author?: boolean
          is_team_member?: boolean
          phone?: string | null
          portrait_media_id?: string | null
          social_links?: Json
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "people_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_portrait_media_id_fkey"
            columns: ["portrait_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "people_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      people_translations: {
        Row: {
          content: Json
          created_at: string
          job_title: string | null
          locale: string
          person_id: string
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          short_bio: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          job_title?: string | null
          locale: string
          person_id: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_bio?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          job_title?: string | null
          locale?: string
          person_id?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          short_bio?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "people_translations_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          invited_by: string | null
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          invited_by?: string | null
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          created_at: string
          created_by: string | null
          destination_path: string
          id: string
          is_active: boolean
          locale: string | null
          source_path: string
          status_code: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destination_path: string
          id?: string
          is_active?: boolean
          locale?: string | null
          source_path: string
          status_code?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destination_path?: string
          id?: string
          is_active?: boolean
          locale?: string | null
          source_path?: string
          status_code?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "redirects_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redirects_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "redirects_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      region_translations: {
        Row: {
          created_at: string
          locale: string
          name: string
          published_at: string | null
          region_id: string
          scheduled_for: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          locale: string
          name: string
          published_at?: string | null
          region_id: string
          scheduled_for?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          locale?: string
          name?: string
          published_at?: string | null
          region_id?: string
          scheduled_for?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "region_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "region_translations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          map_config: Json
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          map_config?: Json
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          map_config?: Json
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "regions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "regions_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_people: {
        Row: {
          created_at: string
          display_order: number
          person_id: string
          relationship: string
          sector_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          person_id: string
          relationship?: string
          sector_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          person_id?: string
          relationship?: string
          sector_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sector_people_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_translations: {
        Row: {
          content: Json
          created_at: string
          locale: string
          name: string
          published_at: string | null
          scheduled_for: string | null
          sector_id: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          locale: string
          name: string
          published_at?: string | null
          scheduled_for?: string | null
          sector_id: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          locale?: string
          name?: string
          published_at?: string | null
          scheduled_for?: string | null
          sector_id?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sector_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sector_translations_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          icon_media_id: string | null
          id: string
          is_active: boolean
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon_media_id?: string | null
          id?: string
          is_active?: boolean
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon_media_id?: string | null
          id?: string
          is_active?: boolean
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sectors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_icon_media_id_fkey"
            columns: ["icon_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sectors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_people: {
        Row: {
          created_at: string
          display_order: number
          person_id: string
          relationship: string
          service_id: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          person_id: string
          relationship?: string
          service_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          person_id?: string
          relationship?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_people_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      service_translations: {
        Row: {
          content: Json
          created_at: string
          locale: string
          name: string
          published_at: string | null
          scheduled_for: string | null
          seo_description: string | null
          seo_title: string | null
          service_id: string
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          locale: string
          name: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          service_id: string
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          locale?: string
          name?: string
          published_at?: string | null
          scheduled_for?: string | null
          seo_description?: string | null
          seo_title?: string | null
          service_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "service_translations_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          icon_media_id: string | null
          id: string
          is_active: boolean
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon_media_id?: string | null
          id?: string
          is_active?: boolean
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          icon_media_id?: string | null
          id?: string
          is_active?: boolean
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "services_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_icon_media_id_fkey"
            columns: ["icon_media_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "services_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          created_at: string
          description: string | null
          is_public: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          created_at?: string
          description?: string | null
          is_public?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tag_translations: {
        Row: {
          created_at: string
          description: string | null
          locale: string
          name: string
          published_at: string | null
          scheduled_for: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          tag_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          locale: string
          name: string
          published_at?: string | null
          scheduled_for?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          tag_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          locale?: string
          name?: string
          published_at?: string | null
          scheduled_for?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          tag_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tag_translations_locale_fkey"
            columns: ["locale"]
            isOneToOne: false
            referencedRelation: "locales"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tag_translations_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_active: boolean
          stable_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          stable_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          stable_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "editor"
      content_status: "draft" | "scheduled" | "published" | "archived"
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
      app_role: ["admin", "editor"],
      content_status: ["draft", "scheduled", "published", "archived"],
    },
  },
} as const

-- Extensions
create extension if not exists citext with schema public;
create extension if not exists pgcrypto with schema public;
create extension if not exists pg_trgm with schema public;

-- Enums (controlled vocabularies)
create type property_status as enum ('draft','coming_soon','for_sale','under_contract','sold','paused','archived');
create type moderation_status as enum ('clear','flagged','hidden');
create type address_visibility as enum ('full','city_zip','city_only');
create type property_type as enum ('single_family','multi_family','condo','townhouse','co_op','land','manufactured_home','other');
create type pricing_type as enum ('asking_price','expected_range','price_undecided');
create type sale_method as enum ('independent','agent_assisted');
create type lead_recipient as enum ('seller','agent','both');
create type lead_status as enum ('new','contacted','showing_scheduled','interested','offer_stage','closed','not_interested');
create type inquiry_type as enum ('question','showing_request','more_information','offer_interest','open_house_question','future_property_interest','general_seller_question','other');
create type buying_stage as enum ('pre_approved','planning_to_get_pre_approved','cash_buyer','just_starting','prefer_not_to_say');
create type agent_status as enum ('yes','no','prefer_not_to_say');
create type contact_method as enum ('email','phone','text');
create type registration_type as enum ('none','optional','required');
create type host_type as enum ('seller','agent','both');
create type open_house_status as enum ('scheduled','cancelled');
create type rsvp_agent_status as enum ('working_with_agent','not_working_with_agent','prefer_not_to_say');
create type rsvp_status as enum ('confirmed','cancelled');
create type report_reason as enum ('fraud','incorrect_information','discriminatory_content','stolen_photos','duplicate_listing','spam','other');
create type report_status as enum ('open','reviewing','resolved','dismissed');
create type seller_account_type as enum ('individual','business');
create type seller_status as enum ('active','suspended','deactivated');
create type app_role as enum ('user','admin');
create type email_status as enum ('pending','sent','failed');
create type notification_type as enum ('new_property','coming_soon_property','open_house_created','open_house_updated','open_house_cancelled','new_lead','open_house_rsvp','listing_moderated','account_moderated');
create type lot_size_unit as enum ('sqft','acres');
create type billing_status as enum ('none','active','past_due');

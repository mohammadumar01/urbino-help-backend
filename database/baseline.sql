-- Baseline schema: poora database structure (migration 010 tak).
-- Sirf KHAALI database par chalta hai (jaise naya cloud DB). Purane DB par
-- migrate.js ise skip karta hai. Naye badlav hamesha naye migration file mein karo.
-- Dobara banana ho: pg_dump --schema-only --no-owner --no-privileges -T schema_migrations
--
-- PostgreSQL database dump
--



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agent_invites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_invites (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    agent_id integer NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    message text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    responded_at timestamp without time zone,
    CONSTRAINT agent_invites_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: agent_invites_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_invites_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_invites_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_invites_id_seq OWNED BY public.agent_invites.id;


--
-- Name: agent_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_profiles (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    address text,
    experience_years integer DEFAULT 0 NOT NULL,
    skills text,
    service_area text,
    profile_image text,
    verification_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    document_path text,
    document_original_name text,
    document_mime_type character varying(100),
    CONSTRAINT agent_profiles_experience_years_check CHECK ((experience_years >= 0)),
    CONSTRAINT agent_profiles_verification_status_check CHECK (((verification_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: agent_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_profiles_id_seq OWNED BY public.agent_profiles.id;


--
-- Name: agent_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_services (
    id integer NOT NULL,
    agent_id integer NOT NULL,
    service_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: agent_services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.agent_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: agent_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.agent_services_id_seq OWNED BY public.agent_services.id;


--
-- Name: booking_tracking; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_tracking (
    booking_id integer NOT NULL,
    agent_id integer,
    latitude numeric(9,6) NOT NULL,
    longitude numeric(9,6) NOT NULL,
    accuracy_m integer,
    heading smallint,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    service_name character varying(100) NOT NULL,
    address text NOT NULL,
    booking_date date NOT NULL,
    booking_time character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    provider_id integer,
    completed_at timestamp without time zone,
    agent_id integer,
    provider_accepted_at timestamp without time zone,
    agent_assigned_at timestamp without time zone,
    agent_accepted_at timestamp without time zone,
    started_at timestamp without time zone,
    on_the_way_at timestamp without time zone,
    service_id integer,
    price numeric(10,2),
    cancelled_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    start_otp character varying(6),
    start_otp_attempts smallint DEFAULT 0 NOT NULL,
    agent_declined_reason text,
    rework_of integer,
    latitude numeric(9,6),
    longitude numeric(9,6),
    CONSTRAINT bookings_latlng_check CHECK ((((latitude IS NULL) AND (longitude IS NULL)) OR (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)) AND ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric))))),
    CONSTRAINT bookings_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'provider_accepted'::character varying, 'agent_assigned'::character varying, 'agent_accepted'::character varying, 'on_the_way'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);


--
-- Name: bookings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bookings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bookings_id_seq OWNED BY public.bookings.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    booking_id integer,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    type character varying(50) NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_events (
    id integer NOT NULL,
    gateway character varying(20) NOT NULL,
    event_id character varying(120) NOT NULL,
    event_type character varying(60) NOT NULL,
    payload jsonb NOT NULL,
    received_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payment_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_events_id_seq OWNED BY public.payment_events.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    customer_id integer NOT NULL,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50) NOT NULL,
    payment_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    transaction_id character varying(255),
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    gateway character varying(20),
    gateway_order_id character varying(100),
    gateway_payment_id character varying(100),
    failure_reason text,
    refund_id character varying(100),
    refunded_at timestamp without time zone,
    platform_fee numeric(10,2),
    provider_earning numeric(10,2),
    collected_by integer,
    CONSTRAINT payments_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT payments_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'successful'::character varying, 'failed'::character varying, 'refund_pending'::character varying, 'refunded'::character varying])::text[])))
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: provider_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_agents (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    agent_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT provider_cannot_be_agent CHECK ((provider_id <> agent_id))
);


--
-- Name: provider_agents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_agents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_agents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_agents_id_seq OWNED BY public.provider_agents.id;


--
-- Name: provider_availability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_availability (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    day_of_week character varying(10) NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_valid_day CHECK (((day_of_week)::text = ANY ((ARRAY['Monday'::character varying, 'Tuesday'::character varying, 'Wednesday'::character varying, 'Thursday'::character varying, 'Friday'::character varying, 'Saturday'::character varying, 'Sunday'::character varying])::text[]))),
    CONSTRAINT check_valid_time CHECK ((start_time < end_time))
);


--
-- Name: provider_availability_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_availability_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_availability_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_availability_id_seq OWNED BY public.provider_availability.id;


--
-- Name: provider_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_payouts (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    direction character varying(20) NOT NULL,
    amount numeric(10,2) NOT NULL,
    reference character varying(120),
    note text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT provider_payouts_amount_check CHECK ((amount > (0)::numeric)),
    CONSTRAINT provider_payouts_direction_check CHECK (((direction)::text = ANY ((ARRAY['to_provider'::character varying, 'from_provider'::character varying])::text[])))
);


--
-- Name: provider_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_payouts_id_seq OWNED BY public.provider_payouts.id;


--
-- Name: provider_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_profiles (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    bio text,
    experience_years integer DEFAULT 0,
    skills text,
    service_area character varying(255),
    hourly_rate numeric(10,2),
    profile_image text,
    is_verified boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    latitude numeric(9,6),
    longitude numeric(9,6),
    service_radius_km integer DEFAULT 15 NOT NULL,
    CONSTRAINT provider_profiles_experience_check CHECK (((experience_years IS NULL) OR ((experience_years >= 0) AND (experience_years <= 60)))),
    CONSTRAINT provider_profiles_radius_check CHECK (((service_radius_km >= 1) AND (service_radius_km <= 100)))
);


--
-- Name: provider_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_profiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_profiles_id_seq OWNED BY public.provider_profiles.id;


--
-- Name: provider_services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_services (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    service_id integer NOT NULL,
    price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT provider_services_price_check CHECK ((price > (0)::numeric))
);


--
-- Name: provider_services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_services_id_seq OWNED BY public.provider_services.id;


--
-- Name: provider_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.provider_verifications (
    id integer NOT NULL,
    provider_id integer NOT NULL,
    document_type character varying(50) NOT NULL,
    document_number character varying(100),
    document_url text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    rejection_reason text,
    verified_by integer,
    verified_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    document_original_name text,
    document_mime_type character varying(100),
    CONSTRAINT provider_verifications_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: provider_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.provider_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: provider_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.provider_verifications_id_seq OWNED BY public.provider_verifications.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    customer_id integer NOT NULL,
    provider_id integer NOT NULL,
    rating integer NOT NULL,
    review text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: service_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.service_claims (
    id integer NOT NULL,
    booking_id integer NOT NULL,
    customer_id integer NOT NULL,
    provider_id integer,
    reason text NOT NULL,
    preferred_date date,
    preferred_time character varying(5),
    status character varying(20) DEFAULT 'requested'::character varying NOT NULL,
    provider_note text,
    rework_booking_id integer,
    support_ticket_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT service_claims_status_check CHECK (((status)::text = ANY ((ARRAY['requested'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'escalated'::character varying])::text[])))
);


--
-- Name: service_claims_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.service_claims_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: service_claims_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.service_claims_id_seq OWNED BY public.service_claims.id;


--
-- Name: services; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.services (
    id integer NOT NULL,
    category_id integer NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    base_price numeric(10,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT services_base_price_check CHECK (((base_price IS NULL) OR (base_price >= (0)::numeric)))
);


--
-- Name: services_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.services_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.services_id_seq OWNED BY public.services.id;


--
-- Name: support_tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_tickets (
    id integer NOT NULL,
    user_id integer,
    name character varying(100),
    phone character varying(20),
    booking_id integer,
    category character varying(40) DEFAULT 'other'::character varying NOT NULL,
    message text NOT NULL,
    chat_transcript jsonb,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    admin_note text,
    resolved_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT support_tickets_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'resolved'::character varying])::text[])))
);


--
-- Name: support_tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.support_tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: support_tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.support_tickets_id_seq OWNED BY public.support_tickets.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    phone character varying(15),
    role character varying(20) DEFAULT 'customer'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_deleted boolean DEFAULT false,
    deleted_at timestamp without time zone,
    deleted_by integer
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: agent_invites id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_invites ALTER COLUMN id SET DEFAULT nextval('public.agent_invites_id_seq'::regclass);


--
-- Name: agent_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_profiles ALTER COLUMN id SET DEFAULT nextval('public.agent_profiles_id_seq'::regclass);


--
-- Name: agent_services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_services ALTER COLUMN id SET DEFAULT nextval('public.agent_services_id_seq'::regclass);


--
-- Name: bookings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings ALTER COLUMN id SET DEFAULT nextval('public.bookings_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: payment_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events ALTER COLUMN id SET DEFAULT nextval('public.payment_events_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: provider_agents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_agents ALTER COLUMN id SET DEFAULT nextval('public.provider_agents_id_seq'::regclass);


--
-- Name: provider_availability id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_availability ALTER COLUMN id SET DEFAULT nextval('public.provider_availability_id_seq'::regclass);


--
-- Name: provider_payouts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_payouts ALTER COLUMN id SET DEFAULT nextval('public.provider_payouts_id_seq'::regclass);


--
-- Name: provider_profiles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles ALTER COLUMN id SET DEFAULT nextval('public.provider_profiles_id_seq'::regclass);


--
-- Name: provider_services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_services ALTER COLUMN id SET DEFAULT nextval('public.provider_services_id_seq'::regclass);


--
-- Name: provider_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_verifications ALTER COLUMN id SET DEFAULT nextval('public.provider_verifications_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: service_claims id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims ALTER COLUMN id SET DEFAULT nextval('public.service_claims_id_seq'::regclass);


--
-- Name: services id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services ALTER COLUMN id SET DEFAULT nextval('public.services_id_seq'::regclass);


--
-- Name: support_tickets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets ALTER COLUMN id SET DEFAULT nextval('public.support_tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: agent_invites agent_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_invites
    ADD CONSTRAINT agent_invites_pkey PRIMARY KEY (id);


--
-- Name: agent_profiles agent_profiles_agent_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_profiles
    ADD CONSTRAINT agent_profiles_agent_id_key UNIQUE (agent_id);


--
-- Name: agent_profiles agent_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_profiles
    ADD CONSTRAINT agent_profiles_pkey PRIMARY KEY (id);


--
-- Name: agent_services agent_services_agent_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_services
    ADD CONSTRAINT agent_services_agent_id_service_id_key UNIQUE (agent_id, service_id);


--
-- Name: agent_services agent_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_services
    ADD CONSTRAINT agent_services_pkey PRIMARY KEY (id);


--
-- Name: booking_tracking booking_tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_tracking
    ADD CONSTRAINT booking_tracking_pkey PRIMARY KEY (booking_id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_key UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: payment_events payment_events_gateway_event_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_gateway_event_id_key UNIQUE (gateway, event_id);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: payments payments_transaction_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_transaction_id_key UNIQUE (transaction_id);


--
-- Name: provider_agents provider_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_agents
    ADD CONSTRAINT provider_agents_pkey PRIMARY KEY (id);


--
-- Name: provider_availability provider_availability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_availability
    ADD CONSTRAINT provider_availability_pkey PRIMARY KEY (id);


--
-- Name: provider_payouts provider_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_payouts
    ADD CONSTRAINT provider_payouts_pkey PRIMARY KEY (id);


--
-- Name: provider_profiles provider_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles
    ADD CONSTRAINT provider_profiles_pkey PRIMARY KEY (id);


--
-- Name: provider_profiles provider_profiles_provider_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles
    ADD CONSTRAINT provider_profiles_provider_id_key UNIQUE (provider_id);


--
-- Name: provider_services provider_services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_services
    ADD CONSTRAINT provider_services_pkey PRIMARY KEY (id);


--
-- Name: provider_services provider_services_provider_id_service_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_services
    ADD CONSTRAINT provider_services_provider_id_service_id_key UNIQUE (provider_id, service_id);


--
-- Name: provider_verifications provider_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_verifications
    ADD CONSTRAINT provider_verifications_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_booking_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_key UNIQUE (booking_id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: service_claims service_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims
    ADD CONSTRAINT service_claims_pkey PRIMARY KEY (id);


--
-- Name: services services_category_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_name_key UNIQUE (category_id, name);


--
-- Name: services services_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_pkey PRIMARY KEY (id);


--
-- Name: support_tickets support_tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);


--
-- Name: provider_agents unique_provider_agent; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_agents
    ADD CONSTRAINT unique_provider_agent UNIQUE (provider_id, agent_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_agent_invites_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_invites_agent ON public.agent_invites USING btree (agent_id, status);


--
-- Name: idx_agent_services_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agent_services_service ON public.agent_services USING btree (service_id);


--
-- Name: idx_bookings_agent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_agent_status ON public.bookings USING btree (agent_id, status);


--
-- Name: idx_bookings_customer_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_customer_created ON public.bookings USING btree (customer_id, created_at DESC);


--
-- Name: idx_bookings_provider_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_provider_date ON public.bookings USING btree (provider_id, booking_date) WHERE ((status)::text <> 'cancelled'::text);


--
-- Name: idx_bookings_provider_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_provider_status ON public.bookings USING btree (provider_id, status);


--
-- Name: idx_bookings_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_service ON public.bookings USING btree (service_id);


--
-- Name: idx_bookings_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status_created ON public.bookings USING btree (status, created_at DESC);


--
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);


--
-- Name: idx_payments_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_booking ON public.payments USING btree (booking_id);


--
-- Name: idx_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_customer ON public.payments USING btree (customer_id);


--
-- Name: idx_payments_paid_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_paid_at ON public.payments USING btree (paid_at DESC) WHERE ((payment_status)::text = 'successful'::text);


--
-- Name: idx_payments_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status_created ON public.payments USING btree (payment_status, created_at DESC);


--
-- Name: idx_provider_agents_agent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_agents_agent ON public.provider_agents USING btree (agent_id);


--
-- Name: idx_provider_availability_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_availability_day ON public.provider_availability USING btree (provider_id, day_of_week);


--
-- Name: idx_provider_availability_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_availability_provider ON public.provider_availability USING btree (provider_id);


--
-- Name: idx_provider_payouts_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_payouts_provider ON public.provider_payouts USING btree (provider_id, created_at DESC);


--
-- Name: idx_provider_services_service; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_services_service ON public.provider_services USING btree (service_id);


--
-- Name: idx_provider_verifications_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_provider_verifications_provider ON public.provider_verifications USING btree (provider_id, status);


--
-- Name: idx_reviews_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reviews_provider ON public.reviews USING btree (provider_id);


--
-- Name: idx_service_claims_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_service_claims_provider ON public.service_claims USING btree (provider_id, status);


--
-- Name: idx_services_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_active ON public.services USING btree (category_id) WHERE is_active;


--
-- Name: idx_services_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_services_category ON public.services USING btree (category_id);


--
-- Name: idx_support_tickets_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_status ON public.support_tickets USING btree (status, created_at DESC);


--
-- Name: idx_support_tickets_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_support_tickets_user ON public.support_tickets USING btree (user_id, created_at DESC);


--
-- Name: idx_users_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_email_lower ON public.users USING btree (lower((email)::text));


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_users_role ON public.users USING btree (role) WHERE (is_deleted IS NOT TRUE);


--
-- Name: uq_agent_invites_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_agent_invites_pending ON public.agent_invites USING btree (provider_id, agent_id) WHERE ((status)::text = 'pending'::text);


--
-- Name: uq_categories_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_categories_name ON public.categories USING btree (lower((name)::text));


--
-- Name: uq_payments_gateway_order; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_payments_gateway_order ON public.payments USING btree (gateway_order_id) WHERE (gateway_order_id IS NOT NULL);


--
-- Name: uq_payments_gateway_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_payments_gateway_payment ON public.payments USING btree (gateway_payment_id) WHERE (gateway_payment_id IS NOT NULL);


--
-- Name: uq_payments_one_success_per_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_payments_one_success_per_booking ON public.payments USING btree (booking_id) WHERE ((payment_status)::text = 'successful'::text);


--
-- Name: uq_provider_verifications_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_provider_verifications_type ON public.provider_verifications USING btree (provider_id, document_type);


--
-- Name: uq_service_claims_booking; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_service_claims_booking ON public.service_claims USING btree (booking_id);


--
-- Name: uq_services_category_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_services_category_name ON public.services USING btree (category_id, lower((name)::text));


--
-- Name: agent_invites agent_invites_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_invites
    ADD CONSTRAINT agent_invites_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_invites agent_invites_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_invites
    ADD CONSTRAINT agent_invites_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_profiles agent_profiles_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_profiles
    ADD CONSTRAINT agent_profiles_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_services agent_services_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_services
    ADD CONSTRAINT agent_services_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: agent_services agent_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_services
    ADD CONSTRAINT agent_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: booking_tracking booking_tracking_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_tracking
    ADD CONSTRAINT booking_tracking_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: booking_tracking booking_tracking_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_tracking
    ADD CONSTRAINT booking_tracking_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_agent_id_fkey FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_rework_of_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_rework_of_fkey FOREIGN KEY (rework_of) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;


--
-- Name: provider_agents fk_agent; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_agents
    ADD CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: bookings fk_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_agents fk_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_agents
    ADD CONSTRAINT fk_provider FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_availability fk_provider_availability_provider; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_availability
    ADD CONSTRAINT fk_provider_availability_provider FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payments payments_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_collected_by_fkey FOREIGN KEY (collected_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: payments payments_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_payouts provider_payouts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_payouts
    ADD CONSTRAINT provider_payouts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: provider_payouts provider_payouts_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_payouts
    ADD CONSTRAINT provider_payouts_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_profiles provider_profiles_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_profiles
    ADD CONSTRAINT provider_profiles_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_services provider_services_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_services
    ADD CONSTRAINT provider_services_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_services provider_services_service_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_services
    ADD CONSTRAINT provider_services_service_id_fkey FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE CASCADE;


--
-- Name: provider_verifications provider_verifications_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_verifications
    ADD CONSTRAINT provider_verifications_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: provider_verifications provider_verifications_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.provider_verifications
    ADD CONSTRAINT provider_verifications_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: reviews reviews_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_claims service_claims_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims
    ADD CONSTRAINT service_claims_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: service_claims service_claims_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims
    ADD CONSTRAINT service_claims_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: service_claims service_claims_provider_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims
    ADD CONSTRAINT service_claims_provider_id_fkey FOREIGN KEY (provider_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: service_claims service_claims_rework_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims
    ADD CONSTRAINT service_claims_rework_booking_id_fkey FOREIGN KEY (rework_booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: service_claims service_claims_support_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.service_claims
    ADD CONSTRAINT service_claims_support_ticket_id_fkey FOREIGN KEY (support_ticket_id) REFERENCES public.support_tickets(id) ON DELETE SET NULL;


--
-- Name: services services_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.services
    ADD CONSTRAINT services_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: support_tickets support_tickets_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_resolved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: support_tickets support_tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_tickets
    ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--



--
-- PostgreSQL database dump
--

\restrict ZunjNeSj4VVyqDrNkeeSCBnF5OR96MxjG4RGdYwAfvH4d6IV2zz1ccKTcRxQc9E

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.0

-- Started on 2026-01-09 14:10:10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 224 (class 1259 OID 32786)
-- Name: bin_sizes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bin_sizes (
    id integer NOT NULL,
    bin_type_id integer NOT NULL,
    size character varying(50) NOT NULL,
    capacity_cubic_meters numeric(10,2) NOT NULL,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bin_sizes OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 32785)
-- Name: bin_sizes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bin_sizes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bin_sizes_id_seq OWNER TO postgres;

--
-- TOC entry 4974 (class 0 OID 0)
-- Dependencies: 223
-- Name: bin_sizes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bin_sizes_id_seq OWNED BY public.bin_sizes.id;


--
-- TOC entry 222 (class 1259 OID 32769)
-- Name: bin_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.bin_types (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.bin_types OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 32768)
-- Name: bin_types_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.bin_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.bin_types_id_seq OWNER TO postgres;

--
-- TOC entry 4975 (class 0 OID 0)
-- Dependencies: 221
-- Name: bin_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.bin_types_id_seq OWNED BY public.bin_types.id;


--
-- TOC entry 226 (class 1259 OID 32811)
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    type character varying(50) DEFAULT 'string'::character varying NOT NULL,
    description text,
    category character varying(50) DEFAULT 'general'::character varying,
    is_public boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 32810)
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.system_settings_id_seq OWNER TO postgres;

--
-- TOC entry 4976 (class 0 OID 0)
-- Dependencies: 225
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- TOC entry 220 (class 1259 OID 24578)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    phone character varying(20) NOT NULL,
    email character varying(255),
    role character varying(20) NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'customer'::character varying, 'supplier'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 24577)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 4977 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4778 (class 2604 OID 32789)
-- Name: bin_sizes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_sizes ALTER COLUMN id SET DEFAULT nextval('public.bin_sizes_id_seq'::regclass);


--
-- TOC entry 4773 (class 2604 OID 32772)
-- Name: bin_types id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_types ALTER COLUMN id SET DEFAULT nextval('public.bin_types_id_seq'::regclass);


--
-- TOC entry 4783 (class 2604 OID 32814)
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- TOC entry 4770 (class 2604 OID 24581)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4966 (class 0 OID 32786)
-- Dependencies: 224
-- Data for Name: bin_sizes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.bin_sizes VALUES (1, 1, '3m³', 3.00, true, 1, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (2, 1, '6m³', 6.00, true, 2, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (3, 1, '10m³', 10.00, true, 3, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (4, 2, '3m³', 3.00, true, 1, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (5, 2, '6m³', 6.00, true, 2, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (6, 2, '10m³', 10.00, true, 3, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (7, 3, '3m³', 3.00, true, 1, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (8, 3, '6m³', 6.00, true, 2, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (9, 3, '10m³', 10.00, true, 3, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (10, 4, '3m³', 3.00, true, 1, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (11, 4, '6m³', 6.00, true, 2, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_sizes VALUES (12, 4, '10m³', 10.00, true, 3, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');


--
-- TOC entry 4964 (class 0 OID 32769)
-- Dependencies: 222
-- Data for Name: bin_types; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.bin_types VALUES (1, 'General Waste', 'General household and commercial waste', true, 1, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_types VALUES (2, 'Green Waste', 'Garden and organic waste', true, 2, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_types VALUES (3, 'Builders Waste', 'Construction and building materials', true, 3, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');
INSERT INTO public.bin_types VALUES (4, 'Concrete/Dirt', 'Concrete, dirt, and heavy materials', true, 4, '2026-01-09 13:52:33.307583', '2026-01-09 13:52:33.307583');


--
-- TOC entry 4968 (class 0 OID 32811)
-- Dependencies: 226
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.system_settings VALUES (1, 'platform_commission_percentage', '15', 'number', 'Platform commission percentage for suppliers', 'commission', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (2, 'min_booking_duration_days', '1', 'number', 'Minimum booking duration in days', 'general', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (3, 'max_booking_duration_days', '365', 'number', 'Maximum booking duration in days', 'general', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (4, 'quote_expiry_hours', '24', 'number', 'Hours until a quote expires', 'general', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (5, 'base_price_algorithm', '{"base_multiplier": 1.0, "location_factor": 0.1, "duration_factor": 0.05}', 'json', 'Base pricing algorithm parameters', 'pricing', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (6, 'enable_notifications', 'true', 'boolean', 'Enable push notifications', 'notifications', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (7, 'support_email', 'support@binrental.com', 'string', 'Support email address', 'general', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');
INSERT INTO public.system_settings VALUES (8, 'support_phone', '+1234567890', 'string', 'Support phone number', 'general', false, '2026-01-09 13:52:33.358954', '2026-01-09 13:52:33.358954');


--
-- TOC entry 4962 (class 0 OID 24578)
-- Dependencies: 220
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.users VALUES (1, 'Admin', '0123456789', NULL, 'admin', '$2b$10$gyaIpsIS1YQldLxRDRQcG.IOdVmYIxtOYWbYlQ4.zy4eQlFVA1gI6', '2026-01-08 14:28:58.258102', '2026-01-08 15:33:51.920432');


--
-- TOC entry 4978 (class 0 OID 0)
-- Dependencies: 223
-- Name: bin_sizes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bin_sizes_id_seq', 12, true);


--
-- TOC entry 4979 (class 0 OID 0)
-- Dependencies: 221
-- Name: bin_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.bin_types_id_seq', 4, true);


--
-- TOC entry 4980 (class 0 OID 0)
-- Dependencies: 225
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 8, true);


--
-- TOC entry 4981 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 2, true);


--
-- TOC entry 4802 (class 2606 OID 32801)
-- Name: bin_sizes bin_sizes_bin_type_id_size_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_sizes
    ADD CONSTRAINT bin_sizes_bin_type_id_size_key UNIQUE (bin_type_id, size);


--
-- TOC entry 4804 (class 2606 OID 32799)
-- Name: bin_sizes bin_sizes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_sizes
    ADD CONSTRAINT bin_sizes_pkey PRIMARY KEY (id);


--
-- TOC entry 4797 (class 2606 OID 32784)
-- Name: bin_types bin_types_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_types
    ADD CONSTRAINT bin_types_name_key UNIQUE (name);


--
-- TOC entry 4799 (class 2606 OID 32782)
-- Name: bin_types bin_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_types
    ADD CONSTRAINT bin_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4810 (class 2606 OID 32828)
-- Name: system_settings system_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_key_key UNIQUE (key);


--
-- TOC entry 4812 (class 2606 OID 32826)
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- TOC entry 4793 (class 2606 OID 24595)
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- TOC entry 4795 (class 2606 OID 24593)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4805 (class 1259 OID 32809)
-- Name: idx_bin_sizes_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bin_sizes_active ON public.bin_sizes USING btree (is_active);


--
-- TOC entry 4806 (class 1259 OID 32808)
-- Name: idx_bin_sizes_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bin_sizes_type_id ON public.bin_sizes USING btree (bin_type_id);


--
-- TOC entry 4800 (class 1259 OID 32807)
-- Name: idx_bin_types_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_bin_types_active ON public.bin_types USING btree (is_active);


--
-- TOC entry 4807 (class 1259 OID 32830)
-- Name: idx_system_settings_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category);


--
-- TOC entry 4808 (class 1259 OID 32829)
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (key);


--
-- TOC entry 4790 (class 1259 OID 24596)
-- Name: idx_users_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_phone ON public.users USING btree (phone);


--
-- TOC entry 4791 (class 1259 OID 24597)
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- TOC entry 4813 (class 2606 OID 32802)
-- Name: bin_sizes bin_sizes_bin_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.bin_sizes
    ADD CONSTRAINT bin_sizes_bin_type_id_fkey FOREIGN KEY (bin_type_id) REFERENCES public.bin_types(id) ON DELETE CASCADE;


-- Completed on 2026-01-09 14:10:11

--
-- PostgreSQL database dump complete
--

\unrestrict ZunjNeSj4VVyqDrNkeeSCBnF5OR96MxjG4RGdYwAfvH4d6IV2zz1ccKTcRxQc9E


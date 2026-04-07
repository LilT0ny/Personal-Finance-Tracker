-- =============================================================================
-- PERSONAL FINANCE TRACKER — Supabase Schema
-- Engine : PostgreSQL (Supabase)
-- Version: 3.0
-- =============================================================================

-- Nota: Supabase ya provee la tabla auth.users. Creamos una tabla pública
-- "usuarios" que extiende el perfil del usuario autenticado.

-- -----------------------------------------------------------------------------
-- EXTENSIONES
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- TABLA: usuarios
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
    id                 UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id       UUID, -- Ahora opcional - no usamos Supabase Auth
    cedula             VARCHAR(13)   UNIQUE NOT NULL,
    email              VARCHAR(255)  UNIQUE NOT NULL,
    password_hash      TEXT          NOT NULL, -- Hash de contraseña
    nombre             VARCHAR(100)  NOT NULL,
    apellido_paterno   VARCHAR(100)  NOT NULL,
    apellido_materno   VARCHAR(100),
    telefono           VARCHAR(20),
    fecha_nacimiento   DATE          NOT NULL,
    created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.usuarios              IS 'Usuarios del sistema con autenticación propia';
COMMENT ON COLUMN public.usuarios.password_hash IS 'Hash SHA-256 de la contraseña';

-- -----------------------------------------------------------------------------
-- FUNCIÓN: fn_calcular_edad
-- Reemplaza la columna generada (que falla porque CURRENT_DATE es volátil).
-- Úsala en queries: SELECT public.fn_calcular_edad(fecha_nacimiento) AS edad
-- O consúmela desde la vista v_usuarios_perfil definida más abajo.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_calcular_edad(p_fecha_nacimiento DATE)
RETURNS INTEGER
LANGUAGE sql
STABLE  -- No es IMMUTABLE porque depende de CURRENT_DATE; sí es STABLE (misma dentro de una transacción)
AS $$
    SELECT DATE_PART('year', AGE(CURRENT_DATE, p_fecha_nacimiento))::INTEGER;
$$;

COMMENT ON FUNCTION public.fn_calcular_edad IS
    'Calcula la edad en años completos a partir de la fecha de nacimiento. '
    'Marcada STABLE: mismo resultado dentro de una transacción. '
    'No pudo usarse como columna GENERATED porque CURRENT_DATE no es IMMUTABLE en PostgreSQL.';


-- =============================================================================
-- TABLA: categorias
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.categorias (
    id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id       UUID           NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nombre           VARCHAR(100)   NOT NULL,
    icono            VARCHAR(100)   NOT NULL DEFAULT 'circle',   -- Nombre de icono Lucide / FontAwesome
    limite_gastos    DECIMAL(10,2)  NOT NULL DEFAULT 0.00,       -- Tope para la línea punteada de la gráfica
    color            VARCHAR(7)     NOT NULL DEFAULT '#6366f1',  -- Hexadecimal: #RRGGBB
    fecha_creacion   TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    -- Evita categorías duplicadas por nombre dentro del mismo usuario
    CONSTRAINT uq_categoria_usuario_nombre UNIQUE (usuario_id, nombre)
);

COMMENT ON TABLE  public.categorias               IS 'Categorías privadas por usuario para clasificar transacciones.';
COMMENT ON COLUMN public.categorias.icono         IS 'Nombre del icono en Lucide o FontAwesome (ej: "shopping-cart", "home").';
COMMENT ON COLUMN public.categorias.limite_gastos IS 'Presupuesto máximo de la categoría; se usa como línea punteada en la gráfica.';
COMMENT ON COLUMN public.categorias.color         IS 'Color en formato hexadecimal (#RRGGBB) para la gráfica.';


-- =============================================================================
-- TABLA: transacciones
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.transacciones (
    id            UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id    UUID           NOT NULL REFERENCES public.usuarios(id)   ON DELETE CASCADE,
    categoria_id  UUID           NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    monto         DECIMAL(10,2)  NOT NULL CHECK (monto > 0),
    tipo          VARCHAR(10)    NOT NULL CHECK (tipo IN ('Ingreso', 'Egreso')),
    fecha         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    descripcion   TEXT,
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.transacciones            IS 'Registro de ingresos y egresos por usuario.';
COMMENT ON COLUMN public.transacciones.monto      IS 'Siempre positivo. El tipo (Ingreso/Egreso) determina la dirección.';
COMMENT ON COLUMN public.transacciones.tipo       IS 'Ingreso: suma al balance. Egreso: resta al balance.';

-- Índices para consultas frecuentes del dashboard
CREATE INDEX IF NOT EXISTS idx_transacciones_usuario_id    ON public.transacciones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_categoria_id  ON public.transacciones(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha         ON public.transacciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo          ON public.transacciones(tipo);


-- =============================================================================
-- TABLA: parametros_sistema
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.parametros_sistema (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id       UUID        UNIQUE NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    tema             VARCHAR(10) NOT NULL DEFAULT 'dark' CHECK (tema IN ('light', 'dark')),
    color_primario   VARCHAR(7)  NOT NULL DEFAULT '#6366f1', -- Hexadecimal
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public.parametros_sistema             IS 'Preferencias de UI por usuario (1 fila por usuario).';
COMMENT ON COLUMN public.parametros_sistema.usuario_id  IS 'Relación 1-a-1 con usuarios (UNIQUE).';


-- =============================================================================
-- TABLA: presupuestos  (Regla 50/30/20)
-- Almacena los 3 baldes de presupuesto por usuario con su porcentaje.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id    UUID          NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nombre        VARCHAR(50)   NOT NULL,                                -- 'necesidades', 'deseos', 'ahorro'
    porcentaje    DECIMAL(5,2)  NOT NULL DEFAULT 0 CHECK (porcentaje >= 0 AND porcentaje <= 100),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- Un usuario no puede tener dos baldes con el mismo nombre
    CONSTRAINT uq_presupuesto_usuario_nombre UNIQUE (usuario_id, nombre)
);

COMMENT ON TABLE  public.presupuestos              IS 'Baldes de presupuesto por usuario (regla 50/30/20). Cada usuario tiene 3 filas.';
COMMENT ON COLUMN public.presupuestos.nombre       IS 'Identificador del balde: necesidades, deseos, ahorro.';
COMMENT ON COLUMN public.presupuestos.porcentaje   IS 'Porcentaje del ingreso asignado a este balde (0-100).';


-- =============================================================================
-- TABLA: presupuesto_categorias  (Relación N:N entre presupuestos y categorías)
-- Cada balde tiene asociadas N categorías del usuario.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.presupuesto_categorias (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    presupuesto_id   UUID        NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    categoria_id     UUID        NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Una categoría no puede estar dos veces en el mismo balde
    CONSTRAINT uq_presupuesto_categoria UNIQUE (presupuesto_id, categoria_id)
);

COMMENT ON TABLE  public.presupuesto_categorias IS 'Relación muchos-a-muchos entre presupuestos (baldes) y categorías del usuario.';


-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_id ON public.presupuestos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_cat_presupuesto ON public.presupuesto_categorias(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_cat_categoria ON public.presupuesto_categorias(categoria_id);


-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Trigger helper: actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_parametros_updated_at
    BEFORE UPDATE ON public.parametros_sistema
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_presupuestos_updated_at
    BEFORE UPDATE ON public.presupuestos
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


-- Trigger: al crear un usuario en public.usuarios, genera sus parámetros
-- por defecto automáticamente.
CREATE OR REPLACE FUNCTION public.fn_crear_parametros_default()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.parametros_sistema (usuario_id)
    VALUES (NEW.id)
    ON CONFLICT (usuario_id) DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_parametros_default_on_usuario
    AFTER INSERT ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_crear_parametros_default();


-- Trigger: crear categorías por defecto cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.fn_crear_categorias_default()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    -- Categorías por defecto para egresos
    INSERT INTO public.categorias (usuario_id, nombre, icono, color, limite_gastos)
    VALUES 
        (NEW.id, 'Comida', 'UtensilsCrossed', '#f97316', 0),
        (NEW.id, 'Transporte', 'Car', '#3b82f6', 0),
        (NEW.id, 'Salud', 'Heart', '#ef4444', 0),
        (NEW.id, 'Entretenimiento', 'Gamepad2', '#a855f7', 0),
        (NEW.id, 'Compras', 'ShoppingBag', '#ec4899', 0),
        (NEW.id, 'Servicios', 'Zap', '#eab308', 0),
        (NEW.id, 'Otros', 'Circle', '#6b7280', 0)
    ON CONFLICT (usuario_id, nombre) DO NOTHING;
    
    -- Categoría por defecto para ingresos
    INSERT INTO public.categorias (usuario_id, nombre, icono, color, limite_gastos)
    VALUES (NEW.id, 'Salario', 'PiggyBank', '#22c55e', 0)
    ON CONFLICT (usuario_id, nombre) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_categorias_default_on_usuario ON public.usuarios;
CREATE TRIGGER trg_categorias_default_on_usuario
    AFTER INSERT ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_crear_categorias_default();


-- Trigger: crear presupuestos default (50/30/20) cuando se crea un usuario
CREATE OR REPLACE FUNCTION public.fn_crear_presupuestos_default()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO public.presupuestos (usuario_id, nombre, porcentaje)
    VALUES 
        (NEW.id, 'necesidades', 50),
        (NEW.id, 'deseos', 30),
        (NEW.id, 'ahorro', 20)
    ON CONFLICT (usuario_id, nombre) DO NOTHING;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_presupuestos_default_on_usuario ON public.usuarios;
CREATE TRIGGER trg_presupuestos_default_on_usuario
    AFTER INSERT ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_crear_presupuestos_default();


-- =============================================================================
-- VISTAS
-- =============================================================================

-- Vista: resumen_gastos_por_categoria
-- Devuelve, para cada categoría de cada usuario:
--   · total gastado en egresos
--   · el límite configurado
--   · el porcentaje de uso (para la barra de progreso del frontend)
--   · cuánto queda disponible

CREATE OR REPLACE VIEW public.v_resumen_gastos_por_categoria AS
SELECT
    c.id                                                         AS categoria_id,
    c.usuario_id,
    c.nombre                                                     AS categoria_nombre,
    c.icono,
    c.color,
    c.limite_gastos,
    COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'Egreso'), 0)  AS total_gastado,
    COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'Ingreso'), 0) AS total_ingresado,
    -- Porcentaje gastado vs. límite (NULL si limite_gastos = 0)
    CASE
        WHEN c.limite_gastos > 0
        THEN ROUND(
            (COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'Egreso'), 0) / c.limite_gastos) * 100,
            2
        )
        ELSE NULL
    END                                                          AS porcentaje_uso,
    -- Disponible restante (puede ser negativo si se excedió el límite)
    CASE
        WHEN c.limite_gastos > 0
        THEN c.limite_gastos - COALESCE(SUM(t.monto) FILTER (WHERE t.tipo = 'Egreso'), 0)
        ELSE NULL
    END                                                          AS disponible
FROM
    public.categorias c
LEFT JOIN
    public.transacciones t ON t.categoria_id = c.id
GROUP BY
    c.id, c.usuario_id, c.nombre, c.icono, c.color, c.limite_gastos;

COMMENT ON VIEW public.v_resumen_gastos_por_categoria IS
    'Resumen por categoría para alimentar la gráfica de barras del dashboard. '
    'Filtra automáticamente por RLS (el usuario solo ve sus propias categorías).';


-- =============================================================================
-- VISTA: v_usuarios_perfil
-- Expone todos los campos del usuario incluyendo 'edad' calculada al vuelo.
-- Uso desde el frontend: supabase.from('v_usuarios_perfil').select('*')
-- =============================================================================
CREATE OR REPLACE VIEW public.v_usuarios_perfil AS
SELECT
    u.id,
    u.auth_user_id,
    u.cedula,
    u.email,
    u.nombre,
    u.apellido_paterno,
    u.apellido_materno,
    u.telefono,
    u.fecha_nacimiento,
    public.fn_calcular_edad(u.fecha_nacimiento) AS edad,  -- Calculada al vuelo, no almacenada
    u.created_at,
    u.updated_at
FROM public.usuarios u;

COMMENT ON VIEW public.v_usuarios_perfil IS
    'Vista del perfil de usuario con edad calculada al vuelo via fn_calcular_edad. '
    'Protegida por RLS de la tabla usuarios subyacente.';


-- =============================================================================
-- ROW LEVEL SECURITY (RLS) — Supabase
-- No usamos Supabase Auth → políticas abiertas, el frontend controla acceso.
-- =============================================================================

ALTER TABLE public.usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuestos       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_categorias ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Políticas: usuarios (abiertas - el frontend controla acceso)
-- -----------------------------------------------------------------------
CREATE POLICY "usuarios: SELECT anyone"
    ON public.usuarios FOR SELECT USING (true);

CREATE POLICY "usuarios: INSERT anyone"
    ON public.usuarios FOR INSERT WITH CHECK (true);

CREATE POLICY "usuarios: UPDATE anyone"
    ON public.usuarios FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "usuarios: DELETE anyone"
    ON public.usuarios FOR DELETE USING (true);

-- -----------------------------------------------------------------------
-- Políticas: categorias (abiertas)
-- -----------------------------------------------------------------------
CREATE POLICY "categorias: SELECT anyone"
    ON public.categorias FOR SELECT USING (true);

CREATE POLICY "categorias: INSERT anyone"
    ON public.categorias FOR INSERT WITH CHECK (true);

CREATE POLICY "categorias: UPDATE anyone"
    ON public.categorias FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "categorias: DELETE anyone"
    ON public.categorias FOR DELETE USING (true);

-- -----------------------------------------------------------------------
-- Políticas: transacciones (abiertas)
-- -----------------------------------------------------------------------
CREATE POLICY "transacciones: SELECT anyone"
    ON public.transacciones FOR SELECT USING (true);

CREATE POLICY "transacciones: INSERT anyone"
    ON public.transacciones FOR INSERT WITH CHECK (true);

CREATE POLICY "transacciones: UPDATE anyone"
    ON public.transacciones FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "transacciones: DELETE anyone"
    ON public.transacciones FOR DELETE USING (true);

-- -----------------------------------------------------------------------
-- Políticas: parametros_sistema (abiertas)
-- -----------------------------------------------------------------------
CREATE POLICY "parametros: SELECT anyone"
    ON public.parametros_sistema FOR SELECT USING (true);

CREATE POLICY "parametros: INSERT anyone"
    ON public.parametros_sistema FOR INSERT WITH CHECK (true);

CREATE POLICY "parametros: UPDATE anyone"
    ON public.parametros_sistema FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "parametros: DELETE anyone"
    ON public.parametros_sistema FOR DELETE USING (true);

-- -----------------------------------------------------------------------
-- Políticas: presupuestos (abiertas)
-- -----------------------------------------------------------------------
CREATE POLICY "presupuestos: SELECT anyone"
    ON public.presupuestos FOR SELECT USING (true);

CREATE POLICY "presupuestos: INSERT anyone"
    ON public.presupuestos FOR INSERT WITH CHECK (true);

CREATE POLICY "presupuestos: UPDATE anyone"
    ON public.presupuestos FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "presupuestos: DELETE anyone"
    ON public.presupuestos FOR DELETE USING (true);

-- -----------------------------------------------------------------------
-- Políticas: presupuesto_categorias (abiertas)
-- -----------------------------------------------------------------------
CREATE POLICY "presupuesto_categorias: SELECT anyone"
    ON public.presupuesto_categorias FOR SELECT USING (true);

CREATE POLICY "presupuesto_categorias: INSERT anyone"
    ON public.presupuesto_categorias FOR INSERT WITH CHECK (true);

CREATE POLICY "presupuesto_categorias: UPDATE anyone"
    ON public.presupuesto_categorias FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "presupuesto_categorias: DELETE anyone"
    ON public.presupuesto_categorias FOR DELETE USING (true);

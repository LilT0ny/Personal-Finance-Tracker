-- =============================================================================
-- PERSONAL FINANCE TRACKER — Supabase Schema
-- Engine : PostgreSQL (Supabase)
-- Version: 2.0
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

CREATE OR REPLACE TRIGGER trg_categorias_default_on_usuario
    AFTER INSERT ON public.usuarios
    FOR EACH ROW EXECUTE FUNCTION public.fn_crear_categorias_default();


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
-- Cada usuario solo puede leer/escribir sus propios datos.
-- =============================================================================

ALTER TABLE public.usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacciones      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------
-- Políticas: usuarios
-- -----------------------------------------------------------------------
CREATE POLICY "usuarios: solo el propio usuario puede ver su fila"
    ON public.usuarios FOR SELECT
    USING (auth.uid() = auth_user_id);

CREATE POLICY "usuarios: solo el propio usuario puede insertar su fila"
    ON public.usuarios FOR INSERT
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "usuarios: solo el propio usuario puede actualizar su fila"
    ON public.usuarios FOR UPDATE
    USING (auth.uid() = auth_user_id)
    WITH CHECK (auth.uid() = auth_user_id);

CREATE POLICY "usuarios: solo el propio usuario puede eliminar su fila"
    ON public.usuarios FOR DELETE
    USING (auth.uid() = auth_user_id);

-- -----------------------------------------------------------------------
-- Políticas: categorias
-- -----------------------------------------------------------------------
CREATE POLICY "categorias: SELECT solo las propias"
    ON public.categorias FOR SELECT
    USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "categorias: INSERT solo las propias"
    ON public.categorias FOR INSERT
    WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "categorias: UPDATE solo las propias"
    ON public.categorias FOR UPDATE
    USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
    WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "categorias: DELETE solo las propias"
    ON public.categorias FOR DELETE
    USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- -----------------------------------------------------------------------
-- Políticas: transacciones
-- -----------------------------------------------------------------------
CREATE POLICY "transacciones: SELECT solo las propias"
    ON public.transacciones FOR SELECT
    USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "transacciones: INSERT solo las propias"
    ON public.transacciones FOR INSERT
    WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "transacciones: UPDATE solo las propias"
    ON public.transacciones FOR UPDATE
    USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()))
    WITH CHECK (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "transacciones: DELETE solo las propias"
    ON public.transacciones FOR DELETE
    USING (usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- -----------------------------------------------------------------------
-- Políticas: parametros_sistema
-- NOTA: No usamos Supabase Auth, así que permitimos acceso total
-- El frontend controla que cada usuario acceda solo a sus datos
-- -----------------------------------------------------------------------
CREATE POLICY "parametros: SELECT anyone"
    ON public.parametros_sistema FOR SELECT
    USING (true);

CREATE POLICY "parametros: INSERT anyone"
    ON public.parametros_sistema FOR INSERT
    WITH CHECK (true);

CREATE POLICY "parametros: UPDATE anyone"
    ON public.parametros_sistema FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "parametros: DELETE anyone"
    ON public.parametros_sistema FOR DELETE
    USING (true);


-- =============================================================================
-- DATOS SEMILLA — Categorías por defecto (las inserta el frontend por usuario)
-- Esto es solo un ejemplo de cómo quedan los datos; no se ejecuta en seed.
-- =============================================================================
/*
  Para crear categorías por defecto al registrar un usuario puedes usar
  una función RPC de Supabase o un trigger AFTER INSERT ON public.usuarios.

  Ejemplo de categorías default:
  INSERT INTO public.categorias (usuario_id, nombre, icono, color, limite_gastos) VALUES
    (<uid>, 'Alimentación',  'utensils',        '#f59e0b', 500.00),
    (<uid>, 'Transporte',    'car',             '#3b82f6', 200.00),
    (<uid>, 'Entretenimiento','music',          '#8b5cf6', 150.00),
    (<uid>, 'Salud',         'heart-pulse',     '#ef4444', 300.00),
    (<uid>, 'Educación',     'graduation-cap',  '#10b981', 400.00),
    (<uid>, 'Hogar',         'home',            '#6366f1', 600.00);
*/


-- =============================================================================
-- QUERY DE EJEMPLO — Uso directo en el frontend (Supabase JS SDK)
-- =============================================================================
/*
  Para obtener el resumen de gastos por categoría del usuario autenticado:

  const { data, error } = await supabase
    .from('v_resumen_gastos_por_categoria')
    .select('*')
    .order('total_gastado', { ascending: false });

  Los datos retornados alimentan directamente la gráfica de barras:
    · nombre          → label del eje Y
    · total_gastado   → valor de la barra
    · limite_gastos   → posición de la línea punteada
    · porcentaje_uso  → ancho de la barra (%)
    · color           → color del fill de la barra
    · disponible      → tooltip de cuánto queda
*/

-- =============================================================================
-- MIGRACIÓN v3.0 — Ejecutar en SQL Editor de Supabase
-- Agrega: tablas presupuestos + presupuesto_categorias
-- Actualiza: triggers de categorías default, políticas RLS abiertas
-- =============================================================================

-- =============================================
-- 1. CREAR TABLA: presupuestos
-- =============================================
CREATE TABLE IF NOT EXISTS public.presupuestos (
    id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id    UUID          NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    nombre        VARCHAR(50)   NOT NULL,
    porcentaje    DECIMAL(5,2)  NOT NULL DEFAULT 0 CHECK (porcentaje >= 0 AND porcentaje <= 100),
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presupuesto_usuario_nombre UNIQUE (usuario_id, nombre)
);

COMMENT ON TABLE  public.presupuestos            IS 'Baldes de presupuesto por usuario (regla 50/30/20). Cada usuario tiene 3 filas.';
COMMENT ON COLUMN public.presupuestos.nombre     IS 'Identificador del balde: necesidades, deseos, ahorro.';
COMMENT ON COLUMN public.presupuestos.porcentaje IS 'Porcentaje del ingreso asignado a este balde (0-100).';

-- =============================================
-- 2. CREAR TABLA: presupuesto_categorias
-- =============================================
CREATE TABLE IF NOT EXISTS public.presupuesto_categorias (
    id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    presupuesto_id   UUID        NOT NULL REFERENCES public.presupuestos(id) ON DELETE CASCADE,
    categoria_id     UUID        NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_presupuesto_categoria UNIQUE (presupuesto_id, categoria_id)
);

COMMENT ON TABLE public.presupuesto_categorias IS 'Relación muchos-a-muchos entre presupuestos (baldes) y categorías del usuario.';

-- =============================================
-- 3. ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_presupuestos_usuario_id ON public.presupuestos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_cat_presupuesto ON public.presupuesto_categorias(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_presupuesto_cat_categoria ON public.presupuesto_categorias(categoria_id);

-- =============================================
-- 4. TRIGGER: updated_at para presupuestos
-- =============================================
CREATE OR REPLACE TRIGGER trg_presupuestos_updated_at
    BEFORE UPDATE ON public.presupuestos
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- =============================================
-- 5. TRIGGER: crear presupuestos default (50/30/20) al crear usuario
-- =============================================
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

-- =============================================
-- 6. CREAR presupuestos para usuarios EXISTENTES que aún no tienen
-- =============================================
INSERT INTO public.presupuestos (usuario_id, nombre, porcentaje)
SELECT u.id, b.nombre, b.porcentaje
FROM public.usuarios u
CROSS JOIN (
    VALUES ('necesidades', 50::DECIMAL), ('deseos', 30::DECIMAL), ('ahorro', 20::DECIMAL)
) AS b(nombre, porcentaje)
WHERE NOT EXISTS (
    SELECT 1 FROM public.presupuestos p 
    WHERE p.usuario_id = u.id AND p.nombre = b.nombre
);

-- =============================================
-- 7. RLS + Políticas abiertas para las nuevas tablas
-- =============================================
ALTER TABLE public.presupuestos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presupuesto_categorias ENABLE ROW LEVEL SECURITY;

-- Presupuestos
DROP POLICY IF EXISTS "presupuestos: SELECT anyone" ON public.presupuestos;
DROP POLICY IF EXISTS "presupuestos: INSERT anyone" ON public.presupuestos;
DROP POLICY IF EXISTS "presupuestos: UPDATE anyone" ON public.presupuestos;
DROP POLICY IF EXISTS "presupuestos: DELETE anyone" ON public.presupuestos;

CREATE POLICY "presupuestos: SELECT anyone" ON public.presupuestos FOR SELECT USING (true);
CREATE POLICY "presupuestos: INSERT anyone" ON public.presupuestos FOR INSERT WITH CHECK (true);
CREATE POLICY "presupuestos: UPDATE anyone" ON public.presupuestos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "presupuestos: DELETE anyone" ON public.presupuestos FOR DELETE USING (true);

-- Presupuesto categorías
DROP POLICY IF EXISTS "presupuesto_categorias: SELECT anyone" ON public.presupuesto_categorias;
DROP POLICY IF EXISTS "presupuesto_categorias: INSERT anyone" ON public.presupuesto_categorias;
DROP POLICY IF EXISTS "presupuesto_categorias: UPDATE anyone" ON public.presupuesto_categorias;
DROP POLICY IF EXISTS "presupuesto_categorias: DELETE anyone" ON public.presupuesto_categorias;

CREATE POLICY "presupuesto_categorias: SELECT anyone" ON public.presupuesto_categorias FOR SELECT USING (true);
CREATE POLICY "presupuesto_categorias: INSERT anyone" ON public.presupuesto_categorias FOR INSERT WITH CHECK (true);
CREATE POLICY "presupuesto_categorias: UPDATE anyone" ON public.presupuesto_categorias FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "presupuesto_categorias: DELETE anyone" ON public.presupuesto_categorias FOR DELETE USING (true);

-- =============================================
-- 8. Limpiar políticas viejas de otras tablas (por si aún existen)
-- =============================================

-- Usuarios: limpiar políticas viejas que usaban auth.uid()
DROP POLICY IF EXISTS "usuarios: solo el propio usuario puede ver su fila" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: solo el propio usuario puede insertar su fila" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: solo el propio usuario puede actualizar su fila" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios: solo el propio usuario puede eliminar su fila" ON public.usuarios;

-- Crear abiertas si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'usuarios: SELECT anyone') THEN
        EXECUTE 'CREATE POLICY "usuarios: SELECT anyone" ON public.usuarios FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'usuarios: INSERT anyone') THEN
        EXECUTE 'CREATE POLICY "usuarios: INSERT anyone" ON public.usuarios FOR INSERT WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'usuarios: UPDATE anyone') THEN
        EXECUTE 'CREATE POLICY "usuarios: UPDATE anyone" ON public.usuarios FOR UPDATE USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usuarios' AND policyname = 'usuarios: DELETE anyone') THEN
        EXECUTE 'CREATE POLICY "usuarios: DELETE anyone" ON public.usuarios FOR DELETE USING (true)';
    END IF;
END $$;

-- Categorías: limpiar políticas viejas que usaban auth.uid()
DROP POLICY IF EXISTS "categorias: SELECT solo las propias" ON public.categorias;
DROP POLICY IF EXISTS "categorias: INSERT solo las propias" ON public.categorias;
DROP POLICY IF EXISTS "categorias: UPDATE solo las propias" ON public.categorias;
DROP POLICY IF EXISTS "categorias: DELETE solo las propias" ON public.categorias;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias' AND policyname = 'categorias: SELECT anyone') THEN
        EXECUTE 'CREATE POLICY "categorias: SELECT anyone" ON public.categorias FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias' AND policyname = 'categorias: INSERT anyone') THEN
        EXECUTE 'CREATE POLICY "categorias: INSERT anyone" ON public.categorias FOR INSERT WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias' AND policyname = 'categorias: UPDATE anyone') THEN
        EXECUTE 'CREATE POLICY "categorias: UPDATE anyone" ON public.categorias FOR UPDATE USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'categorias' AND policyname = 'categorias: DELETE anyone') THEN
        EXECUTE 'CREATE POLICY "categorias: DELETE anyone" ON public.categorias FOR DELETE USING (true)';
    END IF;
END $$;

-- Transacciones: limpiar políticas viejas
DROP POLICY IF EXISTS "transacciones: SELECT solo las propias" ON public.transacciones;
DROP POLICY IF EXISTS "transacciones: INSERT solo las propias" ON public.transacciones;
DROP POLICY IF EXISTS "transacciones: UPDATE solo las propias" ON public.transacciones;
DROP POLICY IF EXISTS "transacciones: DELETE solo las propias" ON public.transacciones;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transacciones' AND policyname = 'transacciones: SELECT anyone') THEN
        EXECUTE 'CREATE POLICY "transacciones: SELECT anyone" ON public.transacciones FOR SELECT USING (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transacciones' AND policyname = 'transacciones: INSERT anyone') THEN
        EXECUTE 'CREATE POLICY "transacciones: INSERT anyone" ON public.transacciones FOR INSERT WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transacciones' AND policyname = 'transacciones: UPDATE anyone') THEN
        EXECUTE 'CREATE POLICY "transacciones: UPDATE anyone" ON public.transacciones FOR UPDATE USING (true) WITH CHECK (true)';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transacciones' AND policyname = 'transacciones: DELETE anyone') THEN
        EXECUTE 'CREATE POLICY "transacciones: DELETE anyone" ON public.transacciones FOR DELETE USING (true)';
    END IF;
END $$;

-- =============================================
-- ✅ MIGRACIÓN COMPLETA
-- =============================================
-- Verificación rápida:
-- SELECT * FROM public.presupuestos;
-- SELECT * FROM public.presupuesto_categorias;

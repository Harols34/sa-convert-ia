
-- Crear tabla para configurar límites por cuenta
CREATE TABLE public.account_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  limite_horas INTEGER NOT NULL DEFAULT 100,
  limite_consultas INTEGER NOT NULL DEFAULT 100,
  fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  creado_por UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(account_id)
);

-- Crear tabla para rastrear el uso
CREATE TABLE public.usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('transcripcion', 'chat_llamada', 'chat_general')),
  cantidad NUMERIC NOT NULL DEFAULT 0,
  fecha TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  origen UUID REFERENCES auth.users(id),
  costo_usd NUMERIC(10,4) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.account_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para account_limits (solo superadmin)
CREATE POLICY "Solo superadmin puede ver límites" 
  ON public.account_limits 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superAdmin'
    )
  );

-- Políticas RLS para usage_tracking (solo superadmin)
CREATE POLICY "Solo superadmin puede ver uso" 
  ON public.usage_tracking 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'superAdmin'
    )
  );

-- Crear índices para optimizar consultas
CREATE INDEX idx_account_limits_account_id ON public.account_limits(account_id);
CREATE INDEX idx_usage_tracking_account_id ON public.usage_tracking(account_id);
CREATE INDEX idx_usage_tracking_fecha ON public.usage_tracking(fecha);
CREATE INDEX idx_usage_tracking_tipo ON public.usage_tracking(tipo);

-- Trigger para actualizar updated_at en account_limits
CREATE OR REPLACE FUNCTION update_account_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_account_limits_updated_at
  BEFORE UPDATE ON public.account_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_account_limits_updated_at();

-- Función para verificar límites de cuenta
CREATE OR REPLACE FUNCTION public.check_account_limits(
  p_account_id UUID,
  p_tipo TEXT
)
RETURNS TABLE(
  limite_alcanzado BOOLEAN,
  uso_actual NUMERIC,
  limite_total INTEGER,
  porcentaje_uso NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_limite INTEGER;
  v_uso_actual NUMERIC;
  v_fecha_inicio DATE;
BEGIN
  -- Obtener el primer día del mes actual
  v_fecha_inicio := date_trunc('month', CURRENT_DATE)::DATE;
  
  -- Obtener el límite configurado para la cuenta
  IF p_tipo = 'transcripcion' THEN
    SELECT limite_horas INTO v_limite
    FROM public.account_limits
    WHERE account_id = p_account_id;
  ELSE
    SELECT limite_consultas INTO v_limite
    FROM public.account_limits
    WHERE account_id = p_account_id;
  END IF;
  
  -- Si no hay límite configurado, usar valores por defecto
  IF v_limite IS NULL THEN
    v_limite := 100;
  END IF;
  
  -- Calcular uso actual del mes
  SELECT COALESCE(SUM(cantidad), 0) INTO v_uso_actual
  FROM public.usage_tracking
  WHERE account_id = p_account_id
    AND tipo = p_tipo
    AND fecha >= v_fecha_inicio;
  
  -- Retornar resultado
  RETURN QUERY SELECT 
    v_uso_actual >= v_limite AS limite_alcanzado,
    v_uso_actual,
    v_limite,
    CASE 
      WHEN v_limite > 0 THEN ROUND((v_uso_actual / v_limite * 100), 2)
      ELSE 0
    END AS porcentaje_uso;
END;
$$;

-- Función para registrar uso
CREATE OR REPLACE FUNCTION public.register_usage(
  p_account_id UUID,
  p_tipo TEXT,
  p_cantidad NUMERIC,
  p_origen UUID DEFAULT NULL,
  p_costo_usd NUMERIC DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.usage_tracking (
    account_id,
    tipo,
    cantidad,
    origen,
    costo_usd
  ) VALUES (
    p_account_id,
    p_tipo,
    p_cantidad,
    COALESCE(p_origen, auth.uid()),
    p_costo_usd
  );
END;
$$;

-- Crear vista para dashboard de límites
CREATE OR REPLACE VIEW public.limits_dashboard AS
SELECT 
  a.id as account_id,
  a.name as account_name,
  al.limite_horas,
  al.limite_consultas,
  COALESCE(ut_transcripcion.uso_transcripcion, 0) as uso_transcripcion_mes,
  COALESCE(ut_chat.uso_consultas, 0) as uso_consultas_mes,
  COALESCE(ut_total.costo_total, 0) as costo_total_mes,
  CASE 
    WHEN al.limite_horas > 0 THEN ROUND((COALESCE(ut_transcripcion.uso_transcripcion, 0) / al.limite_horas * 100), 2)
    ELSE 0
  END as porcentaje_transcripcion,
  CASE 
    WHEN al.limite_consultas > 0 THEN ROUND((COALESCE(ut_chat.uso_consultas, 0) / al.limite_consultas * 100), 2)
    ELSE 0
  END as porcentaje_consultas
FROM public.accounts a
LEFT JOIN public.account_limits al ON a.id = al.account_id
LEFT JOIN (
  SELECT 
    account_id,
    SUM(cantidad) as uso_transcripcion
  FROM public.usage_tracking
  WHERE tipo = 'transcripcion'
    AND fecha >= date_trunc('month', CURRENT_DATE)
  GROUP BY account_id
) ut_transcripcion ON a.id = ut_transcripcion.account_id
LEFT JOIN (
  SELECT 
    account_id,
    SUM(cantidad) as uso_consultas
  FROM public.usage_tracking
  WHERE tipo IN ('chat_llamada', 'chat_general')
    AND fecha >= date_trunc('month', CURRENT_DATE)
  GROUP BY account_id
) ut_chat ON a.id = ut_chat.account_id
LEFT JOIN (
  SELECT 
    account_id,
    SUM(costo_usd) as costo_total
  FROM public.usage_tracking
  WHERE fecha >= date_trunc('month', CURRENT_DATE)
  GROUP BY account_id
) ut_total ON a.id = ut_total.account_id;

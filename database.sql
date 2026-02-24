-- ============================================
-- ProvaLab - Script de Criação do Banco de Dados
-- Execute este script no SQL Editor do Supabase
-- ============================================

-- Criar tipos ENUM
DO $$ BEGIN
    CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subject_type AS ENUM ('algebra', 'geometry', 'calculus', 'statistics', 'trigonometry', 'arithmetic');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- Tabela de Usuários
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    password_hash TEXT,
    google_id VARCHAR(255) UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Tabela de Perfis
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Tabela de Exercícios
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty difficulty_level NOT NULL,
    subject subject_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Tabela de Tentativas de Exercícios
-- ============================================
CREATE TABLE IF NOT EXISTS public.exercise_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Tabela de CÃ³digos de VerificaÃ§Ã£o de Email
-- ============================================
CREATE TABLE IF NOT EXISTS public.email_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    attempts_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    consumed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_ip VARCHAR(64)
);

-- ============================================
-- Tabela de Tokens de Redefinicao de Senha
-- ============================================
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    request_ip VARCHAR(64)
);

-- ============================================
-- Tabela de Plano e Consumo do Usuario
-- ============================================
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    free_uses INTEGER NOT NULL DEFAULT 5,
    uses_count INTEGER NOT NULL DEFAULT 0,
    hotmart_purchase_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Migração para Bases Existentes (idempotente)
-- ============================================
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id ON public.users(google_id) WHERE google_id IS NOT NULL;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users_profile ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS free_uses INTEGER NOT NULL DEFAULT 5;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS uses_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS hotmart_purchase_id TEXT;
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.users_profile ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE public.email_verification_codes ADD COLUMN IF NOT EXISTS request_ip VARCHAR(64);
ALTER TABLE public.password_reset_tokens ADD COLUMN IF NOT EXISTS request_ip VARCHAR(64);

-- ============================================
-- Índices para Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_exercises_subject ON public.exercises(subject);
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises(difficulty);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON public.exercise_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exercise_id ON public.exercise_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON public.users(google_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_user_id ON public.email_verification_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_codes_expires_at ON public.email_verification_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_verification_codes_request_ip ON public.email_verification_codes(request_ip);
CREATE INDEX IF NOT EXISTS idx_users_profile_email ON public.users_profile(email);
CREATE INDEX IF NOT EXISTS idx_users_profile_plan ON public.users_profile(plan);
CREATE INDEX IF NOT EXISTS idx_password_reset_user_id ON public.password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_hash ON public.password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires_at ON public.password_reset_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_request_ip ON public.password_reset_tokens(request_ip);
-- ============================================
-- Trigger para Atualizar updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_profile_updated_at ON public.users_profile;
CREATE TRIGGER update_users_profile_updated_at
    BEFORE UPDATE ON public.users_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Exercícios de Exemplo
-- ============================================

-- Álgebra - Fácil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Quanto é 15 + 27?', '["40", "42", "44", "38"]', '42', '15 + 27 = 42', 'easy', 'algebra'),
('Resolva: x + 5 = 12. Qual o valor de x?', '["5", "6", "7", "8"]', '7', 'x + 5 = 12 → x = 12 - 5 = 7', 'easy', 'algebra'),
('Qual é o resultado de 8 × 9?', '["72", "63", "81", "64"]', '72', '8 × 9 = 72', 'easy', 'algebra');

-- Álgebra - Médio
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Resolva: 3x + 5 = 20. Qual o valor de x?', '["3", "4", "5", "6"]', '5', '3x = 20 - 5 = 15 → x = 5', 'medium', 'algebra'),
('Se 2x - 4 = 10, quanto vale x?', '["5", "6", "7", "8"]', '7', '2x = 14 → x = 7', 'medium', 'algebra'),
('Resolva: x² = 49', '["6", "7", "8", "9"]', '7', '√49 = 7', 'medium', 'algebra');

-- Álgebra - Difícil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Resolva o sistema: 2x + y = 10 e x - y = 2. Qual é o valor de x?', '["3", "4", "5", "6"]', '4', 'Somando as equações: 3x = 12 → x = 4', 'hard', 'algebra'),
('Qual é o discriminante de x² - 5x + 6 = 0?', '["1", "4", "9", "25"]', '1', 'Δ = b² - 4ac = 25 - 24 = 1', 'hard', 'algebra');

-- Geometria - Fácil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Quantos lados tem um hexágono?', '["5", "6", "7", "8"]', '6', 'Hexágono = 6 lados', 'easy', 'geometry'),
('Qual é o nome do polígono de 4 lados?', '["Triângulo", "Quadrilátero", "Pentágono", "Hexágono"]', 'Quadrilátero', 'Polígono de 4 lados = Quadrilátero', 'easy', 'geometry');

-- Geometria - Médio
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é a área de um retângulo com lados 8 cm e 5 cm?', '["35 cm²", "40 cm²", "45 cm²", "50 cm²"]', '40 cm²', 'Área = base × altura = 8 × 5 = 40 cm²', 'medium', 'geometry'),
('Qual é o perímetro de um quadrado de lado 7 cm?', '["21 cm", "28 cm", "35 cm", "49 cm"]', '28 cm', 'Perímetro = 4 × lado = 4 × 7 = 28 cm', 'medium', 'geometry');

-- Geometria - Difícil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é o volume de uma esfera de raio 3 cm? (Use π ≈ 3.14)', '["113.04 cm³", "84.78 cm³", "56.52 cm³", "28.26 cm³"]', '113.04 cm³', 'V = (4/3)πr³ = (4/3) × 3.14 × 27 ≈ 113.04 cm³', 'hard', 'geometry');

-- Cálculo - Fácil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é a derivada de f(x) = x²?', '["x", "2x", "2", "x²"]', '2x', 'd/dx(x²) = 2x', 'easy', 'calculus'),
('Qual é a derivada de f(x) = 5x?', '["5", "x", "5x", "0"]', '5', 'd/dx(5x) = 5', 'easy', 'calculus');

-- Cálculo - Médio
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é a integral de f(x) = 2x?', '["x²", "x² + C", "2x²", "2x² + C"]', 'x² + C', '∫2x dx = x² + C', 'medium', 'calculus'),
('Qual é a derivada de f(x) = x³?', '["x²", "3x", "3x²", "x³"]', '3x²', 'd/dx(x³) = 3x²', 'medium', 'calculus');

-- Cálculo - Difícil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é a derivada de f(x) = x³ + 2x²?', '["3x² + 4x", "3x² + 2x", "x² + 4x", "3x + 4"]', '3x² + 4x', 'd/dx(x³ + 2x²) = 3x² + 4x', 'hard', 'calculus');

-- Estatística - Fácil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é a média de 2, 4, 6, 8?', '["4", "5", "6", "7"]', '5', 'Média = (2 + 4 + 6 + 8) / 4 = 20 / 4 = 5', 'easy', 'statistics'),
('Qual é a moda do conjunto {1, 2, 2, 3, 4}?', '["1", "2", "3", "4"]', '2', 'Moda = valor mais frequente = 2', 'easy', 'statistics');

-- Estatística - Médio
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é a mediana de 3, 7, 2, 9, 5?', '["3", "5", "7", "9"]', '5', 'Ordenado: 2, 3, 5, 7, 9 → Mediana = 5', 'medium', 'statistics');

-- Estatística - Difícil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Se a variância é 16, qual é o desvio padrão?', '["2", "4", "8", "16"]', '4', 'Desvio padrão = √variância = √16 = 4', 'hard', 'statistics');

-- Trigonometria - Fácil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é o valor de sen(90°)?', '["0", "0.5", "1", "-1"]', '1', 'sen(90°) = 1', 'easy', 'trigonometry'),
('Qual é o valor de cos(0°)?', '["0", "0.5", "1", "-1"]', '1', 'cos(0°) = 1', 'easy', 'trigonometry');

-- Trigonometria - Médio
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é o valor de cos(60°)?', '["0", "0.5", "√2/2", "√3/2"]', '0.5', 'cos(60°) = 1/2 = 0.5', 'medium', 'trigonometry');

-- Trigonometria - Difícil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é o valor de tan(45°)?', '["0", "0.5", "1", "√3"]', '1', 'tan(45°) = sen(45°)/cos(45°) = 1', 'hard', 'trigonometry');

-- Aritmética - Fácil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Quanto é 8 × 7?', '["54", "56", "58", "52"]', '56', '8 × 7 = 56', 'easy', 'arithmetic'),
('Quanto é 144 ÷ 12?', '["10", "11", "12", "13"]', '12', '144 ÷ 12 = 12', 'easy', 'arithmetic');

-- Aritmética - Médio
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é o MDC de 12 e 18?', '["2", "3", "6", "9"]', '6', 'MDC(12, 18) = 6', 'medium', 'arithmetic');

-- Aritmética - Difícil
INSERT INTO public.exercises (question, options, correct_answer, explanation, difficulty, subject) VALUES
('Qual é o MMC de 8 e 12?', '["24", "48", "96", "4"]', '24', 'MMC(8, 12) = 24', 'hard', 'arithmetic');

-- ============================================
-- Verificar Criação
-- ============================================
SELECT 'Tabelas criadas com sucesso!' as status;
SELECT COUNT(*) as total_exercicios FROM public.exercises;

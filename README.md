# ProvaLab - Plataforma de Exercícios Educacionais

Plataforma completa para estudantes praticarem exercícios de matemática com correção automática e acompanhamento de progresso.

## 📁 Estrutura do Projeto

```
provalab/
├── backend/                    # API FastAPI (Python)
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # Entrada da aplicação
│   │   ├── config.py          # Configurações
│   │   ├── database.py        # Conexão com banco
│   │   ├── models.py          # Modelos SQLAlchemy
│   │   ├── schemas.py         # Schemas Pydantic
│   │   ├── auth.py            # Autenticação JWT
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py        # Rotas de autenticação
│   │       ├── profiles.py    # Rotas de perfil
│   │       ├── exercises.py   # Rotas de exercícios
│   │       └── attempts.py    # Rotas de tentativas
│   ├── requirements.txt       # Dependências Python
│   └── .env.example           # Exemplo de variáveis de ambiente
│
├── frontend/                   # React + TypeScript + Tailwind
│   ├── public/
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── contexts/          # Contextos React
│   │   ├── hooks/             # Hooks personalizados
│   │   ├── lib/               # Utilitários
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── services/          # Serviços de API
│   │   ├── App.tsx            # Componente principal
│   │   ├── main.tsx           # Entrada do React
│   │   └── index.css          # Estilos globais
│   ├── package.json           # Dependências Node
│   ├── vite.config.ts         # Configuração Vite
│   ├── tailwind.config.ts     # Configuração Tailwind
│   └── .env.example           # Exemplo de variáveis
│
└── database.sql               # Script SQL do banco de dados
```

## 🚀 Como Executar

### Pré-requisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL (Supabase)

### 1. Configurar o Banco de Dados

1. Acesse o SQL Editor do seu projeto Supabase
2. Execute o conteúdo do arquivo `database.sql`
3. Isso criará as tabelas e inserirá exercícios de exemplo

### 2. Configurar o Backend

```bash
# Entrar na pasta do backend
cd provalab/backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# Edite o arquivo .env com suas credenciais do Supabase
```

**Configurar o arquivo `.env`:**

```env
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[SUA_SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
JWT_SECRET_KEY=sua_chave_secreta_com_pelo_menos_32_caracteres
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

**Iniciar o backend:**

```bash
uvicorn app.main:app --reload --port 8000
```

A API estará disponível em: `http://localhost:8000`
Documentação: `http://localhost:8000/docs`

### 3. Configurar o Frontend

```bash
# Entrar na pasta do frontend
cd provalab/frontend

# Instalar dependências
npm install

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# O arquivo .env já vem configurado para localhost:8000
```

**Iniciar o frontend:**

```bash
npm run dev
```

O frontend estará disponível em: `http://localhost:5173`

## 📚 Funcionalidades

### Autenticação
- Cadastro de usuários
- Login com email e senha
- Autenticação via JWT
- Perfil do usuário

### Exercícios
- 6 disciplinas de matemática:
  - Álgebra
  - Geometria
  - Cálculo
  - Estatística
  - Trigonometria
  - Aritmética
- 3 níveis de dificuldade (Fácil, Médio, Difícil)
- Correção automática
- Explicações detalhadas

### Progresso
- Histórico de exercícios
- Estatísticas de desempenho
- Gráficos de evolução
- Sequência de dias de estudo

## 🔌 Rotas da API

### Autenticação
- `POST /auth/signup` - Criar conta
- `POST /auth/login` - Fazer login
- `GET /auth/me` - Dados do usuário

### Perfil
- `GET /profiles/me` - Obter perfil
- `PUT /profiles/me` - Atualizar perfil

### Exercícios
- `GET /exercises` - Listar exercícios
- `GET /exercises/random` - Exercício aleatório
- `GET /exercises/{id}` - Obter exercício
- `POST /exercises` - Criar exercício

### Tentativas
- `GET /attempts` - Histórico de tentativas
- `GET /attempts/stats` - Estatísticas
- `GET /attempts/progress` - Dados de progresso
- `POST /attempts` - Registrar tentativa

## 🛠️ Tecnologias

### Backend
- **FastAPI** - Framework web
- **SQLAlchemy** - ORM
- **Pydantic** - Validação de dados
- **JWT** - Autenticação
- **PostgreSQL** - Banco de dados

### Frontend
- **React 18** - Biblioteca UI
- **TypeScript** - Tipagem estática
- **Tailwind CSS** - Estilização
- **React Query** - Gerenciamento de estado
- **Framer Motion** - Animações
- **Recharts** - Gráficos
- **React Router** - Roteamento

## 📝 Licença

Este projeto é de código aberto e pode ser usado livremente.

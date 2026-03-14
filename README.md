# 📚 ProvaLab

> Plataforma de prática de exercícios e simulados de matemática com correção automática e acompanhamento de progresso.

🌐 **Acesse agora:** [provalab.com.br](https://www.provalab.com.br) — **com usuários ativos**

---

## 💡 Por que criei isso

Muitos estudantes estudam teoria, mas nunca praticam o suficiente. Não sabem quais conteúdos erram mais, não acompanham a própria evolução e estudam de forma aleatória.

O ProvaLab resolve isso centralizando prática, acompanhamento e organização em um só lugar.

Sou o Lorenzo, tenho 16 anos, medalha na OBMEP e construí o ProvaLab do zero — do banco de dados ao deploy — usando FastAPI, React e PostgreSQL.

---

## ✅ Funcionalidades

### Exercícios
- 6 áreas da matemática: Álgebra, Geometria, Cálculo, Estatística, Trigonometria e Aritmética
- 3 níveis de dificuldade (Fácil, Médio, Difícil)
- Correção automática com explicações detalhadas

### Progresso
- Histórico completo de exercícios
- Estatísticas de desempenho por conteúdo
- Gráficos de evolução
- Sequência de dias de estudo (streak)

### Autenticação
- Cadastro e login com email/senha
- JWT para sessões seguras
- Perfil do usuário

---

## 🛠️ Tecnologias

### Backend
| Tecnologia | Uso |
|---|---|
| FastAPI | Framework web |
| SQLAlchemy | ORM |
| Pydantic | Validação de dados |
| JWT | Autenticação |
| PostgreSQL (Supabase) | Banco de dados |

### Frontend
| Tecnologia | Uso |
|---|---|
| React 18 + TypeScript | Interface |
| Tailwind CSS | Estilização |
| React Query | Gerenciamento de estado |
| Recharts | Gráficos de progresso |
| Framer Motion | Animações |
| React Router | Roteamento |

---

## 📁 Estrutura do Projeto

```
provalab/
├── backend/                    # API FastAPI (Python)
│   ├── app/
│   │   ├── main.py            # Entrada da aplicação
│   │   ├── config.py          # Configurações
│   │   ├── database.py        # Conexão com banco
│   │   ├── models.py          # Modelos SQLAlchemy
│   │   ├── schemas.py         # Schemas Pydantic
│   │   ├── auth.py            # Autenticação JWT
│   │   └── routers/
│   │       ├── auth.py        # Rotas de autenticação
│   │       ├── profiles.py    # Rotas de perfil
│   │       ├── exercises.py   # Rotas de exercícios
│   │       └── attempts.py    # Rotas de tentativas
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # React + TypeScript + Tailwind
│   ├── src/
│   │   ├── components/        # Componentes reutilizáveis
│   │   ├── contexts/          # Contextos React
│   │   ├── hooks/             # Hooks personalizados
│   │   ├── pages/             # Páginas da aplicação
│   │   ├── services/          # Serviços de API
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
└── database.sql               # Script SQL do banco de dados
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL (ou conta no [Supabase](https://supabase.com))

### 1. Banco de Dados

1. Crie um projeto no Supabase
2. Acesse o SQL Editor e execute o conteúdo de `database.sql`

### 2. Backend

```bash
cd provalab/backend

# Criar e ativar ambiente virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
```

Configure o `.env`:

```env
DATABASE_URL=postgresql://postgres.[PROJECT_ID]:[SUA_SENHA]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
JWT_SECRET_KEY=sua_chave_secreta_com_pelo_menos_32_caracteres
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
```

Iniciar o backend:

```bash
uvicorn app.main:app --reload --port 8000
```

API disponível em `http://localhost:8000` — docs em `http://localhost:8000/docs`

### 3. Frontend

```bash
cd provalab/frontend
npm install
cp .env.example .env
npm run dev
```

Frontend disponível em `http://localhost:5173`

---

## 🔌 Rotas da API

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/signup` | Criar conta |
| POST | `/auth/login` | Fazer login |
| GET | `/auth/me` | Dados do usuário |
| GET | `/profiles/me` | Obter perfil |
| PUT | `/profiles/me` | Atualizar perfil |
| GET | `/exercises` | Listar exercícios |
| GET | `/exercises/random` | Exercício aleatório |
| POST | `/exercises` | Criar exercício |
| GET | `/attempts` | Histórico |
| GET | `/attempts/stats` | Estatísticas |
| GET | `/attempts/progress` | Dados de progresso |
| POST | `/attempts` | Registrar tentativa |

---

## 📝 Licença

Código aberto — pode ser usado livremente.

---

Desenvolvido por **Lorenzo Cecatto Paim** — [Portfólio](https://lorenzocecattopaim.github.io/Portifolio_/) · [LinkedIn](https://www.linkedin.com/in/lorenzo-cecatto-paim-9b19012b6/)
# CLAUDE.md — Semana Planner

Documento lido automaticamente pelo Claude Code a cada sessão.
Contém decisões técnicas, convenções e contexto permanente do projeto.

---

## Contexto do produto

Ferramenta interna de gestão de projetos e time blocking semanal para uma consultoria de estratégia de marca (Simpatia 22 / CERNE). Permite organizar clientes → projetos → tarefas com alocação de tempo por dia da semana. Multi-usuário, com acesso de terceiros (clientes, freelancers) em permissões distintas.

---

## Stack

| Camada | Tecnologia |
|--------|------------|
| Frontend | Vue 3 + Vite |
| Backend / Banco / Auth | PocketBase (self-hosted) |
| Deploy | Coolify no VPS Contabo |
| Estilização | CSS nativo com variáveis + componentes Vue SFC |

**Não usar:** React, Next.js, Nuxt, Tailwind, Prisma, Express, Supabase cloud.

---

## Estrutura de diretórios

```
/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── views/
│   │   ├── stores/            # Pinia
│   │   ├── composables/
│   │   ├── services/          # chamadas ao PocketBase SDK
│   │   └── styles/
│   │       ├── variables.css  # tokens de layout e estrutura
│   │       └── theme.css      # tokens estéticos — fonte, cor, raio, sombra
│   └── vite.config.js
│
├── pb_data/           # gerado pelo PocketBase (não commitar)
├── pb_migrations/     # migrations versionadas (commitar)
├── pocketbase         # binário (não commitar)
│
├── .env.example
├── docker-compose.yml
└── CLAUDE.md
```

---

## Convenções de código

### Vue
- Componentes em `PascalCase.vue`
- Composables em `use<Nome>.js`
- Stores Pinia por domínio: `useClientStore`, `useTaskStore`, `useWeekStore`
- Props sempre tipadas com `defineProps<{...}>()`
- Emits sempre declarados com `defineEmits`
- `<script setup>` em todos os componentes

### CSS — dois arquivos separados

**`variables.css`** — estrutura e layout:
```css
--sidebar-width: 280px;
--day-col-min-width: 160px;
--spacing-block: 12px;
--spacing-page: 24px;
--header-height: 56px;
```

**`theme.css`** — estética, o único arquivo a editar para mudar a aparência:
```css
--color-bg: #F5F3EE;
--color-surface: #EDEAE3;
--color-text: #1A1A18;
--color-text-muted: #6B6860;
--color-border: #D4D0C8;
--color-accent: #2B7FBF;
--color-alert: #BF4040;
--font-base: 'DM Sans', sans-serif;
--font-mono: 'DM Mono', monospace;
--radius-card: 6px;
--radius-block: 4px;
--shadow-card: 0 1px 3px rgba(0,0,0,0.08);
```

Cada componente Vue tem `<style scoped>` — CSS do `WeekBlock.vue` não afeta nada além do bloco.
Para mudar aparência global, editar apenas `theme.css`. Para mudar layout, editar `variables.css`.

### PocketBase
- Toda lógica de acesso em `src/services/pb.js`
- Nunca chamar `pb` diretamente de um componente — sempre via composable ou store
- `pb.autoCancellation(false)` apenas onde necessário e documentado

### Nomenclatura de collections
- Singular, snake_case: `client`, `project`, `task`, `time_block`, `user`
- IDs gerados pelo PocketBase (não criar IDs customizados)

---

## Autenticação e permissões

| Role | Descrição | Visão padrão ao logar |
|------|-----------|----------------------|
| `admin` | Acesso total | Semana completa — todos os clientes, todas as pessoas |
| `member` | Ver e editar próprias alocações | Semana filtrada para si mesmo |
| `viewer` | Somente leitura via token de projeto | Cronograma do projeto vinculado ao token |

- Admin e member: auth via PocketBase nativo (email + senha)
- Viewer: acesso por link com token único por projeto — sem autenticação
- Role armazenado no campo `role` da collection `user`
- Regras de acesso configuradas via PocketBase Rules (não no frontend)

### Acesso viewer (cliente externo)
- URL de acesso: `/<dominio>/view/<token>`
- Admin gera e revoga tokens pelo painel (`/manage`)
- Token: mínimo 32 chars, random criptograficamente seguro
- Viewer nunca vê outros projetos ou clientes

---

## Schema do banco (PocketBase collections)

### `client`
| Campo | Tipo | Notas |
|-------|------|-------|
| name | text (required) | |
| color | text (required) | Hex livre, ex: #2B7FBF |
| created | autodate | |

### `project`
| Campo | Tipo | Notas |
|-------|------|-------|
| name | text (required) | |
| client | relation → client | |
| status | select: active, paused, done | |
| viewer_token | text (unique) | Gerado automaticamente |

### `task`
| Campo | Tipo | Notas |
|-------|------|-------|
| name | text (required) | |
| project | relation → project | |
| assignee | relation → user (nullable) | Responsável pela tarefa |
| estimated_hours | number (default: 1) | |
| due_date | date (nullable) | Exibida na visão do cliente |
| status | select: todo, doing, done | |

### `time_block`
| Campo | Tipo | Notas |
|-------|------|-------|
| task | relation → task | |
| person | relation → user | Quem executa neste bloco |
| day_of_week | select: mon, tue, wed, thu, fri | |
| hours | number (min: 0.5, max: 8) | |
| week_ref | text | Semana ISO, ex: "2026-W16" |

**Nota:** `assignee` (dono da tarefa) e `person` no `time_block` (executor do bloco) podem ser pessoas diferentes. Isso permite que uma tarefa de um sócio seja executada por um colaborador numa semana específica.

---

## Mapeamento de status por visão

| Status interno | Visão interna | Visão cliente (viewer) |
|---------------|---------------|------------------------|
| `todo` | "A fazer" | **Oculto** |
| `doing` | "Em andamento" | "Em andamento" |
| `done` | "Concluído" | "Concluído" |

O admin controla quando uma tarefa "existe" para o cliente movendo para `doing`.

---

## Responsividade

Dois breakpoints principais:

| Breakpoint | Layout | Interação |
|------------|--------|-----------|
| Desktop ≥ 1024px | Grade semanal completa com sidebar | Drag and drop |
| Mobile < 768px | Um dia por vez, navegação por setas (← →) | Toque para alocar |

- O componente `WeekView.vue` detecta o breakpoint via composable `useBreakpoint.js`
- A lógica de dados é idêntica — só a apresentação muda
- Swipe horizontal pode ser adicionado no mobile como melhoria futura
- A visão do cliente (viewer) é lista — responsiva por natureza, sem esforço adicional

---

## Visões por tipo de usuário

### Admin / Member — Desktop
- Grade semanal: colunas Segunda a Sexta
- Sidebar com tarefas agrupadas por cliente → projeto
- Drag and drop de tarefa para coluna de dia
- Bloco: cor do cliente, nome da tarefa, responsável, horas
- Contador de horas por dia (alerta em 8h, não bloqueia)
- Navegação entre semanas + filtro por pessoa

### Admin / Member — Mobile
- Um dia por vez na tela
- Navegação por setas ← → entre dias
- Lista de blocos do dia selecionado
- Botão "＋" para alocar tarefa (modal de seleção, sem drag)
- Mesmo contador de horas

### Viewer — Cronograma (desktop e mobile)
- Acesso via URL com token, sem login
- Lista de tarefas com: nome, data de entrega, status simplificado
- Status visível: "Em andamento" e "Concluído" (tarefas `todo` ocultas)
- Sem time blocking, sem horas, sem drag and drop

---

## Regras importantes

- **Nunca hardcodar IDs** de collections ou registros
- **Sempre usar `week_ref`** no formato ISO (`YYYY-Www`)
- **Drag and drop** — Web API nativa (HTML5), sem bibliotecas externas
- **Mobile** — sem drag and drop, alocação via modal de seleção
- **Horas por dia** — alerta visual em 8h, nunca bloquear
- **Deleção** — sempre soft (`status: archived`), nunca deletar clientes ou projetos
- **Tarefas** — só deletar se não tiverem `time_block` associado
- **Visão do cliente** — nunca expõe horas, time blocking ou vocabulário interno
- **Aparência** — toda personalização estética vai em `theme.css`, nunca dispersa nos componentes

---

## Deploy (Coolify + VPS Contabo)

- Frontend: build estático via `npm run build`, servido por Nginx
- PocketBase: container Docker via `docker-compose.yml`
- Porta padrão PocketBase: `8090`
- Frontend consome PocketBase via `VITE_PB_URL` no `.env`
- Nunca commitar `.env`, `pb_data/`, binário `pocketbase`

---

## O que não fazer

- Não usar Vuex (usar Pinia)
- Não usar Options API (usar Composition API com `<script setup>`)
- Não instalar bibliotecas de drag-and-drop
- Não usar Tailwind ou qualquer framework CSS
- Não expor painel admin do PocketBase publicamente em produção
- Não expor status `todo` na visão do cliente
- Não expor horas ou time blocking na visão do cliente
- Não usar paleta fixa de cores — cor do cliente é hex livre
- Não dispersar tokens estéticos fora do `theme.css`

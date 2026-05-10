# PRD — Semana Planner
**Versão:** 0.4
**Status:** Draft
**Produto:** Ferramenta de gestão de projetos e time blocking semanal

---

## 1. Contexto e problema

Uma consultoria de estratégia de marca com 4–8 clientes ativos simultaneamente precisa de uma forma simples de:
1. Organizar trabalho por cliente → projeto → tarefa
2. Alocar tarefas em dias específicos da semana (time blocking)
3. Visualizar a semana inteira de uma vez — quem faz o quê, quando
4. Compartilhar o andamento de projetos com clientes externos, de forma controlada

---

## 2. Usuários

| Tipo | Descrição | Acesso |
|------|-----------|--------|
| `admin` | Sócios da consultoria | Total |
| `member` | Colaboradores, freelancers | Ver e editar próprias alocações |
| `viewer` | Clientes externos | Somente leitura via link de projeto |

**Volume inicial:** 2 admins, até 5 members, viewers ilimitados por link.

---

## 3. Fluxos principais

### 3.1 Lista — captura e navegação (view primária)

1. Usuário abre a view **Lista** — estrutura em árvore: Clientes → Projetos → Tarefas
2. Itens colapsáveis: clicar no ícone ▶/▼ expande ou colapsa o nível
3. **Zoom in** com duplo clique num item: ele vira título da tela; seu conteúdo continua como lista abaixo
4. Seta **‹** ao lado do título volta ao nível anterior (breadcrumb)
5. **Criar:** botão `+` circular abre input inline; `Enter` cria próximo item no mesmo nível; `Tab` indenta (cria item como filho do item anterior)
6. **Arquivamento por drag:** cada nível tem um item fixo "Arquivo" no final; arrastar qualquer item para dentro dele arquiva o item (soft delete)
7. Itens arquivados ficam ocultos por padrão; "Arquivo" expansível exibe os arquivados

### 3.2 Semana — alocação de tempo (view secundária)

1. Usuário abre a view **Semana** — colunas Segunda a Sexta
2. **Adicionar bloco:** clicar em área vazia de um dia (sem cards) ou no botão `+` abre um modal
3. Modal permite selecionar Cliente → Projeto → Tarefa existentes, ou criar um novo item diretamente
4. Sidebar esquerda mostra tarefas agrupadas por cliente → projeto
5. **Arrastar tarefa** da sidebar para um dia da semana (desktop)
6. Bloco aparece com cor do cliente, nome da tarefa, responsável e horas
7. Clique no bloco permite **editar horas** ou **remover**
8. Contador de horas por dia — alerta visual em 8h

### 3.3 Time blocking — Mobile

1. Tela mostra **um dia por vez**
2. Navegação por setas ← → entre dias da semana
3. Botão "＋" abre modal de seleção de tarefa (sem drag)
4. Bloco alocado aparece na lista do dia
5. Mesmo contador de horas

### 3.4 Navegação de semanas

1. Semana atual exibida por padrão
2. Botões anterior / próxima navegam semana a semana
3. Blocos salvos por semana ISO (`2026-W16`)
4. Botão "Hoje" volta para a semana atual

### 3.5 Visão por pessoa

- **Admin:** semana completa por padrão, filtro por pessoa disponível
- **Member:** semana filtrada para si mesmo por padrão
- Filtro de pessoa no topo da grade

### 3.6 Visão do cliente (Viewer)

1. Acessa via link único: `/<dominio>/view/<token>`
2. Sem login, sem conta
3. Vê **cronograma de entregas** — não o time blocking interno
4. Lista: nome da tarefa, data de entrega, status simplificado
5. Status visível: "Em andamento" e "Concluído" — tarefas `todo` ocultas
6. Admin revoga link a qualquer momento

---

## 4. Interface — princípios

- **Duas abas principais:** Lista (captura e navegação) e Semana (alocação de tempo)
- **Lista como view primária:** é onde itens são criados, organizados e arquivados
- **Semana como view de execução:** é onde o trabalho é planejado no tempo
- **Cor do cliente** como linguagem visual primária — hex livre por cliente
- **Drag and drop** na interação desktop — sem formulários para alocar
- **Mobile:** um dia na tela, navegação por setas, modal para alocar
- **Visão do cliente** separada — cronograma limpo, sem complexidade interna
- **Personalização visual** centralizada em `theme.css`

---

## 5. Telas

### 5.1 Lista — view principal

```
[Header: logo | Lista  Semana | usuário]

← [título do zoom atual, se houver]

▼ Cliente A
    ▶ Projeto 1
    ▼ Projeto 2
        Tarefa X
        Tarefa Y
        [+] nova tarefa...
    [Arquivo]
▶ Cliente B
[Arquivo]

                           [+]  ← botão circular fixo
```

### 5.2 Lista — zoom in (ex: Cliente A)

```
[Header: logo | Lista  Semana | usuário]

‹ Cliente A

▶ Projeto 1
▼ Projeto 2
    Tarefa X
    Tarefa Y
[Arquivo]

                           [+]
```

### 5.3 Semana — Desktop

```
[Header: logo | Lista  Semana | usuário]

[Sidebar 280px]        [Grade semanal]
Cliente A              SEG      TER      QUA      QUI      SEX
  Projeto 1            2h/8h    4h/8h    1h/8h    0h/8h    3h/8h
    ↳ Tarefa X  ────►  [bloco]  [bloco]
    ↳ Tarefa Y
  Projeto 2
    ↳ Tarefa Z  ────►           [bloco]
Cliente B
  ...
                                              [+]  ← criar bloco
```

### 5.4 Semana — Modal "Adicionar à semana"

```
┌─────────────────────────────────────┐
│ Adicionar bloco — Terça             │
│                                     │
│ Cliente  [▼ selecionar...]          │
│ Projeto  [▼ selecionar...]          │
│ Tarefa   [▼ selecionar... ou criar] │
│ Horas    [1]                        │
│                                     │
│              [Cancelar] [Adicionar] │
└─────────────────────────────────────┘
```

### 5.5 Semana — Mobile

```
[Header: logo + ‹ SEG 20 abr › + semana]

[Blocos do dia]
  [bloco — Cliente A / Tarefa X / 2h]
  [bloco — Cliente B / Tarefa Z / 1h]

[＋ Alocar tarefa]
```

### 5.6 Cronograma — Viewer

```
[Header: nome do projeto]

  ● Em andamento   Revisão de identidade verbal     30 abr
  ● Em andamento   Apresentação de posicionamento   15 mai
  ✓ Concluído      Diagnóstico de marca             10 abr
```

### 5.7 Gestão (`/manage`)
- CRUD de clientes, projetos, tarefas
- Geração e revogação de link viewer por projeto
- Acesso restrito a admin

### 5.8 Pessoas (`/people`)
- Lista de usuários: nome, email, role
- Convite, alteração de role, desativação
- Acesso restrito a admin

---

## 6. Schema de dados

Ver `CLAUDE.md` — seção "Schema do banco".

```
client (nome, cor hex, archived)
  └── project (status, viewer_token, archived)
        └── task (assignee, estimated_hours, due_date, status, archived)
              └── time_block (person, day_of_week, hours, week_ref)
```

**Campo `archived` (boolean):** adicionado a `client`, `project` e `task`. Soft delete via drag-to-archive na view Lista. Itens arquivados ficam ocultos nas views normais e na sidebar da Semana.

---

## 7. Responsividade

| Breakpoint | Layout | Alocação |
|------------|--------|----------|
| ≥ 1024px | Grade semanal completa + sidebar | Drag and drop |
| < 768px | Um dia na tela, navegação ← → | Modal de seleção |

Viewer é lista — responsiva por natureza.
Lista é responsiva por natureza.

---

## 8. Fora do escopo (v1)

- Notificações ou lembretes
- Comentários em tarefas
- Integração com calendário externo
- Relatórios de horas ou faturamento
- App mobile nativo
- Histórico de mudanças (audit log)
- Múltiplos projetos no mesmo link viewer
- Swipe horizontal no mobile (pode entrar como melhoria futura)

---

## 9. Critérios de aceite (v1)

- [ ] Login e logout com email + senha
- [ ] View Lista: árvore Clientes → Projetos → Tarefas
- [ ] View Lista: zoom in com duplo clique, breadcrumb com ‹
- [ ] View Lista: colapsar/expandir nós
- [ ] View Lista: criar item com Enter ou botão +
- [ ] View Lista: Tab indenta item ao nível filho
- [ ] View Lista: arquivar item por drag-to-archive
- [ ] Navegação por abas: Lista e Semana no header
- [ ] Admin cria cliente (com cor hex), projeto e tarefa
- [ ] Tarefa aparece na sidebar agrupada por cliente → projeto
- [ ] Desktop: drag de tarefa para dia cria bloco na semana correta
- [ ] Semana: clicar em área vazia ou + abre modal "Adicionar à semana"
- [ ] Modal Semana: selecionar Cliente → Projeto → Tarefa existentes ou criar novo
- [ ] Mobile: modal de seleção cria bloco no dia atual
- [ ] Bloco mostra cor do cliente, tarefa, responsável e horas
- [ ] Horas do bloco editáveis com clique
- [ ] Navegação entre semanas preserva os blocos
- [ ] Visão padrão do member filtrada para si mesmo
- [ ] Admin gera e revoga link viewer por projeto
- [ ] Viewer acessa via link sem login e vê cronograma
- [ ] Tarefas `todo` não aparecem no viewer
- [ ] Layout mobile: um dia na tela, navegação ← →
- [ ] Deploy funcional no Coolify

---

## 10. Ordem de desenvolvimento sugerida

1. **Setup** — Vue 3 + Vite, PocketBase local, `.env`, `theme.css` e `variables.css`
2. **Schema PocketBase** — collections, campos, regras de acesso
3. **Autenticação** — login, logout, guarda de rota por role
4. **CRUD base** — clientes, projetos, tarefas (`/manage`)
5. **Lista — estrutura e árvore** — view primária, colapso, zoom in
6. **Lista — criação inline** — Enter, Tab, botão +
7. **Lista — arquivamento por drag** — drag-to-archive por nível
8. **Abas de navegação** — Lista e Semana no header
9. **Semana — estrutura desktop** — grade visual estática
10. **Semana — drag and drop desktop** — arrastar tarefa para coluna
11. **Semana — modal Adicionar** — clicar em área vazia ou +
12. **Semana — blocos** — persistência, edição de horas, remoção
13. **Navegação de semanas** — semana ISO, anterior/próxima/hoje
14. **Filtro por pessoa + visão padrão por role**
15. **Mobile** — breakpoint, dia único, navegação ← →, modal de alocação
16. **Token viewer** — geração, revogação, rota pública `/view/:token`
17. **Cronograma viewer** — layout, filtragem de status
18. **Gestão de pessoas** — convite, roles
19. **Testes e ajustes** — edge cases, limites de horas, responsividade
20. **Deploy** — Coolify, Nginx, variáveis de produção

---

## 11. Decisões técnicas registradas

| Decisão | Motivo |
|---------|--------|
| Vue 3 + Vite | Menor curva para manutenção, código legível para devs externos |
| PocketBase self-hosted | No VPS existente, zero custo adicional, backend completo num binário |
| HTML5 drag API nativa | Sem dependência de biblioteca para feature core |
| Semana ISO (`YYYY-Www`) | Padrão universal, evita ambiguidade de datas |
| CSS nativo com `theme.css` separado | Personalização visual sem tocar em lógica ou estrutura |
| Cor do cliente como hex livre | Admin escolhe a cor que faz sentido para cada cliente |
| Viewer por token de projeto, sem login | Simplicidade para o cliente externo, controle total para o admin |
| Tarefas `todo` ocultas no viewer | Admin controla quando algo "existe" para o cliente |
| Duas visões distintas (time blocking vs cronograma) | Vocabulário adequado para cada audiência |
| Mobile: um dia na tela, sem drag | Grade semanal não é viável em tela pequena — dia único é o modelo certo |
| Mobile: modal em vez de drag | Drag and drop em touch é frágil — modal de seleção é mais confiável |
| Lista como view primária, Semana como view secundária | A Lista é o modelo mental de captura e navegação (inspirado no Workflowy): qualquer item é criado aqui, depois alocado na Semana. A Semana é a view de execução — sem Lista não há o quê alocar. São dois modos sobre a mesma estrutura de dados (cliente → projeto → tarefa), não dois apps. |
| Arquivamento por drag, sem checkbox de status | Intenção de remover um item deve ser gestual e deliberada; checkbox incentiva marcar e esquecer. Drag-to-archive exige ação consciente e é reversível. |
| `archived` como boolean separado por collection | Não polui os seletores de status existentes (que têm semântica própria: doing/done para tarefas, active/paused/done para projetos); boolean é mais simples de filtrar em queries. |
| Modal "Adicionar à semana" em área vazia | O clique em área vazia é o gesto mais natural para "quero colocar algo aqui"; o botão + é o fallback para usuários que não descobrem o gesto. Evita formulários separados e mantém o flow contextual (o dia já está implícito). |

# PRD — Semana Planner
**Versão:** 0.3
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

### 3.1 Gestão de clientes e projetos (Admin)

1. Admin cria um **cliente** com nome e cor (hex livre)
2. Dentro do cliente, cria **projetos** com nome e status
3. Dentro do projeto, cria **tarefas** com nome, responsável, estimativa de horas e data de entrega
4. Admin gera um **link de acesso** para o projeto e compartilha com o cliente

### 3.2 Time blocking — Desktop

1. Usuário abre a view **Semana** — colunas Segunda a Sexta
2. Sidebar esquerda mostra tarefas agrupadas por cliente → projeto
3. **Arrasta uma tarefa** para um dia da semana
4. Bloco aparece com cor do cliente, nome da tarefa, responsável e horas
5. Clique no bloco permite **editar horas** ou **remover**
6. Contador de horas por dia — alerta visual em 8h

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

- **Cor do cliente** como linguagem visual primária — hex livre por cliente
- **Drag and drop** na interação desktop — sem formulários para alocar
- **Mobile:** um dia na tela, navegação por setas, modal para alocar
- **Visão do cliente** separada — cronograma limpo, sem complexidade interna
- **Personalização visual** centralizada em `theme.css` — tipografia, cores, raios, sombras editáveis sem tocar em lógica

---

## 5. Telas

### 5.1 Semana — Desktop

```
[Header: logo + semana atual + ‹ anterior / hoje / próxima › + filtro pessoa]

[Sidebar 280px]        [Grade semanal]
Cliente A              SEG      TER      QUA      QUI      SEX
  Projeto 1            2h/8h    4h/8h    1h/8h    0h/8h    3h/8h
    ↳ Tarefa X  ────►  [bloco]  [bloco]
    ↳ Tarefa Y
  Projeto 2
    ↳ Tarefa Z  ────►           [bloco]
Cliente B
  ...
```

### 5.2 Semana — Mobile

```
[Header: logo + ‹ SEG 20 abr › + semana]

[Blocos do dia]
  [bloco — Cliente A / Tarefa X / 2h]
  [bloco — Cliente B / Tarefa Z / 1h]

[＋ Alocar tarefa]
```

### 5.3 Cronograma — Viewer

```
[Header: nome do projeto]

  ● Em andamento   Revisão de identidade verbal     30 abr
  ● Em andamento   Apresentação de posicionamento   15 mai
  ✓ Concluído      Diagnóstico de marca             10 abr
```

### 5.4 Gestão (`/manage`)
- CRUD de clientes, projetos, tarefas
- Geração e revogação de link viewer por projeto
- Acesso restrito a admin

### 5.5 Pessoas (`/people`)
- Lista de usuários: nome, email, role
- Convite, alteração de role, desativação
- Acesso restrito a admin

---

## 6. Schema de dados

Ver `CLAUDE.md` — seção "Schema do banco".

```
client (nome, cor hex)
  └── project (status, viewer_token)
        └── task (assignee, estimated_hours, due_date, status)
              └── time_block (person, day_of_week, hours, week_ref)
```

---

## 7. Responsividade

| Breakpoint | Layout | Alocação |
|------------|--------|----------|
| ≥ 1024px | Grade semanal completa + sidebar | Drag and drop |
| < 768px | Um dia na tela, navegação ← → | Modal de seleção |

Viewer é lista — responsiva por natureza.

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
- [ ] Admin cria cliente (com cor hex), projeto e tarefa
- [ ] Tarefa aparece na sidebar agrupada por cliente → projeto
- [ ] Desktop: drag de tarefa para dia cria bloco na semana correta
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
5. **Semana — estrutura desktop** — grade visual estática
6. **Semana — drag and drop desktop** — arrastar tarefa para coluna
7. **Semana — blocos** — persistência, edição de horas, remoção
8. **Navegação de semanas** — semana ISO, anterior/próxima/hoje
9. **Filtro por pessoa + visão padrão por role**
10. **Mobile** — breakpoint, dia único, navegação ← →, modal de alocação
11. **Token viewer** — geração, revogação, rota pública `/view/:token`
12. **Cronograma viewer** — layout, filtragem de status
13. **Gestão de pessoas** — convite, roles
14. **Testes e ajustes** — edge cases, limites de horas, responsividade
15. **Deploy** — Coolify, Nginx, variáveis de produção

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

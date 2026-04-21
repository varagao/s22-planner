/// <reference path="../pb_data/types.d.ts" />

// Corrige as coleções criadas sem campos pela migration inicial.
// Remove e recria client, project, task, time_block com os campos corretos.
// Seguro enquanto não há dados reais (campos não existiam, nada foi salvo).

migrate(
  (app) => {

    // ── Remove coleções vazias na ordem inversa de dependência ────────────────
    for (const name of ["time_block", "task", "project", "client"]) {
      try { app.delete(app.findCollectionByNameOrId(name)) } catch (_) {}
    }

    // ── role em users (adiciona se não existir) ───────────────────────────────
    const users = app.findCollectionByNameOrId("users")
    let hasRole = false
    try { users.fields.getByName("role"); hasRole = true } catch (_) {}
    if (!hasRole) {
      // PocketBase v0.22+: propriedades no nível raiz, sem "options"
      users.fields.add({
        name:      "role",
        type:      "select",
        required:  true,
        maxSelect: 1,
        values:    ["admin", "member", "viewer"],
      })
      app.save(users)
    }

    // ── client ────────────────────────────────────────────────────────────────
    app.save(new Collection({
      name: "client",
      type: "base",
      fields: [
        { name: "name",  type: "text", required: true },
        { name: "color", type: "text", required: true },
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
    }))

    // ── project ───────────────────────────────────────────────────────────────
    const clientId = app.findCollectionByNameOrId("client").id
    const usersId  = app.findCollectionByNameOrId("users").id

    app.save(new Collection({
      name: "project",
      type: "base",
      fields: [
        { name: "name",         type: "text",     required: true },
        { name: "viewer_token", type: "text",     required: false },
        { name: "status",       type: "select",   required: true,
          maxSelect: 1, values: ["active", "paused", "done"] },
        { name: "client",       type: "relation", required: true,
          collectionId: clientId, maxSelect: 1, cascadeDelete: false },
      ],
      listRule:   "@request.auth.id != '' || (viewer_token != '' && viewer_token = @request.query.token)",
      viewRule:   "@request.auth.id != '' || (viewer_token != '' && viewer_token = @request.query.token)",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
    }))

    // ── task ──────────────────────────────────────────────────────────────────
    const projectId = app.findCollectionByNameOrId("project").id

    app.save(new Collection({
      name: "task",
      type: "base",
      fields: [
        { name: "name",            type: "text",     required: true },
        { name: "estimated_hours", type: "number",   required: false, min: 0 },
        { name: "due_date",        type: "date",     required: false },
        { name: "status",          type: "select",   required: true,
          maxSelect: 1, values: ["todo", "doing", "done"] },
        { name: "project",         type: "relation", required: true,
          collectionId: projectId, maxSelect: 1, cascadeDelete: false },
        { name: "assignee",        type: "relation", required: false,
          collectionId: usersId,   maxSelect: 1, cascadeDelete: false },
      ],
      listRule:   "@request.auth.id != '' || (project.viewer_token != '' && project.viewer_token = @request.query.token)",
      viewRule:   "@request.auth.id != '' || (project.viewer_token != '' && project.viewer_token = @request.query.token)",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
    }))

    // ── time_block ────────────────────────────────────────────────────────────
    const taskId = app.findCollectionByNameOrId("task").id

    app.save(new Collection({
      name: "time_block",
      type: "base",
      fields: [
        { name: "week_ref",    type: "text",     required: true },
        { name: "hours",       type: "number",   required: true, min: 0.5, max: 8 },
        { name: "day_of_week", type: "select",   required: true,
          maxSelect: 1, values: ["mon", "tue", "wed", "thu", "fri"] },
        { name: "task",        type: "relation", required: true,
          collectionId: taskId,  maxSelect: 1, cascadeDelete: false },
        { name: "person",      type: "relation", required: true,
          collectionId: usersId, maxSelect: 1, cascadeDelete: false },
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
    }))

  },

  (_app) => {}
)

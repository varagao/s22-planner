migrate(
  (db) => {
    // ── user ──────────────────────────────────────────────────────────────────
    // Extends the built-in _pb_users_auth collection with a role field.
    // PocketBase already creates the auth collection; we only add our field.
    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    usersCollection.schema.addField(
      new SchemaField({
        name: "role",
        type: "select",
        required: true,
        options: {
          maxSelect: 1,
          values: ["admin", "member", "viewer"],
        },
      })
    )
    $app.dao().saveCollection(usersCollection)

    // ── client ────────────────────────────────────────────────────────────────
    const client = new Collection({
      name: "client",
      type: "base",
      schema: [
        { name: "name",  type: "text",   required: true },
        { name: "color", type: "text",   required: true },
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null, // nunca deletar — usar status archived no futuro
    })
    $app.dao().saveCollection(client)

    // ── project ───────────────────────────────────────────────────────────────
    const project = new Collection({
      name: "project",
      type: "base",
      schema: [
        { name: "name",   type: "text",     required: true },
        {
          name: "client",
          type: "relation",
          required: true,
          options: { collectionId: $app.dao().findCollectionByNameOrId("client").id, maxSelect: 1 },
        },
        {
          name: "status",
          type: "select",
          required: true,
          options: { maxSelect: 1, values: ["active", "paused", "done"] },
        },
        { name: "viewer_token", type: "text", required: false },
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != '' || @collection.project.viewer_token = @request.query.token",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
    })
    $app.dao().saveCollection(project)

    // ── task ──────────────────────────────────────────────────────────────────
    const task = new Collection({
      name: "task",
      type: "base",
      schema: [
        { name: "name", type: "text", required: true },
        {
          name: "project",
          type: "relation",
          required: true,
          options: { collectionId: $app.dao().findCollectionByNameOrId("project").id, maxSelect: 1 },
        },
        {
          name: "assignee",
          type: "relation",
          required: false,
          options: { collectionId: $app.dao().findCollectionByNameOrId("users").id, maxSelect: 1 },
        },
        { name: "estimated_hours", type: "number", required: false, options: { min: 0 } },
        { name: "due_date",        type: "date",   required: false },
        {
          name: "status",
          type: "select",
          required: true,
          options: { maxSelect: 1, values: ["todo", "doing", "done"] },
        },
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
    })
    $app.dao().saveCollection(task)

    // ── time_block ────────────────────────────────────────────────────────────
    const time_block = new Collection({
      name: "time_block",
      type: "base",
      schema: [
        {
          name: "task",
          type: "relation",
          required: true,
          options: { collectionId: $app.dao().findCollectionByNameOrId("task").id, maxSelect: 1 },
        },
        {
          name: "person",
          type: "relation",
          required: true,
          options: { collectionId: $app.dao().findCollectionByNameOrId("users").id, maxSelect: 1 },
        },
        {
          name: "day_of_week",
          type: "select",
          required: true,
          options: { maxSelect: 1, values: ["mon", "tue", "wed", "thu", "fri"] },
        },
        {
          name: "hours",
          type: "number",
          required: true,
          options: { min: 0.5, max: 8 },
        },
        { name: "week_ref", type: "text", required: true },
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
    })
    $app.dao().saveCollection(time_block)
  },

  // ── down: desfaz tudo na ordem inversa ────────────────────────────────────
  (db) => {
    for (const name of ["time_block", "task", "project", "client"]) {
      const col = $app.dao().findCollectionByNameOrId(name)
      $app.dao().deleteCollection(col)
    }

    const usersCollection = $app.dao().findCollectionByNameOrId("users")
    usersCollection.schema.removeField("role")
    $app.dao().saveCollection(usersCollection)
  }
)

/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {

    // ── users: adiciona campo role à collection auth existente ────────────────
    const users = app.findCollectionByNameOrId("users")
    users.fields.add(new SelectField({
      name:      "role",
      required:  true,
      maxSelect: 1,
      values:    ["admin", "member", "viewer"],
    }))
    app.save(users)

    // ── client ────────────────────────────────────────────────────────────────
    const client = new Collection({
      name: "client",
      type: "base",
      fields: [
        new TextField({ name: "name",  required: true }),
        new TextField({ name: "color", required: true }),
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
    })
    app.save(client)

    // ── project ───────────────────────────────────────────────────────────────
    const project = new Collection({
      name: "project",
      type: "base",
      fields: [
        new TextField({ name: "name", required: true }),
        new RelationField({
          name:         "client",
          required:     true,
          collectionId: app.findCollectionByNameOrId("client").id,
          maxSelect:    1,
        }),
        new SelectField({
          name:      "status",
          required:  true,
          maxSelect: 1,
          values:    ["active", "paused", "done"],
        }),
        new TextField({ name: "viewer_token", required: false }),
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin'",
      updateRule: "@request.auth.role = 'admin'",
      deleteRule: null,
    })
    app.save(project)

    // ── task ──────────────────────────────────────────────────────────────────
    const task = new Collection({
      name: "task",
      type: "base",
      fields: [
        new TextField({ name: "name", required: true }),
        new RelationField({
          name:         "project",
          required:     true,
          collectionId: app.findCollectionByNameOrId("project").id,
          maxSelect:    1,
        }),
        new RelationField({
          name:         "assignee",
          required:     false,
          collectionId: app.findCollectionByNameOrId("users").id,
          maxSelect:    1,
        }),
        new NumberField({ name: "estimated_hours", required: false, min: 0 }),
        new DateField({   name: "due_date",         required: false }),
        new SelectField({
          name:      "status",
          required:  true,
          maxSelect: 1,
          values:    ["todo", "doing", "done"],
        }),
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
    })
    app.save(task)

    // ── time_block ────────────────────────────────────────────────────────────
    const time_block = new Collection({
      name: "time_block",
      type: "base",
      fields: [
        new RelationField({
          name:         "task",
          required:     true,
          collectionId: app.findCollectionByNameOrId("task").id,
          maxSelect:    1,
        }),
        new RelationField({
          name:         "person",
          required:     true,
          collectionId: app.findCollectionByNameOrId("users").id,
          maxSelect:    1,
        }),
        new SelectField({
          name:      "day_of_week",
          required:  true,
          maxSelect: 1,
          values:    ["mon", "tue", "wed", "thu", "fri"],
        }),
        new NumberField({ name: "hours",    required: true, min: 0.5, max: 8 }),
        new TextField({   name: "week_ref", required: true }),
      ],
      listRule:   "@request.auth.id != ''",
      viewRule:   "@request.auth.id != ''",
      createRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      updateRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
      deleteRule: "@request.auth.role = 'admin' || @request.auth.role = 'member'",
    })
    app.save(time_block)

  },

  // ── down ──────────────────────────────────────────────────────────────────
  (app) => {
    for (const name of ["time_block", "task", "project", "client"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }

    const users = app.findCollectionByNameOrId("users")
    users.fields.removeByName("role")
    app.save(users)
  }
)

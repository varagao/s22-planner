/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const client = app.findCollectionByNameOrId("client")
    client.fields.add(new BoolField({ name: "archived", required: false }))
    app.save(client)

    const project = app.findCollectionByNameOrId("project")
    project.fields.add(new BoolField({ name: "archived", required: false }))
    app.save(project)

    const task = app.findCollectionByNameOrId("task")
    task.fields.add(new BoolField({ name: "archived", required: false }))
    app.save(task)
  },

  (app) => {
    const client = app.findCollectionByNameOrId("client")
    client.fields.removeByName("archived")
    app.save(client)

    const project = app.findCollectionByNameOrId("project")
    project.fields.removeByName("archived")
    app.save(project)

    const task = app.findCollectionByNameOrId("task")
    task.fields.removeByName("archived")
    app.save(task)
  }
)

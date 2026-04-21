/// <reference path="../pb_data/types.d.ts" />

// Corrige as regras de acesso do project e task para permitir
// leitura pública via viewer_token passado como query param.

migrate(
  (app) => {
    const project = app.findCollectionByNameOrId("project")
    project.listRule = "@request.auth.id != '' || (viewer_token != '' && viewer_token = @request.query.token)"
    project.viewRule = "@request.auth.id != '' || (viewer_token != '' && viewer_token = @request.query.token)"
    app.save(project)

    const task = app.findCollectionByNameOrId("task")
    task.listRule = "@request.auth.id != '' || (project.viewer_token != '' && project.viewer_token = @request.query.token)"
    task.viewRule = "@request.auth.id != '' || (project.viewer_token != '' && project.viewer_token = @request.query.token)"
    app.save(task)
  },

  (app) => {
    const project = app.findCollectionByNameOrId("project")
    project.listRule = "@request.auth.id != ''"
    project.viewRule = "@request.auth.id != ''"
    app.save(project)

    const task = app.findCollectionByNameOrId("task")
    task.listRule = "@request.auth.id != ''"
    task.viewRule = "@request.auth.id != ''"
    app.save(task)
  }
)

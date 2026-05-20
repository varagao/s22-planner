/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    for (const name of ["client", "project", "task"]) {
      const col = app.findCollectionByNameOrId(name)
      col.fields.add(new NumberField({ name: "sort_order", required: false, min: 0 }))
      app.save(col)
    }
  },

  (app) => {
    for (const name of ["client", "project", "task"]) {
      const col = app.findCollectionByNameOrId(name)
      col.fields.removeByName("sort_order")
      app.save(col)
    }
  }
)

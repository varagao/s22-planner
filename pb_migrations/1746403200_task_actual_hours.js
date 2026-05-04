/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("task")
    col.fields.add(new NumberField({ name: "actual_hours", required: false, min: 0 }))
    col.fields.add(new DateField({ name: "completed_at", required: false }))
    app.save(col)
  },

  (app) => {
    const col = app.findCollectionByNameOrId("task")
    col.fields.removeByName("actual_hours")
    col.fields.removeByName("completed_at")
    app.save(col)
  }
)

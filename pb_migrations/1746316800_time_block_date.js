/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("time_block")

    // 1. Adiciona campo date (temporariamente não obrigatório para a migração de dados)
    col.fields.add(new DateField({ name: "date", required: false }))
    app.save(col)

    // 2. Converte week_ref + day_of_week → date em todos os registros existentes
    const dayOffset = { mon: 0, tue: 1, wed: 2, thu: 3, fri: 4 }
    const records = app.findAllRecords("time_block")

    for (const r of records) {
      const weekRef = r.getString("week_ref")
      const dow     = r.getString("day_of_week")
      if (!weekRef || dow === "") continue

      const [yearStr, weekStr] = weekRef.split("-W")
      const year = parseInt(yearStr)
      const week = parseInt(weekStr)

      // Segunda-feira da semana ISO
      const jan4 = new Date(Date.UTC(year, 0, 4))
      const dayOfWeek = jan4.getUTCDay() || 7
      const monday = new Date(jan4)
      monday.setUTCDate(jan4.getUTCDate() - dayOfWeek + 1 + (week - 1) * 7)

      // Adiciona offset do dia
      const offset = dayOffset[dow] ?? 0
      monday.setUTCDate(monday.getUTCDate() + offset)

      r.set("date", monday.toISOString().slice(0, 10))
      app.saveRecord(r)
    }

    // 3. Remove campos antigos e torna date obrigatório
    col.fields.removeByName("week_ref")
    col.fields.removeByName("day_of_week")
    const dateField = col.fields.getByName("date")
    dateField.required = true
    app.save(col)
  },

  (app) => {
    // Rollback: restaura week_ref e day_of_week, remove date
    const col = app.findCollectionByNameOrId("time_block")
    col.fields.add(new TextField({ name: "week_ref", required: true }))
    col.fields.add(new SelectField({
      name: "day_of_week", required: true,
      maxSelect: 1, values: ["mon", "tue", "wed", "thu", "fri"],
    }))
    col.fields.removeByName("date")
    app.save(col)
  }
)

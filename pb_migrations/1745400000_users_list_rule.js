/// <reference path="../pb_data/types.d.ts" />

// Permite que qualquer usuário autenticado liste e visualize outros usuários.
// Necessário para: listagem em /manage/pessoas e expand de person em time_block.
// A criação, edição e deleção continuam restritas ao próprio usuário ou admin.

migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users")
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    app.save(users)
  },

  (app) => {
    const users = app.findCollectionByNameOrId("users")
    users.listRule = null
    users.viewRule = null
    app.save(users)
  }
)

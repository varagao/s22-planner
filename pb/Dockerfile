FROM ghcr.io/muchobien/pocketbase:latest

# Migrations são copiadas para dentro da imagem.
# PocketBase as aplica automaticamente no startup.
COPY pb_migrations/ /pb_migrations/

EXPOSE 8090

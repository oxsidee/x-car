# Проводка Нивы 2131 — статическое веб-приложение на nginx.
# three.js скачивается при сборке и кладётся в образ, поэтому 3D работает без интернета.

FROM node:20-alpine AS vendor
WORKDIR /v
RUN npm pack three@0.160.0 --silent \
 && tar -xzf three-0.160.0.tgz \
 && mkdir -p out/three/examples \
 && cp -r package/build out/three/ \
 && cp -r package/examples/jsm out/three/examples/

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html data.js model.js /usr/share/nginx/html/
COPY --from=vendor /v/out/three /usr/share/nginx/html/vendor/three
# Импорт three.js — из образа вместо CDN; странице нужен doctype (в артефакте его добавляет хостинг)
RUN sed -i 's#https://cdn.jsdelivr.net/npm/three@0.160.0/#./vendor/three/#g' /usr/share/nginx/html/index.html \
 && sed -i '1i <!doctype html>' /usr/share/nginx/html/index.html
EXPOSE 1865
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:1865/ >/dev/null || exit 1

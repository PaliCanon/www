# The showcase served by nginx, from a container (task 013): the image builds
# the site (the checks of deploy.yml's prod job: build, then test:dist, both
# with SITE_URL=https://palicanon.app) and serves dist/ on 8080 as
# Cloudflare Workers static assets served it (docker/www.conf.template, its
# headers and redirects generated from public/_headers and public/_redirects).
#
# No build argument: the release is in the environment at run time, so the
# image depends on its sources only, never on the git ref (it is tagged by a
# hash of them, deploy.yml). Run-time environment:
#   WWW_ENV                 the release, the log's service.version (tag or branch)
#   WWW_SHA                 the commit, service.commit
#   WWW_DEPLOYMENT_ENV      prod or dev, deployment.environment.name
# Their values go into a JSON string of the access log: no quote, backslash or $.
# The container writes its config at start (envsubst, into /etc/nginx/conf.d)
# and nginx its temp files under /tmp: a read-only root needs both writable.
#
# The build context holds .git: a page's lastmod is the date of the last commit
# of its file (src/lib/lastmod.ts), so the checkout must have its full history.

FROM node:24.21.0-alpine3.24 AS build
RUN apk add --no-cache git
WORKDIR /src
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# A checkout owned by another user: git refuses it without this.
RUN git config --global --add safe.directory /src
ENV SITE_URL=https://palicanon.app
RUN npm run build && npm run test:dist
# Served files only: the rules files are the generator's input, not content.
RUN node scripts/nginx-conf.mjs docker/www.conf.template public/_headers public/_redirects > /www.conf.template \
 && rm dist/_headers dist/_redirects

FROM nginxinc/nginx-unprivileged:1.31.7-alpine3.24
# The official image's envsubst fills only the WWW_* variables of the template
# (nginx's own $uri, $status, ... are left alone). A default for each: an
# unset one would leave a literal ${...} nginx cannot read.
ENV NGINX_ENVSUBST_FILTER=^WWW_ \
    WWW_ENV=unknown \
    WWW_SHA=unknown \
    WWW_DEPLOYMENT_ENV=unknown
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /www.conf.template /etc/nginx/templates/www.conf.template
# The image's own default site is replaced by the template's output.
USER root
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/templates/default.conf.template
COPY --from=build /src/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
USER 101

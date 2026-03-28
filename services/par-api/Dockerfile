FROM debian:bookworm-slim AS dds-builder

ARG DDS_REPO="https://github.com/eseidel/dds.git"
ARG DDS_REF="master"

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates git build-essential \
  && rm -rf /var/lib/apt/lists/*

RUN test -n "${DDS_REPO}"
RUN git clone --depth 1 --branch "${DDS_REF}" "${DDS_REPO}" /opt/dds

WORKDIR /opt/dds
RUN make

COPY dds_par_cli.cpp /tmp/dds_par_cli.cpp
RUN g++ -O2 -o /tmp/dds-par-cli /tmp/dds_par_cli.cpp -L/opt/dds -ldds -fopenmp

FROM node:20-bookworm-slim

ENV NODE_ENV=production
ENV DDS_ROOT=/opt/dds
ENV DDS_PAR_CLI=/usr/local/bin/dds-par-cli
ENV PORT=8080

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY --from=dds-builder /opt/dds /opt/dds
COPY --from=dds-builder /tmp/dds-par-cli /usr/local/bin/dds-par-cli
COPY package.json ./package.json
COPY server.js ./server.js

EXPOSE 8080

CMD ["sh", "-c", "LD_LIBRARY_PATH=/opt/dds npm start"]

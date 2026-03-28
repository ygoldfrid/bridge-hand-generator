#include <cstdio>
#include <cstring>
#include <string>

#include "/opt/dds/dll.h"

static void escape_json(const char *src, char *dst, size_t dst_size) {
  size_t j = 0;
  for (size_t i = 0; src[i] != '\0' && j + 2 < dst_size; i++) {
    const char c = src[i];
    if (c == '"' || c == '\\') {
      dst[j++] = '\\';
      dst[j++] = c;
    } else if (c == '\n' || c == '\r' || c == '\t') {
      dst[j++] = ' ';
    } else {
      dst[j++] = c;
    }
  }
  dst[j] = '\0';
}

int main(int argc, char **argv) {
  if (argc < 3) {
    std::printf("{\"ok\":false,\"error\":\"Usage: dds-par-cli '<PBN>' <vulnCode 0..3>\"}\n");
    return 2;
  }

  const char *pbn = argv[1];
  const int vulnerable = std::atoi(argv[2]);
  if (vulnerable < 0 || vulnerable > 3) {
    std::printf("{\"ok\":false,\"error\":\"Invalid vulnerability code\"}\n");
    return 2;
  }

  ddTableDealPBN tableDealPBN;
  std::memset(&tableDealPBN, 0, sizeof(tableDealPBN));
  std::strncpy(tableDealPBN.cards, pbn, sizeof(tableDealPBN.cards) - 1);

  ddTableResults table;
  std::memset(&table, 0, sizeof(table));
  parResults par;
  std::memset(&par, 0, sizeof(par));

  // Explicit GB avoids InitStart(0,…) auto-detect, which runs `free` on Linux
  // (missing in slim images → "free: not found"). 4 matches DDS thread caps doc.
  InitStart(4, 1);
  const int rc = CalcParPBN(tableDealPBN, &table, vulnerable, &par);
  if (rc != 1) {
    std::printf("{\"ok\":false,\"error\":\"DDS CalcParPBN failed\",\"code\":%d}\n", rc);
    return 1;
  }

  char score_ns[64];
  char score_ew[64];
  char contracts_ns[256];
  char contracts_ew[256];
  escape_json(par.parScore[0], score_ns, sizeof(score_ns));
  escape_json(par.parScore[1], score_ew, sizeof(score_ew));
  escape_json(par.parContractsString[0], contracts_ns, sizeof(contracts_ns));
  escape_json(par.parContractsString[1], contracts_ew, sizeof(contracts_ew));

  std::printf(
    "{\"ok\":true,\"par\":{\"scoreNS\":\"%s\",\"scoreEW\":\"%s\","
    "\"contractsNS\":\"%s\",\"contractsEW\":\"%s\"}}\n",
    score_ns,
    score_ew,
    contracts_ns,
    contracts_ew
  );
  return 0;
}

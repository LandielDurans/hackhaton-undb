import { describe, expect, it } from "vitest";
import { dataBR, nivelDe, pct, pp } from "./format";

describe("formatação", () => {
  it("formata percentuais em pt-BR", () => {
    expect(pct(41.5)).toBe("41,5%");
    expect(pct(undefined)).toBe("—");
    expect(pp(3.2)).toBe("+3,2 p.p.");
    expect(pp(-1)).toBe("-1,0 p.p.");
  });
  it("classifica pelo critério configurado", () => {
    const c = { adequado: 70, atencao: 50 };
    expect(nivelDe(70, c)).toBe("ADEQUADO");
    expect(nivelDe(69.9, c)).toBe("EM_DESENVOLVIMENTO");
    expect(nivelDe(49.9, c)).toBe("REQUER_ATENCAO");
  });
  it("formata datas", () => {
    expect(dataBR("2026-09-21")).toBe("21/09/2026");
  });
});

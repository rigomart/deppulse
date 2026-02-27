import { formatNumber } from "./utils";

describe("formatNumber", () => {
  it("returns raw number below 1k", () => {
    expect(formatNumber(0)).toEqual("0");
    expect(formatNumber(1)).toEqual("1");
    expect(formatNumber(999)).toEqual("999");
  });

  it("formats thousands with one decimal", () => {
    expect(formatNumber(1_000)).toEqual("1.0k");
    expect(formatNumber(1_500)).toEqual("1.5k");
    expect(formatNumber(10_000)).toEqual("10.0k");
    expect(formatNumber(500_000)).toEqual("500.0k");
  });

  it("promotes to millions when rounding overflows thousands", () => {
    expect(formatNumber(999_949)).toEqual("999.9k");
    expect(formatNumber(999_950)).toEqual("1.0M");
    expect(formatNumber(999_999)).toEqual("1.0M");
  });

  it("formats millions with one decimal", () => {
    expect(formatNumber(1_000_000)).toEqual("1.0M");
    expect(formatNumber(1_500_000)).toEqual("1.5M");
    expect(formatNumber(5_000_000)).toEqual("5.0M");
    expect(formatNumber(9_999_999)).toEqual("10.0M");
  });
});

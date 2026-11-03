/** Unlocked US iPhone Duo SKUs from apple.com/shop/buy-iphone/iphone-duo */
export type DuoPart = {
  partNumber: string;
  color: string;
  storage: string;
  label: string;
};

export const IPHONE_DUO_PARTS: DuoPart[] = [
  { partNumber: "MK1F4LL/A", color: "Night Sky", storage: "256GB", label: "iPhone Duo 256GB Night Sky" },
  { partNumber: "MK1E4LL/A", color: "Star White", storage: "256GB", label: "iPhone Duo 256GB Star White" },
  { partNumber: "MK1H4LL/A", color: "Night Sky", storage: "512GB", label: "iPhone Duo 512GB Night Sky" },
  { partNumber: "MK1G4LL/A", color: "Star White", storage: "512GB", label: "iPhone Duo 512GB Star White" },
  { partNumber: "MK1L4LL/A", color: "Night Sky", storage: "1TB", label: "iPhone Duo 1TB Night Sky" },
  { partNumber: "MK1J4LL/A", color: "Star White", storage: "1TB", label: "iPhone Duo 1TB Star White" },
  { partNumber: "MK1R4LL/A", color: "Night Sky", storage: "2TB", label: "iPhone Duo 2TB Night Sky" },
  { partNumber: "MK1Q4LL/A", color: "Star White", storage: "2TB", label: "iPhone Duo 2TB Star White" },
];

export const DEFAULT_PICKUP_ZIP = "98109";
export const DEFAULT_ALERT_EMAIL = "richasvast@gmail.com";

export function partByNumber(partNumber: string): DuoPart | undefined {
  return IPHONE_DUO_PARTS.find((p) => p.partNumber === partNumber);
}

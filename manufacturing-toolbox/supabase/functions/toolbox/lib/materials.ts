// Engineering materials database. Typical room-temperature values for common
// wrought/molded conditions — for design screening, not certification.
// machinability: % relative to B1112 steel = 100 (higher = easier). null = n/a.

export interface Material {
  id: string;
  name: string;
  category: string;
  condition: string;
  density_g_cm3: number;
  tensile_mpa: number | null;
  yield_mpa: number | null;
  modulus_gpa: number | null;
  melting_c: number | null;
  machinability: number | null;
  cost_class: 1 | 2 | 3 | 4 | 5;
  tags: string[];
}

const M = (
  id: string, name: string, category: string, condition: string,
  density: number, tensile: number | null, yieldS: number | null,
  modulus: number | null, melt: number | null, mach: number | null,
  cost: 1 | 2 | 3 | 4 | 5, tags: string[],
): Material => ({
  id, name, category, condition,
  density_g_cm3: density, tensile_mpa: tensile, yield_mpa: yieldS,
  modulus_gpa: modulus, melting_c: melt, machinability: mach,
  cost_class: cost, tags,
});

export const MATERIALS: Material[] = [
  // --- Aluminum
  M("al-6061-t6", "Aluminum 6061-T6", "aluminum", "T6", 2.70, 310, 276, 68.9, 582, 190, 2, ["general purpose", "weldable", "anodizable"]),
  M("al-7075-t6", "Aluminum 7075-T6", "aluminum", "T6", 2.81, 572, 503, 71.7, 477, 160, 3, ["aerospace", "high strength"]),
  M("al-5052-h32", "Aluminum 5052-H32", "aluminum", "H32", 2.68, 228, 193, 70.3, 607, 150, 2, ["sheet", "marine", "formable"]),
  M("al-2024-t3", "Aluminum 2024-T3", "aluminum", "T3", 2.78, 483, 345, 73.1, 502, 150, 3, ["aerospace", "fatigue"]),
  M("al-6063-t5", "Aluminum 6063-T5", "aluminum", "T5", 2.70, 186, 145, 68.9, 615, 140, 2, ["extrusion", "architectural"]),
  M("al-5083-h116", "Aluminum 5083-H116", "aluminum", "H116", 2.66, 317, 228, 70.3, 570, 130, 2, ["marine", "weldable"]),
  M("al-a356-t6", "Aluminum A356.0-T6 (cast)", "aluminum", "T6 cast", 2.68, 262, 186, 72.4, 555, 110, 2, ["casting"]),
  M("al-mic6", "Aluminum MIC-6 (cast plate)", "aluminum", "cast plate", 2.70, 166, 105, 71, 571, 200, 3, ["tooling plate", "flat", "stable"]),
  // --- Carbon / alloy steel
  M("steel-1018", "Steel 1018", "carbon steel", "cold drawn", 7.87, 440, 370, 205, 1420, 70, 1, ["low carbon", "weldable", "general purpose"]),
  M("steel-1045", "Steel 1045", "carbon steel", "cold drawn", 7.85, 625, 530, 206, 1420, 55, 1, ["medium carbon", "shafts"]),
  M("steel-a36", "Steel A36", "carbon steel", "hot rolled", 7.85, 400, 250, 200, 1425, 70, 1, ["structural", "weldable"]),
  M("steel-12l14", "Steel 12L14", "carbon steel", "cold drawn", 7.87, 540, 415, 200, 1420, 160, 2, ["free machining", "screw machine"]),
  M("steel-4140", "Steel 4140", "alloy steel", "annealed", 7.85, 655, 415, 205, 1416, 65, 2, ["chromoly", "shafts", "heat treatable"]),
  M("steel-4140-ht", "Steel 4140 HT (28-32 HRC)", "alloy steel", "Q&T", 7.85, 1000, 900, 205, 1416, 55, 2, ["pre-hard", "tooling"]),
  M("steel-4340", "Steel 4340", "alloy steel", "annealed", 7.85, 745, 470, 205, 1427, 50, 3, ["high strength", "aerospace"]),
  M("steel-8620", "Steel 8620", "alloy steel", "annealed", 7.85, 530, 385, 205, 1427, 65, 2, ["case hardening", "gears"]),
  M("steel-52100", "Steel 52100", "alloy steel", "annealed", 7.81, 675, 415, 210, 1424, 40, 3, ["bearings", "high hardness capable"]),
  M("steel-1215", "Steel 1215", "carbon steel", "cold drawn", 7.87, 540, 415, 200, 1420, 136, 1, ["free machining"]),
  // --- Stainless
  M("ss-304", "Stainless 304", "stainless steel", "annealed", 8.00, 505, 215, 193, 1450, 45, 2, ["austenitic", "food grade", "corrosion resistant"]),
  M("ss-316", "Stainless 316", "stainless steel", "annealed", 8.00, 515, 205, 193, 1400, 45, 3, ["marine", "chemical", "corrosion resistant"]),
  M("ss-303", "Stainless 303", "stainless steel", "annealed", 8.00, 620, 240, 193, 1425, 78, 2, ["free machining"]),
  M("ss-17-4ph", "Stainless 17-4 PH (H900)", "stainless steel", "H900", 7.80, 1310, 1170, 196, 1440, 48, 4, ["precipitation hardening", "aerospace"]),
  M("ss-410", "Stainless 410", "stainless steel", "annealed", 7.80, 485, 275, 200, 1480, 55, 2, ["martensitic", "hardenable"]),
  M("ss-430", "Stainless 430", "stainless steel", "annealed", 7.75, 450, 205, 200, 1425, 55, 2, ["ferritic", "decorative"]),
  M("ss-2205", "Stainless 2205 Duplex", "stainless steel", "annealed", 7.80, 620, 450, 190, 1420, 35, 4, ["duplex", "high strength", "chloride resistant"]),
  // --- Tool steel
  M("ts-o1", "Tool Steel O1", "tool steel", "annealed", 7.81, 655, 380, 214, 1425, 42, 3, ["oil hardening", "knives", "dies"]),
  M("ts-a2", "Tool Steel A2", "tool steel", "annealed", 7.86, 690, 400, 203, 1425, 42, 3, ["air hardening", "punches"]),
  M("ts-d2", "Tool Steel D2", "tool steel", "annealed", 7.70, 725, 425, 210, 1420, 30, 3, ["high wear", "dies"]),
  M("ts-h13", "Tool Steel H13", "tool steel", "annealed", 7.80, 690, 400, 210, 1425, 40, 3, ["hot work", "mold tooling"]),
  M("ts-s7", "Tool Steel S7", "tool steel", "annealed", 7.83, 640, 380, 207, 1425, 45, 3, ["shock resisting"]),
  // --- Titanium & superalloys
  M("ti-grade2", "Titanium Grade 2 (CP)", "titanium", "annealed", 4.51, 345, 275, 105, 1665, 22, 4, ["commercially pure", "corrosion resistant", "medical"]),
  M("ti-grade5", "Titanium Ti-6Al-4V (Grade 5)", "titanium", "annealed", 4.43, 950, 880, 113.8, 1660, 18, 5, ["aerospace", "medical", "high strength-to-weight"]),
  M("inconel-625", "Inconel 625", "nickel superalloy", "annealed", 8.44, 880, 460, 208, 1350, 12, 5, ["high temp", "corrosion resistant"]),
  M("inconel-718", "Inconel 718", "nickel superalloy", "aged", 8.19, 1375, 1100, 200, 1336, 10, 5, ["high temp", "aerospace"]),
  M("monel-400", "Monel 400", "nickel alloy", "annealed", 8.80, 550, 240, 179, 1350, 25, 5, ["seawater", "chemical"]),
  // --- Copper alloys
  M("brass-c360", "Brass C360 (free machining)", "copper alloy", "half hard", 8.50, 385, 310, 97, 900, 300, 3, ["free machining", "fittings"]),
  M("brass-c260", "Brass C260 (cartridge)", "copper alloy", "annealed", 8.53, 315, 95, 110, 915, 90, 3, ["deep draw", "sheet"]),
  M("copper-c110", "Copper C110 (ETP)", "copper alloy", "annealed", 8.96, 220, 69, 117, 1083, 60, 3, ["electrical", "thermal"]),
  M("copper-c101", "Copper C101 (OFHC)", "copper alloy", "annealed", 8.96, 220, 69, 117, 1083, 60, 4, ["oxygen free", "vacuum", "electrical"]),
  M("bronze-c932", "Bronze C932 (bearing)", "copper alloy", "as cast", 8.91, 240, 125, 100, 1000, 70, 3, ["bearings", "bushings"]),
  M("becu-c172", "Beryllium Copper C172", "copper alloy", "aged", 8.25, 1280, 1100, 131, 980, 40, 5, ["springs", "non-sparking", "conductive"]),
  // --- Other metals
  M("mg-az31b", "Magnesium AZ31B", "magnesium", "H24", 1.77, 290, 220, 45, 630, 500, 4, ["lightest structural metal"]),
  M("zn-zamak3", "Zinc Zamak 3", "zinc", "die cast", 6.60, 268, 208, 96, 387, 80, 2, ["die casting"]),
  // --- Engineering plastics
  M("pl-abs", "ABS", "plastic", "molded", 1.05, 40, 40, 2.3, 210, null, 1, ["general purpose", "impact resistant", "3d printing"]),
  M("pl-pla", "PLA", "plastic", "3D printed", 1.24, 50, 55, 3.5, 170, null, 1, ["3d printing", "biodegradable"]),
  M("pl-petg", "PETG", "plastic", "molded", 1.27, 50, 50, 2.1, 245, null, 1, ["3d printing", "chemical resistant"]),
  M("pl-pc", "Polycarbonate (PC)", "plastic", "molded", 1.20, 66, 62, 2.4, 267, null, 2, ["impact resistant", "transparent"]),
  M("pl-nylon6", "Nylon 6 (PA6)", "plastic", "molded, dry", 1.14, 78, 70, 2.8, 220, null, 2, ["wear", "gears", "moisture sensitive"]),
  M("pl-nylon66", "Nylon 66 (PA66)", "plastic", "molded, dry", 1.14, 83, 82, 3.1, 262, null, 2, ["wear", "higher temp than PA6"]),
  M("pl-pom", "Acetal (POM, Delrin)", "plastic", "molded", 1.41, 66, 66, 3.1, 175, null, 2, ["low friction", "dimensional stability", "machinable"]),
  M("pl-peek", "PEEK", "plastic", "molded", 1.32, 100, 97, 3.9, 343, null, 5, ["high temp", "chemical resistant", "medical"]),
  M("pl-ptfe", "PTFE (Teflon)", "plastic", "molded", 2.18, 25, 12, 0.5, 327, null, 3, ["lowest friction", "chemical inert", "seals"]),
  M("pl-pp", "Polypropylene (PP)", "plastic", "molded", 0.905, 33, 32, 1.4, 165, null, 1, ["living hinge", "chemical resistant", "cheap"]),
  M("pl-hdpe", "HDPE", "plastic", "molded", 0.95, 26, 24, 1.0, 130, null, 1, ["chemical resistant", "cheap", "cutting boards"]),
  M("pl-pvc", "PVC (rigid)", "plastic", "extruded", 1.40, 48, 45, 3.0, 190, null, 1, ["pipes", "chemical resistant"]),
  M("pl-pmma", "Acrylic (PMMA)", "plastic", "cast", 1.18, 70, 65, 3.0, 160, null, 1, ["transparent", "brittle", "laser cuttable"]),
  M("pl-tpu-95a", "TPU 95A", "plastic", "molded", 1.21, 40, null, 0.03, 220, null, 2, ["flexible", "3d printing", "abrasion resistant"]),
  M("pl-pei-ultem", "PEI (Ultem 1000)", "plastic", "molded", 1.27, 110, 105, 3.2, 340, null, 4, ["high temp", "aerospace", "flame retardant"]),
  M("pl-uhmwpe", "UHMW-PE", "plastic", "extruded", 0.93, 40, 21, 0.7, 135, null, 2, ["abrasion resistant", "low friction"]),
  M("pl-pa12-sls", "Nylon 12 (SLS printed)", "plastic", "SLS", 1.01, 48, 43, 1.7, 178, null, 3, ["3d printing", "sls"]),
  // --- Composites & misc
  M("cf-plate", "Carbon fiber plate (quasi-iso)", "composite", "layup", 1.55, 600, null, 60, null, null, 4, ["stiff", "light", "no yield - brittle"]),
  M("g10-fr4", "G10/FR4 fiberglass", "composite", "laminate", 1.85, 310, null, 24, null, null, 2, ["electrical insulation", "pcb substrate"]),
];

export function getMaterial(id: string): Material | undefined {
  return MATERIALS.find((m) => m.id === id.toLowerCase());
}

export function searchMaterials(q: string, category?: string, limit = 25): Material[] {
  const needle = (q ?? "").trim().toLowerCase();
  const cat = category?.trim().toLowerCase();
  let list = MATERIALS;
  if (cat) list = list.filter((m) => m.category.includes(cat));
  if (needle) {
    list = list.filter((m) =>
      m.id.includes(needle) || m.name.toLowerCase().includes(needle) ||
      m.category.includes(needle) || m.tags.some((t) => t.includes(needle))
    );
  }
  return list.slice(0, Math.max(1, Math.min(100, limit)));
}

export function materialCategories(): string[] {
  return [...new Set(MATERIALS.map((m) => m.category))];
}

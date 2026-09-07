export type DepartmentGeo = {
  department: string;
  region: string;
  regionCode: string;
  label: string;
};

export const DEPARTMENTS: DepartmentGeo[] = [
  { department: "75", region: "Île-de-France", regionCode: "IDF", label: "Paris" },
  { department: "92", region: "Île-de-France", regionCode: "IDF", label: "Hauts-de-Seine" },
  { department: "13", region: "Provence-Alpes-Côte d'Azur", regionCode: "PACA", label: "Bouches-du-Rhône" },
  { department: "83", region: "Provence-Alpes-Côte d'Azur", regionCode: "PACA", label: "Var" },
  { department: "69", region: "Auvergne-Rhône-Alpes", regionCode: "ARA", label: "Rhône" },
  { department: "38", region: "Auvergne-Rhône-Alpes", regionCode: "ARA", label: "Isère" },
  { department: "33", region: "Nouvelle-Aquitaine", regionCode: "NAQ", label: "Gironde" },
  { department: "31", region: "Occitanie", regionCode: "OCC", label: "Haute-Garonne" },
  { department: "44", region: "Pays de la Loire", regionCode: "PDL", label: "Loire-Atlantique" },
  { department: "35", region: "Bretagne", regionCode: "BRE", label: "Ille-et-Vilaine" },
  { department: "59", region: "Hauts-de-France", regionCode: "HDF", label: "Nord" },
  { department: "67", region: "Grand Est", regionCode: "GES", label: "Bas-Rhin" },
  { department: "06", region: "Provence-Alpes-Côte d'Azur", regionCode: "PACA", label: "Alpes-Maritimes" },
  { department: "34", region: "Occitanie", regionCode: "OCC", label: "Hérault" },
  { department: "45", region: "Centre-Val de Loire", regionCode: "CVL", label: "Loiret" },
  { department: "2A", region: "Corse", regionCode: "COR", label: "Corse-du-Sud" },
  { department: "2B", region: "Corse", regionCode: "COR", label: "Haute-Corse" },
];

const BY_DEPT = new Map(DEPARTMENTS.map((d) => [d.department, d]));

export function geoForDepartment(department: string): DepartmentGeo | undefined {
  return BY_DEPT.get(department);
}

export function displayedZoneFor(departments: string[]): {
  displayedZone: string;
  isNationwide: boolean;
  regions: string[];
  regionCodes: string[];
} {
  const uniqueDept = [...new Set(departments)];
  const geos = uniqueDept.map((d) => geoForDepartment(d));
  const regionCodes = [...new Set(geos.map((g) => g?.regionCode).filter((x): x is string => Boolean(x)))];
  const regionNames = [...new Set(geos.map((g) => g?.region).filter((x): x is string => Boolean(x)))];
  if (uniqueDept.length >= 8 || regionCodes.length >= 4) {
    return { displayedZone: "Couverture nationale", isNationwide: true, regions: regionNames, regionCodes };
  }
  if (uniqueDept.length <= 2) {
    return {
      displayedZone: uniqueDept.map((d) => geoForDepartment(d)?.label ?? d).join(", "),
      isNationwide: false,
      regions: regionNames,
      regionCodes,
    };
  }
  return {
    displayedZone: regionNames.join(", ") || uniqueDept.join(", "),
    isNationwide: false,
    regions: regionNames,
    regionCodes,
  };
}

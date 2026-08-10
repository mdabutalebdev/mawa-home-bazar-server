/**
 * Shape of the bundled Bangladesh administrative-area seed data.
 *
 * The seed lives in `data/<division>.ts` — one file per division — and is
 * loaded once by `geo.seed.ts` to populate the Division / District / Upazila
 * collections. Every name is carried in both English and Bengali so the UI can
 * show whichever the visitor's language is set to.
 */

export interface UpazilaSeed {
    name: string;
    bnName: string;
}

export interface DistrictSeed {
    name: string;
    bnName: string;
    upazilas: UpazilaSeed[];
}

export interface DivisionSeed {
    name: string;
    bnName: string;
    districts: DistrictSeed[];
}

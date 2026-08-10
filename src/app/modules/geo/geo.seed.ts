import { Types } from 'mongoose';
import { Division, District, Upazila, slugify } from './geo.model';
import { BANGLADESH } from './data';

/** Total upazilas in the bundled data — the yardstick for "is the seed complete?". */
export const EXPECTED_UPAZILAS = BANGLADESH.reduce(
    (n, d) => n + d.districts.reduce((m, dist) => m + dist.upazilas.length, 0),
    0
);

/**
 * Populate the geo collections from the bundled seed data.
 *
 * Written as three `bulkWrite` passes rather than a nested upsert loop: the
 * loop version issued ~570 round trips and a server restart part-way through
 * left the data half-seeded. Three round trips finish before anything can
 * interrupt them.
 *
 * Idempotent — upserts key on slug, so re-running only applies corrections
 * (a fixed Bengali spelling, a renamed upazila). Dealer coverage flags
 * (`hasDealer`, `homeDeliveryAvailable`) are never touched here: they are
 * runtime state, not seed data.
 */
export const seedGeo = async (): Promise<{ divisions: number; districts: number; upazilas: number }> => {
    // ── 1. Divisions ────────────────────────────────────────────────
    await Division.bulkWrite(
        BANGLADESH.map((div) => {
            const slug = slugify(div.name);
            return {
                updateOne: {
                    filter: { slug },
                    update: { $set: { name: div.name, bnName: div.bnName, slug } },
                    upsert: true,
                },
            };
        })
    );

    const divisionIdBySlug = new Map<string, Types.ObjectId>(
        (await Division.find().select('slug').lean()).map((d) => [d.slug as string, d._id])
    );

    // ── 2. Districts ────────────────────────────────────────────────
    const districtOps = BANGLADESH.flatMap((div) =>
        div.districts.map((dist) => {
            const slug = slugify(dist.name);
            return {
                updateOne: {
                    filter: { slug },
                    update: {
                        $set: {
                            name: dist.name,
                            bnName: dist.bnName,
                            slug,
                            division: divisionIdBySlug.get(slugify(div.name)),
                        },
                    },
                    upsert: true,
                },
            };
        })
    );
    await District.bulkWrite(districtOps);

    const districtIdBySlug = new Map<string, Types.ObjectId>(
        (await District.find().select('slug').lean()).map((d) => [d.slug as string, d._id])
    );

    // ── 3. Upazilas ─────────────────────────────────────────────────
    const upazilaOps = BANGLADESH.flatMap((div) =>
        div.districts.flatMap((dist) => {
            const distSlug = slugify(dist.name);
            return dist.upazilas.map((upa) => {
                // "Sadar" alone repeats in most districts — prefix keeps it unique.
                const slug = `${distSlug}-${slugify(upa.name)}`;
                return {
                    updateOne: {
                        filter: { slug },
                        update: {
                            $set: {
                                name: upa.name,
                                bnName: upa.bnName,
                                slug,
                                district: districtIdBySlug.get(distSlug),
                                division: divisionIdBySlug.get(slugify(div.name)),
                            },
                        },
                        upsert: true,
                    },
                };
            });
        })
    );
    await Upazila.bulkWrite(upazilaOps);

    return {
        divisions: BANGLADESH.length,
        districts: districtOps.length,
        upazilas: upazilaOps.length,
    };
};

/**
 * Seed on boot when the data is missing **or incomplete**.
 *
 * Checking the upazila count rather than "are there any divisions?" is
 * deliberate: an interrupted seed used to leave a few divisions behind, which
 * the old `count > 0` guard read as "already done" and never repaired.
 */
export const seedGeoIfEmpty = async (): Promise<void> => {
    try {
        const existing = await Upazila.estimatedDocumentCount();
        if (existing >= EXPECTED_UPAZILAS) return;

        const counts = await seedGeo();
        console.log(
            `🗺️  Geo seeded: ${counts.divisions} divisions, ${counts.districts} districts, ${counts.upazilas} upazilas`
        );
    } catch (err) {
        console.error('⚠️  Geo seed skipped:', (err as Error).message);
    }
};

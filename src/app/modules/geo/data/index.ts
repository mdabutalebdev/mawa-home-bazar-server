import { DivisionSeed } from '../geo.types';
import { dhaka } from './dhaka';
import { chattogram } from './chattogram';
import { rajshahi } from './rajshahi';
import { khulna } from './khulna';
import { barishal } from './barishal';
import { sylhet } from './sylhet';
import { rangpur } from './rangpur';
import { mymensingh } from './mymensingh';

/** All 8 divisions of Bangladesh, with their districts and upazilas. */
export const BANGLADESH: DivisionSeed[] = [
    dhaka,
    chattogram,
    rajshahi,
    khulna,
    barishal,
    sylhet,
    rangpur,
    mymensingh,
];

export default BANGLADESH;

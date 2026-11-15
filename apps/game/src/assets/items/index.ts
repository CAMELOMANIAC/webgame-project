import { getCatalogItemByName } from "@webgame/types";

import eqComT1 from "./eq-com-t1.png";
import eqComT2a from "./eq-com-t2a.png";
import eqComT2b from "./eq-com-t2b.png";
import eqCulT1 from "./eq-cul-t1.png";
import eqCulT2a from "./eq-cul-t2a.png";
import eqCulT2b from "./eq-cul-t2b.png";
import eqInfT1 from "./eq-inf-t1.png";
import eqInfT2a from "./eq-inf-t2a.png";
import eqInfT2b from "./eq-inf-t2b.png";
import eqLogT1 from "./eq-log-t1.png";
import eqLogT2a from "./eq-log-t2a.png";
import eqLogT2b from "./eq-log-t2b.png";
import eqMedT1 from "./eq-med-t1.png";
import eqMedT2a from "./eq-med-t2a.png";
import eqMedT2b from "./eq-med-t2b.png";
import eqPubT1 from "./eq-pub-t1.png";
import eqPubT2a from "./eq-pub-t2a.png";
import eqPubT2b from "./eq-pub-t2b.png";
import hanlimControlBaton from "./hanlim-control-baton.png";
import hanlimReliefCarbine from "./hanlim-relief-carbine.png";
import matAnticoagulant from "./mat-anticoagulant.png";
import matBattery from "./mat-battery.png";
import matBiogel from "./mat-biogel.png";
import matCeramic from "./mat-ceramic.png";
import matCore from "./mat-core.png";
import matElectrolyte from "./mat-electrolyte.png";
import matFuel from "./mat-fuel.png";
import matLens from "./mat-lens.png";
import matLighter from "./mat-lighter.png";
import matNanosuture from "./mat-nanosuture.png";
import matRelay from "./mat-relay.png";
import matSolenoid from "./mat-solenoid.png";
import matStimulant from "./mat-stimulant.png";
import matTape from "./mat-tape.png";
import matTitanium from "./mat-titanium.png";
import matWire from "./mat-wire.png";
import wpnDagger from "./wpn_dagger.png";
import wpnGiantSlayer from "./wpn_giant_slayer.png";
import wpnLifesaver from "./wpn_lifesaver.png";
import wpnPrimary from "./wpn_primary.png";
import wpnSniper from "./wpn_sniper.png";

export const ITEM_IMAGE_BY_ID: Readonly<Record<string, string>> = {
  wpn_primary: wpnPrimary,
  wpn_dagger: wpnDagger,
  wpn_lifesaver: wpnLifesaver,
  wpn_sniper: wpnSniper,
  wpn_giant_slayer: wpnGiantSlayer,
  "hanlim-relief-carbine": hanlimReliefCarbine,
  "hanlim-control-baton": hanlimControlBaton,
  "mat-tape": matTape,
  "mat-wire": matWire,
  "mat-lighter": matLighter,
  "mat-electrolyte": matElectrolyte,
  "mat-lens": matLens,
  "mat-relay": matRelay,
  "mat-battery": matBattery,
  "mat-ceramic": matCeramic,
  "mat-biogel": matBiogel,
  "mat-stimulant": matStimulant,
  "mat-anticoagulant": matAnticoagulant,
  "mat-nanosuture": matNanosuture,
  "mat-titanium": matTitanium,
  "mat-solenoid": matSolenoid,
  "mat-fuel": matFuel,
  "mat-core": matCore,
  "eq-log-t1": eqLogT1,
  "eq-log-t2a": eqLogT2a,
  "eq-log-t2b": eqLogT2b,
  "eq-com-t1": eqComT1,
  "eq-com-t2a": eqComT2a,
  "eq-com-t2b": eqComT2b,
  "eq-pub-t1": eqPubT1,
  "eq-pub-t2a": eqPubT2a,
  "eq-pub-t2b": eqPubT2b,
  "eq-inf-t1": eqInfT1,
  "eq-inf-t2a": eqInfT2a,
  "eq-inf-t2b": eqInfT2b,
  "eq-med-t1": eqMedT1,
  "eq-med-t2a": eqMedT2a,
  "eq-med-t2b": eqMedT2b,
  "eq-cul-t1": eqCulT1,
  "eq-cul-t2a": eqCulT2a,
  "eq-cul-t2b": eqCulT2b,
};

export function resolveItemImageSrc(
  itemId?: string,
  itemName?: string,
): string | undefined {
  if (itemId && ITEM_IMAGE_BY_ID[itemId]) {
    return ITEM_IMAGE_BY_ID[itemId];
  }
  if (itemName) {
    const catalog = getCatalogItemByName(itemName);
    if (catalog && ITEM_IMAGE_BY_ID[catalog.id]) {
      return ITEM_IMAGE_BY_ID[catalog.id];
    }
  }
  return undefined;
}

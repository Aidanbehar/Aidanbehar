/* Seed list for the polyatomic ion table.
 *
 * Same rule as seed.js: nothing structural is written here on faith. Each
 * entry gives a PubChem query, the formula and charge I expect, and a note for
 * the reference table. scripts/build-db.js resolves every one against PubChem
 * and fails the build if the atom counts or the charge disagree — asking for
 * "thiosulfate" once returned the monoprotonated HS2O3- rather than S2O3(2-),
 * and asking for "peroxide" returned neutral hydrogen peroxide.
 *
 * Fields:
 *   q    PubChem query (name)       cid  explicit CID, when the name is ambiguous
 *   n    display name               f    expected formula      c  expected charge
 *   syn  other names it goes by     note where you meet it, in the teacher voice
 */
module.exports = [

/* ------------------------------------------------------------------ cations */
{q:'ammonium',n:'Ammonium',f:'NH4',c:1,
 note:'The one common positive polyatomic ion. Nitrogen with four hydrogens has one bond more than nitrogen wants, and that extra bond is where the charge comes from.'},
{q:'hydronium',n:'Hydronium',f:'H3O',c:1,
 note:'What a loose H⁺ actually is in water: it does not float around alone, it lands on a water molecule. This is the ion that makes something acidic.'},

/* ------------------------------------------------------- minus one charge */
{q:'hydroxide',n:'Hydroxide',f:'OH',c:-1,
 note:'The ion that makes something basic. Every strong base you will meet is a metal holding one or more of these.'},
{q:'nitrate',n:'Nitrate',f:'NO3',c:-1,syn:['saltpetre'],
 note:'In fertiliser, in cured meat and in every explosive from gunpowder to TNT. Nitrates are also almost all soluble, which is useful to remember.'},
{q:'nitrite',n:'Nitrite',f:'NO2',c:-1,
 note:'Nitrate with one oxygen taken away, and the -ite ending is how you say so. That is the whole pattern: -ate is the common one, -ite has one oxygen fewer.'},
{q:'hydrogen carbonate',n:'Hydrogen carbonate',f:'HCO3',c:-1,syn:['bicarbonate','baking soda'],
 note:'Baking soda is the sodium salt of this. Carbonate that has picked up one hydrogen, which cancels one of its two charges.'},
{q:'acetate',n:'Acetate',f:'C2H3O2',c:-1,syn:['ethanoate','vinegar'],
 note:'What vinegar becomes once it has given its hydrogen away. Often written CH3COO⁻ to show the shape rather than just the headcount.'},
{q:'cyanide',n:'Cyanide',f:'CN',c:-1,
 note:'A carbon and a nitrogen triple-bonded together. Famously poisonous because it jams the enzyme your cells use to breathe.'},
{q:'thiocyanate',n:'Thiocyanate',f:'SCN',c:-1,
 note:'Cyanide with a sulfur bolted on — thio- always means "sulfur has replaced an oxygen or been added". Present in your saliva, harmlessly.'},
{q:'permanganate',n:'Permanganate',f:'MnO4',c:-1,
 note:'An intense purple that fades as it reacts, which makes it the standard way to titrate something you cannot otherwise see.'},
{q:'hypochlorite',n:'Hypochlorite',f:'ClO',c:-1,syn:['bleach'],
 note:'The bleach ion. Bottom of the chlorine-oxygen ladder: hypo- means "even fewer oxygens than -ite".'},
{q:'chlorite',n:'Chlorite',f:'ClO2',c:-1,
 note:'Second rung of the same ladder. ClO⁻, ClO₂⁻, ClO₃⁻, ClO₄⁻ go hypochlorite, chlorite, chlorate, perchlorate.'},
{q:'chlorate',n:'Chlorate',f:'ClO3',c:-1,
 note:'Third rung, and the -ate one, so it is the one to memorise and count from. In match heads and old weedkillers.'},
{q:'perchlorate',n:'Perchlorate',f:'ClO4',c:-1,
 note:'Top rung: per- means one more oxygen than -ate. In rocket propellant, and about as oxidising as chlorine gets.'},
{q:'bromate',n:'Bromate',f:'BrO3',c:-1,
 note:'Chlorate with bromine in chlorine’s place. The whole ladder repeats for bromine and iodine, with the same four prefixes.'},
{q:'iodate',n:'Iodate',f:'IO3',c:-1,
 note:'The iodine version. Added to table salt in many countries, because a little iodine in the diet prevents goitre.'},
{q:'hydrogen sulfate',n:'Hydrogen sulfate',f:'HSO4',c:-1,syn:['bisulfate'],
 note:'Sulfuric acid having given away one of its two hydrogens. Still acidic, because it has another to give.'},
{q:'hydrogen sulfite',n:'Hydrogen sulfite',f:'HSO3',c:-1,syn:['bisulfite'],
 note:'The preservative in wine and dried fruit. One oxygen fewer than hydrogen sulfate, hence -ite.'},
{q:'dihydrogen phosphate',n:'Dihydrogen phosphate',f:'H2PO4',c:-1,
 note:'Phosphate holding two of its three hydrogens back. This and hydrogen phosphate together are the buffer that holds your cells at the right pH.'},
{q:'formate',n:'Formate',f:'CHO2',c:-1,syn:['methanoate','ant'],
 note:'From formic acid, named after ants — formica is Latin for ant, and it is what makes an ant bite sting.'},
{q:'azide',n:'Azide',f:'N3',c:-1,
 note:'Three nitrogens in a row, desperate to become N₂ gas. That is what inflated car airbags for decades.'},

/* ------------------------------------------------------- minus two charge */
{q:'carbonate',n:'Carbonate',f:'CO3',c:-2,
 note:'Chalk, limestone, marble, seashells and eggshells are all this ion with calcium. Add acid and it fizzes off as CO₂.'},
{q:'sulfate',n:'Sulfate',f:'SO4',c:-2,
 note:'The most common -2 ion you will meet. In plaster, in Epsom salts, in shampoo, and in the acid rain that comes off burning coal.'},
{q:'sulfite',n:'Sulfite',f:'SO3',c:-2,
 note:'Sulfate with one oxygen fewer. Sulfur can hold either, which is exactly why the -ate and -ite endings had to be invented.'},
{q:'chromate',n:'Chromate',f:'CrO4',c:-2,
 note:'Bright yellow. Chrome yellow paint was this, until its lead half turned out to be a bad idea.'},
{q:'dichromate',n:'Dichromate',f:'Cr2O7',c:-2,
 note:'Two chromates joined with an oxygen shared between them, and orange rather than yellow. A classic oxidising agent.'},
{q:'oxalate',n:'Oxalate',f:'C2O4',c:-2,
 note:'In rhubarb leaves and spinach. It grabs calcium hard, which is why too much of it forms kidney stones.'},
{q:'thiosulfate ion',cid:1084,n:'Thiosulfate',f:'S2O3',c:-2,
 note:'Sulfate with one oxygen swapped for a sulfur. Photographers used it to wash unexposed silver off film.'},
{q:'hydrogen phosphate',n:'Hydrogen phosphate',f:'HPO4',c:-2,
 note:'Phosphate having taken back one hydrogen. Together with dihydrogen phosphate it buffers the inside of every cell you have.'},
{q:'orthosilicate',cid:104812,n:'Silicate',f:'SiO4',c:-4,syn:['orthosilicate'],
 note:'Silicon with four oxygens, the same shape as phosphate. Silicon and oxygen between them make up most of the rock under your feet, and glass and sand are close relatives. You will also see silicate written SiO₃²⁻, which is what you get when these units chain together and share oxygens.'},

/* ------------------------------------------------------ minus three charge */
{q:'phosphate',n:'Phosphate',f:'PO4',c:-3,
 note:'The backbone of DNA, the P in ATP, the mineral in your bones and a third of the fertiliser in the world. Possibly the most important ion in biology.'},
{q:'phosphite',n:'Phosphite',f:'PO3',c:-3,
 note:'Phosphate with one oxygen fewer, following the same -ate and -ite rule as everything else.'},
{q:'arsenate',n:'Arsenate',f:'AsO4',c:-3,
 note:'Arsenic sits under phosphorus, so it forms the same shape of ion. That resemblance is exactly why arsenic is poisonous: your enzymes accept it in phosphate’s place, and then nothing works.'},
{q:'tetraborate',cid:9855541,n:'Tetraborate',f:'B4O7',c:-2,syn:['borate','borax'],
 note:'The ion in borax — old laundry powders, and the thing that turns PVA glue into slime. Four borons sharing seven oxygens between them, which is what boron does instead of forming one tidy little ion.'},
];

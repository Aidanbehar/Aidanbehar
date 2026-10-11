package dev.aidanbehar.nuclearstation.facility;

import com.mojang.serialization.Codec;
import dev.aidanbehar.nuclearstation.NuclearStation;
import dev.aidanbehar.nuclearstation.facility.layout.Blueprint;
import java.util.BitSet;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.util.datafix.DataFixTypes;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.level.saveddata.SavedDataType;

/**
 * Persistent facility state for the Overworld: the one canonical site and which of its
 * 64 x 64 chunks have been built. Stored once per world; the site is never re-selected
 * once chosen, which (together with deterministic selection) prevents duplicates.
 */
public final class FacilityData extends SavedData {
	public static final Codec<FacilityData> CODEC = CompoundTag.CODEC.xmap(FacilityData::fromTag, FacilityData::toTag);
	public static final SavedDataType<FacilityData> TYPE = new SavedDataType<>(
		NuclearStation.id("facility"), FacilityData::new, CODEC, DataFixTypes.SAVED_DATA_COMMAND_STORAGE);
	public static final int FORMAT = 1;

	private boolean siteSelected;
	private int originX;
	private int originZ;
	private int grade;
	private int sea;
	private String selectionNote = "";
	private int epoch = 1;
	/** Blueprint content revision the built chunks were painted with (see FacilityManager.upgrade). */
	private int contentRevision = 1;
	/**
	 * Whether chunks with player activity are protected from painting. Only needed when the
	 * site may overlap terrain that existed (and may hold builds) before it was chosen.
	 */
	private boolean protectExisting = true;
	private final BitSet built = new BitSet(Blueprint.CHUNKS * Blueprint.CHUNKS);
	private final BitSet skipped = new BitSet(Blueprint.CHUNKS * Blueprint.CHUNKS);
	/** Chunks to be painted again (repairing accident damage), even if already marked. */
	private final BitSet repair = new BitSet(Blueprint.CHUNKS * Blueprint.CHUNKS);

	public FacilityData() {
	}

	public static FacilityData get(ServerLevel overworld) {
		return overworld.getDataStorage().computeIfAbsent(TYPE);
	}

	public boolean siteSelected() {
		return siteSelected;
	}

	public void selectSite(int originX, int originZ, int grade, int sea, String note) {
		if (siteSelected) {
			throw new IllegalStateException("Facility site already selected");
		}
		this.siteSelected = true;
		this.originX = originX;
		this.originZ = originZ;
		this.grade = grade;
		this.sea = sea;
		this.selectionNote = note;
		this.protectExisting = !verifiedUntouched(note);
		setDirty();
	}

	/** A coastal search at strictness 0-2 only accepts sites with no previously generated chunks. */
	static boolean verifiedUntouched(String note) {
		var m = java.util.regex.Pattern.compile("^coastal search, strictness ([0-9])").matcher(note);
		return m.find() && Integer.parseInt(m.group(1)) <= 2;
	}

	public boolean protectExisting() {
		return protectExisting;
	}

	/** Bumps the epoch without forgetting progress: every chunk is re-verified when it next loads. */
	public void reverifyAll() {
		epoch++;
		if (!protectExisting) {
			skipped.clear();
		}
		setDirty();
	}

	public int originX() {
		return originX;
	}

	public int originZ() {
		return originZ;
	}

	public int grade() {
		return grade;
	}

	public int sea() {
		return sea;
	}

	public String selectionNote() {
		return selectionNote;
	}

	/** Local chunk index for world chunk coordinates, or -1 if outside the footprint. */
	public int index(int chunkX, int chunkZ) {
		if (!siteSelected) {
			return -1;
		}
		int lx = chunkX - (originX >> 4);
		int lz = chunkZ - (originZ >> 4);
		if (lx < 0 || lz < 0 || lx >= Blueprint.CHUNKS || lz >= Blueprint.CHUNKS) {
			return -1;
		}
		return lx * Blueprint.CHUNKS + lz;
	}

	public boolean isBuilt(int index) {
		return built.get(index);
	}

	public void markBuilt(int index) {
		built.set(index);
		skipped.clear(index);
		setDirty();
	}

	public void markSkipped(int index) {
		skipped.set(index);
		setDirty();
	}

	public boolean isSkipped(int index) {
		return skipped.get(index);
	}

	public int contentRevision() {
		return contentRevision;
	}

	public void setContentRevision(int revision) {
		contentRevision = revision;
		setDirty();
	}

	public void requestRepair(int index) {
		repair.set(index);
		skipped.clear(index);
		setDirty();
	}

	public boolean needsRepair(int index) {
		return repair.get(index);
	}

	public void repaired(int index) {
		repair.clear(index);
		setDirty();
	}

	/** Generation epoch; chunks painted in an earlier epoch are painted again. */
	public int epoch() {
		return epoch;
	}

	public int builtCount() {
		return built.cardinality();
	}

	public int skippedCount() {
		return skipped.cardinality();
	}

	/** Development only: forget which chunks were built so they are painted again on load. */
	public void resetBuilt() {
		epoch++;
		built.clear();
		skipped.clear();
		setDirty();
	}

	private static FacilityData fromTag(CompoundTag tag) {
		FacilityData d = new FacilityData();
		d.siteSelected = tag.getBooleanOr("siteSelected", false);
		d.originX = tag.getIntOr("originX", 0);
		d.originZ = tag.getIntOr("originZ", 0);
		d.grade = tag.getIntOr("grade", 68);
		d.sea = tag.getIntOr("sea", 63);
		d.selectionNote = tag.getStringOr("note", "");
		d.epoch = tag.getIntOr("epoch", 1);
		d.contentRevision = tag.getIntOr("contentRevision", 1);
		d.protectExisting = tag.getBooleanOr("protectExisting", !verifiedUntouched(d.selectionNote));
		tag.getLongArray("built").ifPresent(a -> d.built.or(BitSet.valueOf(a)));
		tag.getLongArray("skipped").ifPresent(a -> d.skipped.or(BitSet.valueOf(a)));
		tag.getLongArray("repair").ifPresent(a -> d.repair.or(BitSet.valueOf(a)));
		return d;
	}

	private CompoundTag toTag() {
		CompoundTag tag = new CompoundTag();
		tag.putInt("format", FORMAT);
		tag.putBoolean("siteSelected", siteSelected);
		tag.putInt("originX", originX);
		tag.putInt("originZ", originZ);
		tag.putInt("grade", grade);
		tag.putInt("sea", sea);
		tag.putString("note", selectionNote);
		tag.putInt("epoch", epoch);
		tag.putInt("contentRevision", contentRevision);
		tag.putBoolean("protectExisting", protectExisting);
		tag.putLongArray("built", built.toLongArray());
		tag.putLongArray("skipped", skipped.toLongArray());
		tag.putLongArray("repair", repair.toLongArray());
		return tag;
	}
}

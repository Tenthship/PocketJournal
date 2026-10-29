import AntDesign from "@expo/vector-icons/AntDesign";
import { useContext, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import EntryField from "../components/EntryField";
import SearchBar from "../components/SearchBar";
import { useAuth } from "../utils/AuthContext";
import { cancelReminder } from "../utils/notifications";
import { colors, typeMeta } from "../utils/theme";
import { EntriesContext } from "./_layout";

const localUrl = "https://pocketjournal.onrender.com";

function formatTime(dateString) {
  if (!dateString) return "";
  return new Date(dateString).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function Entries() {
  const { refreshKey } = useContext(EntriesContext);
  const { session } = useAuth();
  const [dbEntries, setDbEntries] = useState([]);
  const [currentType, setCurrentType] = useState("All");
  const [searchValue, setSearchValue] = useState("");
  const [showEntry, setShowEntry] = useState(null);

  const loadEntries = async () => {
    if (!session) return;

    const response = await fetch(`${localUrl}/entries`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      console.log("Failed to load entries:", response.status);
      return;
    }

    const entries = await response.json();
    setDbEntries(Array.isArray(entries) ? entries : []);
  };

  async function handleDelete(id) {
    setDbEntries((oldEntries) => oldEntries.filter((entry) => entry.id !== id));

    const response = await fetch(`${localUrl}/entries/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      console.log("Delete failed");
      loadEntries();
      return;
    }

    await cancelReminder(id);
  }

  useEffect(() => {
    loadEntries();
  }, [refreshKey, session]);

  function FilterPill({ label, type }) {
    const active = currentType === type;
    return (
      <Pressable
        style={[styles.pill, active && styles.pillActive]}
        onPress={() => setCurrentType(type)}
      >
        <Text style={[styles.pillText, active && styles.pillTextActive]}>
          {label}
        </Text>
      </Pressable>
    );
  }

  const search = searchValue.toLowerCase();

  const visibleEntries = dbEntries.filter((entry) => {
    const matchesType = currentType === "All" || entry.type === currentType;

    const matchesSearch =
      search === "" ||
      entry.raw_text?.toLowerCase().includes(search) ||
      entry.title?.toLowerCase().includes(search) ||
      entry.description?.toLowerCase().includes(search) ||
      entry.keywords?.some((keyword) => keyword.toLowerCase().includes(search));

    return matchesType && matchesSearch;
  });

  return (
    <View style={styles.container}>
      <EntryField
        entry={showEntry}
        onClose={() => setShowEntry(null)}
        onUpdated={loadEntries}
      />

      <View style={styles.header}>
        <Text style={styles.eyebrow}>Pocket Journal</Text>
        <Text style={styles.h1}>Entries</Text>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={searchValue} onChange={setSearchValue} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterWrapper}
      >
        <FilterPill label="All" type="All" />
        <FilterPill label="Tasks" type="task" />
        <FilterPill label="Reminders" type="reminder" />
        <FilterPill label="Events" type="event" />
        <FilterPill label="Notes" type="statement" />
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {visibleEntries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>
              {dbEntries.length === 0
                ? "Add your first entry from the Home tab."
                : "Try a different filter or search term."}
            </Text>
          </View>
        )}

        {visibleEntries.map((entry) => {
          const meta = typeMeta[entry.type] || typeMeta.statement;

          return (
            <Pressable key={entry.id} onPress={() => setShowEntry(entry)}>
              <View
                style={[styles.entryCard, { backgroundColor: colors.card }]}
              >
                <View style={[styles.rail, { backgroundColor: meta.fg }]} />

                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.chip, { backgroundColor: meta.bg }]}>
                      <Text style={[styles.chipText, { color: meta.fg }]}>
                        {meta.label}
                      </Text>
                    </View>

                    <Pressable
                      onPress={() => handleDelete(entry.id)}
                      hitSlop={8}
                    >
                      <AntDesign
                        name="delete"
                        size={16}
                        color={colors.inkSoft}
                      />
                    </Pressable>
                  </View>

                  <Text style={styles.title}>
                    {entry.title || entry.raw_text || "Untitled"}
                  </Text>

                  <Text style={styles.description} numberOfLines={3}>
                    {entry.description || entry.raw_text}
                  </Text>

                  <Text style={styles.time}>
                    {formatTime(entry.created_at || entry.date)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 14,
  },

  eyebrow: {
    fontSize: 12,
    color: colors.inkSoft,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontWeight: "600",
  },

  h1: {
    fontSize: 32,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 2,
  },

  searchWrap: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  filterWrapper: {
    flexGrow: 0,
  },

  filters: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 8,
  },

  pill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },

  pillActive: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },

  pillText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSoft,
  },

  pillTextActive: {
    color: colors.cream,
  },

  list: {
    padding: 20,
    paddingTop: 8,
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: "center",
  },

  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },

  emptyBody: {
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: "center",
  },

  entryCard: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
  },

  rail: {
    width: 4,
  },

  cardBody: {
    flex: 1,
    padding: 14,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  chipText: {
    fontSize: 11,
    fontWeight: "700",
  },

  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 4,
  },

  description: {
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 20,
    marginBottom: 8,
  },

  time: {
    fontSize: 12,
    color: colors.inkSoft,
  },
});

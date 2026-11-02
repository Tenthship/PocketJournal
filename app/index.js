import { useRouter } from "expo-router";
import { useContext, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CaptureBar from "../components/CaptureBar";
import { useAuth } from "../utils/AuthContext";
import {
  handleReminder
} from "../utils/notifications";
import { colors, typeMeta } from "../utils/theme";
import { EntriesContext } from "./_layout";

const localUrl = "https://pocketjournal.onrender.com";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isToday(dateString) {
  if (!dateString) return false;
  const d = new Date(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function Today() {
  const { session } = useAuth();
  const { setRefreshKey } = useContext(EntriesContext);
  const router = useRouter();
  const [todayEntries, setTodayEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadToday() {
    if (!session) return;

    const response = await fetch(`${localUrl}/entries`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (!response.ok) {
      setLoading(false);
      return;
    }

    const entries = await response.json();
    const list = Array.isArray(entries) ? entries : [];
    setTodayEntries(list.filter((e) => isToday(e.created_at)));
    setLoading(false);
  }

  useEffect(() => {
    loadToday();
  }, [session]);

  async function handleSaved(savedEntry) {
    await handleReminder(savedEntry);
    setTodayEntries((prev) => [savedEntry, ...prev]);
    setRefreshKey((prev) => prev + 1);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{todayLabel()}</Text>
        <Text style={styles.title}>{greeting()}</Text>
      </View>

      <CaptureBar session={session} onSaved={handleSaved} />

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Today</Text>
        <Pressable onPress={() => router.push("/entries")}>
          <Text style={styles.viewAll}>View all →</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
        {!loading && todayEntries.length === 0 && (
          <Text style={styles.emptyText}>
            Nothing added today yet. Type or hold the mic above to start.
          </Text>
        )}

        {todayEntries.map((entry) => {
          const meta = typeMeta[entry.type] || typeMeta.statement;
          return (
            <View key={entry.id} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: meta.fg }]} />
              <Text style={styles.rowText} numberOfLines={1}>
                {entry.title || entry.raw_text}
              </Text>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: 20,
    paddingTop: 60,
  },

  header: {
    marginBottom: 18,
  },

  eyebrow: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkSoft,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  title: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.ink,
  },

  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 26,
    marginBottom: 10,
  },

  listTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  viewAll: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  list: {
    flex: 1,
  },

  emptyText: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 12,
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },

  rowText: {
    flex: 1,
    fontSize: 15,
    color: colors.ink,
    fontWeight: "600",
  },
});

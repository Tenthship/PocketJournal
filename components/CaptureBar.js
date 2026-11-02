import Ionicons from "@expo/vector-icons/Ionicons";
import {
    AudioModule,
    RecordingPresets,
    setAudioModeAsync,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { colors } from "../utils/theme";

const localUrl = "https://pocketjournal.onrender.com";

function uploadAudio(uri, token) {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("audio", {
      uri,
      name: "recording.m4a",
      type: "audio/m4a",
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${localUrl}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (err) {
          reject(err);
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

export default function CaptureBar({ session, onSaved }) {
  const [input, setInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  async function saveText(text) {
    setIsSaving(true);

    const response = await fetch(`${localUrl}/entries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ text }),
    });

    setIsSaving(false);

    if (!response.ok) {
      console.log("Saving entry failed:", response.status);
      return null;
    }

    return await response.json();
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || isSaving) return;

    setInput("");
    const savedEntry = await saveText(text);

    if (!savedEntry) {
      setInput(text);
      return;
    }

    onSaved?.(savedEntry);
  }

  async function startRecording() {
    const permission = await AudioModule.requestRecordingPermissionsAsync();
    if (!permission.granted) {
      console.log("Mic permission denied");
      return;
    }

    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await audioRecorder.prepareToRecordAsync();
    audioRecorder.record();
  }

  async function stopRecording() {
    await audioRecorder.stop();
    const uri = audioRecorder.uri;
    if (!uri) return;

    setIsTranscribing(true);

    let voiceMessage;
    try {
      voiceMessage = await uploadAudio(uri, session.access_token);
    } catch (err) {
      console.log("Transcription failed:", err.message);
      setIsTranscribing(false);
      return;
    }

    const savedEntry = await saveText(voiceMessage.transcript);
    setIsTranscribing(false);

    if (savedEntry) onSaved?.(savedEntry);
  }

  const handleMicPressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.9, useNativeDriver: true }).start();
    startRecording();
  };

  const handleMicPressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 90,
      useNativeDriver: true,
    }).start();
    stopRecording();
  };

  const busy = isSaving || isTranscribing;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={
            recorderState.isRecording
              ? "Listening..."
              : isTranscribing
                ? "Transcribing..."
                : "Write a thought, task, or reminder..."
          }
          placeholderTextColor={colors.inkSoft}
          editable={!recorderState.isRecording && !isTranscribing}
          multiline
        />

        {input.trim().length > 0 ? (
          <Pressable
            style={styles.sendButton}
            onPress={handleSend}
            disabled={busy}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.cream} />
            ) : (
              <Ionicons name="arrow-up" size={20} color={colors.cream} />
            )}
          </Pressable>
        ) : (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              style={[
                styles.micButton,
                recorderState.isRecording && styles.micButtonActive,
              ]}
              onPressIn={handleMicPressIn}
              onPressOut={handleMicPressOut}
              disabled={isTranscribing}
            >
              {isTranscribing ? (
                <ActivityIndicator size="small" color={colors.cream} />
              ) : (
                <Ionicons name="mic" size={20} color={colors.cream} />
              )}
            </Pressable>
          </Animated.View>
        )}
      </View>

      {recorderState.isRecording && (
        <Text style={styles.hint}>Recording — release to save</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 4,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },

  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
    maxHeight: 120,
  },

  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  micButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },

  micButtonActive: {
    backgroundColor: colors.primary,
  },

  hint: {
    marginTop: 8,
    fontSize: 13,
    color: colors.primary,
    fontWeight: "600",
    textAlign: "center",
  },
});

import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/mednow/Navbar";
import { Footer } from "@/components/mednow/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, appointmentApi, type DoctorRaw } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  Mic, MicOff, Video, VideoOff, Phone, Wifi, Send, Stethoscope, Loader2, User,
} from "lucide-react";

export const Route = createFileRoute("/telemedicine")({
  head: () => ({
    meta: [
      { title: "Telemedicine — MedNow" },
      { name: "description", content: "Voice and video doctor consults optimised for 2G/3G." },
    ],
  }),
  component: Telemed,
});

type ChatMsg = { from: "me" | "doc"; text: string; time: string };

function Telemed() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorRaw[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [activeDoctor, setActiveDoctor] = useState<DoctorRaw | null>(null);
  const [inCall, setInCall] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(false);
  const [signal, setSignal] = useState(2);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [callSeconds, setCallSeconds] = useState(0);
  const [connectingCall, setConnectingCall] = useState(false);

  // WebRTC refs
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load doctors
  useEffect(() => {
    authApi.getDoctors({ isAvailable: "true" })
      .then((res) => setDoctors(res.data || []))
      .catch(() => {})
      .finally(() => setDoctorsLoading(false));
  }, []);

  // Network quality simulation (real apps use NetworkInformation API)
  useEffect(() => {
    const conn = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
    if (conn?.effectiveType) {
      const map: Record<string, number> = { "slow-2g": 1, "2g": 1, "3g": 2, "4g": 4 };
      setSignal(map[conn.effectiveType] ?? 3);
    }
    const t = setInterval(() => {
      const conn2 = (navigator as unknown as { connection?: { effectiveType?: string } }).connection;
      if (!conn2) setSignal(1 + Math.floor(Math.random() * 4));
      else {
        const map: Record<string, number> = { "slow-2g": 1, "2g": 1, "3g": 2, "4g": 4 };
        setSignal(map[conn2.effectiveType ?? "4g"] ?? 3);
      }
    }, 5000);
    return () => clearInterval(t);
  }, []);

  // Call timer
  useEffect(() => {
    if (inCall) {
      timerRef.current = setInterval(() => setCallSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCallSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [inCall]);

  // Scroll chat to bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Socket.io call signaling
  useEffect(() => {
    if (!inCall || !activeDoctor) return;
    const socket = getSocket();

    socket.on("ice-candidate", async (candidate: RTCIceCandidateInit) => {
      try {
        await peerRef.current?.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {}
    });

    socket.on("call-answer", async (answer: RTCSessionDescriptionInit) => {
      try {
        await peerRef.current?.setRemoteDescription(new RTCSessionDescription(answer));
      } catch {}
    });

    socket.on("chat-message", (msg: { text: string; from: string }) => {
      setChat((c) => [
        ...c,
        { from: "doc", text: msg.text, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
    });

    return () => {
      socket.off("ice-candidate");
      socket.off("call-answer");
      socket.off("chat-message");
    };
  }, [inCall, activeDoctor]);

  const startCall = async (doctor: DoctorRaw) => {
    if (!user) { toast.error("Please sign in to start a call"); return; }
    setActiveDoctor(doctor);
    setConnectingCall(true);

    try {
      // Request microphone (camera optional based on signal)
      const constraints = {
        audio: true,
        video: cam && signal >= 3,
      };

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.warning("Microphone access denied. Continuing with chat only.");
      }

      // Create peer connection
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;

      // Add tracks
      stream?.getTracks().forEach((track) => pc.addTrack(track, stream!));

      // Handle remote tracks
      pc.ontrack = (evt) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = evt.streams[0];
        }
      };

      // ICE candidates
      const socket = getSocket();
      pc.onicecandidate = (evt) => {
        if (evt.candidate) {
          socket.emit("ice-candidate", {
            candidate: evt.candidate,
            roomId: `room_${doctor._id}`,
          });
        }
      };

      // Join room and create offer
      socket.emit("join-room", {
        roomId: `room_${doctor._id}`,
        userId: user.id,
        userType: "patient",
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit("call-offer", {
        roomId: `room_${doctor._id}`,
        offer,
        callerId: user.id,
        callerName: user.name,
        doctorId: doctor._id,
      });

      setInCall(true);
      setChat([{
        from: "doc",
        text: `Connected to ${doctor.name}. Hello, how can I help you today?`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }]);
      toast.success(`Connected to ${doctor.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start call");
      setActiveDoctor(null);
    } finally {
      setConnectingCall(false);
    }
  };

  const endCall = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    peerRef.current?.close();
    localStreamRef.current = null;
    peerRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;

    if (activeDoctor) {
      const socket = getSocket();
      socket.emit("end-call", { roomId: `room_${activeDoctor._id}` });
    }

    setInCall(false);
    setActiveDoctor(null);
    setChat([]);
    toast.info("Call ended");
  };

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !mic; });
    setMic((m) => !m);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !cam; });
    setCam((c) => !c);
  };

  const send = () => {
    if (!draft.trim() || !activeDoctor) return;
    const msg: ChatMsg = {
      from: "me",
      text: draft,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChat((c) => [...c, msg]);

    if (inCall) {
      const socket = getSocket();
      socket.emit("chat-message", {
        roomId: `room_${activeDoctor._id}`,
        text: draft,
        from: user?.id,
      });
    }
    setDraft("");
  };

  const quality = signal >= 3 ? "Good" : signal === 2 ? "Audio only" : "Low — 2G mode";
  const qualityTone = signal >= 3 ? "text-success" : signal === 2 ? "text-warning-foreground" : "text-destructive";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  return (
    <div className="relative min-h-dvh bg-background text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-mesh opacity-60" />
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Telemedicine</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Talk to a doctor in seconds</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Voice-first calls switch to audio-only on weak networks. Chat works even when calls don't.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* Call canvas */}
          <Card className="overflow-hidden rounded-3xl border-border/60 p-0 shadow-[var(--shadow-glow)] glass">
            <div className="relative aspect-video w-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10">
              {/* Remote video (hidden until stream arrives) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />

              {/* Overlay when no remote stream */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                {activeDoctor ? (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur">
                      {activeDoctor.avatar ? (
                        <img src={activeDoctor.avatar} alt={activeDoctor.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <Stethoscope className="h-9 w-9" />
                      )}
                    </div>
                    <p className="mt-3 text-base font-semibold">{activeDoctor.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {activeDoctor.doctorProfile?.specialization || "General"} ·{" "}
                      {cam && signal >= 3 ? "Video on" : "Audio only · saving data"}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-background/70 text-primary backdrop-blur">
                      <Stethoscope className="h-9 w-9" />
                    </div>
                    <p className="mt-3 text-base font-semibold text-muted-foreground">No active call</p>
                    <p className="text-xs text-muted-foreground">Select a doctor below to connect</p>
                  </>
                )}
              </div>

              {/* Local video pip */}
              {inCall && cam && (
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute bottom-4 right-4 h-24 w-32 rounded-xl object-cover shadow-lg"
                />
              )}

              {/* Signal badge */}
              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 text-xs font-medium backdrop-blur">
                <Wifi className={`h-3.5 w-3.5 ${qualityTone}`} />
                <span className={qualityTone}>{quality}</span>
                <span className="ml-1 inline-flex items-end gap-0.5">
                  {[1, 2, 3, 4].map((b) => (
                    <span
                      key={b}
                      className={`w-1 rounded-sm ${b <= signal ? "bg-foreground" : "bg-muted-foreground/30"}`}
                      style={{ height: `${4 + b * 2}px` }}
                    />
                  ))}
                </span>
              </div>

              {inCall && (
                <div className="absolute right-4 top-4 rounded-full bg-destructive/90 px-3 py-1 text-xs font-bold text-destructive-foreground">
                  LIVE · {formatTime(callSeconds)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 border-t border-border/40 p-4">
              <CallBtn onClick={toggleMic} active={mic} icon={mic ? Mic : MicOff} disabled={!inCall} />
              <CallBtn onClick={toggleCam} active={cam} icon={cam ? Video : VideoOff} disabled={!inCall} />
              {inCall ? (
                <button
                  onClick={endCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-105"
                >
                  <Phone className="h-5 w-5 rotate-[135deg]" />
                </button>
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Phone className="h-5 w-5" />
                </div>
              )}
            </div>
          </Card>

          {/* Chat */}
          <Card className="flex h-[520px] flex-col rounded-3xl border-border/60 p-5 glass">
            <div className="flex items-center gap-2 border-b border-border/40 pb-3">
              <div className={`h-2 w-2 rounded-full ${inCall ? "bg-success" : "bg-muted-foreground/40"}`} />
              <span className="text-sm font-semibold">
                {inCall ? `Chat · ${activeDoctor?.name}` : "Live chat"}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">Always works on 2G</span>
            </div>

            <div className="mt-3 flex-1 space-y-2 overflow-y-auto pr-1">
              {chat.length === 0 && (
                <p className="text-center text-xs text-muted-foreground pt-4">
                  Start a call to chat with a doctor.
                </p>
              )}
              {chat.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.from === "me" ? "items-end" : "items-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${m.from === "me" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    {m.text}
                  </div>
                  <span className="mt-0.5 text-[10px] text-muted-foreground">{m.time}</span>
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="mt-3 flex gap-2"
            >
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={inCall ? "Type a message…" : "Select a doctor to start chatting"}
                disabled={!inCall}
                className="rounded-xl"
              />
              <Button type="submit" size="icon" className="rounded-xl" disabled={!inCall || !draft.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </div>

        {/* Doctor list */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold">Available doctors</h2>
          {doctorsLoading ? (
            <div className="mt-6 flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : doctors.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No doctors available right now. Check back soon.</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {doctors.map((d) => {
                const available = d.doctorProfile?.isAvailable ?? false;
                const isActive = activeDoctor?._id === d._id;
                return (
                  <Card key={d._id} className={`rounded-2xl border-border/60 p-4 glass transition-all ${isActive ? "border-primary ring-1 ring-primary/30" : ""}`}>
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary overflow-hidden">
                        {d.avatar ? (
                          <img src={d.avatar} alt={d.name} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-4 w-4" />
                        )}
                      </div>
                      <span className={`ml-auto h-2 w-2 rounded-full ${available ? "bg-success" : "bg-muted-foreground/40"}`} />
                    </div>
                    <p className="mt-3 text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.doctorProfile?.specialization || "General"}</p>
                    {d.doctorProfile?.rating && (
                      <p className="mt-1 text-xs text-muted-foreground">{d.doctorProfile.rating.toFixed(1)} ★ · ₹{d.doctorProfile.consultationFee || "—"}</p>
                    )}
                    <p className="mt-2 text-xs font-medium">
                      {available ? "Available now" : "Offline"}
                    </p>
                    <Button
                      size="sm"
                      className={`mt-3 w-full rounded-lg ${isActive ? "bg-destructive hover:bg-destructive/90" : ""}`}
                      disabled={(!available && !isActive) || connectingCall}
                      onClick={() => isActive && inCall ? endCall() : startCall(d)}
                    >
                      {connectingCall && isActive ? (
                        <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Connecting…</>
                      ) : isActive && inCall ? (
                        "End call"
                      ) : available ? (
                        "Connect"
                      ) : (
                        "Offline"
                      )}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </div>
  );
}

function CallBtn({ onClick, active, icon: Icon, disabled }: { onClick: () => void; active: boolean; icon: typeof Mic; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-40 ${active ? "bg-foreground/10 text-foreground" : "bg-muted text-muted-foreground"}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

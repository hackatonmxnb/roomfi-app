// VoiceSearch.tsx
import React, { useCallback, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition'; // si usas el oficial, cambia el import
import {
  Fab, SwipeableDrawer, Box, Typography, Button, Stack, Chip, CircularProgress, Snackbar, LinearProgress
} from '@mui/material';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';

type Parsed = { chips?: string[]; [k: string]: any };
type Props = {
  onSubmit?: (query: string) => Promise<Parsed> | Parsed | void;
  hint?: string;
  fabBottom?: number;
  fabRight?: number;
  setMatches: React.Dispatch<React.SetStateAction<any[] | null>>;
};

const SILENCE_MS = 1500; // sin voz -> finalizar
const HARD_CAP_MS = 8000; // tope absoluto
const GRACE_MS   = 250;   // espera breve tras stop para ver si llega 'result'

export default function VoiceSearch({
  onSubmit,
  hint = 'Ej.: "Cuarto en Condesa por menos de 5 mil con estacionamiento, solo mujeres"',
  fabBottom = 16,
  fabRight = 16,
  setMatches
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [listening, setListening]   = useState(false);
  const [partial, setPartial]       = useState('');
  const [finalText, setFinalText]   = useState('');
  const [chips, setChips]           = useState<string[]>([]);
  const [loading, setLoading]       = useState(false);
  const [toast, setToast]           = useState<string | null>(null);
  const [searching, setSearching] = useState(false);

  // ===== Control de sesión (evita “primera vez funciona, luego no”) =====
  const sessionRef = useRef(0);                // id creciente por sesión
  const nativeStopRef = useRef<null | (() => void)>(null); // para forzar stop nativo
  const webRecRef = useRef<any>(null);         // recognizer web
  
  //const pxFromFabSize = (size: 'small' | 'medium' | 'large' = 'medium') => size === 'small' ? 40 : size === 'large' ? 72 : 56;
  const fabPx = 40;
  const bottomInset = `calc(env(safe-area-inset-bottom, 0px) + ${fabBottom + fabPx + 12}px)`;

  // -------------------- WEB (fallback) --------------------
  const startWeb = useCallback(async (sessionId: number): Promise<string> => {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { setToast('Reconocimiento de voz no disponible en este navegador.'); return ''; }

    return new Promise<string>((resolve) => {
      let last = '';
      const rec = new SR();
      webRecRef.current = rec;

      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = 'es-MX';

      rec.onresult = (e: any) => {
        if (sessionRef.current !== sessionId) return; // ignora sesión vieja
        const txt = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
        last = txt; setPartial(txt);
      };
      rec.onerror = () => resolve(last.trim());
      rec.onend   = () => resolve(last.trim());

      try { rec.start(); } catch { resolve(last.trim()); }
    });
  }, []);

  const stopWeb = useCallback(() => {
    const rec = webRecRef.current;
    if (rec) { try { rec.stop(); } catch {} webRecRef.current = null; }
  }, []);

  // -------------------- NATIVO (Capacitor) --------------------
  async function ensureSpeechPermission(SR: any): Promise<boolean> {
    // oficial
    if (typeof SR.checkPermissions === 'function') {
      const st = await SR.checkPermissions();
      if (st?.speechRecognition !== 'granted') {
        const r = await SR.requestPermissions();
        return r?.speechRecognition === 'granted';
      }
      return true;
    }
    // community
    if (typeof SR.hasPermission === 'function') {
      const st = await SR.hasPermission();
      if (!st?.permission) {
        const r = await SR.requestPermission();
        return !!r?.permission;
      }
      return !!st?.permission;
    }
    return false;
  }

  const startNative = useCallback(async (sessionId: number): Promise<string> => {
    const SR: any = SpeechRecognition;

    if (!(await ensureSpeechPermission(SR))) {
      setToast('Permiso de micrófono denegado.');
      return '';
    }

    let last = '';
    let resolved = false;
    let stopping = false;
    let silenceTimer: any;
    let hardCapTimer: any;
    let graceTimer: any;
    const listeners: PluginListenerHandle[] = [];

    const cleanup = async () => {
      clearTimeout(silenceTimer);
      clearTimeout(hardCapTimer);
      clearTimeout(graceTimer);
      listeners.forEach(l => l.remove());
      nativeStopRef.current = null;
      try { await SR.stop?.(); } catch {}
    };

    const resolveOnce = async (txt: string) => {
      if (resolved) return txt.trim();
      resolved = true;
      await cleanup();
      return txt.trim();
    };

    const resetSilence = () => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(requestStop, SILENCE_MS);
    };

    const requestStop = async () => {
      if (stopping) return;
      stopping = true;
      try { await SR.stop?.(); } catch {}
      // si no llega 'result', cerramos con último partial
      graceTimer = setTimeout(async () => {
        if (!resolved) {
          resolved = true;
          await cleanup();
        }
      }, GRACE_MS);
    };

    nativeStopRef.current = requestStop;

    return new Promise<string>(async (resolve) => {
      try {
        listeners.push(await SR.addListener('partialResults', (e: any) => {
          if (sessionRef.current !== sessionId) return;
          const txt = e?.matches?.[0];
          if (typeof txt === 'string') { last = txt; setPartial(txt); resetSilence(); }
        }));
        listeners.push(await SR.addListener('result', async (e: any) => {
          if (sessionRef.current !== sessionId) return;
          const txt = (e?.matches?.[0] ?? last ?? '').trim();
          resolve(await resolveOnce(txt));
        }));
        listeners.push(await SR.addListener('error', async () => {
          if (sessionRef.current !== sessionId) return;
          resolve(await resolveOnce(last));
        }));

        hardCapTimer = setTimeout(requestStop, HARD_CAP_MS);

        await SR.start({ language: 'es-MX', partialResults: true, maxResults: 1, prompt: '¿Qué buscas?' });
        resetSilence();
      } catch {
        resolve(await resolveOnce(last));
      }
    }).then(txt => txt || last.trim());
  }, []);

  // -------------------- Control unificado --------------------
  const startSession = useCallback(async () => {
    // abre el sheet de inmediato y entra a spinner
    setDrawerOpen(true);
    setPartial('');
    setFinalText('');
    setChips([]);
    setListening(true);

    // id de sesión (evita que respuestas viejas actualicen el UI)
    const mySession = ++sessionRef.current;

    try {
      const text = await (Capacitor.isNativePlatform()
        ? startNative(mySession)
        : startWeb(mySession));
      if (sessionRef.current !== mySession) return; // ya hay otra sesión
      setFinalText(text);
    } catch (e: any) {
      if (sessionRef.current !== mySession) return;
      setToast(e?.message || 'Error de voz');
    } finally {
      if (sessionRef.current === mySession) setListening(false);
      if (!Capacitor.isNativePlatform()) stopWeb();
    }
  }, [startNative, startWeb, stopWeb]);

  const stopSession = useCallback(() => {
    // fuerza cierre inmediato sin depender de 'result'
    setListening(false);
    // nativo
    nativeStopRef.current?.();
    // web
    stopWeb();
    // si no hay texto final, usa el último parcial
    setFinalText((t) => t || partial || '');
  }, [partial, stopWeb]);

  const onFabClick = useCallback(() => {
    // Toggle: si está escuchando, paramos; si no, iniciamos
    if (listening) stopSession();
    else startSession();
  }, [listening, startSession, stopSession]);

  // Buscar (manda al backend si existe onSubmit)
  const runSearch = useCallback(async () => {
    if (!onSubmit) { setDrawerOpen(false); return; }
    let matchesWithCoords = [] as any;
    try {
      setLoading(true);
      setSearching(true);
      const user_id = '7c74d216-7c65-47e6-b02d-1e6954f39ba7';
      fetch(process.env.REACT_APP_API + "/matchmaking/match/top?ai_query=true&user_id=" + user_id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'user_prompt': (finalText || partial || '') })
      })
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data.property_matches)) {
            const baseLat = 19.4326;
            const baseLng = -99.1333;
            const randomNearby = (base: number, delta: number) => base + (Math.random() - 0.5) * delta;
            const matchesWithCoords = data.property_matches.map((match: any) => ({
              ...match,
              lat: randomNearby(baseLat, 0.025),
              lng: randomNearby(baseLng, 0.025),
            }));
            setMatches(matchesWithCoords);
          } else {
            setMatches([]);
          }
        })
        .catch(() => setMatches([]));
      

      if (matchesWithCoords && Array.isArray((matchesWithCoords as any).chips)) setChips((matchesWithCoords as any).chips!);
      else setDrawerOpen(false);
    } catch (e: any) {
      setToast(e?.message || 'Error al procesar la búsqueda');
    } finally {
      setLoading(false);
      setSearching(false);
    }
  }, [onSubmit, finalText, partial]);

  // Si el usuario cierra el sheet manualmente, paramos todo y reseteamos bien
  const handleCloseDrawer = useCallback(() => {
    stopSession();
    setDrawerOpen(false);
  }, [stopSession]);

  return (
    <>
      {/* FAB Mic */}
      <Fab
        color={listening ? 'secondary' : 'primary'}
        onClick={onFabClick}
        sx={{ position: 'fixed', right: fabRight, bottom: fabBottom, zIndex: 1500 }}
        aria-label={listening ? 'Detener dictado' : 'Iniciar dictado'}
      >
        {listening ? <CircularProgress size={24} sx={{ color: 'white' }} /> : <KeyboardVoiceIcon />}
      </Fab>

      {/* Bottom Sheet (se abre al tocar FAB) */}
      <SwipeableDrawer
        anchor="bottom"
        open={drawerOpen}
        onOpen={() => {}}
        onClose={handleCloseDrawer}
        PaperProps={{ sx: { borderTopLeftRadius: 16, borderTopRightRadius: 16, p: 2, pb: 3 } }}
      >
        {searching && (
          <Box sx={{ position: 'sticky', top: 0, left: 0, right: 0, zIndex: 1, mb: 1 }}>
            <LinearProgress />
          </Box>
        )}
        <Typography variant="subtitle2" color="text.secondary">Búsqueda por voz</Typography>

        <Box sx={{ mt: 1, minHeight: 52 }}>
          <Typography variant="h6">
            {listening ? (partial || 'Escuchando…') : (finalText || partial || '…')}
          </Typography>
        </Box>

        {chips.length > 0 && (
          <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mt: 1 }}>
            {chips.map((c) => (
              <Chip key={c} label={c} onDelete={() => setChips(chips.filter(x => x !== c))} />
            ))}
          </Stack>
        )}

        <Stack direction="row" gap={1} sx={{ mt: 2 }}>
          <Button fullWidth variant="contained" onClick={runSearch} 
            disabled={searching || loading || !(finalText || partial)}
            startIcon={searching ? <CircularProgress size={16} /> : null}>
            {loading ? 'Buscando…' : 'Buscar'}
          </Button>
          <Button fullWidth variant="outlined" onClick={handleCloseDrawer}>
            Cerrar
          </Button>
        </Stack>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {hint}
        </Typography>
        <Box sx={{ height: bottomInset }} />

        {searching && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              pointerEvents: 'auto',
            }}
          >
            <CircularProgress />
          </Box>
        )}
      </SwipeableDrawer>

      <Snackbar open={!!toast} autoHideDuration={2500} message={toast || ''} onClose={() => setToast(null)} />
    </>
  );
}

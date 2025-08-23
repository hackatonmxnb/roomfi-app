import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Alert, Avatar, Stack, Chip,
  LinearProgress, Slider, FormHelperText
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import { renderGenderIcon } from './utils/icons';
// Si usas TS, cambia a: import type { SelectChangeEvent } from '@mui/material/Select';
import { useUser } from './UserContext';

export default function RegisterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, updateUser } = useUser();

  // Datos de Google
  const { email = '', name = '', picture = '', given_name = '', family_name = '' } = location.state || {};

  // Wizard
  const [step, setStep] = useState(1);
  const totalSteps = 2;

  // Form
  const [form, setForm] = useState({
    first_name: given_name || '',
    last_name: family_name || '',
    gender: '',
    age: '',
    bio: '',
    // Presupuesto: manejamos con slider pero conservamos min/max para backend
    budget_min: 2500,
    budget_max: 5500,
    location_preference: '',
    lifestyle_tags: [] as string[],
    roomie_preferences: { gender: '', smoking: '' },
  });

  // Estado UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [lastMatches, setLastMatches] = useState(null);

  // user_id local
  const [userId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('roomfi_user_id');
      if (stored) return stored;
      const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('roomfi_user_id', uuid);
      return uuid;
    }
    return '';
  });

  // Helpers
  const fmtMXN = (n:any) =>
    new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n || 0);

  const progress = useMemo(() => Math.round((step / totalSteps) * 100), [step]);

  const canNextStep1 = form.first_name && form.last_name && form.gender && form.age;
  const canFinish = form.location_preference || form.lifestyle_tags.length > 0 || form.roomie_preferences.gender || form.roomie_preferences.smoking || form.budget_max >= form.budget_min;

  // Navegación post-éxito
  useEffect(() => {
    if (success && lastMatches) navigate('/', { state: { matches: lastMatches } });
  }, [success, lastMatches, navigate]);

  // Handlers
  const up = (partial:any) => setForm((prev) => ({ ...prev, ...partial }));
  const onChange = (e:any) => up({ [e.target.name]: e.target.value });

  const handleBudgetChange = (_:any, value:any) => {
    const [min, max] = value;
    up({ budget_min: min, budget_max: max });
  };

  const handleRegister = async () => {
    setLoading(true);
    setError('');
    try {
      const fullUserData = {
        ...user,            // wallet, etc.
        ...form,
        email,
        name,
        picture,
        user_id: userId,
      };
      updateUser(fullUserData);

      // Registro
      const res = await fetch(process.env.REACT_APP_API + '/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullUserData),
      });
      if (!res.ok) throw new Error('Error al registrar usuario');

      // Matchmaking
      const matchRes = await fetch(process.env.REACT_APP_API + `/matchmaking/match/top`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
      });
      const matchData = await matchRes.json();
      setLastMatches(matchData);

      setSuccess(true);
      localStorage.removeItem('roomfi_user_id');
    } catch (err:any) {
      setError(err.message || 'Ocurrió un error desconocido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Si tienes un <Header/> global, mantenlo; si no, quítalo */}
      {/* <Header ... /> */}

      <Box maxWidth={600} mx="auto" mt={3} pb={10 /* espacio para sticky CTA */}>
        <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3 }}>
          {/* Header compacto */}
          <Stack direction="row" spacing={2} alignItems="center" mb={1}>
            <Avatar src={picture} alt={name} sx={{ width: 56, height: 56 }} />
            <Box>
              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {name || 'Tu nombre'}
              </Typography>
              <Typography color="primary" fontWeight={500} sx={{ fontSize: 14, wordBreak: 'break-all' }}>
                {email}
              </Typography>
            </Box>
          </Stack>

          {/* Progreso */}
          <Box mt={2} mb={1.5}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.75}>
              <Typography variant="subtitle2" fontWeight={700}>
                Completa tu perfil ({step}/{totalSteps})
              </Typography>
              <Typography variant="caption" color="text.secondary">{progress}%</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 999 }} />
          </Box>

          {/* Tip */}
          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
            <Chip label="FYI" color="primary" size="small" />
            <Typography variant="body2" color="text.secondary">
              2 min para completar tu perfil y aumentar tus matches 5×.
            </Typography>
          </Stack>

          {/* STEP 1: Información básica */}
          {step === 1 && (
            <Box component="form" onSubmit={(e) => { e.preventDefault(); if (canNextStep1) setStep(2); }}>
              <Stack spacing={2}>
                <TextField
                  label="Nombre"
                  name="first_name"
                  value={form.first_name}
                  onChange={onChange}
                  fullWidth
                  required
                  inputProps={{ autoComplete: 'given-name' }}
                />
                <TextField
                  label="Apellidos"
                  name="last_name"
                  value={form.last_name}
                  onChange={onChange}
                  fullWidth
                  required
                  inputProps={{ autoComplete: 'family-name' }}
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Género</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {[
                      { v: 'female', l: 'Femenino' },
                      { v: 'male', l: 'Masculino' },
                      { v: 'other', l: 'Otro' },
                      { v: 'prefer_not_say', l: 'Prefiero no decir' },
                    ].map(opt => (
                      <Chip
                        key={opt.v}
                        icon={renderGenderIcon(opt.v)}
                        label={opt.l}
                        onClick={() => up({ gender: opt.v })}
                        color={form.gender === opt.v ? 'primary' : 'default'}
                        variant={form.gender === opt.v ? 'filled' : 'outlined'}
                        sx={{ mb: 1 }}
                      />
                    ))}
                  </Stack>
                  {!form.gender && <FormHelperText error>Selecciona una opción</FormHelperText>}
                </Box>

                <TextField
                  label="Edad"
                  name="age"
                  type="number"
                  value={form.age}
                  onChange={onChange}
                  fullWidth
                  required
                  inputProps={{ min: 18, max: 99, inputMode: 'numeric', pattern: '[0-9]*' }}
                />

                <TextField
                  label="Bio"
                  name="bio"
                  value={form.bio}
                  onChange={onChange}
                  fullWidth
                  multiline
                  minRows={2}
                  maxRows={4}
                  placeholder="Cuéntales brevemente sobre ti"
                />
              </Stack>

              {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

              {/* CTA sticky */}
              <Box
                sx={{
                  position: { xs: 'fixed', sm: 'static' },
                  left: 0, right: 0, bottom: 0,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderTop: { xs: '1px solid', sm: 'none' },
                  borderColor: 'divider',
                  zIndex: 1200,
                  pb: { xs: `calc(8px + env(safe-area-inset-bottom))`, sm: 0 },
                  mt: 2
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={!canNextStep1}
                >
                  Continuar
                </Button>
              </Box>
            </Box>
          )}

          {/* STEP 2: Preferencias */}
          {step === 2 && (
            <Box component="form" onSubmit={(e) => { e.preventDefault(); handleRegister(); }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Presupuesto mensual</Typography>
                  <Slider
                    value={[form.budget_min, form.budget_max]}
                    onChange={handleBudgetChange}
                    min={1500}
                    max={20000}
                    step={250}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(v) => fmtMXN(v)}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Rango: {fmtMXN(form.budget_min)} – {fmtMXN(form.budget_max)}
                  </Typography>
                </Box>

                <TextField
                  label="Ubicación preferida"
                  name="location_preference"
                  value={form.location_preference}
                  onChange={onChange}
                  fullWidth
                  placeholder="Ej.: Condesa, Roma, Del Valle…"
                />

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Estilo de vida</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {[
                      ['early_bird', 'Madrugador/a'],
                      ['night_owl', 'Nocturno/a'],
                      ['no_pets', 'Sin mascotas'],
                      ['pets_ok', 'Acepta mascotas'],
                      ['fitness', 'Fitness'],
                      ['vegan', 'Vegano/a'],
                      ['student', 'Estudiante'],
                      ['remote_worker', 'Home office'],
                    ].map(([val, label]) => {
                      const active = form.lifestyle_tags.includes(val);
                      return (
                        <Chip
                          key={val}
                          label={label}
                          onClick={() => {
                            const set = new Set(form.lifestyle_tags);
                            active ? set.delete(val) : set.add(val);
                            up({ lifestyle_tags: Array.from(set) });
                          }}
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          sx={{ mb: 1 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Prefiero roomies</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {[
                      ['female', 'Solo mujeres'],
                      ['male', 'Solo hombres'],
                      ['any', 'Indiferente'],
                      ['mixed', 'Mixto'],
                    ].map(([val, label]) => {
                      const active = form.roomie_preferences.gender === val;
                      return (
                        <Chip
                          key={val}
                          label={label}
                          onClick={() =>
                            up({ roomie_preferences: { ...form.roomie_preferences, gender: val } })
                          }
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                          sx={{ mb: 1 }}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>¿Aceptas fumar?</Typography>
                  <Stack direction="row" spacing={1}>
                    {[
                      ['no', 'No'],
                      ['yes', 'Sí'],
                      ['', 'Cualquiera'],
                    ].map(([val, label]) => {
                      const active = form.roomie_preferences.smoking === val;
                      return (
                        <Chip
                          key={val || 'any'}
                          label={label}
                          onClick={() =>
                            up({ roomie_preferences: { ...form.roomie_preferences, smoking: val } })
                          }
                          color={active ? 'primary' : 'default'}
                          variant={active ? 'filled' : 'outlined'}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                {error && <Alert severity="error">{error}</Alert>}
              </Stack>

              {/* CTA sticky */}
              <Box
                sx={{
                  position: { xs: 'fixed', sm: 'static' },
                  left: 0, right: 0, bottom: 0,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderTop: { xs: '1px solid', sm: 'none' },
                  borderColor: 'divider',
                  zIndex: 1200,
                  pb: { xs: `calc(8px + env(safe-area-inset-bottom))`, sm: 0 },
                  mt: 2
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  fullWidth
                  disabled={loading || !canFinish}
                >
                  {loading ? 'Registrando…' : 'Registrar'}
                </Button>
                <Button
                  onClick={() => setStep(1)}
                  variant="text"
                  color="inherit"
                  fullWidth
                  sx={{ mt: 1 }}
                >
                  Volver
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </>
  );
}

// SuggestionBar.tsx
import { Box, Paper, Stack, Chip, Typography } from '@mui/material';

export default function SuggestionBar({
  items, bottomPx = 16, rightPx = 16, leftPx = 16,
}: { items: string[]; bottomPx?: number; rightPx?: number; leftPx?: number }) {
  if (!items?.length) return null;
  return (
    <Box
      sx={{
        position: 'fixed',
        left: `calc(env(safe-area-inset-left,0px) + ${leftPx}px)`,
        right:`calc(env(safe-area-inset-right,0px) + ${rightPx}px)`,
        bottom:`calc(env(safe-area-inset-bottom,0px) + ${bottomPx}px)`,
        zIndex: 1450,
      }}
    >
      <Paper elevation={3} sx={{ p: 1.25, borderRadius: 2, backdropFilter: 'blur(6px)' }}>
        <Typography variant="caption" color="text.secondary">Quizás quieras añadir</Typography>
        <Stack direction="row" spacing={1} sx={{ mt: .5, overflowX: 'auto', pb: .5 }}>
          {items.map(s => (
            <Chip key={s} label={s} size="small" variant="outlined" />
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

import React from 'react';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Drawer, List, ListItemButton,
  ListItemText, Paper, Modal, Stack, Divider, Chip, useMediaQuery
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';

interface HeaderProps {
  account?: string | null;
  tokenBalance?: number;
  onFundingModalOpen?: () => void;
  onConnectGoogle: () => void;
  onConnectMetaMask: () => void;
  onViewNFTClick: () => void;
  onMintNFTClick: () => void;
  onViewMyPropertiesClick: () => void;
  onSavingsClick: () => void;
  onHowItWorksClick: () => void;
  tenantPassportData: any;
  isCreatingWallet?: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  showOnboarding: boolean;
}

export default function Header(props: HeaderProps) {
  const {
    account, tokenBalance, onFundingModalOpen, onConnectGoogle, onConnectMetaMask,
    onViewNFTClick, onViewMyPropertiesClick, onSavingsClick, onHowItWorksClick,
    isCreatingWallet, setShowOnboarding, showOnboarding
  } = props;

  const theme = useTheme();
  const mdDown = useMediaQuery(theme.breakpoints.down('md'));
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pendingActionRef = React.useRef<null | (() => void)>(null);
  const closeDrawerThen = (fn: () => void) => {
    pendingActionRef.current = fn;
    setDrawerOpen(false);
  };

  const handleOpenOnboarding = () => setShowOnboarding(true);
  const handleCloseOnboarding = () => setShowOnboarding(false);

  // Nav items (mismos labels que usas)
  const NAV: Array<
    { label: string; to?: string; onClick?: () => void; showWhen?: 'always' | 'account' }
  > = [
    { label: 'Crear Pool', to: '/create-pool', showWhen: 'account' },
    { label: 'Mis Propiedades', onClick: onViewMyPropertiesClick, showWhen: 'account' },
    { label: 'Bóveda', onClick: onSavingsClick, showWhen: 'account' },
    { label: 'Como funciona', onClick: onHowItWorksClick, showWhen: 'always' },
    { label: 'Verifica roomie', to: '/verifica-roomie', showWhen: 'always' },
    { label: 'Para empresas', to: '/empresas', showWhen: 'always' },
  ];

  const NavButtonsDesktop = (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ ml: 2 }}>
      {NAV.filter(i => i.showWhen === 'always' || !!account).map((item) => {
        const active = item.to && pathname.startsWith(item.to);
        const btn = (
          <Button
            key={item.label}
            color="inherit"
            onClick={item.onClick}
            sx={{
              textTransform: 'none',
              fontWeight: active ? 700 : 600,
              opacity: active ? 1 : 0.9,
            }}
            {...(item.to ? { component: RouterLink, to: item.to } : {})}
          >
            {item.label}
          </Button>
        );
        return btn;
      })}
    </Stack>
  );

  const WalletDesktop = account ? (
    <Paper elevation={2} sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 2, borderRadius: 2 }}>
      <Box sx={{ textAlign: 'right' }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          {(tokenBalance ?? 0).toFixed(2)} MON
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
        </Typography>
      </Box>
      <Button variant="contained" size="small" onClick={onFundingModalOpen}>Añadir Fondos</Button>
      <Button variant="outlined" size="small" onClick={onViewNFTClick}>Ver mi NFT</Button>
    </Paper>
  ) : (
    <Button
      color="primary"
      variant="contained"
      onClick={handleOpenOnboarding}
      sx={{ ml: 2, bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
    >
      Conectar
    </Button>
  );

  const WalletMobileBlock = (
    <Box sx={{ p: 2 }}>
      {account ? (
        <Stack spacing={1.25}>
          <Chip
            size="small"
            variant="outlined"
            label={`${(tokenBalance ?? 0).toFixed(2)} MON`}
          />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
          </Typography>
          <Button fullWidth variant="contained" onClick={onFundingModalOpen}>
            Añadir Fondos
          </Button>
          <Button fullWidth variant="outlined" onClick={onViewNFTClick}>
            Ver mi NFT
          </Button>
        </Stack>
      ) : (
        <Button fullWidth variant="contained" onClick={handleOpenOnboarding}>
          Conectar
        </Button>
      )}
    </Box>
  );

  return (
    <>
      <AppBar
        position="sticky"
        elevation={0}
        color="transparent"
        sx={{
          borderBottom: '1px solid',
          borderColor: 'divider',
          backdropFilter: 'saturate(180%) blur(8px)',
          backgroundColor: 'rgba(255,255,255,0.85)',
        }}
      >
        <Toolbar sx={{ minHeight: 64, px: { xs: 1.5, sm: 2.5 } }}>
          {/* Logo + burger en mobile */}
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flex: '0 0 auto' }}>
            {mdDown && (
              <IconButton edge="start" aria-label="menu" onClick={() => setDrawerOpen(true)} sx={{ color: 'primary.main' }}>
                <MenuIcon />
              </IconButton>
            )}
            <RouterLink to="/" style={{ display: 'block', textDecoration: 'none' }}>
              <img
                src="/roomfilogo2.png"
                alt="RoomFi Logo"
                style={{ height: 44, objectFit: 'contain', display: 'block', cursor: 'pointer' }}
              />
            </RouterLink>
          </Stack>

          {/* Nav desktop */}
          <Box sx={{ flex: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-start' }}>
            {NavButtonsDesktop}
          </Box>

          {/* Wallet / CTA derecha */}
          <Box sx={{ flex: '0 0 auto', display: { xs: 'none', md: 'block' } }}>
            {WalletDesktop}
          </Box>

          {/* Placeholder para empujar burger/CTA en mobile */}
          <Box sx={{ flex: 1, display: { xs: 'block', md: 'none' } }} />
        </Toolbar>
      </AppBar>

      {/* Drawer Mobile */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          // ejecuta la acción diferida (si existe)
          const fn = pendingActionRef.current;
          pendingActionRef.current = null;
          if (fn) fn();
        }}
        PaperProps={{ sx: { width: '82vw', maxWidth: 360 } }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <img src="/roomfilogo2.png" alt="RoomFi" style={{ width: 28, height: 28 }} />
            <Typography fontWeight={800}>RoomFi</Typography>
          </Stack>
          <IconButton onClick={() => setDrawerOpen(false)} aria-label="Cerrar menú">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Divider />

        <List sx={{ p: 0 }}>
          {NAV.filter(i => i.showWhen === 'always' || !!account).map((item) => (
            <ListItemButton
              key={item.label}
              onClick={() => {
                setDrawerOpen(false);
                item.onClick?.();
              }}
              {...(item.to ? { component: RouterLink, to: item.to } as any : {})}
              selected={!!item.to && pathname.startsWith(item.to)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Divider />

        {/* Wallet/Conectar al final del drawer */}
        {WalletMobileBlock}
      </Drawer>

      {/* Onboarding modal (conservado) */}
      <Modal open={showOnboarding} onClose={handleCloseOnboarding}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: 'background.paper',
          borderRadius: 3,
          boxShadow: 24,
          p: 4,
          minWidth: 320,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2
        }}>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Conecta tu Wallet
          </Typography>
          <Button variant="contained" fullWidth onClick={() => { setDrawerOpen(false); onConnectMetaMask?.(); handleCloseOnboarding(); }}>
            Conectar con Reown
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                style={{ width: 20, height: 20 }}
              />
            }
            onClick={() => { onConnectGoogle(); handleCloseOnboarding(); }}
            disabled={isCreatingWallet}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {isCreatingWallet ? 'Creando wallet...' : 'Iniciar sesión con Google'}
          </Button>
        </Box>
      </Modal>
    </>
  );
}

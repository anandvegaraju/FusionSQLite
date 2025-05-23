import React from 'react';
import Typography from '@mui/material/Typography';
import Link from '@mui/material/Link';

export default function Copyright(props) {
  return (
    <Typography variant="body2" color="text.secondary" align="center" {...props}>
      {'Copyright © '}
      <Link color="inherit" href="#"> {/* In a real app, this might link to the app's main page or an org page */}
        Fusion SQL PWA
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

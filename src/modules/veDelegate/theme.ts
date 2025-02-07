export interface VeDelegateTheme {
  colors: {
    primary: {
      main: string;
      light: string;
      dark: string;
    };
    secondary: {
      main: string;
      light: string;
      dark: string;
    };
    background: {
      main: string;
      paper: string;
    };
    text: {
      primary: string;
      secondary: string;
    };
    success: {
      main: string;
      light: string;
    };
    error: {
      main: string;
      light: string;
    };
  };
  shadows: {
    card: string;
    button: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
  };
}

export const defaultTheme: VeDelegateTheme = {
  colors: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
    },
    background: {
      main: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#212121',
      secondary: '#757575',
    },
    success: {
      main: '#4caf50',
      light: '#81c784',
    },
    error: {
      main: '#f44336',
      light: '#e57373',
    },
  },
  shadows: {
    card: '0 2px 4px rgba(0,0,0,0.1)',
    button: '0 1px 3px rgba(0,0,0,0.12)',
  },
  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
  },
  spacing: {
    small: '0.5rem',
    medium: '1rem',
    large: '2rem',
  },
}; 
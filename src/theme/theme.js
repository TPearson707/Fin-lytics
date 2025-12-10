export const theme = {
  primary: {
    main: '#749181',        
    light: '##8fb5a0',       
    dark: '#566b5f',        
    contrastText: '#fff',   
  },

  secondary: {
     main: '#2196f3',        
    light: '#64b5f6',       
    dark: '#1976d2',        
    contrastText: '#fff',
     
  },

  success: {
    main: '#4caf50',        
    light: '#81c784',       
    dark: '#388e3c',        
    contrastText: '#fff',
  },

  error: {
    main: '#f44336',        
    light: '#e57373',       
    dark: '#d32f2f',        
    contrastText: '#fff',
  },

  warning: {
    main: '#ff9800',        
    light: '#ffb74d',       
    dark: '#f57c00',        
    contrastText: 'rgba(0, 0, 0, 0.87)',
  },

  info: {
    main: '#9c27b0',        
    light: '#ba68c8',       
    dark: '#7b1fa2',        
    contrastText: '#fff',  
  },

  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  background: {
    default: '#fafafa',     
    paper: '#ffffff',       
    alt: '#f5f5f5',         
  },

  text: {
    primary: 'rgba(0, 0, 0, 0.87)',
    secondary: 'rgba(0, 0, 0, 0.6)',
    disabled: 'rgba(0, 0, 0, 0.38)',
    hint: 'rgba(0, 0, 0, 0.38)',
  },

  
  divider: 'rgba(0, 0, 0, 0.12)',

  budget: {
    income: '#4caf50',           
    expense: '#f44336',          
    recurring: '#9c27b0',        
    projection: '#1976d2',       
    balance: {
      positive: '#4caf50',       
      negative: '#f44336',       
      neutral: '#9e9e9e',        
    },
  },

  
  stock: {
    gain: '#4caf50',             
    loss: '#f44336',             
    neutral: '#9e9e9e',          
  },

  
  calendar: {
    today: {
      background: '#f5faf5',
      border: '##749180',
    },
    negative: {
      background: 'rgba(244, 67, 54, 0.06)',
    },
    positive: {
      background: 'rgba(76, 175, 80, 0.06)',
    },
  },

  chart: {
    colors: [
      '#1976d2', 
      '#9c27b0', 
      '#f44336', 
      '#4caf50', 
      '#ff9800', 
      '#2196f3', 
      '#e91e63', 
      '#00bcd4', 
      '#8bc34a', 
      '#ffc107', 
    ],
  },

  categoryDefaults: {
    food: '#ff9800',           
    transport: '#2196f3',      
    entertainment: '#9c27b0', 
    shopping: '#e91e63',       
    bills: '#f44336',          
    income: '#4caf50',        
    savings: '#00bcd4',     
    other: '#9e9e9e',          
  },

  navigation: {
    background: '#ffffff',
    selected: 'rgba(25, 118, 210, 0.08)',
    hover: 'rgba(0, 0, 0, 0.04)',
    text: 'rgba(0, 0, 0, 0.87)',
    icon: 'rgba(0, 0, 0, 0.6)',
  },

  shadows: {
    card: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevated: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    modal: '0px 8px 24px rgba(0, 0, 0, 0.2)',
  },

  borderRadius: {
    small: '4px',
    medium: '8px',
    large: '12px',
    round: '50%',
  },


  spacing: 8, 
};

export const getThemeColor = (path) => {
  const keys = path.split('.');
  let value = theme;
  for (const key of keys) {
    value = value?.[key];
    if (value === undefined) return null;
  }
  return value;
};

export const muiTheme = {
  palette: {
    primary: theme.primary,
    secondary: theme.secondary,
    success: theme.success,
    error: theme.error,
    warning: theme.warning,
    info: theme.info,
    grey: theme.grey,
    background: theme.background,
    text: theme.text,
    divider: theme.divider,
  },
  typography: {
    fontFamily: 'Quicksand, sans-serif',
    h1: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
    },
    h4: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
    },
    h5: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
    },
    h6: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 700,
    },
    button: {
      fontFamily: 'Quicksand, sans-serif',
      fontWeight: 'bold',
      fontSize: '15px',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'Quicksand, sans-serif',
          fontWeight: 'bold',
          fontSize: '15px',
        },
      },
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: theme.spacing,
};

export default theme;

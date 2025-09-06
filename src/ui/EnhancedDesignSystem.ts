// Enhanced Design System with comprehensive UI/UX standardization
import { PlayerArchetypeType } from '../game/PlayerArchetype';
import { EnemyType } from '../game/EnemySystem';

// Extended Design System with all identified missing components
export const EnhancedDesignSystem = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64
  },
  
  colors: {
    // Primary colors - Medieval parchment and stone
    primary: '#f4e4bc',        // Aged parchment
    primaryDark: '#d4c4a0',    // Darker parchment
    primaryLight: '#faf0d8',   // Light parchment
    
    // Accent colors - Medieval gold and bronze
    accent: '#d4af37',         // Royal gold
    accentDark: '#b8941f',     // Dark gold
    accentLight: '#e6c547',    // Bright gold
    
    // Secondary colors - Deep medieval red
    secondary: '#8b0000',      // Dark red
    
    // Background colors - Dark stone and wood
    background: '#2c1810',     // Dark wood/stone
    backgroundDark: 'rgba(44, 24, 16, 0.9)', // Dark wood with transparency
    backgroundLight: '#3d2817', // Lighter wood
    
    // UI element colors - Iron and bronze
    border: '#5d4e37',         // Dark brown/bronze
    borderHover: '#d4af37',    // Gold on hover
    borderActive: '#e6c547',   // Bright gold when active
    
    // Status colors - Medieval themed
    success: '#228b22',        // Forest green
    warning: '#daa520',        // Goldenrod
    error: '#8b0000',          // Dark red
    info: '#4682b4',           // Steel blue
    
    // Text colors - Parchment and ink
    text: '#f4e4bc',           // Parchment text
    textMuted: '#a0906c',      // Faded ink
    textDark: '#5d4e37',       // Dark brown ink
    
    // NEW: Player Archetype colors - Medieval themed
    archetype: {
      tank: '#4682b4',        // Steel Blue (Knight)
      glassCannon: '#8b0000', // Dark Red (Mage)
      evasive: '#228b22'      // Forest Green (Rogue)
    },
    
    // NEW: Enemy type colors
    enemy: {
      tank: '#8B4513',        // Saddle Brown
      projectile: '#DC143C',  // Crimson
      speedster: '#32CD32',   // Lime Green
      boss: '#8B0000',        // Dark Red
      eliteTank: '#4B0082',   // Indigo
      sniper: '#800080',      // Purple
      swarm: '#FF8C00',       // Dark Orange
      berserker: '#B22222'    // Fire Brick
    },
    
    // NEW: XP and game element colors
    xp: {
      orb: '#FFD700',         // Gold
      orbBorder: '#FFA500',   // Orange
      orbGlow: '#FFD700'      // Gold (for glow effects)
    },
    
    // NEW: Game-specific colors
    game: {
      background: '#028af8',   // Game background
      healthGreen: '#00ff00',  // Health bar green
      healthYellow: '#ffff00', // Health bar yellow
      healthRed: '#ff0000'     // Health bar red
    }
  },
  
  borders: {
    thin: 1,
    medium: 2,
    thick: 3,
    radius: {
      sm: 5,
      md: 10,
      lg: 15,
      xl: 20
    }
  },
  
  shadows: {
    sm: '0 2px 4px rgba(0, 0, 0, 0.1)',
    md: '0 4px 8px rgba(0, 0, 0, 0.2)',
    lg: '0 8px 16px rgba(0, 0, 0, 0.3)',
    xl: '0 12px 24px rgba(0, 0, 0, 0.4)'
  },
  
  animations: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500
    },
    easing: {
      ease: 'ease',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out'
    }
  },
  
  zIndex: {
    background: 0,
    game: 10,
    ui: 100,
    modal: 1000,
    overlay: 2000
  },
  
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    title: 32,
    // NEW: Additional sizes found in codebase
    notification: 18,
    massive: 56
  },
  
  fontFamily: {
    primary: 'Cinzel, "Old English Text MT", "Blackletter", serif',
    secondary: 'Cinzel, "Times New Roman", serif',
    decorative: '"Uncial Antiqua", "Luminari", fantasy'
  }
};

// Enhanced interfaces for better type safety
interface TextStyleOptions {
  size?: keyof typeof EnhancedDesignSystem.fontSize;
  color?: string;
  stroke?: boolean;
  background?: boolean;
  fontFamily?: keyof typeof EnhancedDesignSystem.fontFamily;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
  wordWrap?: { width: number };
}

interface BackgroundStyleOptions {
  color?: number;
  alpha?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  width: number;
  height: number;
}

interface CardStyleOptions {
  width: number;
  height: number;
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  borderRadius?: number;
  alpha?: number;
  hover?: {
    borderColor?: number;
    scale?: number;
  };
}

interface ButtonStyleOptions {
  variant: 'primary' | 'secondary' | 'accent' | 'danger';
  size: 'sm' | 'md' | 'lg';
  state: 'normal' | 'hover' | 'active' | 'disabled';
  width?: number;
  height?: number;
}

export interface HealthBarOptions {
  width: number;
  height: number;
  position: { x: number; y: number };
  showBorder: boolean;
  animated: boolean;
  currentHealth: number;
  maxHealth: number;
}

export interface NotificationOptions {
  type: 'success' | 'warning' | 'error' | 'info';
  duration: number;
  position: 'top' | 'center' | 'bottom';
  animation: boolean;
  message: string;
}

// Enhanced StyleHelpers with comprehensive component support
export const EnhancedStyleHelpers = {
  // Existing text style helper (enhanced)
  createTextStyle: (options: TextStyleOptions = {}) => {
    const {
      size = 'md',
      color = EnhancedDesignSystem.colors.primary,
      stroke = false,
      background = false,
      fontFamily = 'primary',
      fontStyle = 'normal',
      align = 'left',
      wordWrap
    } = options;
    
    const style: any = {
      fontSize: EnhancedDesignSystem.fontSize[size],
      color: color,
      fontFamily: EnhancedDesignSystem.fontFamily[fontFamily],
      fontStyle: fontStyle,
      align: align
    };
    
    if (stroke) {
      style.stroke = EnhancedDesignSystem.colors.background;
      style.strokeThickness = 2;
    }
    
    if (background) {
      style.backgroundColor = EnhancedDesignSystem.colors.backgroundDark;
      style.padding = {
        x: EnhancedDesignSystem.spacing.sm,
        y: EnhancedDesignSystem.spacing.xs
      };
    }
    
    if (wordWrap) {
      style.wordWrap = wordWrap;
    }
    
    return style;
  },
  
  // Existing background helper
  createBackground: (graphics: Phaser.GameObjects.Graphics, options: BackgroundStyleOptions) => {
    const {
      color = 0x1a1a1a,
      alpha = 0.95,
      borderColor = 0xd4af37,
      borderWidth = EnhancedDesignSystem.borders.thick,
      borderRadius = EnhancedDesignSystem.borders.radius.lg,
      width,
      height
    } = options;
    
    graphics.clear();
    graphics.fillStyle(color, alpha);
    graphics.fillRoundedRect(0, 0, width, height, borderRadius);
    graphics.lineStyle(borderWidth, borderColor, 1);
    graphics.strokeRoundedRect(0, 0, width, height, borderRadius);
  },
  
  // Existing card helpers
  createCard: (graphics: Phaser.GameObjects.Graphics, options: CardStyleOptions) => {
    const {
      width,
      height,
      backgroundColor = 0x1a1a1a,
      borderColor = 0x333333,
      borderWidth = EnhancedDesignSystem.borders.medium,
      borderRadius = EnhancedDesignSystem.borders.radius.md,
      alpha = 1
    } = options;
    
    graphics.clear();
    graphics.fillStyle(backgroundColor, alpha);
    graphics.lineStyle(borderWidth, borderColor, 1);
    graphics.fillRoundedRect(-width/2, -height/2, width, height, borderRadius);
    graphics.strokeRoundedRect(-width/2, -height/2, width, height, borderRadius);
  },
  
  createHoverCard: (graphics: Phaser.GameObjects.Graphics, options: CardStyleOptions) => {
    const hoverOptions = {
      ...options,
      borderColor: options.hover?.borderColor || 0xd4af37
    };
    EnhancedStyleHelpers.createCard(graphics, hoverOptions);
  },

  createMedievalButton: (graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, isHovered: boolean = false) => {
    const bgColor = isHovered ? 0xe6c547 : 0xd4af37; // Gold, brighter on hover
    const borderColor = isHovered ? 0xb8941f : 0x5d4e37; // Dark brown border
    
    // Button background (scroll-like)
    graphics.fillStyle(bgColor, 0.9);
    graphics.fillRoundedRect(x, y, width, height, 6);
    
    // Border
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRoundedRect(x, y, width, height, 6);
    
    // Inner highlight for 3D effect
    graphics.lineStyle(1, 0xfaf0d8, 0.7);
    graphics.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 5);
    
    // Bottom shadow for depth
    graphics.lineStyle(1, 0x2c1810, 0.5);
    graphics.strokeRoundedRect(x + 1, y + height - 1, width - 2, 1, 0);
  },

  createStoneButton: (graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, isPressed: boolean = false) => {
    const bgColor = isPressed ? 0x5d4e37 : 0x8b7355; // Stone gray, darker when pressed
    const borderColor = 0x2c1810; // Dark border
    
    // Stone background
    graphics.fillStyle(bgColor, 1);
    graphics.fillRoundedRect(x, y, width, height, 4);
    
    // Carved border effect
    graphics.lineStyle(2, borderColor, 1);
    graphics.strokeRoundedRect(x, y, width, height, 4);
    
    // Highlight for carved effect
    if (!isPressed) {
      graphics.lineStyle(1, 0xa0906c, 0.8);
      graphics.strokeRoundedRect(x + 1, y + 1, width - 2, height - 2, 3);
    }
  },
  
  // NEW: Archetype-specific helpers
  archetype: {
    getColor: (type: PlayerArchetypeType): string => {
      switch (type) {
        case PlayerArchetypeType.TANK:
          return EnhancedDesignSystem.colors.archetype.tank;
        case PlayerArchetypeType.GLASS_CANNON:
          return EnhancedDesignSystem.colors.archetype.glassCannon;
        case PlayerArchetypeType.EVASIVE:
          return EnhancedDesignSystem.colors.archetype.evasive;
        default:
          return EnhancedDesignSystem.colors.primary;
      }
    },
    
    getColorHex: (type: PlayerArchetypeType): number => {
      const colorStr = EnhancedStyleHelpers.archetype.getColor(type);
      return parseInt(colorStr.replace('#', '0x'));
    },
    
    getStyle: (type: PlayerArchetypeType) => {
      return EnhancedStyleHelpers.createTextStyle({
        size: 'md',
        color: EnhancedStyleHelpers.archetype.getColor(type),
        fontFamily: 'primary',
        stroke: true
      });
    }
  },
  
  // NEW: Enemy-specific helpers
  enemy: {
    getColor: (type: EnemyType): number => {
      switch (type) {
        case EnemyType.TANK:
          return parseInt(EnhancedDesignSystem.colors.enemy.tank.replace('#', '0x'));
        case EnemyType.PROJECTILE:
          return parseInt(EnhancedDesignSystem.colors.enemy.projectile.replace('#', '0x'));
        case EnemyType.SPEEDSTER:
          return parseInt(EnhancedDesignSystem.colors.enemy.speedster.replace('#', '0x'));
        case EnemyType.BOSS:
          return parseInt(EnhancedDesignSystem.colors.enemy.boss.replace('#', '0x'));
        case EnemyType.ELITE_TANK:
          return parseInt(EnhancedDesignSystem.colors.enemy.eliteTank.replace('#', '0x'));
        case EnemyType.SNIPER:
          return parseInt(EnhancedDesignSystem.colors.enemy.sniper.replace('#', '0x'));
        case EnemyType.SWARM:
          return parseInt(EnhancedDesignSystem.colors.enemy.swarm.replace('#', '0x'));
        case EnemyType.BERSERKER:
          return parseInt(EnhancedDesignSystem.colors.enemy.berserker.replace('#', '0x'));
        default:
          return 0x666666;
      }
    },
    
    getHealthBarColor: (healthPercent: number): number => {
      if (healthPercent > 0.6) {
        return parseInt(EnhancedDesignSystem.colors.game.healthGreen.replace('#', '0x'));
      } else if (healthPercent > 0.3) {
        return parseInt(EnhancedDesignSystem.colors.game.healthYellow.replace('#', '0x'));
      } else {
        return parseInt(EnhancedDesignSystem.colors.game.healthRed.replace('#', '0x'));
      }
    }
  },
  
  // NEW: XP Orb helpers
  xp: {
    getOrbColor: (): number => {
      return parseInt(EnhancedDesignSystem.colors.xp.orb.replace('#', '0x'));
    },
    
    getOrbBorderColor: (): number => {
      return parseInt(EnhancedDesignSystem.colors.xp.orbBorder.replace('#', '0x'));
    },
    
    getOrbStyle: () => {
      return EnhancedStyleHelpers.createTextStyle({
        size: 'md',
        color: EnhancedDesignSystem.colors.xp.orb,
        fontFamily: 'primary',
        fontStyle: 'bold'
      });
    }
  },
  
  // NEW: Medieval Button component system
  button: {
    create: (graphics: Phaser.GameObjects.Graphics, options: ButtonStyleOptions) => {
      const sizes = {
        sm: { width: 100, height: 32 },
        md: { width: 160, height: 50 },
        lg: { width: 200, height: 60 }
      };
      
      const size = sizes[options.size];
      const width = options.width || size.width;
      const height = options.height || size.height;
      
      // Use medieval button styling based on variant and state
      if (options.variant === 'primary' || options.variant === 'accent') {
        // Gold scroll-like buttons
        const isHovered = options.state === 'hover';
        const isPressed = options.state === 'active';
        
        if (isPressed) {
          // Pressed state - darker gold
          graphics.fillStyle(0xb8941f, 0.9);
          graphics.fillRoundedRect(0, 0, width, height, 6);
          graphics.lineStyle(2, 0x5d4e37, 1);
          graphics.strokeRoundedRect(0, 0, width, height, 6);
        } else {
          // Use existing medieval button helper
          EnhancedStyleHelpers.createMedievalButton(graphics, 0, 0, width, height, isHovered);
        }
      } else if (options.variant === 'secondary' || options.variant === 'danger') {
        // Stone tablet buttons
        const isPressed = options.state === 'active' || options.state === 'hover';
        EnhancedStyleHelpers.createStoneButton(graphics, 0, 0, width, height, isPressed);
      }
      
      // Handle disabled state
      if (options.state === 'disabled') {
        graphics.fillStyle(0x666666, 0.5);
        graphics.fillRoundedRect(0, 0, width, height, 4);
        graphics.lineStyle(1, 0x444444, 1);
        graphics.strokeRoundedRect(0, 0, width, height, 4);
      }
    }
  },
  
  // NEW: Notification system
  notification: {
    success: (message: string) => ({
      style: EnhancedStyleHelpers.createTextStyle({
        size: 'notification' as keyof typeof EnhancedDesignSystem.fontSize,
        color: EnhancedDesignSystem.colors.success,
        fontFamily: 'primary',
        background: true
      }),
      message
    }),
    
    warning: (message: string) => ({
      style: EnhancedStyleHelpers.createTextStyle({
        size: 'notification' as keyof typeof EnhancedDesignSystem.fontSize,
        color: EnhancedDesignSystem.colors.warning,
        fontFamily: 'primary',
        background: true
      }),
      message
    }),
    
    error: (message: string) => ({
      style: EnhancedStyleHelpers.createTextStyle({
        size: 'notification' as keyof typeof EnhancedDesignSystem.fontSize,
        color: EnhancedDesignSystem.colors.error,
        fontFamily: 'primary',
        background: true
      }),
      message
    }),
    
    info: (message: string) => ({
      style: EnhancedStyleHelpers.createTextStyle({
        size: 'notification' as keyof typeof EnhancedDesignSystem.fontSize,
        color: EnhancedDesignSystem.colors.info,
        fontFamily: 'primary',
        background: true
      }),
      message
    })
  },
  
  // Enhanced common text styles
  titleStyle: () => EnhancedStyleHelpers.createTextStyle({
    size: 'massive' as keyof typeof EnhancedDesignSystem.fontSize,
    color: EnhancedDesignSystem.colors.accent,
    fontFamily: 'primary',
    stroke: true
  }),
  
  subtitleStyle: () => EnhancedStyleHelpers.createTextStyle({
    size: 'xl',
    color: EnhancedDesignSystem.colors.accent,
    fontFamily: 'primary'
  }),
  
  bodyStyle: () => EnhancedStyleHelpers.createTextStyle({
    size: 'sm',
    color: EnhancedDesignSystem.colors.text,
    fontFamily: 'primary'
  }),
  
  metricStyle: () => EnhancedStyleHelpers.createTextStyle({
    size: 'sm',
    color: EnhancedDesignSystem.colors.accentDark,
    fontFamily: 'primary',
    stroke: true
  }),
  
  gameOverStyle: () => EnhancedStyleHelpers.createTextStyle({
    size: 'title',
    color: EnhancedDesignSystem.colors.primary,
    fontFamily: 'primary',
    stroke: true,
    background: true,
    align: 'center'
  })
};

// Export both for backward compatibility and new enhanced version
export { EnhancedDesignSystem as DesignSystem, EnhancedStyleHelpers as StyleHelpers };
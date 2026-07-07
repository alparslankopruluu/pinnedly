declare module 'lucide-react-native/dist/esm/icons/*.js' {
  import type { ComponentType } from 'react';
  import type { SvgProps } from 'react-native-svg';

  type LucideIconProps = SvgProps & {
    size?: number;
    color?: string;
    strokeWidth?: number;
    absoluteStrokeWidth?: boolean;
  };

  const Icon: ComponentType<LucideIconProps>;
  export default Icon;
}

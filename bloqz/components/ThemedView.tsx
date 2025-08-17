import React from 'react';
import { View, Text, type ViewProps } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  noBackground?: boolean; // Add option to disable background color
};

// Define a type for React element props that may contain children
type PropsWithChildren = { children?: React.ReactNode } & Record<string, any>;

// Helper function to recursively wrap text nodes
const wrapTextNodes = (children: React.ReactNode): React.ReactNode => {
  if (children === null || children === undefined) {
    return null;
  }
  
  if (typeof children === 'string' || typeof children === 'number') {
    return <Text>{children}</Text>;
  }
  
  if (Array.isArray(children)) {
    return children.map((child, index) => (
      <React.Fragment key={index}>{wrapTextNodes(child)}</React.Fragment>
    ));
  }
  
  if (React.isValidElement(children)) {
    // Cast to PropsWithChildren to help TypeScript understand the structure
    const props = children.props as PropsWithChildren;
    
    // If it's already a Text component or has no children, return as is
    if (children.type === Text || !props || !props.children) {
      return children;
    }
    
    // Otherwise, recursively wrap its children
    return React.cloneElement(
      children,
      props,
      wrapTextNodes(props.children)
    );
  }
  
  return children;
};

export function ThemedView({ style, lightColor, darkColor, noBackground, children, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');
  
  return (
    <View style={[noBackground ? {} : { backgroundColor }, style]} {...otherProps}>
      {wrapTextNodes(children)}
    </View>
  );
}

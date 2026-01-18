'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

// ============================================================================
// TYPES
// ============================================================================

type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: ContainerSize;
  center?: boolean;
  padding?: boolean;
}

interface PageLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
}

// ============================================================================
// CONTAINER
// ============================================================================

const containerSizes: Record<ContainerSize, string> = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-7xl',
};

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      size = 'lg',
      center = true,
      padding = true,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          ${containerSizes[size]}
          ${center ? 'mx-auto' : ''}
          ${padding ? 'px-4 sm:px-6 lg:px-8' : ''}
          ${className}
        `.trim().replace(/\s+/g, ' ')}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Container.displayName = 'Container';

// ============================================================================
// PAGE LAYOUT
// ============================================================================

export const PageLayout = ({
  children,
  sidebar,
  header,
  footer,
  className = '',
}: PageLayoutProps) => {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      {/* Header */}
      {header}

      {/* Main content area */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebar && (
          <aside className="hidden lg:flex lg:flex-shrink-0">
            {sidebar}
          </aside>
        )}

        {/* Content */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>
      </div>

      {/* Footer */}
      {footer}
    </div>
  );
};

// ============================================================================
// SECTION
// ============================================================================

interface SectionProps extends HTMLAttributes<HTMLElement> {
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
}

const sectionSpacing = {
  sm: 'py-8',
  md: 'py-12',
  lg: 'py-16',
  xl: 'py-24',
};

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ spacing = 'md', className = '', children, ...props }, ref) => {
    return (
      <section
        ref={ref}
        className={`${sectionSpacing[spacing]} ${className}`}
        {...props}
      >
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';

// ============================================================================
// CONTENT LAYOUT (Sidebar + Main)
// ============================================================================

interface ContentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  sidebarPosition?: 'left' | 'right';
  className?: string;
}

export const ContentLayout = ({
  children,
  sidebar,
  sidebarPosition = 'left',
  className = '',
}: ContentLayoutProps) => {
  return (
    <div
      className={`
        flex flex-col lg:flex-row gap-8 lg:gap-12
        ${sidebarPosition === 'right' ? 'lg:flex-row-reverse' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {sidebar && (
        <div className="lg:w-64 flex-shrink-0">
          {sidebar}
        </div>
      )}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

// ============================================================================
// FOOTER
// ============================================================================

interface FooterProps {
  className?: string;
}

export const Footer = ({ className = '' }: FooterProps) => {
  return (
    <footer
      className={`
        border-t border-slate-200 dark:border-slate-800
        bg-slate-50/50 dark:bg-slate-900/50
        ${className}
      `}
    >
      <Container size="xl" className="py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Built to demonstrate honest AI assessment capabilities.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 dark:text-slate-500">
              Powered by Claude Sonnet 4 via Vercel AI SDK
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Container;

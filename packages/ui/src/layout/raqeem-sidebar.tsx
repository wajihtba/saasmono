'use client';

import * as React from 'react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGroup, motion } from 'framer-motion';
import { useId, forwardRef } from 'react';
import clsx from 'clsx';
import {
  Search,
  UserPlus,
  Settings,
  ChevronsUpDown,
  LogOut,
  Scale,
  UserX,
  Upload,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import Image from 'next/image';

// Basic sidebar structure components
export function RaqeemSidebar({ className, ...props }: React.ComponentPropsWithoutRef<'nav'>) {
  return <nav {...props} className={clsx(className, 'flex h-full min-h-0 flex-col')} />;
}

export function SidebarHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'flex flex-col border-b border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5'
      )}
    />
  );
}

export function SidebarBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'flex flex-1 flex-col overflow-y-auto p-4 [&>[data-slot=section]+[data-slot=section]]:mt-8'
      )}
    />
  );
}

export function SidebarFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        'flex flex-col border-t border-zinc-950/5 p-4 dark:border-white/5 [&>[data-slot=section]+[data-slot=section]]:mt-2.5'
      )}
    />
  );
}

export function SidebarSection({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const id = useId();

  return (
    <LayoutGroup id={id}>
      <div {...props} data-slot='section' className={clsx(className, 'flex flex-col gap-0.5')} />
    </LayoutGroup>
  );
}

export function SidebarDivider({ className, ...props }: React.ComponentPropsWithoutRef<'hr'>) {
  return (
    <hr
      {...props}
      className={clsx(className, 'my-4 border-t border-zinc-950/5 lg:-mx-4 dark:border-white/5')}
    />
  );
}

export function SidebarSpacer({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div aria-hidden='true' {...props} className={clsx(className, 'mt-8 flex-1')} />;
}

export function SidebarHeading({ className, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
  return (
    <h3
      {...props}
      className={clsx(
        className,
        'mb-1 px-2 text-xs/6 font-medium text-zinc-500 dark:text-zinc-400'
      )}
    />
  );
}

export const SidebarItem = forwardRef(function SidebarItem(
  {
    current,
    className,
    children,
    ...props
  }: { current?: boolean; className?: string; children: React.ReactNode } & (
    | ({ href: string } & React.ComponentProps<typeof Link>)
    | ({ onClick: () => void } & React.ComponentProps<'button'>)
  ),
  ref: React.ForwardedRef<HTMLAnchorElement | HTMLButtonElement>
) {
  const classes = clsx(
    // Base
    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-all duration-200 ease-in-out',
    // Leading icon/icon-only
    '*:data-[slot=icon]:size-5 *:data-[slot=icon]:shrink-0 *:data-[slot=icon]:stroke-2',
    // Trailing icon (down chevron or similar)
    '*:last:data-[slot=icon]:ml-auto *:last:data-[slot=icon]:size-4',
    // Avatar
    '*:data-[slot=avatar]:-m-0.5 *:data-[slot=avatar]:size-6',
    // Default state
    '*:data-[slot=icon]:text-muted-foreground',
    // Hover
    'hover:bg-accent hover:text-accent-foreground hover:*:data-[slot=icon]:text-accent-foreground',
    // Current/Active state
    current ? ['text-primary', '*:data-[slot=icon]:text-primary'] : '',
    // Focus states
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
  );

  return (
    <span className={clsx(className, 'relative')}>
      {current && (
        <motion.span
          layoutId='current-indicator'
          className='absolute inset-y-2 -left-4 w-1 rounded-full bg-primary dark:bg-primary'
        />
      )}
      {'href' in props ? (
        <Link
          {...props}
          className={classes}
          data-current={current ? 'true' : undefined}
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
        >
          {children}
        </Link>
      ) : (
        <button
          {...(props as React.ComponentProps<'button'>)}
          className={classes}
          data-current={current ? 'true' : undefined}
          ref={ref as React.ForwardedRef<HTMLButtonElement>}
        >
          {children}
        </button>
      )}
    </span>
  );
});

export function SidebarLabel({ className, ...props }: React.ComponentPropsWithoutRef<'span'>) {
  return <span {...props} className={clsx(className, 'truncate')} />;
}

// Helper component to wrap SidebarItem with tooltip when collapsed
function SidebarItemWithTooltip({
  isCollapsed,
  tooltipText,
  children,
  ...props
}: {
  isCollapsed: boolean;
  tooltipText: string;
  children: React.ReactNode;
} & React.ComponentProps<typeof SidebarItem>) {
  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarItem {...props}>{children}</SidebarItem>
        </TooltipTrigger>
        <TooltipContent side='right' sideOffset={8}>
          {tooltipText}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <SidebarItem {...props}>{children}</SidebarItem>;
}

// Navigation item type
export interface NavigationItem {
  title: string;
  icon: React.ComponentType<{ className?: string; 'data-slot'?: string }>;
  href: string;
}

// Props for the main sidebar component
export interface RaqeemDashboardSidebarProps {
  isCollapsed?: boolean;
  navigationItems: NavigationItem[];
  user?: {
    name?: string;
    email?: string;
    image?: string;
  };
  onSignOut?: () => void;
  onNewClient?: () => void;
  onNewCase?: () => void;
  onNewOpponent?: () => void;
  onSearch?: () => void;
}

export function RaqeemDashboardSidebar({
  isCollapsed = false,
  navigationItems,
  user,
  onSignOut,
  onNewClient,
  onNewCase,
  onNewOpponent,
  onSearch
}: RaqeemDashboardSidebarProps) {
  const pathname = usePathname();

  const getInitials = (name: string) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (href: string) => {
    const basePath = `/dashboard`;
    if (href === '') {
      return pathname === basePath;
    }
    return pathname.startsWith(basePath + href);
  };

  return (
    <RaqeemSidebar className={`bg-zinc-100 dark:bg-zinc-950 ${isCollapsed ? 'w-16' : 'w-64'}`}>
      <SidebarHeader>
        <SidebarSection>
          {!isCollapsed && (
            <>
              <div className='flex flex-col items-start flex-1 min-w-0'>
                <SidebarLabel className='font-semibold'>
                  <Image src='/raqeem-logo.svg' alt='Logo' width={100} height={48} />
                </SidebarLabel>
              </div>
            </>
          )}
          {isCollapsed && (
            <>
              <div className='flex flex-col items-start flex-1 min-w-0'>
                <SidebarLabel className='font-semibold'>
                  <Image src='/raqeem-icon.svg' alt='Logo' width={70} height={70} />
                </SidebarLabel>
              </div>
            </>
          )}
        </SidebarSection>
      </SidebarHeader>

      <SidebarBody>
        <SidebarSection>
          {!isCollapsed && <SidebarHeading>التنقل</SidebarHeading>}
          {navigationItems.map(item => (
            <SidebarItemWithTooltip
              key={item.title}
              href={`/dashboard${item.href}` as Route}
              current={isActive(item.href)}
              className={isCollapsed ? 'justify-center' : ''}
              isCollapsed={isCollapsed}
              tooltipText={item.title}
            >
              <item.icon data-slot='icon' />
              {!isCollapsed && <SidebarLabel>{item.title}</SidebarLabel>}
            </SidebarItemWithTooltip>
          ))}
        </SidebarSection>

        <SidebarDivider />

        <SidebarSection>
          {!isCollapsed && <SidebarHeading>إجراءات سريعة</SidebarHeading>}
          {onNewClient && (
            <SidebarItemWithTooltip
              onClick={onNewClient}
              className={isCollapsed ? 'justify-center' : ''}
              isCollapsed={isCollapsed}
              tooltipText='عميل جديد'
            >
              <UserPlus data-slot='icon' />
              {!isCollapsed && <SidebarLabel>عميل جديد</SidebarLabel>}
            </SidebarItemWithTooltip>
          )}
          {onNewCase && (
            <SidebarItemWithTooltip
              onClick={onNewCase}
              className={isCollapsed ? 'justify-center' : ''}
              isCollapsed={isCollapsed}
              tooltipText='قضية جديدة'
            >
              <Scale data-slot='icon' />
              {!isCollapsed && <SidebarLabel>قضية جديدة</SidebarLabel>}
            </SidebarItemWithTooltip>
          )}
          {onNewOpponent && (
            <SidebarItemWithTooltip
              onClick={onNewOpponent}
              className={isCollapsed ? 'justify-center' : ''}
              isCollapsed={isCollapsed}
              tooltipText='خصم جديد'
            >
              <UserX data-slot='icon' />
              {!isCollapsed && <SidebarLabel>خصم جديد</SidebarLabel>}
            </SidebarItemWithTooltip>
          )}
          <SidebarItemWithTooltip
            href={'/dashboard/documents/upload' as Route}
            className={isCollapsed ? 'justify-center' : ''}
            isCollapsed={isCollapsed}
            tooltipText='رفع وثيقة'
          >
            <Upload data-slot='icon' />
            {!isCollapsed && <SidebarLabel>رفع وثيقة</SidebarLabel>}
          </SidebarItemWithTooltip>
          {onSearch && (
            <SidebarItemWithTooltip
              onClick={onSearch}
              className={isCollapsed ? 'justify-center' : ''}
              isCollapsed={isCollapsed}
              tooltipText='البحث'
            >
              <Search data-slot='icon' />
              {!isCollapsed && <SidebarLabel>البحث</SidebarLabel>}
            </SidebarItemWithTooltip>
          )}
        </SidebarSection>

        <SidebarSpacer />
      </SidebarBody>

      <SidebarFooter>
        <SidebarSection>
          {/* Theme Switcher */}
          <div className={`flex ${isCollapsed ? 'justify-center' : 'justify-start'} mb-3`}></div>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant='ghost' className='w-full justify-start p-0 h-auto font-medium'>
                  <div
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-foreground transition-all duration-200 ease-in-out hover:bg-accent hover:text-accent-foreground border-2 border-transparent ${isCollapsed ? 'justify-center' : ''}`}
                  >
                    <Avatar data-slot='avatar' className='h-6 w-6'>
                      <AvatarImage
                        src={user.image || ''}
                        alt={user.name || user.email}
                      />
                      <AvatarFallback className='text-xs'>
                        {getInitials(user.name || user.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <>
                        <div className='flex flex-col items-start flex-1 min-w-0'>
                          <SidebarLabel className='font-semibold'>
                            {user.name || 'User'}
                          </SidebarLabel>
                          <SidebarLabel className='text-xs text-muted-foreground'>
                            {user.email}
                          </SidebarLabel>
                        </div>
                        <ChevronsUpDown className='h-4 w-4 shrink-0 opacity-50' />
                      </>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-56'>
                <DropdownMenuLabel>الحساب</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={'/dashboard/settings' as Route}>
                    <Settings className='ml-2 h-4 w-4' />
                    إعدادات الحساب
                  </Link>
                </DropdownMenuItem>
                {onSignOut && (
                  <DropdownMenuItem asChild>
                    <Button variant='ghost' onClick={onSignOut}>
                      <LogOut className='ml-2 h-4 w-4' />
                      تسجيل الخروج
                    </Button>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </SidebarSection>
      </SidebarFooter>
    </RaqeemSidebar>
  );
}
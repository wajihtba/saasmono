"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../components/ui/drawer";
import { MoreHorizontal, X } from "lucide-react";
import { cn } from "../lib/utils";

export interface MobileNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

export interface QuickAction {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  action: string;
  color: string;
}

export interface DrawerItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}
/** A titled group of links in the drawer. */
export interface DrawerGroup {
  category: string;
  items: Array<DrawerItem>;
}

/** The drawer takes either a group of links or a single link. */
export type DrawerCategory = DrawerGroup | DrawerItem;

export const isDrawerGroup = (entry: DrawerCategory): entry is DrawerGroup =>
  "items" in entry;

export interface NotificationInfo {
  count?: number;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export interface MobileNavProps {
  /**
   * Main navigation items shown in the bottom bar
   */
  mainNavItems: MobileNavItem[];

  /**
   * Quick actions shown in the drawer
   */
  quickActions?: QuickAction[];

  /**
   * Drawer categories and items
   */
  drawerItems?: DrawerCategory[];

  /**
   * Base path prefix (e.g., '/dashboard')
   */
  basePath?: string;

  /**
   * Function to check if a route is active
   */
  isActiveRoute?: (href: string, pathname: string) => boolean;

  /**
   * Handler for quick actions
   */
  onQuickAction?: (action: string) => void;

  /**
   * Notification info
   */
  notifications?: NotificationInfo;

  /**
   * Logout handler
   */
  onLogout?: () => void;

  /**
   * Custom footer actions
   */
  footerActions?: React.ReactNode;

  /**
   * Custom drawer content
   */
  customDrawerContent?: React.ReactNode;

  /**
   * More button text
   */
  moreButtonText?: string;

  /**
   * Drawer title and description
   */
  drawerTitle?: string;
  drawerDescription?: string;

  /**
   * Quick actions section title
   */
  quickActionsTitle?: string;

  /**
   * How many items the bottom bar shows before the rest move into the drawer
   */
  maxMainItems?: number;

  /**
   * Heading for the overflow items inside the drawer
   */
  overflowTitle?: string;
}

// Written out so Tailwind can see the class names.
const GRID_COLS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};

function ItemNav({
  item,
  basePath,
  active,
  handleNavigation,
  isOutlined,
}: any) {
  return (
    <a
      key={item.href}
      href={item.href ? `${basePath}/${item.href}` : basePath}
      onClick={() => handleNavigation(item.href)}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
        active
          ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
          : "hover:bg-gray-50 text-gray-700 hover:shadow-sm",
        isOutlined ? "border border-gray-200" : "",
      )}
    >
      <div
        className={cn(
          "p-2.5 rounded-lg transition-all duration-200",
          active
            ? "bg-primary text-white shadow-md"
            : "bg-gray-100 group-hover:bg-gray-200",
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5",
            active ? "text-white" : "text-gray-600"
          )}
        />
      </div>
      <div className="flex-1">
        <div className={cn(
          "text-base font-semibold",
          active ? "text-primary" : "text-gray-900"
        )}>
          {item.title}
        </div>
        {item.description && (
          <div className="text-xs text-gray-500 leading-tight mt-0.5">
            {item.description}
          </div>
        )}
      </div>
      {active && (
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <div className="w-2 h-2 bg-primary rounded-full"></div>
        </div>
      )}
    </a>
  );
}
export function MobileNav({
  mainNavItems,
  quickActions = [],
  drawerItems = [],
  basePath = "",
  isActiveRoute,
  onQuickAction,
  notifications,
  onLogout,
  footerActions,
  customDrawerContent,
  moreButtonText = "المزيد",
  drawerTitle = "القائمة الرئيسية",
  drawerDescription = "الوصول السريع لجميع الميزات والإعدادات",
  quickActionsTitle = "إجراءات سريعة",
  maxMainItems = 4,
  overflowTitle = "بقية الأقسام",
}: MobileNavProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // The bar only ever holds maxMainItems + the "more" button; anything past that
  // moves into the drawer instead of wrapping onto a second row.
  const barNavItems = mainNavItems.slice(0, maxMainItems);
  const overflowNavItems = mainNavItems.slice(maxMainItems);

  const defaultIsActive = (href: string) => {
    const fullPath = href ? `${basePath}/${href}` : basePath;

    if (href === "") {
      return pathname === basePath;
    }
    return pathname.startsWith(fullPath);
  };

  const checkIsActive = isActiveRoute || defaultIsActive;

  const handleQuickAction = (action: string) => {
    setDrawerOpen(false);
    onQuickAction?.(action);
  };

  const handleNavigation = (href: string) => {
    // Navigation is handled by Link components in the implementation
    setDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden pb-3">
        <div
          className={cn(
            "grid h-16",
            GRID_COLS[barNavItems.length + 1] ?? "grid-cols-5",
          )}
        >
          {/* Main Navigation Items */}
          {barNavItems.map((item) => {
            const active = checkIsActive(item.href, pathname);
            const ItemComponent = ({
              children,
              ...props
            }: {
              children: React.ReactNode;
              [key: string]: any;
            }) => (
              <a
                {...props}
                href={item.href ? `${basePath}/${item.href}` : basePath}
                className={cn(
                  "flex flex-col items-center justify-center py-2 px-1 transition-colors relative",
                  active ? "text-primary" : "text-gray-500 hover:text-gray-700",
                )}
              >
                {children}
              </a>
            );

            return (
              <ItemComponent key={item.href}>
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    active ? item.bgColor : "hover:bg-gray-100",
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-5 w-5",
                      active ? item.color : "text-current",
                    )}
                  />
                </div>
                <span className="w-full truncate px-0.5 text-center text-[11px] font-medium mt-0.5 leading-none">
                  {item.title}
                </span>
                {active && (
                  <div className="absolute -top-0.5 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full"></div>
                )}
              </ItemComponent>
            );
          })}

          {/* More Button with Drawer */}
          {(quickActions.length > 0 ||
            drawerItems.length > 0 ||
            overflowNavItems.length > 0 ||
            customDrawerContent) && (
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <button className="flex flex-col items-center justify-center py-2 px-1 text-gray-500 hover:text-gray-700 transition-colors">
                  <div className="p-1.5 rounded-lg hover:bg-gray-100">
                    <MoreHorizontal className="h-5 w-5" />
                  </div>
                  <span className="w-full truncate px-0.5 text-center text-[11px] font-medium mt-0.5 leading-none">
                    {moreButtonText}
                  </span>
                </button>
              </DrawerTrigger>

              <DrawerContent className="max-h-[85vh]" dir="rtl">
                <DrawerHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <DrawerTitle>{drawerTitle}</DrawerTitle>
                      <DrawerDescription>{drawerDescription}</DrawerDescription>
                    </div>
                    <DrawerClose asChild>
                      <Button variant="ghost" size="sm">
                        <X className="h-4 w-4" />
                      </Button>
                    </DrawerClose>
                  </div>
                </DrawerHeader>

                <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
                  {customDrawerContent || (
                    <>
                      {/* Quick Actions */}
                      {quickActions.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {quickActionsTitle}
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            {quickActions.map((action) => (
                              <button
                                key={action.action}
                                className={cn(
                                  "flex items-center gap-2.5 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 hover:shadow-sm",
                                )}
                                onClick={() => handleQuickAction(action.action)}
                              >
                                <div className={cn(
                                  "p-2 rounded-lg",
                                  action.color
                                )}>
                                  <action.icon className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold text-gray-900 flex-1 text-right">
                                  {action.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Nav items that did not fit in the bottom bar */}
                      {overflowNavItems.length > 0 && (
                        <div className="mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">
                            {overflowTitle}
                          </h3>
                          <div className="space-y-2">
                            {overflowNavItems.map((item) => (
                              <ItemNav
                                key={item.href}
                                item={item}
                                basePath={basePath}
                                active={checkIsActive(item.href, pathname)}
                                handleNavigation={handleNavigation}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Navigation Categories */}
                      {drawerItems.map((entry) =>
                        isDrawerGroup(entry) ? (
                          <div key={entry.category}>
                            <h3 className="text-sm font-semibold text-gray-900 mb-3">
                              {entry.category}
                            </h3>
                            <div className="space-y-2">
                              {entry.items.map((item) => (
                                <ItemNav
                                  key={item.href}
                                  item={item}
                                  basePath={basePath}
                                  active={checkIsActive(item.href, pathname)}
                                  handleNavigation={handleNavigation}
                                />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div key={entry.href}>
                            <ItemNav
                              item={entry}
                              basePath={basePath}
                              active={checkIsActive(entry.href, pathname)}
                              handleNavigation={handleNavigation}
                              isOutlined
                            />
                          </div>
                        ),
                      )}
                    </>
                  )}
                </div>

                {(footerActions || onLogout) && (
                  <DrawerFooter className="border-t bg-gray-50/50 p-4">
                    {footerActions || (
                      <div className="w-full">
                        {onLogout && (
                          <button
                            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 font-semibold transition-all duration-200 hover:shadow-sm"
                            onClick={onLogout}
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                              />
                            </svg>
                            تسجيل الخروج
                          </button>
                        )}
                      </div>
                    )}
                  </DrawerFooter>
                )}
              </DrawerContent>
            </Drawer>
          )}
        </div>
      </div>

      {/* Bottom padding for content to avoid bottom nav overlap (bar + its pb-3) */}
      <div className="h-[76px] lg:hidden" />
    </>
  );
}

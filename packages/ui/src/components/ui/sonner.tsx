"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";
import { useEffect, useState } from "react";

type ToasterComponentProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterComponentProps) => {
  const { theme = "system" } = useTheme();

  // next-themes only knows the real theme after it has read localStorage on the
  // client, so rendering `theme` during SSR produces markup that never matches
  // the client and fails hydration. Render the neutral "system" theme until
  // mounted, then switch to the resolved one.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <Sonner
      theme={(mounted ? theme : "system") as ToasterComponentProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

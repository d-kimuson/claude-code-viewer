"use client";

import type { FC, ReactNode } from "react";

interface SessionLayoutProps {
  children: ReactNode;
}

const SessionLayout: FC<SessionLayoutProps> = ({ children }) => {
  return (
    <div className="flex h-screen max-h-screen overflow-hidden">{children}</div>
  );
};

export default SessionLayout;

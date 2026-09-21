"use client"

import { motion } from "framer-motion"
import { ReactNode } from "react"

interface SidebarTransitionProps {
  children: ReactNode
  isCollapsed: boolean
}

export function SidebarTransition({ children, isCollapsed }: SidebarTransitionProps) {
  return (
    <motion.aside
      initial={{ width: 256 }}
      animate={{ width: isCollapsed ? 64 : 256 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col text-white"
    >
      {children}
    </motion.aside>
  )
}

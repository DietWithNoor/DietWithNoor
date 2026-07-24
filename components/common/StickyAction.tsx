"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function StickyAction({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-20 left-1/2 z-30 -translate-x-1/2"
    >
      <Button size="lg" onClick={onClick} className="shadow-lg rounded-full px-6">
        <Plus className="h-5 w-5" />
        {label}
      </Button>
    </motion.div>
  );
}

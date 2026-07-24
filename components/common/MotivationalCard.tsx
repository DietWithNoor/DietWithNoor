"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";

const QUOTES = [
  "Small steps every day lead to big changes.",
  "Consistency beats intensity — show up today.",
  "Your only competition is who you were yesterday.",
  "Progress, not perfection.",
  "Every glass of water is a vote for your future self.",
  "Rest is part of the process, not a break from it.",
  "You didn't come this far to only come this far.",
];

export function MotivationalCard() {
  const quote = useMemo(() => QUOTES[new Date().getDate() % QUOTES.length], []);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
      <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-0">
        <CardContent className="p-5">
          <p className="text-sm font-medium italic text-foreground/80">&ldquo;{quote}&rdquo;</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

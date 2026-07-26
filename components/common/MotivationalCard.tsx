"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
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
      <Card className="border-0 bg-gradient-to-br from-secondary to-accent-soft shadow-xs">
        <CardContent className="flex items-start gap-3.5 p-5">
          <Quote className="mt-0.5 h-5 w-5 shrink-0 text-primary/50" strokeWidth={2} />
          <p className="text-[15px] font-medium leading-relaxed text-secondary-foreground">{quote}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

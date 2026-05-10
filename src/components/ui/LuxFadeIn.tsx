import { motion } from "framer-motion";
import { ReactNode } from "react";

interface LuxFadeInProps {
  children: ReactNode;
  delay?: number;
  disableAnimation?: boolean;
}

export const LuxFadeIn = ({ children, delay = 0, disableAnimation = false }: LuxFadeInProps) => {
  if (disableAnimation) {
    return <div>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.9,
        ease: "easeOut",
        delay: delay,
      }}
      viewport={{ once: true, margin: "-10% 0px" }}
    >
      {children}
    </motion.div>
  );
};

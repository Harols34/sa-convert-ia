
import React from "react";

export default function Footer() {
  return (
    <footer className="py-6 border-t bg-background">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
        <p className="text-sm text-muted-foreground text-center md:text-left">
          &copy; {new Date().getFullYear()} Convertia. Todos los derechos reservados.
        </p>
        <div className="flex items-center gap-4">
          <p className="text-xs text-muted-foreground">
            Versión 1.0.0
          </p>
        </div>
      </div>
    </footer>
  );
}

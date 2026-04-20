import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      <AlertTriangle className="w-16 h-16 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-2">404 - Terminal Error</h1>
      <p className="text-muted-foreground text-lg mb-8 max-w-md">
        The data endpoint you are trying to access does not exist in this sector.
      </p>
      <Link href="/">
        <button className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all">
          Return to Dashboard
        </button>
      </Link>
    </div>
  );
}

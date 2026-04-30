import { Suspense } from "react";
import App from "../src/App";
import AuthGate from "../src/components/AuthGate";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <AuthGate>
        <App />
      </AuthGate>
    </Suspense>
  );
}

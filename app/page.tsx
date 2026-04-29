import { Suspense } from "react";
import App from "../src/App";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}

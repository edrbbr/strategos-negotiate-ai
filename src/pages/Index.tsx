import { useState } from "react";
import NotFound from "./NotFound";

const Index = () => {
  // Redirect users to landing page
  if (typeof window !== "undefined") {
    window.location.replace("/landing");
  }
  return null;
};

export default Index;

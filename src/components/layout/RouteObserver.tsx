
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * RouteObserver component for tracking route changes
 * This is used in App.tsx to monitor and react to route changes
 */
export default function RouteObserver() {
  const location = useLocation();

  useEffect(() => {
    // Log navigation for tracking purposes
    console.log(`Navigation to: ${location.pathname}`);
    
    // Scroll to top on route change
    window.scrollTo(0, 0);
    
    // Send analytics event (can be extended later)
    const sendPageView = () => {
      // This can be integrated with an analytics service later
      console.log(`Page view: ${location.pathname}`);
    };

    sendPageView();
  }, [location]);

  // This component doesn't render anything
  return null;
}

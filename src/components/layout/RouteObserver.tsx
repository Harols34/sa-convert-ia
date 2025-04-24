
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function RouteObserver() {
  const location = useLocation();

  useEffect(() => {
    // Save current path to localStorage for possible redirection after login
    const currentPath = location.pathname;
    
    if (currentPath !== '/login' && 
        currentPath !== '/register' && 
        !currentPath.includes('reset-password') && 
        currentPath !== '/'
    ) {
      console.log(`Route changed to: ${currentPath}, saving path`);
    }
    
    // Send page view event for analytics (if implemented)
    console.log(`Page viewed: ${currentPath}`);
    
    // Update the document title based on the route
    const pageName = currentPath.split('/').pop()?.replace('-', ' ') || 'Home';
    document.title = `ConvertIA | ${pageName.charAt(0).toUpperCase() + pageName.slice(1)}`;
    
  }, [location.pathname]);

  // This component doesn't render anything
  return null;
}

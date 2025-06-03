
import React, { createContext, useContext, useState, useEffect } from "react";
import { Organization } from "@/lib/types";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useAuth } from "@/context/AuthContext";

interface OrganizationContextType {
  currentOrganization: Organization | null;
  isLoadingOrganization: boolean;
  setCurrentOrganization: (org: Organization | null) => void;
  refreshOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
};

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [isLoadingOrganization, setIsLoadingOrganization] = useState(true);
  const { getUserOrganization } = useOrganizations();
  const { user } = useAuth();

  const refreshOrganization = async () => {
    if (!user) {
      setCurrentOrganization(null);
      setIsLoadingOrganization(false);
      return;
    }

    try {
      setIsLoadingOrganization(true);
      const organization = await getUserOrganization();
      setCurrentOrganization(organization);
    } catch (error) {
      console.error("Error loading organization:", error);
      setCurrentOrganization(null);
    } finally {
      setIsLoadingOrganization(false);
    }
  };

  useEffect(() => {
    if (user) {
      refreshOrganization();
    } else {
      setCurrentOrganization(null);
      setIsLoadingOrganization(false);
    }
  }, [user]);

  return (
    <OrganizationContext.Provider
      value={{
        currentOrganization,
        isLoadingOrganization,
        setCurrentOrganization,
        refreshOrganization
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
};

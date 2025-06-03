
import React from "react";
import Layout from "@/components/layout/Layout";
import OrganizationManager from "@/components/organizations/OrganizationManager";
import { useAuth } from "@/context/AuthContext";
import { Navigate } from "react-router-dom";

export default function Organizations() {
  const { user } = useAuth();

  // Solo super admins pueden acceder a la gestión de organizaciones
  if (!user || user.role !== "superAdmin") {
    return <Navigate to="/analytics" replace />;
  }

  return (
    <Layout>
      <OrganizationManager />
    </Layout>
  );
}

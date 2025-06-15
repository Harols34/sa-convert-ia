
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Agentes</h2>
          <p className="text-muted-foreground">
            Gestión de agentes de ventas y su rendimiento
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Lista de Agentes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Contenido en desarrollo...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
